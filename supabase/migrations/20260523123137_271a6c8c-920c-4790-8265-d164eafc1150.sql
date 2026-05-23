
CREATE TABLE public.contas_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  granja_id UUID NOT NULL REFERENCES public.granjas(id) ON DELETE RESTRICT,
  tenant_id UUID,
  cliente_id UUID REFERENCES public.clientes_fornecedores(id) ON DELETE SET NULL,
  contrato_venda_id UUID REFERENCES public.contratos_venda(id) ON DELETE SET NULL,
  nota_fiscal_id UUID REFERENCES public.notas_fiscais(id) ON DELETE SET NULL,
  documento TEXT,
  parcela TEXT,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  valor_original NUMERIC(15,2) NOT NULL CHECK (valor_original >= 0),
  valor_pago NUMERIC(15,2) NOT NULL DEFAULT 0,
  juros NUMERIC(15,2) NOT NULL DEFAULT 0,
  multa NUMERIC(15,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','parcial','pago','cancelado')),
  dre_conta_id UUID REFERENCES public.dre_contas(id) ON DELETE SET NULL,
  sub_centro_custo_id UUID REFERENCES public.sub_centros_custo(id) ON DELETE SET NULL,
  safra_id UUID REFERENCES public.safras(id) ON DELETE SET NULL,
  observacoes TEXT,
  codigo_legado TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cr_granja_status_venc ON public.contas_receber(granja_id, status, data_vencimento);
CREATE INDEX idx_cr_cliente ON public.contas_receber(cliente_id);
CREATE INDEX idx_cr_contrato ON public.contas_receber(contrato_venda_id);

CREATE TABLE public.contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  granja_id UUID NOT NULL REFERENCES public.granjas(id) ON DELETE RESTRICT,
  tenant_id UUID,
  fornecedor_id UUID REFERENCES public.clientes_fornecedores(id) ON DELETE SET NULL,
  entrada_nfe_id UUID REFERENCES public.entradas_nfe(id) ON DELETE SET NULL,
  compra_cereais_id UUID REFERENCES public.compras_cereais(id) ON DELETE SET NULL,
  documento TEXT,
  parcela TEXT,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  valor_original NUMERIC(15,2) NOT NULL CHECK (valor_original >= 0),
  valor_pago NUMERIC(15,2) NOT NULL DEFAULT 0,
  juros NUMERIC(15,2) NOT NULL DEFAULT 0,
  multa NUMERIC(15,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','parcial','pago','cancelado')),
  dre_conta_id UUID REFERENCES public.dre_contas(id) ON DELETE SET NULL,
  sub_centro_custo_id UUID REFERENCES public.sub_centros_custo(id) ON DELETE SET NULL,
  safra_id UUID REFERENCES public.safras(id) ON DELETE SET NULL,
  observacoes TEXT,
  codigo_legado TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cp_granja_status_venc ON public.contas_pagar(granja_id, status, data_vencimento);
CREATE INDEX idx_cp_fornec ON public.contas_pagar(fornecedor_id);
CREATE INDEX idx_cp_entrada ON public.contas_pagar(entrada_nfe_id);

CREATE TABLE public.contas_receber_baixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES public.contas_receber(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  valor_pago NUMERIC(15,2) NOT NULL CHECK (valor_pago > 0),
  juros NUMERIC(15,2) NOT NULL DEFAULT 0,
  multa NUMERIC(15,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(15,2) NOT NULL DEFAULT 0,
  forma_pagamento TEXT,
  conta_bancaria TEXT,
  documento TEXT,
  observacoes TEXT,
  lancamento_financeiro_id UUID REFERENCES public.lancamentos_financeiros(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crb_conta ON public.contas_receber_baixas(conta_id);

CREATE TABLE public.contas_pagar_baixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  valor_pago NUMERIC(15,2) NOT NULL CHECK (valor_pago > 0),
  juros NUMERIC(15,2) NOT NULL DEFAULT 0,
  multa NUMERIC(15,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(15,2) NOT NULL DEFAULT 0,
  forma_pagamento TEXT,
  conta_bancaria TEXT,
  documento TEXT,
  observacoes TEXT,
  lancamento_financeiro_id UUID REFERENCES public.lancamentos_financeiros(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cpb_conta ON public.contas_pagar_baixas(conta_id);

CREATE TRIGGER trg_cr_updated BEFORE UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cp_updated BEFORE UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crb_updated BEFORE UPDATE ON public.contas_receber_baixas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cpb_updated BEFORE UPDATE ON public.contas_pagar_baixas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_conta_tenant_from_granja()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.granja_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.granjas WHERE id = NEW.granja_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_cr_tenant BEFORE INSERT ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.set_conta_tenant_from_granja();
CREATE TRIGGER trg_cp_tenant BEFORE INSERT ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.set_conta_tenant_from_granja();

CREATE OR REPLACE FUNCTION public.recalc_conta_receber(_conta_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pago NUMERIC; v_orig NUMERIC; v_status TEXT;
BEGIN
  SELECT COALESCE(SUM(valor_pago + juros + multa - desconto),0) INTO v_pago FROM contas_receber_baixas WHERE conta_id = _conta_id;
  SELECT valor_original, status INTO v_orig, v_status FROM contas_receber WHERE id = _conta_id;
  IF v_status = 'cancelado' THEN RETURN; END IF;
  UPDATE contas_receber SET valor_pago = v_pago,
    status = CASE WHEN v_pago <= 0 THEN 'aberto' WHEN v_pago >= v_orig THEN 'pago' ELSE 'parcial' END
  WHERE id = _conta_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalc_conta_pagar(_conta_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pago NUMERIC; v_orig NUMERIC; v_status TEXT;
BEGIN
  SELECT COALESCE(SUM(valor_pago + juros + multa - desconto),0) INTO v_pago FROM contas_pagar_baixas WHERE conta_id = _conta_id;
  SELECT valor_original, status INTO v_orig, v_status FROM contas_pagar WHERE id = _conta_id;
  IF v_status = 'cancelado' THEN RETURN; END IF;
  UPDATE contas_pagar SET valor_pago = v_pago,
    status = CASE WHEN v_pago <= 0 THEN 'aberto' WHEN v_pago >= v_orig THEN 'pago' ELSE 'parcial' END
  WHERE id = _conta_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_cr()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN PERFORM recalc_conta_receber(OLD.conta_id); RETURN OLD; END IF;
  PERFORM recalc_conta_receber(NEW.conta_id);
  IF TG_OP = 'UPDATE' AND OLD.conta_id <> NEW.conta_id THEN PERFORM recalc_conta_receber(OLD.conta_id); END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_cp()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN PERFORM recalc_conta_pagar(OLD.conta_id); RETURN OLD; END IF;
  PERFORM recalc_conta_pagar(NEW.conta_id);
  IF TG_OP = 'UPDATE' AND OLD.conta_id <> NEW.conta_id THEN PERFORM recalc_conta_pagar(OLD.conta_id); END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crb_recalc AFTER INSERT OR UPDATE OR DELETE ON public.contas_receber_baixas FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_cr();
CREATE TRIGGER trg_cpb_recalc AFTER INSERT OR UPDATE OR DELETE ON public.contas_pagar_baixas FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_cp();

ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber_baixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar_baixas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cr_select" ON public.contas_receber FOR SELECT TO authenticated USING (public.granja_belongs_to_tenant(granja_id));
CREATE POLICY "cr_insert" ON public.contas_receber FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()) AND public.granja_belongs_to_tenant(granja_id));
CREATE POLICY "cr_update" ON public.contas_receber FOR UPDATE TO authenticated USING (public.can_edit(auth.uid()) AND public.granja_belongs_to_tenant(granja_id));
CREATE POLICY "cr_delete" ON public.contas_receber FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente'));

CREATE POLICY "cp_select" ON public.contas_pagar FOR SELECT TO authenticated USING (public.granja_belongs_to_tenant(granja_id));
CREATE POLICY "cp_insert" ON public.contas_pagar FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()) AND public.granja_belongs_to_tenant(granja_id));
CREATE POLICY "cp_update" ON public.contas_pagar FOR UPDATE TO authenticated USING (public.can_edit(auth.uid()) AND public.granja_belongs_to_tenant(granja_id));
CREATE POLICY "cp_delete" ON public.contas_pagar FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente'));

CREATE POLICY "crb_select" ON public.contas_receber_baixas FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM contas_receber c WHERE c.id = conta_id AND public.granja_belongs_to_tenant(c.granja_id)));
CREATE POLICY "crb_insert" ON public.contas_receber_baixas FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()) AND EXISTS (SELECT 1 FROM contas_receber c WHERE c.id = conta_id AND public.granja_belongs_to_tenant(c.granja_id)));
CREATE POLICY "crb_update" ON public.contas_receber_baixas FOR UPDATE TO authenticated USING (public.can_edit(auth.uid()) AND EXISTS (SELECT 1 FROM contas_receber c WHERE c.id = conta_id AND public.granja_belongs_to_tenant(c.granja_id)));
CREATE POLICY "crb_delete" ON public.contas_receber_baixas FOR DELETE TO authenticated USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente')) AND EXISTS (SELECT 1 FROM contas_receber c WHERE c.id = conta_id AND public.granja_belongs_to_tenant(c.granja_id)));

CREATE POLICY "cpb_select" ON public.contas_pagar_baixas FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM contas_pagar c WHERE c.id = conta_id AND public.granja_belongs_to_tenant(c.granja_id)));
CREATE POLICY "cpb_insert" ON public.contas_pagar_baixas FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()) AND EXISTS (SELECT 1 FROM contas_pagar c WHERE c.id = conta_id AND public.granja_belongs_to_tenant(c.granja_id)));
CREATE POLICY "cpb_update" ON public.contas_pagar_baixas FOR UPDATE TO authenticated USING (public.can_edit(auth.uid()) AND EXISTS (SELECT 1 FROM contas_pagar c WHERE c.id = conta_id AND public.granja_belongs_to_tenant(c.granja_id)));
CREATE POLICY "cpb_delete" ON public.contas_pagar_baixas FOR DELETE TO authenticated USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente')) AND EXISTS (SELECT 1 FROM contas_pagar c WHERE c.id = conta_id AND public.granja_belongs_to_tenant(c.granja_id)));

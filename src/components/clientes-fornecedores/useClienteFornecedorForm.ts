import { useEffect, useState, type FormEvent } from 'react';
import { useClientesFornecedores, useCreateClienteFornecedor, useUpdateClienteFornecedor, type ClienteFornecedorInsert } from '@/hooks/useClientesFornecedores';
import { useCepLookup } from '@/hooks/useCepLookup';
import { useCnpjLookup } from '@/hooks/useCnpjLookup';
import { validateCpf, validateCnpj } from '@/lib/formatters';
import { isIeGenerica, validarIeUF } from '@/lib/inscricaoEstadualValidator';
import { toast } from 'sonner';

export interface ClienteFornecedorFormOptions {
  open: boolean;
  registroId?: string;
  tipoInicial?: 'ambos' | 'cliente' | 'fornecedor';
  onOpenChange: (open: boolean) => void;
  onSaved?: (id: string) => void;
}

export function useClienteFornecedorForm({ open, registroId, tipoInicial = 'ambos', onOpenChange, onSaved }: ClienteFornecedorFormOptions) {
  const { data: registros, isLoading, isError } = useClientesFornecedores();
  const createMutation = useCreateClienteFornecedor();
  const updateMutation = useUpdateClienteFornecedor();
  const { isLoading: cepLoading, fetchCep } = useCepLookup();
  const { isLoading: cnpjLoading, fetchCnpj } = useCnpjLookup();
  const [formData, setFormData] = useState<ClienteFornecedorInsert>({
    granja_id: null,
    tipo: 'ambos',
    tipo_pessoa: 'juridica',
    nome: '',
    nome_fantasia: '',
    cpf_cnpj: '',
    inscricao_estadual: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    telefone: '',
    celular: '',
    email: '',
    contato: '',
    observacoes: '',
    ativo: true,
  });
  useEffect(() => {
    if (!open) return;
    const item = registroId ? registros?.find(r => r.id === registroId) : undefined;
    if (registroId && !item) return;
    setFormData(prev => {
      const empty = Object.fromEntries(Object.keys(prev).map(key => [key, '']));
      return { ...empty, granja_id: null, nome: '', tipo: tipoInicial, tipo_pessoa: 'juridica', ativo: true,
        ...(item ? Object.fromEntries(Object.keys(prev).map(key => [key, item[key as keyof typeof item]])) : {}) } as ClienteFornecedorInsert;
    });
    // Refetches must not reset a form while it is being edited.
  }, [open, registroId, Boolean(registros), tipoInicial]);
  const handleCepBlur = async (cep: string) => {
    const data = await fetchCep(cep);
    if (data) {
      setFormData((prev) => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
      }));
    }
  };

  const handleCnpjBlur = async (cnpj: string) => {
    if (formData.tipo_pessoa !== 'juridica') return;
    
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) return;
    
    const data = await fetchCnpj(cnpj);
    if (data) {
      setFormData((prev) => ({
        ...prev,
        cpf_cnpj: data.cnpj || prev.cpf_cnpj,
        nome: data.razao_social || prev.nome,
        nome_fantasia: data.nome_fantasia || prev.nome_fantasia,
        logradouro: data.logradouro || prev.logradouro,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        cidade: data.cidade || prev.cidade,
        uf: data.uf || prev.uf,
        cep: data.cep || prev.cep,
        telefone: data.telefone || prev.telefone,
        email: data.email || prev.email,
      }));
      
      // Buscar CEP no ViaCEP para complementar dados se necessário
      if (data.cep) {
        await handleCepBlur(data.cep);
      }
    }
  };  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Bairro é obrigatório no schema da NF-e (SEFAZ rejeita bairro vazio)
    if (!formData.bairro?.trim()) {
      toast.error('Bairro é obrigatório', {
        description: 'A SEFAZ rejeita NF-e com bairro do destinatário em branco. Informe o bairro (ex.: INTERIOR para área rural).',
      });
      return;
    }


    // Validar CPF/CNPJ se informado (pular para estrangeiro)
    if (formData.cpf_cnpj && formData.cpf_cnpj.length > 0 && formData.tipo_pessoa !== 'estrangeiro') {
      const doc = formData.cpf_cnpj.replace(/\D/g, "");
      if (formData.tipo_pessoa === "fisica") {
        if (doc.length > 0 && !validateCpf(doc)) {
          toast.error("CPF inválido!");
          return;
        }
      } else {
        if (doc.length > 0 && !validateCnpj(doc)) {
          toast.error("CNPJ inválido!");
          return;
        }
      }
    }


    // Validar Inscrição Estadual se informada (apenas para não-estrangeiro)
    const ieRaw = (formData.inscricao_estadual || '').trim();
    if (ieRaw && formData.tipo_pessoa !== 'estrangeiro') {
      if (isIeGenerica(ieRaw)) {
        toast.error('Inscrição Estadual inválida', {
          description: 'Não é permitido cadastrar IE genérica (zeros, sequências ou repetições).',
        });
        return;
      }
      if (!formData.uf) {
        toast.error('Informe a UF para validar a Inscrição Estadual.');
        return;
      }
      const res = validarIeUF(ieRaw, formData.uf);
      if (!res.valida) {
        toast.error('Inscrição Estadual inválida', {
          description: res.motivo ?? `A IE informada não é válida para ${formData.uf}.`,
        });
        return;
      }
    }

    if (registroId && !registros?.some(r => r.id === registroId)) return;
    try {
      const saved = registroId
        ? await updateMutation.mutateAsync({ id: registroId, ...formData })
        : await createMutation.mutateAsync(formData);
      onSaved?.(saved.id);
      onOpenChange(false);
    } catch {
      // Mutation hooks display the error; keep the entered data for retry.
    }
  };
  return { formData, setFormData, handleCepBlur, handleCnpjBlur, cepLoading, cnpjLoading, handleSubmit,
    saving: createMutation.isPending || updateMutation.isPending,
    loading: Boolean(registroId) && isLoading,
    unavailable: Boolean(registroId) && (isError || (!isLoading && !registros?.some(r => r.id === registroId))) };
}

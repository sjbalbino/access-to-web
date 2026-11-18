import { supabase } from "@/integrations/supabase/client";

/** Item mínimo do XML necessário para localizar/criar o produto. */
export interface ItemXmlProduto {
  codigoProduto: string;
  descricao: string;
  ncm?: string | null;
  unidade?: string | null;
  valorUnitario?: number | null;
}

const norm = (s: string | null | undefined) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();

/**
 * Para cada item da nota devolve o id do produto: procura primeiro pelo código
 * do fornecedor, depois pelo nome (sem acento/maiúsculas). Se não achar,
 * cadastra o produto automaticamente com unidade, NCM e preço de custo do XML.
 * Itens repetidos na mesma nota reutilizam o mesmo cadastro.
 */
export async function resolverOuCriarProdutos(itens: ItemXmlProduto[]): Promise<{ ids: (string | null)[]; criados: number }> {
  const [{ data: produtos, error }, { data: unidades }] = await Promise.all([
    supabase.from("produtos").select("id, nome, cod_fornecedor").eq("ativo", true).limit(10000),
    supabase.from("unidades_medida").select("id, sigla, codigo, descricao"),
  ]);
  if (error) throw error;
  const porCodigo = new Map<string, string>();
  const porNome = new Map<string, string>();
  for (const p of produtos || []) {
    if (p.cod_fornecedor) porCodigo.set(String(p.cod_fornecedor).trim(), p.id);
    if (p.nome && !porNome.has(norm(p.nome))) porNome.set(norm(p.nome), p.id);
  }
  const unidadeId = (sigla?: string | null) => {
    const s = norm(sigla);
    if (!s) return null;
    return (unidades || []).find((u: any) => [u.sigla, u.codigo, u.descricao].some((v) => norm(v) === s))?.id ?? null;
  };

  let criados = 0;
  const ids: (string | null)[] = [];
  for (const item of itens) {
    const cod = (item.codigoProduto || "").trim();
    const nome = (item.descricao || "").trim();
    let id = (cod && porCodigo.get(cod)) || (nome && porNome.get(norm(nome))) || null;
    if (!id && nome) {
      const { data, error: insErr } = await supabase
        .from("produtos")
        .insert({
          nome,
          tipo: "insumo",
          cod_fornecedor: cod || null,
          ncm: item.ncm || null,
          descricao: `Importado do XML - Cód: ${cod}`,
          unidade_medida_id: unidadeId(item.unidade),
          preco_custo: item.valorUnitario || null,
          preco_venda: item.valorUnitario || null,
          preco_prazo: item.valorUnitario || null,
          ativo: true,
        } as any)
        .select("id")
        .single();
      if (insErr) throw insErr;
      id = data.id;
      criados++;
    }
    if (id) {
      if (cod) porCodigo.set(cod, id);
      porNome.set(norm(nome), id);
    }
    ids.push(id);
  }
  return { ids, criados };
}

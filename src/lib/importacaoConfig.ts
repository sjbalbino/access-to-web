import { supabase } from '@/integrations/supabase/client';

export interface ColumnMapping {
  accessName: string; // column name in Access/Excel
  dbName: string; // column name in Supabase
  required?: boolean;
  transform?: (value: any) => any;
}

export interface ReferenceResolver {
  dbColumn: string; // FK column in target table
  sourceColumn: string; // column from Excel that has the legacy code
  lookupTable: string; // table to look up
  lookupColumn: string; // column in lookup table to match
  lookupLabel?: string; // column to show as label
}

export interface TableConfig {
  key: string;
  label: string;
  tableName: string;
  description: string;
  columns: ColumnMapping[];
  references?: ReferenceResolver[];
  order: number;
  dependsOn?: string[];
}

// Common transforms
const toBool = (v: any): boolean | null => {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim().toUpperCase();
  return s === 'S' || s === 'SIM' || s === 'TRUE' || s === '1' || s === '-1';
};

const toNumber = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
  return isNaN(n) ? null : n;
};

const toDate = (v: any): string | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    // Excel serial date
    const d = new Date((v - 25569) * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  if (typeof v === 'string') {
    // Try DD/MM/YYYY
    const parts = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (parts) return `${parts[3]}-${parts[2]}-${parts[1]}`;
    // Try ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.split('T')[0];
  }
  if (v instanceof Date) return v.toISOString().split('T')[0];
  return null;
};

const toStr = (v: any): string | null => {
  if (v === null || v === undefined || v === '') return null;
  return String(v).trim();
};

const toInt = (v: any): number | null => {
  const n = toNumber(v);
  return n !== null ? Math.round(n) : null;
};

export const tableConfigs: TableConfig[] = [
  {
    key: 'granjas',
    label: 'Granjas',
    tableName: 'granjas',
    description: 'Fazendas/Empresas',
    order: 1,
    columns: [
      { accessName: 'codigo', dbName: 'codigo', transform: toStr },
      { accessName: 'razao_social', dbName: 'razao_social', required: true, transform: toStr },
      { accessName: 'nome_fantasia', dbName: 'nome_fantasia', transform: toStr },
      { accessName: 'cnpj', dbName: 'cnpj', transform: toStr },
      { accessName: 'cpf', dbName: 'cpf', transform: toStr },
      { accessName: 'inscricao_estadual', dbName: 'inscricao_estadual', transform: toStr },
      { accessName: 'logradouro', dbName: 'logradouro', transform: toStr },
      { accessName: 'numero', dbName: 'numero', transform: toStr },
      { accessName: 'complemento', dbName: 'complemento', transform: toStr },
      { accessName: 'bairro', dbName: 'bairro', transform: toStr },
      { accessName: 'cidade', dbName: 'cidade', transform: toStr },
      { accessName: 'uf', dbName: 'uf', transform: toStr },
      { accessName: 'cep', dbName: 'cep', transform: toStr },
      { accessName: 'telefone', dbName: 'telefone', transform: toStr },
      { accessName: 'email', dbName: 'email', transform: toStr },
      { accessName: 'total_hectares', dbName: 'total_hectares', transform: toNumber },
      { accessName: 'ativa', dbName: 'ativa', transform: toBool },
    ],
  },
  {
    key: 'unidades_medida',
    label: 'Unidades de Medida',
    tableName: 'unidades_medida',
    description: 'Unidades de medida (kg, L, un, etc)',
    order: 2,
    columns: [
      { accessName: 'codigo', dbName: 'codigo', required: true, transform: toStr },
      { accessName: 'descricao', dbName: 'descricao', required: true, transform: toStr },
      { accessName: 'sigla', dbName: 'sigla', transform: toStr },
      { accessName: 'ativa', dbName: 'ativa', transform: toBool },
    ],
  },
  {
    key: 'grupos_produtos',
    label: 'Grupos de Produtos',
    tableName: 'grupos_produtos',
    description: 'Grupos/categorias de produtos',
    order: 2,
    columns: [
      { accessName: 'nome', dbName: 'nome', required: true, transform: toStr },
      { accessName: 'descricao', dbName: 'descricao', transform: toStr },
      { accessName: 'ativo', dbName: 'ativo', transform: toBool },
    ],
  },
  {
    key: 'safras',
    label: 'Safras',
    tableName: 'safras',
    description: 'Períodos de safra (depende de Culturas)',
    order: 3,
    dependsOn: ['culturas'],
    columns: [
      { accessName: 'codigo', dbName: 'codigo', transform: toStr },
      { accessName: 'nome', dbName: 'nome', required: true, transform: toStr },
      { accessName: 'ano_colheita', dbName: 'ano_colheita', transform: toInt },
      { accessName: 'data_inicio', dbName: 'data_inicio', transform: toDate },
      { accessName: 'data_fim', dbName: 'data_fim', transform: toDate },
      { accessName: 'status', dbName: 'status', transform: toStr },
    ],
    references: [
      {
        dbColumn: 'cultura_id',
        sourceColumn: 'cultura',
        lookupTable: 'culturas',
        lookupColumn: 'nome',
        lookupLabel: 'nome',
      },
    ],
  },
  {
    key: 'culturas',
    label: 'Culturas',
    tableName: 'culturas',
    description: 'Tipos de cultura (soja, milho, etc)',
    order: 2,
    columns: [
      { accessName: 'codigo', dbName: 'codigo', transform: toStr },
      { accessName: 'nome', dbName: 'nome', required: true, transform: toStr },
      { accessName: 'peso_saco_industria', dbName: 'peso_saco_industria', transform: toNumber },
      { accessName: 'peso_saco_semente', dbName: 'peso_saco_semente', transform: toNumber },
      { accessName: 'informar_ph', dbName: 'informar_ph', transform: toBool },
      { accessName: 'ativa', dbName: 'ativa', transform: toBool },
    ],
  },
  {
    key: 'produtos',
    label: 'Produtos',
    tableName: 'produtos',
    description: 'Produtos e variedades',
    order: 5,
    dependsOn: ['granjas', 'unidades_medida', 'grupos_produtos', 'clientes_fornecedores'],
    columns: [
      { accessName: 'codigo', dbName: 'codigo', transform: toStr },
      { accessName: 'nome', dbName: 'nome', required: true, transform: toStr },
      { accessName: 'tipo', dbName: 'tipo', transform: toStr },
      { accessName: 'descricao', dbName: 'descricao', transform: toStr },
      { accessName: 'ncm', dbName: 'ncm', transform: toStr },
      { accessName: 'peso_saco', dbName: 'peso_saco', transform: toNumber },
      { accessName: 'preco_custo', dbName: 'preco_custo', transform: toNumber },
      { accessName: 'preco_venda', dbName: 'preco_venda', transform: toNumber },
      { accessName: 'ativo', dbName: 'ativo', transform: toBool },
      { accessName: 'codigo_barras', dbName: 'codigo_barras', transform: toStr },
      { accessName: 'grupo', dbName: 'grupo', transform: toStr },
      { accessName: 'artigo_nfe', dbName: 'artigo_nfe', transform: toStr },
      { accessName: 'preco_prazo', dbName: 'preco_prazo', transform: toNumber },
      { accessName: 'estoque_minimo', dbName: 'estoque_minimo', transform: toNumber },
      { accessName: 'estoque_maximo', dbName: 'estoque_maximo', transform: toNumber },
      { accessName: 'estoque_atual', dbName: 'estoque_atual', transform: toNumber },
      { accessName: 'tempo_maximo', dbName: 'tempo_maximo', transform: toNumber },
      { accessName: 'qtd_venda', dbName: 'qtd_venda', transform: toNumber },
      { accessName: 'cod_fornecedor', dbName: 'cod_fornecedor', transform: toStr },
      { accessName: 'cst_pis', dbName: 'cst_pis', transform: toStr },
      { accessName: 'cst_cofins', dbName: 'cst_cofins', transform: toStr },
      { accessName: 'cst_icms', dbName: 'cst_icms', transform: toStr },
      { accessName: 'cst_ipi', dbName: 'cst_ipi', transform: toStr },
      { accessName: 'natureza_receita', dbName: 'natureza_receita', transform: toStr },
      { accessName: 'observacao_tributaria', dbName: 'observacao_tributaria', transform: toStr },
      { accessName: 'cst_ibs', dbName: 'cst_ibs', transform: toStr },
      { accessName: 'cst_cbs', dbName: 'cst_cbs', transform: toStr },
      { accessName: 'cst_is', dbName: 'cst_is', transform: toStr },
      { accessName: 'cclass_trib_ibs', dbName: 'cclass_trib_ibs', transform: toStr },
      { accessName: 'cclass_trib_cbs', dbName: 'cclass_trib_cbs', transform: toStr },
    ],
    references: [
      { dbColumn: 'granja_id', sourceColumn: 'granja_codigo', lookupTable: 'granjas', lookupColumn: 'codigo', lookupLabel: 'razao_social' },
      { dbColumn: 'unidade_medida_id', sourceColumn: 'unidade_medida', lookupTable: 'unidades_medida', lookupColumn: 'codigo', lookupLabel: 'descricao' },
      { dbColumn: 'fornecedor_id', sourceColumn: 'fornecedor', lookupTable: 'clientes_fornecedores', lookupColumn: 'nome', lookupLabel: 'nome' },
      { dbColumn: 'grupo_id', sourceColumn: 'grupo_produto', lookupTable: 'grupos_produtos', lookupColumn: 'nome', lookupLabel: 'nome' },
      { dbColumn: 'produto_residuo_id', sourceColumn: 'produto_residuo', lookupTable: 'produtos', lookupColumn: 'codigo', lookupLabel: 'nome' },
    ],
  },
  {
    key: 'silos',
    label: 'Silos',
    tableName: 'silos',
    description: 'Silos de armazenamento',
    order: 6,
    dependsOn: ['granjas'],
    columns: [
      { accessName: 'codigo', dbName: 'codigo', transform: toStr },
      { accessName: 'nome', dbName: 'nome', required: true, transform: toStr },
      { accessName: 'capacidade_kg', dbName: 'capacidade_kg', transform: toNumber },
      { accessName: 'capacidade_sacas', dbName: 'capacidade_sacas', transform: toNumber },
      { accessName: 'tipo', dbName: 'tipo', transform: toStr },
      { accessName: 'localizacao', dbName: 'localizacao', transform: toStr },
      { accessName: 'ativo', dbName: 'ativo', transform: toBool },
    ],
    references: [
      { dbColumn: 'granja_id', sourceColumn: 'granja_codigo', lookupTable: 'granjas', lookupColumn: 'codigo', lookupLabel: 'razao_social' },
    ],
  },
  {
    key: 'lavouras',
    label: 'Lavouras',
    tableName: 'lavouras',
    description: 'Áreas de plantio',
    order: 7,
    dependsOn: ['granjas'],
    columns: [
      { accessName: 'codigo', dbName: 'codigo', transform: toInt },
      { accessName: 'nome', dbName: 'nome', required: true, transform: toStr },
      { accessName: 'total_hectares', dbName: 'total_hectares', transform: toNumber },
      { accessName: 'area_plantio', dbName: 'area_plantio', transform: toNumber },
      { accessName: 'area_nao_aproveitavel', dbName: 'area_nao_aproveitavel', transform: toNumber },
      { accessName: 'recebe_terceiros', dbName: 'recebe_terceiros', transform: toBool },
      { accessName: 'ativa', dbName: 'ativa', transform: toBool },
      { accessName: 'observacoes', dbName: 'observacoes', transform: toStr },
    ],
    references: [
      { dbColumn: 'granja_id', sourceColumn: 'granja_codigo', lookupTable: 'granjas', lookupColumn: 'codigo', lookupLabel: 'razao_social' },
    ],
  },
  {
    key: 'produtores',
    label: 'Produtores',
    tableName: 'produtores',
    description: 'Produtores rurais',
    order: 7,
    dependsOn: ['granjas'],
    columns: [
      { accessName: 'codigo', dbName: 'codigo', transform: toStr },
      { accessName: 'nome', dbName: 'nome', required: true, transform: toStr },
      { accessName: 'tipo_pessoa', dbName: 'tipo_pessoa', transform: toStr },
      { accessName: 'cpf_cnpj', dbName: 'cpf_cnpj', transform: toStr },
      { accessName: 'identidade', dbName: 'identidade', transform: toStr },
      { accessName: 'logradouro', dbName: 'logradouro', transform: toStr },
      { accessName: 'numero', dbName: 'numero', transform: toStr },
      { accessName: 'complemento', dbName: 'complemento', transform: toStr },
      { accessName: 'bairro', dbName: 'bairro', transform: toStr },
      { accessName: 'cidade', dbName: 'cidade', transform: toStr },
      { accessName: 'uf', dbName: 'uf', transform: toStr },
      { accessName: 'cep', dbName: 'cep', transform: toStr },
      { accessName: 'telefone', dbName: 'telefone', transform: toStr },
      { accessName: 'celular', dbName: 'celular', transform: toStr },
      { accessName: 'email', dbName: 'email', transform: toStr },
      { accessName: 'tipo_produtor', dbName: 'tipo_produtor', transform: toStr },
      { accessName: 'ativo', dbName: 'ativo', transform: toBool },
    ],
    references: [
      { dbColumn: 'granja_id', sourceColumn: 'granja_codigo', lookupTable: 'granjas', lookupColumn: 'codigo', lookupLabel: 'razao_social' },
    ],
  },
  {
    key: 'inscricoes',
    label: 'Inscrições Produtor',
    tableName: 'inscricoes_produtor',
    description: 'Inscrições estaduais dos produtores',
    order: 8,
    dependsOn: ['produtores', 'granjas'],
    columns: [
      { accessName: 'cpf_cnpj', dbName: 'cpf_cnpj', transform: toStr },
      { accessName: 'inscricao_estadual', dbName: 'inscricao_estadual', transform: toStr },
      { accessName: 'granja', dbName: 'granja', transform: toStr },
      { accessName: 'tipo', dbName: 'tipo', transform: toStr },
      { accessName: 'logradouro', dbName: 'logradouro', transform: toStr },
      { accessName: 'numero', dbName: 'numero', transform: toStr },
      { accessName: 'complemento', dbName: 'complemento', transform: toStr },
      { accessName: 'bairro', dbName: 'bairro', transform: toStr },
      { accessName: 'cidade', dbName: 'cidade', transform: toStr },
      { accessName: 'uf', dbName: 'uf', transform: toStr },
      { accessName: 'cep', dbName: 'cep', transform: toStr },
      { accessName: 'telefone', dbName: 'telefone', transform: toStr },
      { accessName: 'email', dbName: 'email', transform: toStr },
      { accessName: 'ativa', dbName: 'ativa', transform: toBool },
    ],
    references: [
      { dbColumn: 'produtor_id', sourceColumn: 'produtor_codigo', lookupTable: 'produtores', lookupColumn: 'codigo', lookupLabel: 'nome' },
      { dbColumn: 'granja_id', sourceColumn: 'granja_codigo', lookupTable: 'granjas', lookupColumn: 'codigo', lookupLabel: 'razao_social' },
    ],
  },
  {
    key: 'placas',
    label: 'Placas',
    tableName: 'placas',
    description: 'Veículos/placas',
    order: 9,
    columns: [
      { accessName: 'placa', dbName: 'placa', required: true, transform: toStr },
      { accessName: 'descricao', dbName: 'descricao', transform: toStr },
      { accessName: 'tipo_veiculo', dbName: 'tipo_veiculo', transform: toStr },
      { accessName: 'capacidade_kg', dbName: 'capacidade_kg', transform: toNumber },
      { accessName: 'uf', dbName: 'uf', transform: toStr },
      { accessName: 'ativa', dbName: 'ativa', transform: toBool },
    ],
  },
  {
    key: 'transportadoras',
    label: 'Transportadoras',
    tableName: 'transportadoras',
    description: 'Empresas de transporte',
    order: 10,
    columns: [
      { accessName: 'codigo', dbName: 'codigo', transform: toStr },
      { accessName: 'razao_social', dbName: 'razao_social', required: true, transform: toStr },
      { accessName: 'nome_fantasia', dbName: 'nome_fantasia', transform: toStr },
      { accessName: 'cpf_cnpj', dbName: 'cpf_cnpj', transform: toStr },
      { accessName: 'inscricao_estadual', dbName: 'inscricao_estadual', transform: toStr },
      { accessName: 'logradouro', dbName: 'logradouro', transform: toStr },
      { accessName: 'numero', dbName: 'numero', transform: toStr },
      { accessName: 'bairro', dbName: 'bairro', transform: toStr },
      { accessName: 'cidade', dbName: 'cidade', transform: toStr },
      { accessName: 'uf', dbName: 'uf', transform: toStr },
      { accessName: 'cep', dbName: 'cep', transform: toStr },
      { accessName: 'telefone', dbName: 'telefone', transform: toStr },
      { accessName: 'ativa', dbName: 'ativa', transform: toBool },
    ],
  },
  {
    key: 'clientes',
    label: 'Clientes/Fornecedores',
    tableName: 'clientes_fornecedores',
    description: 'Clientes e fornecedores',
    order: 11,
    columns: [
      { accessName: 'codigo', dbName: 'codigo', transform: toStr },
      { accessName: 'nome', dbName: 'nome', required: true, transform: toStr },
      { accessName: 'nome_fantasia', dbName: 'nome_fantasia', transform: toStr },
      { accessName: 'tipo', dbName: 'tipo', transform: toStr },
      { accessName: 'tipo_pessoa', dbName: 'tipo_pessoa', transform: toStr },
      { accessName: 'cpf_cnpj', dbName: 'cpf_cnpj', transform: toStr },
      { accessName: 'inscricao_estadual', dbName: 'inscricao_estadual', transform: toStr },
      { accessName: 'logradouro', dbName: 'logradouro', transform: toStr },
      { accessName: 'numero', dbName: 'numero', transform: toStr },
      { accessName: 'complemento', dbName: 'complemento', transform: toStr },
      { accessName: 'bairro', dbName: 'bairro', transform: toStr },
      { accessName: 'cidade', dbName: 'cidade', transform: toStr },
      { accessName: 'uf', dbName: 'uf', transform: toStr },
      { accessName: 'cep', dbName: 'cep', transform: toStr },
      { accessName: 'telefone', dbName: 'telefone', transform: toStr },
      { accessName: 'email', dbName: 'email', transform: toStr },
      { accessName: 'ativo', dbName: 'ativo', transform: toBool },
    ],
    references: [
      { dbColumn: 'granja_id', sourceColumn: 'granja_codigo', lookupTable: 'granjas', lookupColumn: 'codigo', lookupLabel: 'razao_social' },
    ],
  },
  {
    key: 'colheitas',
    label: 'Colheitas',
    tableName: 'colheitas',
    description: 'Registros de colheita/entrada',
    order: 12,
    dependsOn: ['inscricoes', 'safras', 'lavouras', 'silos', 'produtos', 'placas'],
    columns: [
      { accessName: 'data_colheita', dbName: 'data_colheita', transform: toDate },
      { accessName: 'tipo_colheita', dbName: 'tipo_colheita', transform: toStr },
      { accessName: 'peso_bruto', dbName: 'peso_bruto', transform: toNumber },
      { accessName: 'peso_tara', dbName: 'peso_tara', transform: toNumber },
      { accessName: 'producao_kg', dbName: 'producao_kg', transform: toNumber },
      { accessName: 'umidade', dbName: 'umidade', transform: toNumber },
      { accessName: 'impureza', dbName: 'impureza', transform: toNumber },
      { accessName: 'ph', dbName: 'ph', transform: toNumber },
      { accessName: 'kg_umidade', dbName: 'kg_umidade', transform: toNumber },
      { accessName: 'kg_impureza', dbName: 'kg_impureza', transform: toNumber },
      { accessName: 'kg_desconto_total', dbName: 'kg_desconto_total', transform: toNumber },
      { accessName: 'producao_liquida_kg', dbName: 'producao_liquida_kg', transform: toNumber },
      { accessName: 'total_sacos', dbName: 'total_sacos', transform: toNumber },
      { accessName: 'percentual_avariados', dbName: 'percentual_avariados', transform: toNumber },
      { accessName: 'kg_avariados', dbName: 'kg_avariados', transform: toNumber },
      { accessName: 'percentual_outros', dbName: 'percentual_outros', transform: toNumber },
      { accessName: 'kg_outros', dbName: 'kg_outros', transform: toNumber },
      { accessName: 'motorista', dbName: 'motorista', transform: toStr },
      { accessName: 'observacoes', dbName: 'observacoes', transform: toStr },
    ],
    references: [
      { dbColumn: 'inscricao_produtor_id', sourceColumn: 'inscricao_ie', lookupTable: 'inscricoes_produtor', lookupColumn: 'inscricao_estadual' },
      { dbColumn: 'safra_id', sourceColumn: 'safra_codigo', lookupTable: 'safras', lookupColumn: 'codigo', lookupLabel: 'nome' },
      { dbColumn: 'lavoura_id', sourceColumn: 'lavoura_codigo', lookupTable: 'lavouras', lookupColumn: 'codigo', lookupLabel: 'nome' },
      { dbColumn: 'silo_id', sourceColumn: 'silo_codigo', lookupTable: 'silos', lookupColumn: 'codigo', lookupLabel: 'nome' },
      { dbColumn: 'variedade_id', sourceColumn: 'produto_codigo', lookupTable: 'produtos', lookupColumn: 'codigo', lookupLabel: 'nome' },
      { dbColumn: 'placa_id', sourceColumn: 'placa', lookupTable: 'placas', lookupColumn: 'placa', lookupLabel: 'placa' },
    ],
  },
  {
    key: 'contratos',
    label: 'Contratos de Venda',
    tableName: 'contratos_venda',
    description: 'Contratos de venda de produção',
    order: 13,
    dependsOn: ['safras', 'granjas', 'inscricoes', 'clientes', 'produtos'],
    columns: [
      { accessName: 'numero', dbName: 'numero', required: true, transform: toInt },
      { accessName: 'data_contrato', dbName: 'data_contrato', required: true, transform: toDate },
      { accessName: 'quantidade_kg', dbName: 'quantidade_kg', transform: toNumber },
      { accessName: 'quantidade_sacos', dbName: 'quantidade_sacos', transform: toNumber },
      { accessName: 'preco_kg', dbName: 'preco_kg', transform: toNumber },
      { accessName: 'valor_total', dbName: 'valor_total', transform: toNumber },
      { accessName: 'modalidade_frete', dbName: 'modalidade_frete', transform: toInt },
      { accessName: 'venda_entrega_futura', dbName: 'venda_entrega_futura', transform: toBool },
      { accessName: 'a_fixar', dbName: 'a_fixar', transform: toBool },
      { accessName: 'fechada', dbName: 'fechada', transform: toBool },
      { accessName: 'exportacao', dbName: 'exportacao', transform: toBool },
      { accessName: 'observacoes', dbName: 'observacoes', transform: toStr },
      { accessName: 'tipo_venda', dbName: 'tipo_venda', transform: toStr },
      { accessName: 'corretor', dbName: 'corretor', transform: toStr },
      { accessName: 'numero_contrato_comprador', dbName: 'numero_contrato_comprador', transform: toStr },
    ],
    references: [
      { dbColumn: 'safra_id', sourceColumn: 'safra_codigo', lookupTable: 'safras', lookupColumn: 'codigo', lookupLabel: 'nome' },
      { dbColumn: 'granja_id', sourceColumn: 'granja_codigo', lookupTable: 'granjas', lookupColumn: 'codigo', lookupLabel: 'razao_social' },
      { dbColumn: 'inscricao_produtor_id', sourceColumn: 'inscricao_ie', lookupTable: 'inscricoes_produtor', lookupColumn: 'inscricao_estadual' },
      { dbColumn: 'comprador_id', sourceColumn: 'comprador_codigo', lookupTable: 'clientes_fornecedores', lookupColumn: 'codigo', lookupLabel: 'nome' },
      { dbColumn: 'produto_id', sourceColumn: 'produto_codigo', lookupTable: 'produtos', lookupColumn: 'codigo', lookupLabel: 'nome' },
    ],
  },
  {
    key: 'transferencias',
    label: 'Transferências',
    tableName: 'transferencias_deposito',
    description: 'Transferências entre depósitos',
    order: 15,
    dependsOn: ['inscricoes', 'safras', 'produtos'],
    columns: [
      { accessName: 'codigo', dbName: 'codigo', transform: toInt },
      { accessName: 'data_transferencia', dbName: 'data_transferencia', transform: toDate },
      { accessName: 'quantidade_kg', dbName: 'quantidade_kg', transform: toNumber },
      { accessName: 'observacao', dbName: 'observacao', transform: toStr },
    ],
    references: [
      { dbColumn: 'inscricao_origem_id', sourceColumn: 'inscricao_origem_ie', lookupTable: 'inscricoes_produtor', lookupColumn: 'inscricao_estadual' },
      { dbColumn: 'inscricao_destino_id', sourceColumn: 'inscricao_destino_ie', lookupTable: 'inscricoes_produtor', lookupColumn: 'inscricao_estadual' },
      { dbColumn: 'safra_id', sourceColumn: 'safra_codigo', lookupTable: 'safras', lookupColumn: 'codigo', lookupLabel: 'nome' },
      { dbColumn: 'produto_id', sourceColumn: 'produto_codigo', lookupTable: 'produtos', lookupColumn: 'codigo', lookupLabel: 'nome' },
      { dbColumn: 'granja_id', sourceColumn: 'granja_codigo', lookupTable: 'granjas', lookupColumn: 'codigo', lookupLabel: 'razao_social' },
    ],
  },
  {
    key: 'devolucoes',
    label: 'Devoluções',
    tableName: 'devolucoes_deposito',
    description: 'Devoluções de depósito',
    order: 16,
    dependsOn: ['inscricoes', 'safras', 'produtos', 'granjas'],
    columns: [
      { accessName: 'codigo', dbName: 'codigo', transform: toInt },
      { accessName: 'data_devolucao', dbName: 'data_devolucao', transform: toDate },
      { accessName: 'quantidade_kg', dbName: 'quantidade_kg', transform: toNumber },
      { accessName: 'taxa_armazenagem', dbName: 'taxa_armazenagem', transform: toNumber },
      { accessName: 'kg_taxa_armazenagem', dbName: 'kg_taxa_armazenagem', transform: toNumber },
      { accessName: 'valor_unitario', dbName: 'valor_unitario', transform: toNumber },
      { accessName: 'valor_total', dbName: 'valor_total', transform: toNumber },
      { accessName: 'observacao', dbName: 'observacao', transform: toStr },
    ],
    references: [
      { dbColumn: 'inscricao_produtor_id', sourceColumn: 'inscricao_produtor_ie', lookupTable: 'inscricoes_produtor', lookupColumn: 'inscricao_estadual' },
      { dbColumn: 'inscricao_emitente_id', sourceColumn: 'inscricao_emitente_ie', lookupTable: 'inscricoes_produtor', lookupColumn: 'inscricao_estadual' },
      { dbColumn: 'safra_id', sourceColumn: 'safra_codigo', lookupTable: 'safras', lookupColumn: 'codigo', lookupLabel: 'nome' },
      { dbColumn: 'produto_id', sourceColumn: 'produto_codigo', lookupTable: 'produtos', lookupColumn: 'codigo', lookupLabel: 'nome' },
      { dbColumn: 'granja_id', sourceColumn: 'granja_codigo', lookupTable: 'granjas', lookupColumn: 'codigo', lookupLabel: 'razao_social' },
    ],
  },
  {
    key: 'notas_deposito',
    label: 'Notas de Depósito',
    tableName: 'notas_deposito_emitidas',
    description: 'Notas de depósito emitidas',
    order: 17,
    dependsOn: ['inscricoes', 'safras', 'produtos', 'granjas'],
    columns: [
      { accessName: 'codigo', dbName: 'codigo', transform: toInt },
      { accessName: 'data_emissao', dbName: 'data_emissao', transform: toDate },
      { accessName: 'quantidade_kg', dbName: 'quantidade_kg', transform: toNumber },
      { accessName: 'observacao', dbName: 'observacao', transform: toStr },
    ],
    references: [
      { dbColumn: 'inscricao_produtor_id', sourceColumn: 'inscricao_produtor_ie', lookupTable: 'inscricoes_produtor', lookupColumn: 'inscricao_estadual' },
      { dbColumn: 'inscricao_emitente_id', sourceColumn: 'inscricao_emitente_ie', lookupTable: 'inscricoes_produtor', lookupColumn: 'inscricao_estadual' },
      { dbColumn: 'safra_id', sourceColumn: 'safra_codigo', lookupTable: 'safras', lookupColumn: 'codigo', lookupLabel: 'nome' },
      { dbColumn: 'produto_id', sourceColumn: 'produto_codigo', lookupTable: 'produtos', lookupColumn: 'codigo', lookupLabel: 'nome' },
      { dbColumn: 'granja_id', sourceColumn: 'granja_codigo', lookupTable: 'granjas', lookupColumn: 'codigo', lookupLabel: 'razao_social' },
    ],
  },
];

// Resolve references: lookup legacy codes to UUIDs
export async function resolveReferences(
  references: ReferenceResolver[],
  rows: Record<string, any>[]
): Promise<{ resolved: Record<string, any>[]; errors: string[] }> {
  const errors: string[] = [];
  const lookupCache: Record<string, Record<string, string>> = {};

  // Build lookup caches
  for (const ref of references) {
    const cacheKey = `${ref.lookupTable}:${ref.lookupColumn}`;
    if (!lookupCache[cacheKey]) {
      const { data } = await supabase
        .from(ref.lookupTable as any)
        .select(`id, ${ref.lookupColumn}`);
      const cache: Record<string, string> = {};
      data?.forEach((item: any) => {
        const key = String(item[ref.lookupColumn] || '').trim();
        if (key) cache[key] = item.id;
      });
      lookupCache[cacheKey] = cache;
    }
  }

  const resolved = rows.map((row, idx) => {
    const newRow = { ...row };
    for (const ref of references) {
      const sourceValue = String(row[ref.sourceColumn] || '').trim();
      if (!sourceValue) {
        // FK is optional
        delete newRow[ref.sourceColumn];
        continue;
      }
      const cacheKey = `${ref.lookupTable}:${ref.lookupColumn}`;
      const uuid = lookupCache[cacheKey]?.[sourceValue];
      if (uuid) {
        newRow[ref.dbColumn] = uuid;
      } else {
        errors.push(`Linha ${idx + 1}: ${ref.lookupTable}.${ref.lookupColumn} = "${sourceValue}" não encontrado`);
      }
      delete newRow[ref.sourceColumn];
    }
    return newRow;
  });

  return { resolved, errors };
}

// Transform a row using column mappings
export function transformRow(
  row: Record<string, any>,
  columns: ColumnMapping[]
): { data: Record<string, any>; errors: string[] } {
  const data: Record<string, any> = {};
  const errors: string[] = [];

  for (const col of columns) {
    // Try multiple variations of the column name
    const value = row[col.accessName] ?? row[col.accessName.toUpperCase()] ?? row[col.accessName.toLowerCase()];
    const transformed = col.transform ? col.transform(value) : value;

    if (col.required && (transformed === null || transformed === undefined || transformed === '')) {
      errors.push(`Campo obrigatório "${col.accessName}" está vazio`);
    }

    if (transformed !== null && transformed !== undefined) {
      data[col.dbName] = transformed;
    }
  }

  // Also keep any columns that are used as reference source (they'll be resolved later)
  for (const key of Object.keys(row)) {
    const isMapping = columns.some(c => 
      c.accessName === key || c.accessName.toUpperCase() === key || c.accessName.toLowerCase() === key
    );
    if (!isMapping) {
      data[key] = row[key];
    }
  }

  return { data, errors };
}

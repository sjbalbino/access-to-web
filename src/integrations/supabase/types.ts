export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analises_solo: {
        Row: {
          calcio: number | null
          controle_lavoura_id: string
          created_at: string
          data_coleta: string | null
          fosforo: number | null
          id: string
          laboratorio: string | null
          magnesio: number | null
          materia_organica: number | null
          observacoes: string | null
          ph: number | null
          potassio: number | null
          updated_at: string
        }
        Insert: {
          calcio?: number | null
          controle_lavoura_id: string
          created_at?: string
          data_coleta?: string | null
          fosforo?: number | null
          id?: string
          laboratorio?: string | null
          magnesio?: number | null
          materia_organica?: number | null
          observacoes?: string | null
          ph?: number | null
          potassio?: number | null
          updated_at?: string
        }
        Update: {
          calcio?: number | null
          controle_lavoura_id?: string
          created_at?: string
          data_coleta?: string | null
          fosforo?: number | null
          id?: string
          laboratorio?: string | null
          magnesio?: number | null
          materia_organica?: number | null
          observacoes?: string | null
          ph?: number | null
          potassio?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analises_solo_controle_lavoura_id_fkey"
            columns: ["controle_lavoura_id"]
            isOneToOne: false
            referencedRelation: "controle_lavouras"
            referencedColumns: ["id"]
          },
        ]
      }
      aplicacoes: {
        Row: {
          aplicador: string | null
          area_aplicada: number | null
          condicao_climatica: string | null
          controle_lavoura_id: string | null
          created_at: string
          data_aplicacao: string | null
          dose_ha: number | null
          equipamento: string | null
          id: string
          lavoura_id: string
          observacoes: string | null
          plantio_id: string | null
          produto_id: string | null
          quantidade_total: number | null
          safra_id: string | null
          tipo: string
          unidade_medida_id: string | null
          updated_at: string
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          aplicador?: string | null
          area_aplicada?: number | null
          condicao_climatica?: string | null
          controle_lavoura_id?: string | null
          created_at?: string
          data_aplicacao?: string | null
          dose_ha?: number | null
          equipamento?: string | null
          id?: string
          lavoura_id: string
          observacoes?: string | null
          plantio_id?: string | null
          produto_id?: string | null
          quantidade_total?: number | null
          safra_id?: string | null
          tipo: string
          unidade_medida_id?: string | null
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          aplicador?: string | null
          area_aplicada?: number | null
          condicao_climatica?: string | null
          controle_lavoura_id?: string | null
          created_at?: string
          data_aplicacao?: string | null
          dose_ha?: number | null
          equipamento?: string | null
          id?: string
          lavoura_id?: string
          observacoes?: string | null
          plantio_id?: string | null
          produto_id?: string | null
          quantidade_total?: number | null
          safra_id?: string | null
          tipo?: string
          unidade_medida_id?: string | null
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aplicacoes_controle_lavoura_id_fkey"
            columns: ["controle_lavoura_id"]
            isOneToOne: false
            referencedRelation: "controle_lavouras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacoes_lavoura_id_fkey"
            columns: ["lavoura_id"]
            isOneToOne: false
            referencedRelation: "lavouras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacoes_plantio_id_fkey"
            columns: ["plantio_id"]
            isOneToOne: false
            referencedRelation: "plantios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacoes_safra_id_fkey"
            columns: ["safra_id"]
            isOneToOne: false
            referencedRelation: "safras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacoes_unidade_medida_id_fkey"
            columns: ["unidade_medida_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
        ]
      }
      chuvas: {
        Row: {
          controle_lavoura_id: string
          created_at: string
          data_chuva: string | null
          duracao_horas: number | null
          id: string
          observacoes: string | null
          quantidade_mm: number | null
          updated_at: string
        }
        Insert: {
          controle_lavoura_id: string
          created_at?: string
          data_chuva?: string | null
          duracao_horas?: number | null
          id?: string
          observacoes?: string | null
          quantidade_mm?: number | null
          updated_at?: string
        }
        Update: {
          controle_lavoura_id?: string
          created_at?: string
          data_chuva?: string | null
          duracao_horas?: number | null
          id?: string
          observacoes?: string | null
          quantidade_mm?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chuvas_controle_lavoura_id_fkey"
            columns: ["controle_lavoura_id"]
            isOneToOne: false
            referencedRelation: "controle_lavouras"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_fornecedores: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          codigo: string | null
          complemento: string | null
          contato: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          granja_id: string | null
          id: string
          inscricao_estadual: string | null
          logradouro: string | null
          nome: string
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          telefone: string | null
          tipo: string
          tipo_pessoa: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          codigo?: string | null
          complemento?: string | null
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          granja_id?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome: string
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          telefone?: string | null
          tipo?: string
          tipo_pessoa?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          codigo?: string | null
          complemento?: string | null
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          granja_id?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome?: string
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          telefone?: string | null
          tipo?: string
          tipo_pessoa?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_fornecedores_empresa_id_fkey"
            columns: ["granja_id"]
            isOneToOne: false
            referencedRelation: "granjas"
            referencedColumns: ["id"]
          },
        ]
      }
      colheitas: {
        Row: {
          area_colhida: number | null
          controle_lavoura_id: string | null
          created_at: string
          data_colheita: string | null
          id: string
          impureza: number | null
          inscricao_produtor_id: string | null
          kg_avariados: number | null
          kg_desconto_total: number | null
          kg_impureza: number | null
          kg_outros: number | null
          kg_umidade: number | null
          lavoura_id: string
          local_entrega_terceiro_id: string | null
          motorista: string | null
          observacoes: string | null
          percentual_avariados: number | null
          percentual_desconto: number | null
          percentual_outros: number | null
          peso_bruto: number | null
          peso_tara: number | null
          ph: number | null
          placa_id: string | null
          producao_kg: number | null
          producao_liquida_kg: number | null
          produtividade_sacas_ha: number | null
          safra_id: string | null
          silo_id: string | null
          tipo_colheita: string | null
          total_sacos: number | null
          umidade: number | null
          updated_at: string
          variedade_id: string | null
        }
        Insert: {
          area_colhida?: number | null
          controle_lavoura_id?: string | null
          created_at?: string
          data_colheita?: string | null
          id?: string
          impureza?: number | null
          inscricao_produtor_id?: string | null
          kg_avariados?: number | null
          kg_desconto_total?: number | null
          kg_impureza?: number | null
          kg_outros?: number | null
          kg_umidade?: number | null
          lavoura_id: string
          local_entrega_terceiro_id?: string | null
          motorista?: string | null
          observacoes?: string | null
          percentual_avariados?: number | null
          percentual_desconto?: number | null
          percentual_outros?: number | null
          peso_bruto?: number | null
          peso_tara?: number | null
          ph?: number | null
          placa_id?: string | null
          producao_kg?: number | null
          producao_liquida_kg?: number | null
          produtividade_sacas_ha?: number | null
          safra_id?: string | null
          silo_id?: string | null
          tipo_colheita?: string | null
          total_sacos?: number | null
          umidade?: number | null
          updated_at?: string
          variedade_id?: string | null
        }
        Update: {
          area_colhida?: number | null
          controle_lavoura_id?: string | null
          created_at?: string
          data_colheita?: string | null
          id?: string
          impureza?: number | null
          inscricao_produtor_id?: string | null
          kg_avariados?: number | null
          kg_desconto_total?: number | null
          kg_impureza?: number | null
          kg_outros?: number | null
          kg_umidade?: number | null
          lavoura_id?: string
          local_entrega_terceiro_id?: string | null
          motorista?: string | null
          observacoes?: string | null
          percentual_avariados?: number | null
          percentual_desconto?: number | null
          percentual_outros?: number | null
          peso_bruto?: number | null
          peso_tara?: number | null
          ph?: number | null
          placa_id?: string | null
          producao_kg?: number | null
          producao_liquida_kg?: number | null
          produtividade_sacas_ha?: number | null
          safra_id?: string | null
          silo_id?: string | null
          tipo_colheita?: string | null
          total_sacos?: number | null
          umidade?: number | null
          updated_at?: string
          variedade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colheitas_controle_lavoura_id_fkey"
            columns: ["controle_lavoura_id"]
            isOneToOne: false
            referencedRelation: "controle_lavouras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colheitas_inscricao_produtor_id_fkey"
            columns: ["inscricao_produtor_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_produtor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colheitas_lavoura_id_fkey"
            columns: ["lavoura_id"]
            isOneToOne: false
            referencedRelation: "lavouras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colheitas_local_entrega_terceiro_id_fkey"
            columns: ["local_entrega_terceiro_id"]
            isOneToOne: false
            referencedRelation: "clientes_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colheitas_placa_id_fkey"
            columns: ["placa_id"]
            isOneToOne: false
            referencedRelation: "placas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colheitas_safra_id_fkey"
            columns: ["safra_id"]
            isOneToOne: false
            referencedRelation: "safras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colheitas_silo_id_fkey"
            columns: ["silo_id"]
            isOneToOne: false
            referencedRelation: "silos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colheitas_variedade_id_fkey"
            columns: ["variedade_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      controle_lavouras: {
        Row: {
          area_total: number | null
          cobertura_solo: string | null
          created_at: string
          ha_plantado: number | null
          id: string
          lavoura_id: string
          safra_id: string
          updated_at: string
        }
        Insert: {
          area_total?: number | null
          cobertura_solo?: string | null
          created_at?: string
          ha_plantado?: number | null
          id?: string
          lavoura_id: string
          safra_id: string
          updated_at?: string
        }
        Update: {
          area_total?: number | null
          cobertura_solo?: string | null
          created_at?: string
          ha_plantado?: number | null
          id?: string
          lavoura_id?: string
          safra_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "controle_lavouras_lavoura_id_fkey"
            columns: ["lavoura_id"]
            isOneToOne: false
            referencedRelation: "lavouras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controle_lavouras_safra_id_fkey"
            columns: ["safra_id"]
            isOneToOne: false
            referencedRelation: "safras"
            referencedColumns: ["id"]
          },
        ]
      }
      culturas: {
        Row: {
          ativa: boolean | null
          codigo: string | null
          created_at: string
          id: string
          informar_ph: boolean | null
          nome: string
          peso_saco_industria: number | null
          peso_saco_semente: number | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean | null
          codigo?: string | null
          created_at?: string
          id?: string
          informar_ph?: boolean | null
          nome: string
          peso_saco_industria?: number | null
          peso_saco_semente?: number | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean | null
          codigo?: string | null
          created_at?: string
          id?: string
          informar_ph?: boolean | null
          nome?: string
          peso_saco_industria?: number | null
          peso_saco_semente?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      estoque_produtos: {
        Row: {
          created_at: string | null
          custo_unitario: number | null
          data_validade: string | null
          granja_id: string
          id: string
          localizacao: string | null
          lote: string | null
          produto_id: string
          quantidade: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custo_unitario?: number | null
          data_validade?: string | null
          granja_id: string
          id?: string
          localizacao?: string | null
          lote?: string | null
          produto_id: string
          quantidade?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custo_unitario?: number | null
          data_validade?: string | null
          granja_id?: string
          id?: string
          localizacao?: string | null
          lote?: string | null
          produto_id?: string
          quantidade?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_produtos_granja_id_fkey"
            columns: ["granja_id"]
            isOneToOne: false
            referencedRelation: "granjas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      floracoes: {
        Row: {
          controle_lavoura_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          observacoes: string | null
          percentual_floracao: number | null
          updated_at: string
        }
        Insert: {
          controle_lavoura_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          observacoes?: string | null
          percentual_floracao?: number | null
          updated_at?: string
        }
        Update: {
          controle_lavoura_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          observacoes?: string | null
          percentual_floracao?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "floracoes_controle_lavoura_id_fkey"
            columns: ["controle_lavoura_id"]
            isOneToOne: false
            referencedRelation: "controle_lavouras"
            referencedColumns: ["id"]
          },
        ]
      }
      granjas: {
        Row: {
          ativa: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          codigo: string | null
          complemento: string | null
          created_at: string
          email: string | null
          id: string
          inscricao_estadual: string | null
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          razao_social: string
          telefone: string | null
          tenant_id: string | null
          total_hectares: number | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social: string
          telefone?: string | null
          tenant_id?: string | null
          total_hectares?: number | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string
          telefone?: string | null
          tenant_id?: string | null
          total_hectares?: number | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "granjas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_produtos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inscricoes_produtor: {
        Row: {
          ativa: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          granja: string | null
          granja_id: string | null
          id: string
          inscricao_estadual: string | null
          logradouro: string | null
          numero: string | null
          produtor_id: string | null
          telefone: string | null
          tipo: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          granja?: string | null
          granja_id?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          numero?: string | null
          produtor_id?: string | null
          telefone?: string | null
          tipo?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          granja?: string | null
          granja_id?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          numero?: string | null
          produtor_id?: string | null
          telefone?: string | null
          tipo?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_produtor_empresa_id_fkey"
            columns: ["granja_id"]
            isOneToOne: false
            referencedRelation: "granjas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_produtor_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "produtores"
            referencedColumns: ["id"]
          },
        ]
      }
      insetos: {
        Row: {
          area_afetada: number | null
          controle_lavoura_id: string
          created_at: string
          data_registro: string | null
          id: string
          nivel_infestacao: string | null
          observacoes: string | null
          tipo_inseto: string | null
          updated_at: string
        }
        Insert: {
          area_afetada?: number | null
          controle_lavoura_id: string
          created_at?: string
          data_registro?: string | null
          id?: string
          nivel_infestacao?: string | null
          observacoes?: string | null
          tipo_inseto?: string | null
          updated_at?: string
        }
        Update: {
          area_afetada?: number | null
          controle_lavoura_id?: string
          created_at?: string
          data_registro?: string | null
          id?: string
          nivel_infestacao?: string | null
          observacoes?: string | null
          tipo_inseto?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insetos_controle_lavoura_id_fkey"
            columns: ["controle_lavoura_id"]
            isOneToOne: false
            referencedRelation: "controle_lavouras"
            referencedColumns: ["id"]
          },
        ]
      }
      lavouras: {
        Row: {
          area_nao_aproveitavel: number | null
          area_plantio: number | null
          ativa: boolean | null
          codigo: string | null
          created_at: string
          granja_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          observacoes: string | null
          total_hectares: number | null
          updated_at: string
        }
        Insert: {
          area_nao_aproveitavel?: number | null
          area_plantio?: number | null
          ativa?: boolean | null
          codigo?: string | null
          created_at?: string
          granja_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          observacoes?: string | null
          total_hectares?: number | null
          updated_at?: string
        }
        Update: {
          area_nao_aproveitavel?: number | null
          area_plantio?: number | null
          ativa?: boolean | null
          codigo?: string | null
          created_at?: string
          granja_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          observacoes?: string | null
          total_hectares?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lavouras_empresa_id_fkey"
            columns: ["granja_id"]
            isOneToOne: false
            referencedRelation: "granjas"
            referencedColumns: ["id"]
          },
        ]
      }
      ncm: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string
          descricao: string
          id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pivos: {
        Row: {
          controle_lavoura_id: string
          created_at: string
          data_irrigacao: string | null
          duracao_horas: number | null
          energia_kwh: number | null
          id: string
          lamina_mm: number | null
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          controle_lavoura_id: string
          created_at?: string
          data_irrigacao?: string | null
          duracao_horas?: number | null
          energia_kwh?: number | null
          id?: string
          lamina_mm?: number | null
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          controle_lavoura_id?: string
          created_at?: string
          data_irrigacao?: string | null
          duracao_horas?: number | null
          energia_kwh?: number | null
          id?: string
          lamina_mm?: number | null
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pivos_controle_lavoura_id_fkey"
            columns: ["controle_lavoura_id"]
            isOneToOne: false
            referencedRelation: "controle_lavouras"
            referencedColumns: ["id"]
          },
        ]
      }
      placas: {
        Row: {
          ano: number | null
          ativa: boolean | null
          capacidade_kg: number | null
          cor: string | null
          created_at: string
          granja_id: string | null
          id: string
          marca: string | null
          modelo: string | null
          observacoes: string | null
          placa: string
          proprietario: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ano?: number | null
          ativa?: boolean | null
          capacidade_kg?: number | null
          cor?: string | null
          created_at?: string
          granja_id?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          placa: string
          proprietario?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number | null
          ativa?: boolean | null
          capacidade_kg?: number | null
          cor?: string | null
          created_at?: string
          granja_id?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          placa?: string
          proprietario?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "placas_empresa_id_fkey"
            columns: ["granja_id"]
            isOneToOne: false
            referencedRelation: "granjas"
            referencedColumns: ["id"]
          },
        ]
      }
      plantas_invasoras: {
        Row: {
          area_afetada: number | null
          controle_lavoura_id: string
          created_at: string
          data_registro: string | null
          id: string
          nivel_infestacao: string | null
          observacoes: string | null
          tipo_planta: string | null
          updated_at: string
        }
        Insert: {
          area_afetada?: number | null
          controle_lavoura_id: string
          created_at?: string
          data_registro?: string | null
          id?: string
          nivel_infestacao?: string | null
          observacoes?: string | null
          tipo_planta?: string | null
          updated_at?: string
        }
        Update: {
          area_afetada?: number | null
          controle_lavoura_id?: string
          created_at?: string
          data_registro?: string | null
          id?: string
          nivel_infestacao?: string | null
          observacoes?: string | null
          tipo_planta?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantas_invasoras_controle_lavoura_id_fkey"
            columns: ["controle_lavoura_id"]
            isOneToOne: false
            referencedRelation: "controle_lavouras"
            referencedColumns: ["id"]
          },
        ]
      }
      plantios: {
        Row: {
          area_plantada: number | null
          controle_lavoura_id: string | null
          created_at: string
          cultura_id: string | null
          data_plantio: string | null
          espacamento_linha: number | null
          id: string
          lavoura_id: string
          observacoes: string | null
          populacao_ha: number | null
          quantidade_semente: number | null
          safra_id: string | null
          updated_at: string
          valor_total: number | null
          valor_unitario: number | null
          variedade_id: string | null
        }
        Insert: {
          area_plantada?: number | null
          controle_lavoura_id?: string | null
          created_at?: string
          cultura_id?: string | null
          data_plantio?: string | null
          espacamento_linha?: number | null
          id?: string
          lavoura_id: string
          observacoes?: string | null
          populacao_ha?: number | null
          quantidade_semente?: number | null
          safra_id?: string | null
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
          variedade_id?: string | null
        }
        Update: {
          area_plantada?: number | null
          controle_lavoura_id?: string | null
          created_at?: string
          cultura_id?: string | null
          data_plantio?: string | null
          espacamento_linha?: number | null
          id?: string
          lavoura_id?: string
          observacoes?: string | null
          populacao_ha?: number | null
          quantidade_semente?: number | null
          safra_id?: string | null
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
          variedade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantios_controle_lavoura_id_fkey"
            columns: ["controle_lavoura_id"]
            isOneToOne: false
            referencedRelation: "controle_lavouras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantios_cultura_id_fkey"
            columns: ["cultura_id"]
            isOneToOne: false
            referencedRelation: "culturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantios_lavoura_id_fkey"
            columns: ["lavoura_id"]
            isOneToOne: false
            referencedRelation: "lavouras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantios_safra_id_fkey"
            columns: ["safra_id"]
            isOneToOne: false
            referencedRelation: "safras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantios_variedade_id_fkey"
            columns: ["variedade_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtores: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          codigo: string | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          granja_id: string | null
          id: string
          identidade: string | null
          logradouro: string | null
          nome: string
          numero: string | null
          telefone: string | null
          tipo_pessoa: string | null
          tipo_produtor: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          codigo?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          granja_id?: string | null
          id?: string
          identidade?: string | null
          logradouro?: string | null
          nome: string
          numero?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          tipo_produtor?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          codigo?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          granja_id?: string | null
          id?: string
          identidade?: string | null
          logradouro?: string | null
          nome?: string
          numero?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          tipo_produtor?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtores_empresa_id_fkey"
            columns: ["granja_id"]
            isOneToOne: false
            referencedRelation: "granjas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          artigo_nfe: string | null
          ativo: boolean | null
          cod_fornecedor: string | null
          codigo: string | null
          codigo_barras: string | null
          created_at: string
          cst_cofins: string | null
          cst_icms: string | null
          cst_ipi: string | null
          cst_pis: string | null
          descricao: string | null
          estoque_atual: number | null
          estoque_maximo: number | null
          estoque_minimo: number | null
          fornecedor_id: string | null
          granja_id: string | null
          grupo: string | null
          grupo_id: string | null
          id: string
          natureza_receita: string | null
          ncm: string | null
          nome: string
          observacao_tributaria: string | null
          peso_saco: number | null
          preco_custo: number | null
          preco_prazo: number | null
          preco_venda: number | null
          produto_residuo_id: string | null
          qtd_venda: number | null
          tempo_maximo: number | null
          tipo: string
          unidade_medida_id: string | null
          updated_at: string
        }
        Insert: {
          artigo_nfe?: string | null
          ativo?: boolean | null
          cod_fornecedor?: string | null
          codigo?: string | null
          codigo_barras?: string | null
          created_at?: string
          cst_cofins?: string | null
          cst_icms?: string | null
          cst_ipi?: string | null
          cst_pis?: string | null
          descricao?: string | null
          estoque_atual?: number | null
          estoque_maximo?: number | null
          estoque_minimo?: number | null
          fornecedor_id?: string | null
          granja_id?: string | null
          grupo?: string | null
          grupo_id?: string | null
          id?: string
          natureza_receita?: string | null
          ncm?: string | null
          nome: string
          observacao_tributaria?: string | null
          peso_saco?: number | null
          preco_custo?: number | null
          preco_prazo?: number | null
          preco_venda?: number | null
          produto_residuo_id?: string | null
          qtd_venda?: number | null
          tempo_maximo?: number | null
          tipo?: string
          unidade_medida_id?: string | null
          updated_at?: string
        }
        Update: {
          artigo_nfe?: string | null
          ativo?: boolean | null
          cod_fornecedor?: string | null
          codigo?: string | null
          codigo_barras?: string | null
          created_at?: string
          cst_cofins?: string | null
          cst_icms?: string | null
          cst_ipi?: string | null
          cst_pis?: string | null
          descricao?: string | null
          estoque_atual?: number | null
          estoque_maximo?: number | null
          estoque_minimo?: number | null
          fornecedor_id?: string | null
          granja_id?: string | null
          grupo?: string | null
          grupo_id?: string | null
          id?: string
          natureza_receita?: string | null
          ncm?: string | null
          nome?: string
          observacao_tributaria?: string | null
          peso_saco?: number | null
          preco_custo?: number | null
          preco_prazo?: number | null
          preco_venda?: number | null
          produto_residuo_id?: string | null
          qtd_venda?: number | null
          tempo_maximo?: number | null
          tipo?: string
          unidade_medida_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["granja_id"]
            isOneToOne: false
            referencedRelation: "granjas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "clientes_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_produto_residuo_id_fkey"
            columns: ["produto_residuo_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_unidade_medida_id_fkey"
            columns: ["unidade_medida_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      safras: {
        Row: {
          ano_colheita: number | null
          codigo: string | null
          created_at: string
          cultura_id: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          nome: string
          status: string | null
          updated_at: string
        }
        Insert: {
          ano_colheita?: number | null
          codigo?: string | null
          created_at?: string
          cultura_id?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          ano_colheita?: number | null
          codigo?: string | null
          created_at?: string
          cultura_id?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safras_cultura_id_fkey"
            columns: ["cultura_id"]
            isOneToOne: false
            referencedRelation: "culturas"
            referencedColumns: ["id"]
          },
        ]
      }
      silos: {
        Row: {
          ativo: boolean | null
          capacidade_kg: number | null
          capacidade_sacas: number | null
          codigo: string | null
          created_at: string
          granja_id: string | null
          id: string
          localizacao: string | null
          nome: string
          observacoes: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          capacidade_kg?: number | null
          capacidade_sacas?: number | null
          codigo?: string | null
          created_at?: string
          granja_id?: string | null
          id?: string
          localizacao?: string | null
          nome: string
          observacoes?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          capacidade_kg?: number | null
          capacidade_sacas?: number | null
          codigo?: string | null
          created_at?: string
          granja_id?: string | null
          id?: string
          localizacao?: string | null
          nome?: string
          observacoes?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "silos_empresa_id_fkey"
            columns: ["granja_id"]
            isOneToOne: false
            referencedRelation: "granjas"
            referencedColumns: ["id"]
          },
        ]
      }
      tabela_umidades: {
        Row: {
          ativa: boolean | null
          created_at: string
          cultura_id: string | null
          desconto_percentual: number | null
          id: string
          melhoria_ph: number | null
          observacoes: string | null
          umidade_maxima: number
          umidade_minima: number
          updated_at: string
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string
          cultura_id?: string | null
          desconto_percentual?: number | null
          id?: string
          melhoria_ph?: number | null
          observacoes?: string | null
          umidade_maxima: number
          umidade_minima: number
          updated_at?: string
        }
        Update: {
          ativa?: boolean | null
          created_at?: string
          cultura_id?: string | null
          desconto_percentual?: number | null
          id?: string
          melhoria_ph?: number | null
          observacoes?: string | null
          umidade_maxima?: number
          umidade_minima?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tabela_umidades_cultura_id_fkey"
            columns: ["cultura_id"]
            isOneToOne: false
            referencedRelation: "culturas"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          codigo: string | null
          complemento: string | null
          created_at: string
          email: string | null
          id: string
          inscricao_estadual: string | null
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          razao_social: string
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      unidades_medida: {
        Row: {
          ativa: boolean | null
          codigo: string
          created_at: string
          descricao: string
          id: string
          sigla: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean | null
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          sigla?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean | null
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          sigla?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit: { Args: { _user_id: string }; Returns: boolean }
      get_user_tenant_id: { Args: never; Returns: string }
      granja_belongs_to_tenant: {
        Args: { _granja_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "operador" | "visualizador" | "gerente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operador", "visualizador", "gerente"],
    },
  },
} as const

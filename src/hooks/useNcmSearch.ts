import { useState } from 'react';

export interface NcmResult {
  codigo: string;
  descricao: string;
}

// Lista de NCMs mais comuns para produtos agrícolas
const NCM_AGRICOLA: NcmResult[] = [
  { codigo: '10011100', descricao: 'Trigo duro para semeadura' },
  { codigo: '10011900', descricao: 'Outros trigos duros' },
  { codigo: '10019100', descricao: 'Trigo para semeadura' },
  { codigo: '10019900', descricao: 'Outros trigos' },
  { codigo: '10051000', descricao: 'Milho para semeadura' },
  { codigo: '10059010', descricao: 'Milho em grão' },
  { codigo: '12010010', descricao: 'Soja para semeadura' },
  { codigo: '12010090', descricao: 'Soja, mesmo triturada' },
  { codigo: '12019000', descricao: 'Soja, mesmo triturada, exceto para semeadura' },
  { codigo: '10063021', descricao: 'Arroz beneficiado' },
  { codigo: '10063011', descricao: 'Arroz parboilizado' },
  { codigo: '10061010', descricao: 'Arroz para semeadura' },
  { codigo: '07131090', descricao: 'Feijões secos' },
  { codigo: '09011110', descricao: 'Café não torrado, não descafeinado' },
  { codigo: '17011400', descricao: 'Açúcar de cana' },
  { codigo: '15071000', descricao: 'Óleo de soja bruto' },
  { codigo: '23040010', descricao: 'Farelo de soja' },
  { codigo: '31021010', descricao: 'Ureia' },
  { codigo: '31031010', descricao: 'Superfosfato simples' },
  { codigo: '31042010', descricao: 'Cloreto de potássio' },
  { codigo: '31052000', descricao: 'Adubos com NPK' },
  { codigo: '38089110', descricao: 'Inseticidas' },
  { codigo: '38089210', descricao: 'Fungicidas' },
  { codigo: '38089310', descricao: 'Herbicidas' },
  { codigo: '38089410', descricao: 'Desinfetantes' },
  { codigo: '27101259', descricao: 'Óleo diesel' },
  { codigo: '27101921', descricao: 'Lubrificantes' },
  { codigo: '87019490', descricao: 'Tratores agrícolas' },
  { codigo: '84329000', descricao: 'Peças para máquinas agrícolas' },
  { codigo: '84331100', descricao: 'Cortadores de grama' },
  { codigo: '84335100', descricao: 'Colheitadeiras' },
  { codigo: '84322100', descricao: 'Grades de disco' },
  { codigo: '84321000', descricao: 'Arados' },
  { codigo: '84248110', descricao: 'Pulverizadores agrícolas' },
  { codigo: '40169300', descricao: 'Juntas de borracha' },
  { codigo: '84139100', descricao: 'Peças para bombas' },
  { codigo: '84314990', descricao: 'Peças para tratores' },
];

export function useNcmSearch() {
  const [results, setResults] = useState<NcmResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchNcm = async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    try {
      // Busca local nos NCMs agrícolas
      const searchLower = query.toLowerCase();
      const filtered = NCM_AGRICOLA.filter(
        ncm => 
          ncm.codigo.includes(query) || 
          ncm.descricao.toLowerCase().includes(searchLower)
      );
      setResults(filtered.slice(0, 10));
    } finally {
      setIsLoading(false);
    }
  };

  return { results, isLoading, searchNcm };
}

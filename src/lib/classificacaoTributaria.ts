/**
 * Códigos de Classificação Tributária (cClassTrib) para IBS e CBS
 * Conforme NT 2025.002 - Reforma Tributária do Consumo
 * Fonte: Portal da Conformidade Fácil (SEFAZ)
 */

export interface ClassificacaoTributaria {
  value: string;
  label: string;
  cst: string;
  descricao: string;
}

export const CLASSIFICACAO_TRIBUTARIA: ClassificacaoTributaria[] = [
  // CST 000 - Tributação integral
  { value: '000001', label: '000001 - Situações tributadas integralmente pelo IBS e CBS', cst: '000', descricao: 'Situações tributadas integralmente pelo IBS e CBS' },
  { value: '000002', label: '000002 - Exploração de via', cst: '000', descricao: 'Exploração de via' },
  { value: '000003', label: '000003 - Projetos incentivados (art. 311)', cst: '000', descricao: 'Projetos incentivados (art. 311)' },
  { value: '000004', label: '000004 - Projetos incentivados (art. 312)', cst: '000', descricao: 'Projetos incentivados (art. 312)' },
  
  // CST 010 - Regimes especiais
  { value: '010001', label: '010001 - Operações do FGTS não realizadas pela CEF', cst: '010', descricao: 'Operações do FGTS não realizadas pela CEF' },
  { value: '010002', label: '010002 - Operações do serviço financeiro', cst: '010', descricao: 'Operações do serviço financeiro' },
  
  // CST 011 - Regimes especiais com redução
  { value: '011001', label: '011001 - Planos de assistência funerária', cst: '011', descricao: 'Planos de assistência funerária' },
  { value: '011002', label: '011002 - Planos de assistência à saúde', cst: '011', descricao: 'Planos de assistência à saúde' },
  { value: '011003', label: '011003 - Intermediação de planos de assistência à saúde', cst: '011', descricao: 'Intermediação de planos de assistência à saúde' },
  { value: '011004', label: '011004 - Concursos e prognósticos', cst: '011', descricao: 'Concursos e prognósticos' },
  { value: '011005', label: '011005 - Planos de assistência à saúde de animais domésticos', cst: '011', descricao: 'Planos de assistência à saúde de animais domésticos' },
  
  // CST 200 - Alíquota reduzida
  { value: '200001', label: '200001 - Aquisições em zonas de processamento de exportação', cst: '200', descricao: 'Aquisições realizadas entre empresas autorizadas a operar em zonas de processamento de exportação' },
  { value: '200002', label: '200002 - Fornecimento para produtor rural não contribuinte ou TAC', cst: '200', descricao: 'Fornecimento ou importação para produtor rural não contribuinte ou TAC' },
  { value: '200003', label: '200003 - Produtos alimentação humana (Anexo I)', cst: '200', descricao: 'Vendas de produtos destinados à alimentação humana (Anexo I)' },
  { value: '200004', label: '200004 - Dispositivos médicos (Anexo XII)', cst: '200', descricao: 'Venda de dispositivos médicos (Anexo XII)' },
  { value: '200005', label: '200005 - Dispositivos médicos adm. pública (Anexo IV)', cst: '200', descricao: 'Venda de dispositivos médicos adquiridos por órgãos da administração pública (Anexo IV)' },
  { value: '200006', label: '200006 - Emergência saúde pública (Anexo XII)', cst: '200', descricao: 'Situação de emergência de saúde pública reconhecida pelo Poder público (Anexo XII)' },
  { value: '200007', label: '200007 - Dispositivos acessibilidade PcD (Anexo XIII)', cst: '200', descricao: 'Fornecimento dos dispositivos de acessibilidade próprios para pessoas com deficiência (Anexo XIII)' },
  { value: '200008', label: '200008 - Dispositivos acessibilidade adm. pública (Anexo V)', cst: '200', descricao: 'Fornecimento dos dispositivos de acessibilidade próprios para pessoas com deficiência adquiridos por órgãos da administração pública (Anexo V)' },
  { value: '200009', label: '200009 - Medicamentos (Anexo XIV)', cst: '200', descricao: 'Fornecimento de medicamentos (Anexo XIV)' },
  { value: '200010', label: '200010 - Medicamentos Anvisa adm. pública', cst: '200', descricao: 'Fornecimento dos medicamentos registrados na Anvisa, adquiridos por órgãos da administração pública' },
  { value: '200011', label: '200011 - Nutrição enteral/parenteral adm. pública (Anexo VI)', cst: '200', descricao: 'Fornecimento das composições para nutrição enteral e parenteral quando adquiridas por órgãos da administração pública (Anexo VI)' },
  { value: '200012', label: '200012 - Emergência saúde pública (Anexo XIV)', cst: '200', descricao: 'Situação de emergência de saúde pública reconhecida pelo Poder público (Anexo XIV)' },
  { value: '200013', label: '200013 - Absorventes e tampões higiênicos', cst: '200', descricao: 'Fornecimento de tampões higiênicos, absorventes higiênicos internos ou externos' },
  { value: '200014', label: '200014 - Hortícolas, frutas e ovos (Anexo XV)', cst: '200', descricao: 'Fornecimento dos produtos hortícolas, frutas e ovos (Anexo XV)' },
  { value: '200015', label: '200015 - Automóveis motoristas profissionais/PcD', cst: '200', descricao: 'Venda de automóveis de passageiros de fabricação nacional adquiridos por motoristas profissionais ou pessoas com deficiência' },
  { value: '200016', label: '200016 - Pesquisa e desenvolvimento ICT', cst: '200', descricao: 'Prestação de serviços de pesquisa e desenvolvimento por Instituição Científica, Tecnológica e de Inovação (ICT)' },
  { value: '200017', label: '200017 - Operações relacionadas ao FGTS', cst: '200', descricao: 'Operações relacionadas ao FGTS' },
  { value: '200018', label: '200018 - Resseguro e retrocessão', cst: '200', descricao: 'Operações de resseguro e retrocessão' },
  { value: '200019', label: '200019 - Importador serviços financeiros contribuinte', cst: '200', descricao: 'Importador dos serviços financeiros contribuinte' },
  { value: '200020', label: '200020 - Cooperativas optantes regime específico', cst: '200', descricao: 'Operação praticada por sociedades cooperativas optantes por regime específico do IBS e CBS' },
  { value: '200021', label: '200021 - Transporte coletivo ferroviário/hidroviário', cst: '200', descricao: 'Serviços de transporte público coletivo de passageiros ferroviário e hidroviário' },
  { value: '200022', label: '200022 - Operação fora ZFM para ZFM', cst: '200', descricao: 'Operação originada fora da ZFM que destine' },
  { value: '200023', label: '200023 - Bem industrializado para contribuinte ZFM', cst: '200', descricao: 'Bem material industrializado a contribuinte estabelecido na ZFM' },
  { value: '200024', label: '200024 - Bem intermediário entre indústrias ZFM', cst: '200', descricao: 'Operação realizada por indústria incentivada que destine bem intermediário para outra indústria incentivada na ZFM' },
  { value: '200025', label: '200025 - Operação para Áreas de Livre Comércio', cst: '200', descricao: 'Operação originada fora das Áreas de Livre Comércio destinadas a contribuinte estabelecido nas Áreas de Livre Comércio' },
  { value: '200026', label: '200026 - Educação Prouni', cst: '200', descricao: 'Fornecimento dos serviços de educação relacionados ao Programa Universidade para Todos (Prouni)' },
  { value: '200027', label: '200027 - Locação imóveis zonas reabilitadas', cst: '200', descricao: 'Locação de imóveis localizados nas zonas reabilitadas' },
  { value: '200028', label: '200028 - Serviços de educação (Anexo II)', cst: '200', descricao: 'Fornecimento dos serviços de educação (Anexo II)' },
  { value: '200029', label: '200029 - Serviços de saúde humana (Anexo III)', cst: '200', descricao: 'Fornecimento dos serviços de saúde humana (Anexo III)' },
  { value: '200030', label: '200030 - Dispositivos médicos (Anexo IV)', cst: '200', descricao: 'Venda dos dispositivos médicos (Anexo IV)' },
  { value: '200031', label: '200031 - Acessibilidade PcD (Anexo V)', cst: '200', descricao: 'Fornecimento dos dispositivos de acessibilidade próprios para pessoas com deficiência (Anexo V)' },
  { value: '200032', label: '200032 - Medicamentos Anvisa e farmácias manipulação', cst: '200', descricao: 'Fornecimento dos medicamentos registrados na Anvisa ou produzidos por farmácias de manipulação' },
  { value: '200033', label: '200033 - Nutrição enteral/parenteral (Anexo VI)', cst: '200', descricao: 'Fornecimento das composições para nutrição enteral e parenteral (Anexo VI)' },
  { value: '200034', label: '200034 - Alimentos', cst: '200', descricao: 'Fornecimento dos alimentos' },
  { value: '200035', label: '200035 - Higiene pessoal e limpeza (Anexo VIII)', cst: '200', descricao: 'Fornecimento dos produtos de higiene pessoal e limpeza (Anexo VIII)' },
  { value: '200036', label: '200036 - Produtos agropecuários in natura', cst: '200', descricao: 'Fornecimento de produtos agropecuários, aquícolas, pesqueiros, florestais e extrativistas vegetais in natura' },
  { value: '200037', label: '200037 - Serviços ambientais vegetação nativa', cst: '200', descricao: 'Fornecimento de serviços ambientais de conservação ou recuperação da vegetação nativa' },
  { value: '200038', label: '200038 - Insumos agropecuários e aquícolas (Anexo IX)', cst: '200', descricao: 'Fornecimento dos insumos agropecuários e aquícolas (Anexo IX)' },
  { value: '200039', label: '200039 - Produções artísticas nacionais (Anexo X)', cst: '200', descricao: 'Fornecimento dos serviços e o licenciamento ou cessão dos direitos destinados às produções nacionais artísticas (Anexo X)' },
  { value: '200040', label: '200040 - Comunicação institucional adm. pública', cst: '200', descricao: 'Fornecimento de serviços de comunicação institucional à administração pública' },
  { value: '200041', label: '200041 - Educação desportiva (art. 141. I)', cst: '200', descricao: 'Fornecimento de serviço de educação desportiva (art. 141. I)' },
  { value: '200042', label: '200042 - Educação desportiva (art. 141. II)', cst: '200', descricao: 'Fornecimento de serviço de educação desportiva (art. 141. II)' },
  { value: '200043', label: '200043 - Soberania adm. pública (Anexo XI)', cst: '200', descricao: 'Fornecimento à administração pública dos serviços e dos bens relativos à soberania (Anexo XI)' },
  { value: '200044', label: '200044 - Segurança informação/cibernética (Anexo XI)', cst: '200', descricao: 'Operações e prestações de serviços de segurança da informação e segurança cibernética desenvolvidas por sociedade que tenha sócio brasileiro (Anexo XI)' },
  { value: '200045', label: '200045 - Reabilitação urbana zonas históricas', cst: '200', descricao: 'Operações relacionadas a projetos de reabilitação urbana de zonas históricas e de áreas críticas de recuperação' },
  { value: '200046', label: '200046 - Operações com bens imóveis', cst: '200', descricao: 'Operações com bens imóveis' },
  { value: '200047', label: '200047 - Bares e Restaurantes', cst: '200', descricao: 'Bares e Restaurantes' },
  { value: '200048', label: '200048 - Hotelaria, Parques de Diversão e Temáticos', cst: '200', descricao: 'Hotelaria, Parques de Diversão e Parques Temáticos' },
  { value: '200049', label: '200049 - Transporte coletivo rodoviário/ferroviário/hidroviário', cst: '200', descricao: 'Transporte coletivo de passageiros rodoviário, ferroviário e hidroviário' },
  { value: '200050', label: '200050 - Transporte aéreo regional', cst: '200', descricao: 'Serviços de transporte aéreo regional coletivo de passageiros ou de carga' },
  { value: '200051', label: '200051 - Agências de Turismo', cst: '200', descricao: 'Agências de Turismo' },
  { value: '200052', label: '200052 - Profissões intelectuais', cst: '200', descricao: 'Prestação de serviços de profissões intelectuais' },
  
  // CST 220 - Alíquota fixa
  { value: '220001', label: '220001 - Incorporação imobiliária regime especial', cst: '220', descricao: 'Incorporação imobiliária submetida ao regime especial de tributação' },
  { value: '220002', label: '220002 - Incorporação imobiliária regime especial', cst: '220', descricao: 'Incorporação imobiliária submetida ao regime especial de tributação' },
  { value: '220003', label: '220003 - Alienação imóvel parcelamento do solo', cst: '220', descricao: 'Alienação de imóvel decorrente de parcelamento do solo' },
  
  // CST 221 - Alíquota fixa proporcional
  { value: '221001', label: '221001 - Locação/arrendamento imóvel', cst: '221', descricao: 'Locação, cessão onerosa ou arrendamento de bem imóvel com alíquota sobre a receita bruta' },
  
  // CST 222 - Redução de Base de Cálculo
  { value: '222001', label: '222001 - Transporte internacional passageiros ida/volta', cst: '222', descricao: 'Transporte internacional de passageiros, caso os trechos de ida e volta sejam vendidos em conjunto' },
  
  // CST 400 - Isenção
  { value: '400001', label: '400001 - Transporte público coletivo rodoviário/metroviário', cst: '400', descricao: 'Fornecimento de serviços de transporte público coletivo de passageiros rodoviário e metroviário' },
  
  // CST 410 - Imunidade e não incidência
  { value: '410001', label: '410001 - Bonificações em documento fiscal', cst: '410', descricao: 'Fornecimento de bonificações quando constem no documento fiscal e que não dependam de evento posterior' },
  { value: '410002', label: '410002 - Transferências entre estabelecimentos', cst: '410', descricao: 'Transferências entre estabelecimentos pertencentes ao mesmo titular' },
  { value: '410003', label: '410003 - Doações sem contraprestação', cst: '410', descricao: 'Doações sem contraprestação em benefício do doador' },
  { value: '410004', label: '410004 - Exportações de bens e serviços', cst: '410', descricao: 'Exportações de bens e serviços' },
  { value: '410005', label: '410005 - Fornecimentos União/Estados/DF/Municípios', cst: '410', descricao: 'Fornecimentos realizados pela União, pelos Estados, pelo Distrito Federal e pelos Municípios' },
  { value: '410006', label: '410006 - Entidades religiosas e templos', cst: '410', descricao: 'Fornecimentos realizados por entidades religiosas e templos de qualquer culto' },
  { value: '410007', label: '410007 - Partidos políticos', cst: '410', descricao: 'Fornecimentos realizados por partidos políticos' },
  { value: '410008', label: '410008 - Livros, jornais, periódicos e papel', cst: '410', descricao: 'Fornecimentos de livros, jornais, periódicos e do papel destinado a sua impressão' },
  { value: '410009', label: '410009 - Fonogramas e videofonogramas nacionais', cst: '410', descricao: 'Fornecimentos de fonogramas e videofonogramas musicais produzidos no Brasil' },
  { value: '410010', label: '410010 - Radiodifusão recepção livre e gratuita', cst: '410', descricao: 'Fornecimentos de serviço de comunicação nas modalidades de radiodifusão sonora e de sons e imagens de recepção livre e gratuita' },
  { value: '410011', label: '410011 - Ouro ativo financeiro/cambial', cst: '410', descricao: 'Fornecimentos de ouro, quando definido em lei como ativo financeiro ou instrumento cambial' },
  { value: '410012', label: '410012 - Condomínio edilício não optante', cst: '410', descricao: 'Fornecimento de condomínio edilício não optante pelo regime regular' },
  { value: '410013', label: '410013 - Exportações de combustíveis', cst: '410', descricao: 'Exportações de combustíveis' },
  { value: '410014', label: '410014 - Produtor rural não contribuinte', cst: '410', descricao: 'Fornecimento de produtor rural não contribuinte' },
  { value: '410015', label: '410015 - Transportador autônomo não contribuinte', cst: '410', descricao: 'Fornecimento por transportador autônomo não contribuinte' },
  { value: '410016', label: '410016 - Resíduos sólidos', cst: '410', descricao: 'Fornecimento ou aquisição de resíduos sólidos' },
  { value: '410017', label: '410017 - Bem móvel crédito presumido revenda', cst: '410', descricao: 'Aquisição de bem móvel com crédito presumido sob condição de revenda realizada' },
  { value: '410018', label: '410018 - Fundos garantidores políticas públicas', cst: '410', descricao: 'Operações relacionadas aos fundos garantidores e executores de políticas públicas' },
  { value: '410019', label: '410019 - Exclusão gorjeta alimentação', cst: '410', descricao: 'Exclusão da gorjeta na base de cálculo no fornecimento de alimentação' },
  { value: '410020', label: '410020 - Exclusão valor intermediação alimentação', cst: '410', descricao: 'Exclusão do valor de intermediação na base de cálculo no fornecimento de alimentação' },
  { value: '410021', label: '410021 - Contribuição art. 149-A CF', cst: '410', descricao: 'Contribuição de que trata o art. 149-A da Constituição Federal' },
  { value: '410022', label: '410022 - Consolidação propriedade pelo credor', cst: '410', descricao: 'Consolidação da propriedade do bem pelo credor' },
  { value: '410023', label: '410023 - Alienação bens garantia não contribuinte', cst: '410', descricao: 'Alienação de bens móveis ou imóveis que tenham sido objeto de garantia em que o prestador da garantia não seja contribuinte' },
  { value: '410024', label: '410024 - Consolidação propriedade consórcio', cst: '410', descricao: 'Consolidação da propriedade do bem pelo grupo de consórcio' },
  { value: '410025', label: '410025 - Alienação bem garantia não contribuinte', cst: '410', descricao: 'Alienação de bem que tenha sido objeto de garantia em que o prestador da garantia não seja contribuinte' },
  { value: '410026', label: '410026 - Doação com anulação de crédito', cst: '410', descricao: 'Doação com anulação de crédito' },
  { value: '410027', label: '410027 - Exportação serviço/bem imaterial', cst: '410', descricao: 'Exportação de serviço ou de bem imaterial' },
  { value: '410028', label: '410028 - Bens imóveis por pessoa física não contribuinte', cst: '410', descricao: 'Operações com bens imóveis realizadas por pessoas físicas não consideradas contribuintes' },
  { value: '410029', label: '410029 - Operações somente ICMS', cst: '410', descricao: 'Operações acobertadas somente pelo ICMS' },
  { value: '410030', label: '410030 - Estorno crédito perecimento/roubo/furto', cst: '410', descricao: 'Estorno de crédito por perecimento, deteriorização, roubo, furto ou extravio' },
  { value: '410031', label: '410031 - Fornecimento antes vigência IBS/CBS', cst: '410', descricao: 'Fornecimento em período anterior ao início de vigência de incidências de CBS e IBS' },
  { value: '410999', label: '410999 - Outras operações não onerosas', cst: '410', descricao: 'Operações não onerosas sem previsão de tributação, não especificadas anteriormente' },
  
  // CST 510 - Diferimento
  { value: '510001', label: '510001 - Energia elétrica geração/distribuição', cst: '510', descricao: 'Operações, sujeitas a diferimento, com energia elétrica, relativas à geração, comercialização, distribuição e transmissão' },
  
  // CST 515 - Diferimento com redução de alíquota
  { value: '515001', label: '515001 - Insumos agropecuários e aquícolas (Anexo IX)', cst: '515', descricao: 'Insumos agropecuários e aquícolas (Anexo IX)' },
  
  // CST 550 - Suspensão
  { value: '550001', label: '550001 - Exportações de bens materiais', cst: '550', descricao: 'Exportações de bens materiais' },
  { value: '550002', label: '550002 - Regime de Trânsito', cst: '550', descricao: 'Regime de Trânsito' },
  { value: '550003', label: '550003 - Regimes de Depósito (art. 85)', cst: '550', descricao: 'Regimes de Depósito (art. 85)' },
  { value: '550004', label: '550004 - Regimes de Depósito (art. 87)', cst: '550', descricao: 'Regimes de Depósito (art. 87)' },
  { value: '550005', label: '550005 - Regimes de Depósito (art. 87, Parágrafo único)', cst: '550', descricao: 'Regimes de Depósito (art. 87, Parágrafo único)' },
  { value: '550006', label: '550006 - Regimes de Permanência Temporária', cst: '550', descricao: 'Regimes de Permanência Temporária' },
  { value: '550007', label: '550007 - Regimes de Aperfeiçoamento', cst: '550', descricao: 'Regimes de Aperfeiçoamento' },
  { value: '550008', label: '550008 - Repetro-Temporário', cst: '550', descricao: 'Importação de bens para o Regime de Repetro-Temporário' },
  { value: '550009', label: '550009 - GNL-Temporário', cst: '550', descricao: 'GNL-Temporário' },
  { value: '550010', label: '550010 - Repetro-Permanente', cst: '550', descricao: 'Repetro-Permanente' },
  { value: '550011', label: '550011 - Repetro-Industrialização', cst: '550', descricao: 'Repetro-Industrialização' },
  { value: '550012', label: '550012 - Repetro-Nacional', cst: '550', descricao: 'Repetro-Nacional' },
  { value: '550013', label: '550013 - Repetro-Entreposto', cst: '550', descricao: 'Repetro-Entreposto' },
  { value: '550014', label: '550014 - Zona de Processamento de Exportação', cst: '550', descricao: 'Zona de Processamento de Exportação' },
  { value: '550015', label: '550015 - REPORTO', cst: '550', descricao: 'Regime Tributário para Incentivo à Modernização e à Ampliação da Estrutura Portuária' },
  { value: '550016', label: '550016 - REIDI', cst: '550', descricao: 'Regime Especial de Incentivos para Desenvolvimento da Infraestrutura' },
  { value: '550017', label: '550017 - RETAERO', cst: '550', descricao: 'Regime Tributário para Incentivo à Atividade Econômica Naval' },
  { value: '550018', label: '550018 - Desoneração bens de capital', cst: '550', descricao: 'Desoneração da aquisição de bens de capital' },
  { value: '550019', label: '550019 - Importação bem material indústria ZFM', cst: '550', descricao: 'Importação de bem material por indústria incentivada para utilização na ZFM' },
  { value: '550020', label: '550020 - Áreas de livre comércio', cst: '550', descricao: 'Áreas de livre comércio' },
  { value: '550021', label: '550021 - Industrialização para exportação', cst: '550', descricao: 'Industrialização destinada a exportações' },
  
  // CST 620 - Tributação monofásica
  { value: '620001', label: '620001 - Tributação monofásica combustíveis', cst: '620', descricao: 'Tributação monofásica sobre combustíveis' },
  { value: '620002', label: '620002 - Monofásica com retenção combustíveis', cst: '620', descricao: 'Tributação monofásica com responsabilidade pela retenção sobre combustíveis' },
  { value: '620003', label: '620003 - Monofásica tributos retidos combustíveis', cst: '620', descricao: 'Tributação monofásica com tributos retidos por responsabilidade sobre combustíveis' },
  { value: '620004', label: '620004 - Monofásica EAC + gasolina superior', cst: '620', descricao: 'Tributação monofásica sobre mistura de EAC com gasolina A em percentual superior ao obrigatório' },
  { value: '620005', label: '620005 - Monofásica EAC + gasolina inferior', cst: '620', descricao: 'Tributação monofásica sobre mistura de EAC com gasolina A em percentual inferior ao obrigatório' },
  { value: '620006', label: '620006 - Monofásica combustíveis cobrada anteriormente', cst: '620', descricao: 'Tributação monofásica sobre combustíveis cobrada anteriormente' },
  
  // CST 800 - Transferência de crédito
  { value: '800001', label: '800001 - Fusão, cisão ou incorporação', cst: '800', descricao: 'Fusão, cisão ou incorporação' },
  { value: '800002', label: '800002 - Transferência crédito associado/cooperativas', cst: '800', descricao: 'Transferência de crédito do associado, inclusive as cooperativas singulares' },
  
  // CST 810 - Ajuste de IBS na ZFM
  { value: '810001', label: '810001 - Ajuste IBS ZFM fornecimentos', cst: '810', descricao: 'Ajuste de IBS na ZFM sobre o valor apurado nos fornecimentos a partir da ZFM' },
  
  // CST 811 - Anulação de crédito
  { value: '811001', label: '811001 - Anulação crédito saídas imunes/isentas', cst: '811', descricao: 'Anulação de Crédito por Saídas Imunes/Isentas' },
  { value: '811002', label: '811002 - Débitos notas fiscais não', cst: '811', descricao: 'Débitos de notas fiscais não' },
  { value: '811003', label: '811003 - Simples Nacional', cst: '811', descricao: 'do Simples Nacional' },
  
  // CST 820 - Crédito presumido
  { value: '820001', label: '820001 - Planos assistência à saúde', cst: '820', descricao: 'Fornecimento de serviços de planos de assistência à saúde' },
  { value: '820002', label: '820002 - Planos assistência funerária', cst: '820', descricao: 'Fornecimento de serviços de planos de assistência funerária' },
  { value: '820003', label: '820003 - Planos assistência saúde animais domésticos', cst: '820', descricao: 'Fornecimento de serviços de planos de assistência à saúde de animais domésticos' },
  { value: '820004', label: '820004 - Concursos de prognósticos', cst: '820', descricao: 'Prestação de serviços de concursos de prognósticos' },
  { value: '820005', label: '820005 - Alienação de bens imóveis', cst: '820', descricao: 'Alienação de bens imóveis' },
  { value: '820006', label: '820006 - Exploração de via', cst: '820', descricao: 'Fornecimento de serviços de exploração de via' },
  { value: '820007', label: '820007 - Serviços financeiros', cst: '820', descricao: 'Fornecimento de serviços financeiros' },
  { value: '820008', label: '820008 - Tributação em fatura anterior', cst: '820', descricao: 'Fornecimento, mas com tributação realizada em fatura anterior' },
  
  // CST 830 - Exclusão da BC
  { value: '830001', label: '830001 - Exclusão BC energia elétrica distribuidora', cst: '830', descricao: 'Exclusão da BC da CBS e do IBS de energia elétrica fornecida pela distribuidora à UC' },
];

/**
 * Retorna as classificações tributárias filtradas por CST
 * O CST deve ser passado sem zeros à esquerda (ex: "000", "200", "410")
 */
export function getClassificacoesPorCst(cst: string | null | undefined): ClassificacaoTributaria[] {
  if (!cst) return CLASSIFICACAO_TRIBUTARIA;
  
  // Normaliza o CST removendo zeros à esquerda para comparação
  const cstNormalizado = cst.replace(/^0+/, '') || '0';
  
  return CLASSIFICACAO_TRIBUTARIA.filter(c => {
    const cstItem = c.cst.replace(/^0+/, '') || '0';
    return cstItem === cstNormalizado;
  });
}

/**
 * Retorna uma classificação tributária específica pelo código
 */
export function getClassificacaoPorCodigo(codigo: string | null | undefined): ClassificacaoTributaria | undefined {
  if (!codigo) return undefined;
  return CLASSIFICACAO_TRIBUTARIA.find(c => c.value === codigo);
}

/**
 * Formata o código de classificação tributária para exibição
 */
export function formatClassificacaoTributaria(codigo: string | null | undefined): string {
  if (!codigo) return '';
  const classificacao = getClassificacaoPorCodigo(codigo);
  return classificacao ? classificacao.label : codigo;
}

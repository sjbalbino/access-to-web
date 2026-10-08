import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { formatCep } from '@/hooks/useCepLookup';
import { formatCnpj } from '@/hooks/useCnpjLookup';
import { formatCpf } from '@/lib/formatters';
import type { ClienteFornecedorInsert } from '@/hooks/useClientesFornecedores';
import type { Dispatch, SetStateAction } from 'react';

export interface ClienteFornecedorFieldsProps {
  formData: ClienteFornecedorInsert;
  setFormData: Dispatch<SetStateAction<ClienteFornecedorInsert>>;
  handleCepBlur: (cep: string) => Promise<void>;
  handleCnpjBlur: (cnpj: string) => Promise<void>;
  cepLoading: boolean;
  cnpjLoading: boolean;
}

export function IdentificacaoFields({ formData, setFormData, handleCepBlur, handleCnpjBlur, cepLoading, cnpjLoading }: ClienteFornecedorFieldsProps) {
  return <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select isSearchable value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cliente">Cliente</SelectItem>
                          <SelectItem value="fornecedor">Fornecedor</SelectItem>
                          <SelectItem value="ambos">Ambos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo Pessoa</Label>
                      <Select isSearchable value={formData.tipo_pessoa || 'juridica'} onValueChange={(value) => setFormData({ ...formData, tipo_pessoa: value, cpf_cnpj: '' })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fisica">Pessoa Física</SelectItem>
                          <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                          <SelectItem value="estrangeiro">Estrangeiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{formData.tipo_pessoa === 'fisica' ? 'CPF' : formData.tipo_pessoa === 'estrangeiro' ? 'ID Estrangeiro' : 'CNPJ'}</Label>
                      <div className="relative">
                        <Input 
                          value={
                            formData.tipo_pessoa === 'juridica'
                              ? formatCnpj(formData.cpf_cnpj || '')
                              : formData.tipo_pessoa === 'estrangeiro'
                                ? (formData.cpf_cnpj || '')
                                : formatCpf(formData.cpf_cnpj || '')
                          } 
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            cpf_cnpj: formData.tipo_pessoa === 'estrangeiro' ? e.target.value : e.target.value.replace(/\D/g, '')
                          })}
                          onBlur={(e) => handleCnpjBlur(e.target.value)}
                          placeholder={formData.tipo_pessoa === 'juridica' ? '00.000.000/0000-00' : formData.tipo_pessoa === 'estrangeiro' ? 'Identificação do estrangeiro' : '000.000.000-00'}
                          maxLength={formData.tipo_pessoa === 'juridica' ? 18 : formData.tipo_pessoa === 'estrangeiro' ? 20 : 14}
                        />
                        {cnpjLoading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Nome / Razão Social *</Label>
                      <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Fantasia</Label>
                      <Input value={formData.nome_fantasia || ''} onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Inscrição Estadual</Label>
                      <Input value={formData.inscricao_estadual || ''} onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })} />
                    </div>
                  </div>
  </>;
}

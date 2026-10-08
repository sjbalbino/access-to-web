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

export function EnderecoContatoFields({ formData, setFormData, handleCepBlur, handleCnpjBlur, cepLoading, cnpjLoading }: ClienteFornecedorFieldsProps) {
  return <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <div className="relative">
                        <Input 
                          value={formData.cep || ''} 
                          onChange={(e) => setFormData({ ...formData, cep: formatCep(e.target.value) })} 
                          onBlur={(e) => handleCepBlur(e.target.value)}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                        {cepLoading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Logradouro</Label>
                      <Input value={formData.logradouro || ''} onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Input value={formData.numero || ''} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Complemento</Label>
                      <Input value={formData.complemento || ''} onChange={(e) => setFormData({ ...formData, complemento: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bairro <span className="text-destructive">*</span></Label>
                      <Input value={formData.bairro || ''} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} placeholder="Ex.: INTERIOR" />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input value={formData.cidade || ''} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>UF</Label>
                      <Input value={formData.uf || ''} onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })} maxLength={2} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={formData.telefone || ''} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Celular</Label>
                      <Input value={formData.celular || ''} onChange={(e) => setFormData({ ...formData, celular: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Contato</Label>
                      <Input value={formData.contato || ''} onChange={(e) => setFormData({ ...formData, contato: e.target.value })} />
                    </div>
                  </div>
  </>;
}

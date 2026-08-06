import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const leadSchema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome completo").max(120),
  empresa: z.string().trim().max(160).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").max(255),
  telefone: z.string().trim().min(8, "Informe um telefone válido").max(30),
  cidade: z.string().trim().max(120).optional().or(z.literal("")),
  uf: z.string().trim().max(2).optional().or(z.literal("")),
  qtd_produtores: z.string().trim().max(40).optional().or(z.literal("")),
  mensagem: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;

export function useEnviarLead() {
  return useMutation({
    mutationFn: async (input: LeadInput) => {
      const parsed = leadSchema.safeParse(input);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0].message);
      }

      const d = parsed.data;
      const { error } = await supabase.from("leads_portal").insert({
        nome: d.nome,
        empresa: d.empresa || null,
        email: d.email,
        telefone: d.telefone || null,
        cidade: d.cidade || null,
        uf: d.uf ? d.uf.toUpperCase() : null,
        qtd_produtores: d.qtd_produtores || null,
        mensagem: d.mensagem || null,
        origem: "portal",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Solicitação enviada",
        description: "Recebemos seu contato e retornaremos em breve.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Não foi possível enviar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

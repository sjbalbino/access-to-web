import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, KeyRound } from "lucide-react";

interface AlterarSenhaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se informado, admin altera a senha deste usuário via edge function. Caso contrário, usuário altera a própria senha. */
  targetUserId?: string | null;
  targetUserNome?: string | null;
}

export function AlterarSenhaDialog({
  open,
  onOpenChange,
  targetUserId,
  targetUserNome,
}: AlterarSenhaDialogProps) {
  const { toast } = useToast();
  const isAdminMode = !!targetUserId;

  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) {
      setSenha("");
      setConfirmar("");
      setMostrar(false);
      setSalvando(false);
    }
  }, [open]);

  const handleSalvar = async () => {
    if (senha.length < 6) {
      toast({
        title: "Senha inválida",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    if (senha !== confirmar) {
      toast({
        title: "Senhas não conferem",
        description: "A confirmação deve ser igual à nova senha.",
        variant: "destructive",
      });
      return;
    }

    setSalvando(true);
    try {
      if (isAdminMode) {
        const { data, error } = await supabase.functions.invoke(
          "admin-update-password",
          { body: { user_id: targetUserId, password: senha } },
        );
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
      } else {
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) throw error;
      }

      toast({
        title: "Senha alterada",
        description: isAdminMode
          ? `Senha de ${targetUserNome || "usuário"} atualizada com sucesso.`
          : "Sua senha foi atualizada com sucesso.",
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao alterar senha",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {isAdminMode ? "Alterar Senha do Usuário" : "Alterar Minha Senha"}
          </DialogTitle>
          <DialogDescription>
            {isAdminMode
              ? `Defina uma nova senha para ${targetUserNome || "o usuário"}.`
              : "Defina uma nova senha de acesso ao sistema."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nova-senha">Nova senha *</Label>
            <div className="relative">
              <Input
                id="nova-senha"
                type={mostrar ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setMostrar((v) => !v)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar-senha">Confirmar nova senha *</Label>
            <Input
              id="confirmar-senha"
              type={mostrar ? "text" : "password"}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Repita a senha"
              autoComplete="new-password"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando || !senha || !confirmar}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

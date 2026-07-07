import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Leaf, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
});

const signupSchema = z.object({
  nome: z.string().trim().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupNome, setSignupNome] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({
      email: loginEmail,
      password: loginPassword,
    });

    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      console.error("Login error:", { name: error.name, message: error.message, status: (error as any).status, error });
      const raw = (error.message || "").toLowerCase();
      let message: string | null = null;
      if (raw.includes("invalid login credentials") || raw.includes("invalid credentials")) {
        message = "Email ou senha incorretos.";
      } else if (raw.includes("email not confirmed")) {
        message = "Email ainda não confirmado. Verifique sua caixa de entrada.";
      } else if (raw.includes("rate limit") || raw.includes("too many")) {
        message = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
      } else if (raw.includes("network") || raw.includes("failed to fetch")) {
        message = "Falha de conexão. Verifique sua internet e tente novamente.";
      } else if (raw.includes("user not found")) {
        message = "Usuário não encontrado.";
      }
      if (!message) {
        message = error.message
          ? `Erro ao entrar: ${error.message}`
          : "Não foi possível entrar. Tente novamente.";
      }
      toast({
        title: "Erro ao entrar",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = signupSchema.safeParse({
      nome: signupNome,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirmPassword,
    });

    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupNome);

    if (error) {
      setIsLoading(false);
      console.error("Signup error:", { name: error.name, message: error.message, status: (error as any).status, code: (error as any).code, error });
      const raw = (error.message || "").toLowerCase();
      let message: string | null = null;
      if (raw.includes("user already registered") || raw.includes("already been registered") || raw.includes("already registered")) {
        message = "Este email já está cadastrado.";
      } else if (raw.includes("pwned") || raw.includes("compromised") || raw.includes("weak_password") || raw.includes("weak password") || raw.includes("known to be weak") || raw.includes("easy to guess")) {
        message = "Esta senha é considerada fraca ou foi encontrada em vazamentos públicos. Use uma senha mais forte: misture letras maiúsculas e minúsculas, números e símbolos (ex.: Umbu@2026!Agro).";
      } else if (raw.includes("at least") || raw.includes("password should be") || raw.includes("password is too short")) {
        message = "A senha deve ter pelo menos 6 caracteres.";
      } else if (raw.includes("invalid email") || raw.includes("invalid format") || (raw.includes("email address") && raw.includes("invalid"))) {
        message = "Email inválido.";
      } else if (raw.includes("signup is disabled") || raw.includes("signups not allowed") || raw.includes("signup disabled")) {
        message = "O cadastro está temporariamente desabilitado. Contate o administrador.";
      } else if (raw.includes("rate limit") || raw.includes("too many")) {
        message = "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
      } else if (raw.includes("network") || raw.includes("failed to fetch")) {
        message = "Falha de conexão. Verifique sua internet e tente novamente.";
      } else if (raw.includes("database error") || raw.includes("unexpected_failure")) {
        message = `Erro no servidor ao criar o cadastro: ${error.message}. Tente novamente ou contate o administrador.`;
      }
      if (!message) {
        message = error.message
          ? `Erro ao criar conta: ${error.message}`
          : "Não foi possível concluir o cadastro. Tente novamente em alguns instantes.";
      }
      toast({ title: "Erro ao criar conta", description: message, variant: "destructive" });
      return;
    }

    // Disparar e-mails de notificação (usuário + admins) — não bloqueia
    try {
      const { data: sessionData } = await supabase.auth.getUser();
      const newUserId = sessionData?.user?.id;
      if (newUserId) {
        await supabase.functions.invoke("notify-new-signup", {
          body: { user_id: newUserId, email: signupEmail, nome: signupNome },
        });
      }
    } catch (err) {
      console.error("notify-new-signup falhou:", err);
    }

    // Deslogar imediatamente — usuário precisa aguardar aprovação
    await supabase.auth.signOut();
    setIsLoading(false);

    toast({
      title: "Cadastro recebido!",
      description: "Você receberá um e-mail assim que um administrador liberar seu acesso.",
    });

    // Limpar formulário
    setSignupNome("");
    setSignupEmail("");
    setSignupPassword("");
    setSignupConfirmPassword("");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = forgotEmail.trim();
    const emailCheck = z.string().email().safeParse(email);
    if (!emailCheck.success) {
      toast({ title: "Email inválido", description: "Informe um email válido.", variant: "destructive" });
      return;
    }

    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);

    if (error) {
      toast({ title: "Erro ao enviar email", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Email enviado",
      description: "Se este email estiver cadastrado, você receberá as instruções em instantes.",
    });
    setForgotOpen(false);
  };




  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <Leaf className="h-10 w-10 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-primary">
              Sistema Agropecuário
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Gerenciamento de Granja
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember-me" 
                      checked={rememberMe} 
                      onCheckedChange={(checked) => setRememberMe(checked === true)} 
                    />
                    <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
                      Lembrar-me
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(loginEmail); setForgotOpen(true); }}
                    className="text-sm text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-nome">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-nome"
                      type="text"
                      placeholder="Seu nome completo"
                      value={signupNome}
                      onChange={(e) => setSignupNome(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-confirm"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Criando conta..." : "Criar Conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Informe seu email cadastrado e enviaremos um link para redefinir sua senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForgotOpen(false)} disabled={forgotLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={forgotLoading}>
                {forgotLoading ? "Enviando..." : "Enviar link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

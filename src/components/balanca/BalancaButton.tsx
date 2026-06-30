import { useState } from "react";
import { Scale, Settings, Plug, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBalanca, BalancaConfig } from "@/hooks/useBalanca";

interface Props {
  onPeso: (kg: number) => void;
  size?: "sm" | "default";
}

export function BalancaButton({ onPeso, size = "sm" }: Props) {
  const balanca = useBalanca({ onPeso });
  const [cfgOpen, setCfgOpen] = useState(false);
  const [draft, setDraft] = useState<BalancaConfig>(balanca.config);

  const abrirConfig = () => {
    setDraft(balanca.config);
    setCfgOpen(true);
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={balanca.conectado ? "default" : "outline"}
            size={size}
            className="gap-2"
            title={balanca.conectado ? "Balança conectada" : "Conectar balança"}
          >
            <Scale className="h-4 w-4" />
            {balanca.conectado && balanca.peso !== null
              ? `${balanca.peso.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg`
              : "Balança"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-3">
          <div className="text-sm">
            <div className="font-medium">Balança de pesagem</div>
            <div className="text-xs text-muted-foreground">
              {balanca.suportado
                ? `Arquivo esperado: ${balanca.config.caminhoHint}`
                : "Use Chrome ou Edge no PC conectado à balança."}
            </div>
          </div>

          {balanca.conectado ? (
            <div className="space-y-2">
              <div className="rounded-md border bg-muted/40 p-3 text-center">
                <div className="text-xs text-muted-foreground">Peso atual</div>
                <div className="text-2xl font-bold tabular-nums">
                  {balanca.peso !== null
                    ? `${balanca.peso.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg`
                    : "—"}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  onClick={() => balanca.peso !== null && onPeso(balanca.peso)}
                  disabled={balanca.peso === null}
                >
                  Usar peso
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={balanca.desconectar}
                >
                  <Plug className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              className="w-full gap-2"
              onClick={balanca.conectar}
              disabled={!balanca.suportado}
            >
              <PlugZap className="h-4 w-4" />
              Conectar ao arquivo
            </Button>
          )}

          {balanca.erro && (
            <div className="text-xs text-destructive">{balanca.erro}</div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full gap-2"
            onClick={abrirConfig}
          >
            <Settings className="h-3 w-3" />
            Configurar
          </Button>
        </PopoverContent>
      </Popover>

      <Dialog open={cfgOpen} onOpenChange={setCfgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Balança</DialogTitle>
            <DialogDescription>
              Ajuste como o sistema lê o arquivo gerado pela balança.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Caminho do arquivo (informativo)</Label>
              <Input
                value={draft.caminhoHint}
                onChange={(e) => setDraft({ ...draft, caminhoHint: e.target.value })}
                placeholder="C:\LESBR\peso.txt"
              />
              <p className="text-xs text-muted-foreground">
                O navegador exige que o usuário selecione o arquivo manualmente
                ao conectar. Este campo é só uma lembrança visual.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Separador decimal</Label>
                <Select
                  value={draft.decimal}
                  onValueChange={(v) => setDraft({ ...draft, decimal: v as "," | "." })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">Vírgula (1.234,56)</SelectItem>
                    <SelectItem value=".">Ponto (1,234.56)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Unidade</Label>
                <Select
                  value={draft.unidade}
                  onValueChange={(v) => setDraft({ ...draft, unidade: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="t">t</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Intervalo de leitura (ms)</Label>
              <Input
                type="number"
                min={200}
                step={100}
                value={draft.pollMs}
                onChange={(e) => setDraft({ ...draft, pollMs: Number(e.target.value) || 500 })}
              />
            </div>

            <div className="space-y-1">
              <Label>Regex (avançado, opcional)</Label>
              <Input
                value={draft.regex || ""}
                onChange={(e) => setDraft({ ...draft, regex: e.target.value })}
                placeholder='ex.: PESO=(\d+[,.]?\d*)'
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para usar o parser padrão (último número do arquivo).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCfgOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                balanca.atualizarConfig(draft);
                setCfgOpen(false);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

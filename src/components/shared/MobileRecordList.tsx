import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface MobileRecordAcao {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export interface MobileRecordCampo {
  label: string;
  valor: React.ReactNode;
}

export interface MobileRecordItem {
  id: string;
  /** Linha principal (ex.: nome do produtor) */
  titulo: React.ReactNode;
  /** Linha de apoio (ex.: data, nº da nota) */
  subtitulo?: React.ReactNode;
  /** Badge de status exibido à direita do título */
  badge?: { label: string; variant?: "default" | "secondary" | "outline" | "destructive" };
  campos?: MobileRecordCampo[];
  acoes?: MobileRecordAcao[];
}

interface MobileRecordListProps {
  items: MobileRecordItem[];
  emptyText?: string;
  loading?: boolean;
}

/**
 * Listagem em cards para smartphones — substitui tabelas densas
 * garantindo acesso a todas as ações sem rolagem horizontal.
 */
export function MobileRecordList({
  items,
  emptyText = "Nenhum registro encontrado",
  loading = false,
}: MobileRecordListProps) {
  if (loading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>;
  }

  if (items.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{emptyText}</div>;
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <div key={item.id} className="px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium text-sm break-words">{item.titulo}</div>
              {item.subtitulo && (
                <div className="text-xs text-muted-foreground break-words">{item.subtitulo}</div>
              )}
            </div>
            {item.badge && (
              <Badge variant={item.badge.variant ?? "secondary"} className="flex-shrink-0">
                {item.badge.label}
              </Badge>
            )}
          </div>

          {item.campos && item.campos.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {item.campos.map((campo, idx) => (
                <div key={`${item.id}-c-${idx}`} className="min-w-0">
                  <span className="text-muted-foreground">{campo.label}: </span>
                  <span className="font-medium break-words">{campo.valor ?? "-"}</span>
                </div>
              ))}
            </div>
          )}

          {item.acoes && item.acoes.length > 0 && (
            <div className="mt-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-full justify-center">
                    <MoreHorizontal className="h-4 w-4 mr-2" />
                    Ações
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 bg-popover">
                  {item.acoes.map((acao) => {
                    const Icon = acao.icon;
                    return (
                      <DropdownMenuItem
                        key={acao.key}
                        disabled={acao.disabled}
                        onClick={acao.onClick}
                        className={cn(
                          "py-2.5",
                          acao.destructive && "text-destructive focus:text-destructive"
                        )}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {acao.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

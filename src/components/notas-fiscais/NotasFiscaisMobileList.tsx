import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCpfCnpj } from "@/lib/formatters";
import { formatSP } from "@/lib/datetime";
import type { NotaFiscalAcao } from "./notaFiscalAcoes";

/** Grupo de notas de um mesmo emitente (usado no desktop e no mobile) */
export interface GrupoEmitenteNotas {
  key: string;
  emitenteId: string | null;
  nome: string;
  ie: string;
  notas: any[];
  total: number;
}

interface NotasFiscaisMobileListProps {
  grupos: GrupoEmitenteNotas[];
  collapsedGroups: Set<string>;
  toggleGroup: (groupKey: string) => void;
  canEdit: boolean;
  getAcoes: (nota: any) => NotaFiscalAcao[];
  formatCurrency: (value: number | null) => string;
  formatStatusLabel: (status: string | null) => string;
  getStatusVariant: (status: string | null) => any;
  formatDataEmissao: (dataEmissao: string | null, createdAt: string | null) => string;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

/**
 * Listagem em cards para smartphones: garante acesso a TODAS as ações
 * sem depender de rolagem horizontal da tabela.
 */
export function NotasFiscaisMobileList({
  grupos,
  collapsedGroups,
  toggleGroup,
  canEdit,
  getAcoes,
  formatCurrency,
  formatStatusLabel,
  getStatusVariant,
  formatDataEmissao,
}: NotasFiscaisMobileListProps) {
  if (grupos.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Nenhuma nota fiscal encontrada
      </div>
    );
  }

  return (
    <div className="divide-y-0">
      {grupos.map((grupo) => {
        const isCollapsed = collapsedGroups.has(grupo.key);
        return (
          <div key={grupo.key}>
            <button
              type="button"
              onClick={() => toggleGroup(grupo.key)}
              aria-expanded={!isCollapsed}
              title={isCollapsed ? "Expandir grupo" : "Recolher grupo"}
              className="w-full text-left bg-muted/60 px-3 py-3 flex items-start gap-2 border-b border-border"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold uppercase text-sm break-words">{grupo.nome}</div>
                <div className="text-xs text-muted-foreground font-mono">IE: {grupo.ie}</div>
                <div className="text-xs text-muted-foreground">
                  {grupo.notas.length} nota(s) — Total:{" "}
                  <span className="font-semibold text-foreground">{fmtBRL(grupo.total)}</span>
                </div>
              </div>
            </button>

            {!isCollapsed &&
              grupo.notas.map((nota) => {
                const acoes = canEdit ? getAcoes(nota) : [];
                const isCancelada = nota.status === "cancelado" || nota.status === "cancelada";

                return (
                  <div key={nota.id} className="px-3 py-3 border-b border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-sm">
                          Nº {nota.numero || "-"}
                          <span className="text-xs text-muted-foreground">
                            {" "}
                            / Série {nota.serie || "-"}
                          </span>
                        </div>
                        <div className="font-medium text-sm break-words">
                          {nota.dest_nome || "-"}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {formatCpfCnpj(nota.dest_cpf_cnpj) || "-"}
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(nota.status)} className="flex-shrink-0">
                        {formatStatusLabel(nota.status)}
                      </Badge>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {formatDataEmissao(nota.data_emissao, nota.created_at)}
                      </span>
                      <span className="font-semibold text-sm">
                        {formatCurrency(nota.total_nota)}
                      </span>
                    </div>

                    {nota.natureza_operacao && (
                      <div className="mt-1 text-xs text-muted-foreground break-words">
                        {nota.natureza_operacao}
                      </div>
                    )}

                    {isCancelada && (nota.cancelado_por_nome || nota.cancelado_em) && (
                      <div className="mt-1 text-[11px] leading-tight text-muted-foreground">
                        <div>
                          Cancelada por{" "}
                          <span className="font-medium">{nota.cancelado_por_nome || "—"}</span>
                          {nota.cancelado_em && (
                            <> em {formatSP(nota.cancelado_em, "dd/MM/yy HH:mm")}</>
                          )}
                        </div>
                        {(nota.cancelado_motivo || nota.motivo_status) && (
                          <div className="break-words">
                            Motivo: {nota.cancelado_motivo || nota.motivo_status}
                          </div>
                        )}
                      </div>
                    )}

                    {acoes.length > 0 && (
                      <div className="mt-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 w-full justify-center"
                            >
                              <MoreHorizontal className="h-4 w-4 mr-2" />
                              Ações
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64 bg-popover">
                            {acoes.map((acao) => {
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
                                  <Icon className={cn("h-4 w-4 mr-2", acao.iconClass)} />
                                  {acao.label}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

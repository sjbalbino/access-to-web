import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';

export interface ConfirmOptions {
  /** Título do diálogo. Padrão: "Confirmar Exclusão". */
  title?: string;
  /** Texto explicativo da ação. */
  description?: string;
  /** Rótulo do botão de confirmação. Padrão: "Excluir". */
  confirmText?: string;
  /** Rótulo do botão de cancelamento. Padrão: "Cancelar". */
  cancelText?: string;
}

type ConfirmFn = (options?: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

const DEFAULTS: Required<ConfirmOptions> = {
  title: 'Confirmar Exclusão',
  description: 'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.',
  confirmText: 'Excluir',
  cancelText: 'Cancelar',
};

/**
 * Provider global de confirmação de exclusão.
 * Garante que toda ação destrutiva peça confirmação explícita ao operador.
 */
export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Required<ConfirmOptions>>(DEFAULTS);
  // Guarda o resolver da Promise em aberto para responder ao clique do usuário.
  const resolverRef = useRef<((value: boolean) => void) | null>(null);


  const confirm = useCallback<ConfirmFn>((opts) => {
    const normalized: Required<ConfirmOptions> =
      typeof opts === 'string'
        ? { ...DEFAULTS, description: opts }
        : { ...DEFAULTS, ...(opts ?? {}) };

    setOptions(normalized);
    setOpen(true);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    resolver?.(value);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDeleteDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // Fechar por ESC, clique fora ou "Cancelar" equivale a negar a ação.
          if (!next) settle(false);
        }}
        onConfirm={() => settle(true)}
        title={options.title}
        description={options.description}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
      />
    </ConfirmContext.Provider>
  );
}

/**
 * Retorna uma função assíncrona que exibe o diálogo de confirmação.
 * Uso: `if (!(await confirmar('Excluir esta parcela?'))) return;`
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm deve ser usado dentro de <ConfirmDialogProvider>.');
  }
  return ctx;
}

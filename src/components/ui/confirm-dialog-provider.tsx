import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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

// Handler registrado pelo provider; permite chamar a confirmação fora de React.
let globalConfirm: ConfirmFn | null = null;

/**
 * Confirmação de exclusão utilizável em qualquer lugar (dentro ou fora de componentes).
 * Retorna `true` somente se o operador confirmar explicitamente.
 * Fallback defensivo: se o provider não estiver montado, usa `window.confirm`.
 */
export const confirmarExclusao: ConfirmFn = async (options) => {
  if (globalConfirm) return globalConfirm(options);
  const message =
    typeof options === 'string'
      ? options
      : options?.description ?? DEFAULTS.description;
  return typeof window !== 'undefined' ? window.confirm(message) : false;
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

  // Registra o handler globalmente para permitir uso fora de componentes React
  // (handlers utilitários, callbacks inline etc.) sem exigir o hook.
  useEffect(() => {
    globalConfirm = confirm;
    return () => {
      if (globalConfirm === confirm) globalConfirm = null;
    };
  }, [confirm]);

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

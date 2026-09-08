"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

// Substitui window.confirm() nas ações destrutivas (excluir cultura/grupo,
// substituir cultura em massa) — o diálogo nativo do navegador não segue a
// identidade visual do app, trava a thread principal, e não dá pra
// automatizar em teste (achado auditando 05/09/2026). `useConfirm` mantém a
// mesma forma de chamada de `window.confirm` (`if (!(await confirm(...)))
// return;`), só que assíncrona e com o dialog assinado por Promise.

interface ConfirmOptions {
  title: string;
  /** Aceita \n\n para separar parágrafos — renderizado com white-space: pre-line. Omitir quando o título já é autoexplicativo. */
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true = botão de confirmar vermelho e foco inicial no Cancelar (evita apagar sem querer com Enter). */
  danger?: boolean;
}

type ConfirmState = ConfirmOptions & { resolve: (value: boolean) => void };

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const settle = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  useEffect(() => {
    if (!state) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") settle(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const dialog = state ? (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={() => settle(false)}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              state.danger ? "bg-red-500/10 text-red-600" : "bg-blue-500/10 text-blue-600"
            }`}
          >
            {state.danger ? <AlertTriangle size={18} /> : <HelpCircle size={18} />}
          </div>
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-sm font-bold text-foreground">
              {state.title}
            </h2>
            {state.message && (
              <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-line leading-relaxed">
                {state.message}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            autoFocus={state.danger}
            onClick={() => settle(false)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            {state.cancelLabel ?? "Cancelar"}
          </button>
          <button
            autoFocus={!state.danger}
            onClick={() => settle(true)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors ${
              state.danger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {state.confirmLabel ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}

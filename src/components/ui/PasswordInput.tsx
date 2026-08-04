"use client";

import { useState, forwardRef } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showLockIcon?: boolean;
}

/**
 * Input de senha com olho de mostrar/ocultar.
 * Reusado em login, cadastro e troca de senha para não duplicar o toggle 3x.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showLockIcon = false, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        {showLockIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Lock size={18} />
          </div>
        )}
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn(
            showLockIcon ? "pl-10" : "pl-3",
            "w-full rounded-xl border pr-10 py-3 outline-none transition",
            className
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          title={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

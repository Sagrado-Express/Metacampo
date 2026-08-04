"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { toast } from "@/lib/toast";

/**
 * Troca de senha do próprio usuário logado. A API reautentica com a senha
 * atual e rejeita se a nova senha for igual à anterior.
 */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("A confirmação não bate com a nova senha");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Erro ao trocar senha");
        return;
      }

      toast.success("Senha atualizada com sucesso");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Erro de conexão ao trocar senha");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound size={16} className="text-amber-600" />
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Trocar minha senha
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <PasswordInput
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Senha atual"
          required
          className="border-border/40 bg-white/60 focus:ring-1 focus:ring-emerald-400"
        />
        <PasswordInput
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Nova senha"
          required
          minLength={8}
          className="border-border/40 bg-white/60 focus:ring-1 focus:ring-emerald-400"
        />
        <PasswordInput
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirmar nova senha"
          required
          minLength={8}
          className="border-border/40 bg-white/60 focus:ring-1 focus:ring-emerald-400"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-black uppercase tracking-wider hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
          Atualizar senha
        </button>
      </form>
    </div>
  );
}

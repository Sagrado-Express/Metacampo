"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Copy, Check, Loader2, Clock, UserCheck } from "lucide-react";
import { toast } from "@/lib/toast";
import { useSession } from "@/hooks/useSession";

interface Invite {
  id: string;
  email: string;
  token: string;
  role: string;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

/**
 * Convidar novos usuários (Gestor/CTV) para o tenant.
 *
 * A rota /api/tenant/invites já existia e funcionava — só não havia botão
 * em lugar nenhum da interface que a chamasse. Convidar só era possível
 * com uma requisição direta à API.
 */
export function UserInvites() {
  const { data: sessionData } = useSession();
  const isAdmin = sessionData?.role === "admin";
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [inviteAsAdmin, setInviteAsAdmin] = useState(false);
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: invites = [], isLoading } = useQuery<Invite[]>({
    queryKey: ["tenant-invites"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/invites");
      if (!res.ok) throw new Error("Falha ao carregar convites");
      return res.json();
    },
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    try {
      const res = await fetch("/api/tenant/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role: inviteAsAdmin ? "admin" : "user" }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error === "INVALID_EMAIL" ? "E-mail inválido" : "Erro ao enviar convite");
        return;
      }

      await navigator.clipboard.writeText(data.inviteUrl).catch(() => {});
      toast.success("Convite criado — link copiado");
      setEmail("");
      setInviteAsAdmin(false);
      queryClient.invalidateQueries({ queryKey: ["tenant-invites"] });
    } catch {
      toast.error("Erro de conexão ao convidar");
    } finally {
      setSending(false);
    }
  };

  const copyLink = (invite: Invite) => {
    const url = `${window.location.origin}/register?invite=${invite.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Convide gestores e CTVs para acessar este tenant. Quem receber o link cria a própria
          senha e já entra vinculado à sua empresa.
        </p>
      </div>

      {isAdmin ? (
        <form onSubmit={handleInvite} className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@empresa.com.br"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border/40 bg-white/60 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              Convidar
            </button>
          </div>
          <label className="flex items-center gap-2 pl-1 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={inviteAsAdmin}
              onChange={(e) => setInviteAsAdmin(e.target.checked)}
              className="rounded border-border/40"
            />
            Convidar como administrador
          </label>
        </form>
      ) : (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Só administradores podem convidar novos usuários.
        </p>
      )}

      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
          Convites enviados
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-emerald-600" />
          </div>
        ) : invites.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum convite enviado ainda.</p>
        ) : (
          <div className="border border-border/40 rounded-2xl divide-y divide-border/30 overflow-hidden">
            {invites.map((inv) => {
              const aceito = !!inv.used_at;
              const expirado = !aceito && new Date(inv.expires_at) < new Date();
              return (
                <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`shrink-0 ${aceito ? "text-emerald-600" : expirado ? "text-muted-foreground/50" : "text-amber-600"}`}
                  >
                    {aceito ? <UserCheck size={16} /> : <Clock size={16} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
                      {inv.email}
                      {inv.role === "admin" && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[9px] font-black uppercase tracking-wider">
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {aceito
                        ? `Aceito em ${new Date(inv.used_at!).toLocaleDateString("pt-BR")}`
                        : expirado
                          ? "Expirado"
                          : "Pendente"}
                    </p>
                  </div>
                  {!aceito && !expirado && (
                    <button
                      onClick={() => copyLink(inv)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:bg-muted/30 transition-colors"
                      title="Copiar link do convite"
                    >
                      {copiedId === inv.id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === inv.id ? "Copiado" : "Copiar link"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2, Network } from "lucide-react";
import { toast } from "@/lib/toast";
import { useSession } from "@/hooks/useSession";

interface Member {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  managerId: string | null;
  vpmPotencialCentavos: number;
}

interface TreeNode extends Member {
  children: TreeNode[];
  vpmEquipeCentavos: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

/**
 * Monta a árvore CTV → gerente → diretor a partir da lista flat de
 * membros. Um managerId apontando para alguém fora da lista (removido do
 * tenant) vira raiz em vez de sumir — nunca perde o nó de vista.
 */
function buildTree(members: Member[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>(
    members.map((m) => [m.userId, { ...m, children: [], vpmEquipeCentavos: 0 }])
  );

  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    const manager = node.managerId ? nodes.get(node.managerId) : null;
    if (manager) {
      manager.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Profundidade limitada como proteção contra ciclo de dado legado — a API
  // já bloqueia ciclo na atribuição, isso é só defesa extra no render.
  function sum(node: TreeNode, depth = 0): number {
    let total = node.vpmPotencialCentavos;
    if (depth < 20) {
      for (const child of node.children) total += sum(child, depth + 1);
    }
    node.vpmEquipeCentavos = total;
    return total;
  }
  for (const root of roots) sum(root);

  const byName = (a: { fullName: string }, b: { fullName: string }) =>
    a.fullName.localeCompare(b.fullName, "pt-BR");
  roots.sort(byName);
  for (const node of nodes.values()) node.children.sort(byName);

  return roots;
}

export function EstruturaComercial() {
  const { data: sessionData } = useSession();
  const isAdmin = sessionData?.role === "admin";
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["tenant-members"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/members");
      if (!res.ok) throw new Error("Falha ao carregar membros");
      return res.json();
    },
    enabled: isAdmin,
  });

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const changeManager = async (userId: string, managerId: string | null) => {
    setSavingId(userId);
    try {
      const res = await fetch("/api/tenant/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, managerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Erro ao atualizar gerente");
        return;
      }
      toast.success("Estrutura comercial atualizada");
      queryClient.invalidateQueries({ queryKey: ["tenant-members"] });
    } catch {
      toast.error("Erro de conexão ao atualizar");
    } finally {
      setSavingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
        Só administradores podem ver a estrutura comercial.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={20} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  const tree = buildTree(members);

  const renderNode = (node: TreeNode, depth: number) => {
    const isCollapsed = collapsed.has(node.userId);
    const hasChildren = node.children.length > 0;
    return (
      <div key={node.userId}>
        <div
          className="flex items-center gap-2 py-2.5 px-2 border-b border-border/20 last:border-b-0"
          style={{ paddingLeft: depth * 22 + 8 }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggle(node.userId)}
              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </button>
          ) : (
            <span className="w-[18px] shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {node.fullName}
              {node.role === "admin" && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[9px] font-black uppercase tracking-wider align-middle">
                  Admin
                </span>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{node.email}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-black text-emerald-700">{fmt(node.vpmEquipeCentavos / 100)}</p>
            {hasChildren && (
              <p className="text-[10px] text-muted-foreground">
                próprio: {fmt(node.vpmPotencialCentavos / 100)}
              </p>
            )}
          </div>
          <select
            value={node.managerId || ""}
            disabled={savingId === node.userId}
            onChange={(e) => changeManager(node.userId, e.target.value || null)}
            title="Reporta para"
            className="shrink-0 px-2 py-1.5 rounded-lg border border-border/40 text-[11px] font-semibold bg-white/60 focus:outline-none focus:ring-1 focus:ring-emerald-400 disabled:opacity-50 max-w-[160px]"
          >
            <option value="">— Sem gerente —</option>
            {members
              .filter((m) => m.userId !== node.userId)
              .map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.fullName}
                </option>
              ))}
          </select>
        </div>
        {!isCollapsed && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <Network size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Defina para quem cada CTV ou gerente reporta. O valor à direita soma o VPM potencial da
          carteira própria com o de toda a equipe abaixo na árvore.
        </p>
      </div>
      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Nenhum membro cadastrado ainda.</p>
      ) : (
        <div className="border border-border/40 rounded-2xl overflow-hidden">
          {tree.map((node) => renderNode(node, 0))}
        </div>
      )}
    </div>
  );
}

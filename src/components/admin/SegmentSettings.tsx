"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Tag,
  Palette,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Sprout,
  Layers,
  Save,
  X,
  Check,
} from "lucide-react";
import { toast } from "@/lib/toast";

// ============================================================
// Types (local to this component, mirrors TenantClassificacao)
// ============================================================

interface ClassificacaoItem {
  id: string;
  internalKey: string;
  parentKey: string | null;
  customName: string;
  aliases: string[];
  isActive: boolean;
  displayOrder: number;
  color: string;
}

interface CulturaItem {
  id: string;
  internalKey: string;
  customName: string;
  aliases: string[];
  isActive: boolean;
  displayOrder: number;
}

interface SegmentSettingsProps {
  tenantId: string;
  classificacoes: ClassificacaoItem[];
  culturas: CulturaItem[];
  onSaveClassificacao: (item: ClassificacaoItem) => Promise<void>;
  /** Troca um apelido com o nome de exibição atual. */
  onPromoteAlias: (id: string, alias: string) => Promise<void>;
  onCreateClassificacao: (customName: string, parentKey?: string | null) => Promise<void>;
  onDeleteClassificacao: (id: string) => Promise<void>;
  onSaveCultura: (item: CulturaItem) => Promise<void>;
  onCreateCultura: (customName: string) => Promise<void>;
  onDeleteCultura: (id: string) => Promise<void>;
  /** When true, renders only the Culturas section (used by the Cultivos tab). */
  showOnlyCulturas?: boolean;
  /** When true, renders only the Grupos de Produtos section (used by the Grupos de Produtos tab). */
  showOnlyClassifications?: boolean;
  /** Apelido do tenant pro conceito "Grupo de Produtos" (ex.: "Segmento").
   *  Undefined/vazio usa o rótulo padrão. */
  labelGrupoProduto?: string;
  /** Quando presente, o título da seção vira editável (clique pra trocar o
   *  apelido). null limpa o apelido e volta pro rótulo padrão. */
  onChangeLabelGrupoProduto?: (label: string | null) => Promise<void>;
}

// ============================================================
// Component
// ============================================================

/**
 * SegmentSettings: Tenant Parametrization Admin Page
 *
 * "Passo 0" — the tenant configures their product classifications
 * and crops here before any commercial setup.
 *
 * Per meeting Daniel × Marco Polo (16/06/2026):
 * "Como você quer chamar esse campo? O cara dá o nome."
 *
 * Design: Morning Dew (Glass cards, Framer Motion micro-animations)
 * UI Label: "Grupo de Produtos" (renomeado de "Classificação de Produtos"
 * a pedido do Marco Polo, 13/08/2026 — o tenant também pode trocar esse
 * rótulo pelo termo que já usa, ex. "Segmento" (17/08/2026).
 */
export function SegmentSettings({
  tenantId,
  classificacoes,
  culturas,
  onSaveClassificacao,
  onPromoteAlias,
  onCreateClassificacao,
  onDeleteClassificacao,
  onSaveCultura,
  onCreateCultura,
  onDeleteCultura,
  showOnlyCulturas = false,
  showOnlyClassifications = false,
  labelGrupoProduto: labelGrupoProdutoProp,
  onChangeLabelGrupoProduto,
}: SegmentSettingsProps) {
  const labelGrupoProduto = labelGrupoProdutoProp?.trim() || "Grupo de Produtos";
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(labelGrupoProduto);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [newClassName, setNewClassName] = useState("");
  const [newSubClassName, setNewSubClassName] = useState<Record<string, string>>({});
  const [newCulturaName, setNewCulturaName] = useState("");
  const [editingAliases, setEditingAliases] = useState<Record<string, string>>({});
  const [renaming, setRenaming] = useState<{ kind: "classificacao" | "cultura"; id: string } | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [dragCulturaIdx, setDragCulturaIdx] = useState<number | null>(null);
  const [dragClassificacaoIdx, setDragClassificacaoIdx] = useState<number | null>(null);

  // Separate roots and children
  const roots = classificacoes.filter((c) => c.parentKey === null);
  const getChildren = (parentKey: string) =>
    classificacoes.filter((c) => c.parentKey === parentKey);

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const commitLabelGrupoProduto = async () => {
    setEditingLabel(false);
    const trimmed = labelDraft.trim();
    if (!onChangeLabelGrupoProduto || trimmed === labelGrupoProduto) return;
    try {
      // Campo vazio = volta pro rótulo padrão "Grupo de Produtos".
      await onChangeLabelGrupoProduto(trimmed || null);
      toast.success("Nome do grupo de produtos atualizado");
    } catch (err: any) {
      setLabelDraft(labelGrupoProduto);
      toast.error(err?.message || "Erro ao salvar o nome");
    }
  };

  const handleCreateClassificacao = async () => {
    if (!newClassName.trim()) return;
    try {
      await onCreateClassificacao(newClassName.trim());
      setNewClassName("");
      toast.success("Grupo de produto criado");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar grupo de produto");
    }
  };

  const handleCreateSubClassificacao = async (parentKey: string) => {
    const name = newSubClassName[parentKey]?.trim();
    if (!name) return;
    try {
      await onCreateClassificacao(name, parentKey);
      setNewSubClassName((prev) => ({ ...prev, [parentKey]: "" }));
      toast.success("Subgrupo criado");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar subgrupo");
    }
  };

  const handleCreateCultura = async () => {
    if (!newCulturaName.trim()) return;
    try {
      await onCreateCultura(newCulturaName.trim());
      setNewCulturaName("");
      toast.success("Cultura criada");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar cultura");
    }
  };

  const handleAddAlias = async (item: ClassificacaoItem) => {
    const alias = editingAliases[item.id]?.trim();
    if (!alias) return;

    const updatedAliases = [...item.aliases, alias];
    try {
      await onSaveClassificacao({ ...item, aliases: updatedAliases });
      setEditingAliases((prev) => ({ ...prev, [item.id]: "" }));
      toast.success("Apelido adicionado");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao adicionar apelido");
    }
  };

  const handlePromoteAlias = async (item: ClassificacaoItem, alias: string) => {
    if (
      !window.confirm(
        `Usar "${alias}" como nome deste grupo de produto?\n\n` +
          `"${item.customName}" passa a ser apelido, então o reconhecimento de CSV/ERP continua funcionando.\n` +
          `O código interno (${item.internalKey}) não muda.`
      )
    ) {
      return;
    }
    try {
      await onPromoteAlias(item.id, alias);
      toast.success(`"${alias}" agora é o nome`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao trocar o nome");
    }
  };

  const handleRemoveAlias = async (item: ClassificacaoItem, aliasToRemove: string) => {
    const updatedAliases = item.aliases.filter((a) => a !== aliasToRemove);
    try {
      await onSaveClassificacao({ ...item, aliases: updatedAliases });
      toast.success("Apelido removido");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover apelido");
    }
  };

  // ─── Apelidos de cultura ───
  // Mesmo padrão de classificações (add/promover/remover), só que reaproveitando
  // onSaveCultura direto — cultura não tem um endpoint dedicado de "promover
  // alias" como classificação (onPromoteAlias), mas updateCultura já aceita
  // customName+aliases juntos no mesmo PATCH e já propaga o rename pras tabelas
  // dependentes, então não precisa de um endpoint novo pra isso.
  const handleAddCulturaAlias = async (item: CulturaItem) => {
    const alias = editingAliases[item.id]?.trim();
    if (!alias || item.aliases.includes(alias)) return;

    const updatedAliases = [...item.aliases, alias];
    try {
      await onSaveCultura({ ...item, aliases: updatedAliases });
      setEditingAliases((prev) => ({ ...prev, [item.id]: "" }));
      toast.success("Apelido adicionado");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao adicionar apelido");
    }
  };

  const handlePromoteCulturaAlias = async (item: CulturaItem, alias: string) => {
    if (
      !window.confirm(
        `Usar "${alias}" como nome desta cultura?\n\n` +
          `"${item.customName}" passa a ser apelido, então o reconhecimento de CSV/ERP continua funcionando.\n` +
          `O código interno (${item.internalKey}) não muda.`
      )
    ) {
      return;
    }
    const restantes = item.aliases.filter((a) => a.toLowerCase() !== alias.toLowerCase());
    const jaTem = restantes.some((a) => a.toLowerCase() === item.customName.toLowerCase());
    const novosAliases = jaTem ? restantes : [...restantes, item.customName];
    try {
      await onSaveCultura({ ...item, customName: alias, aliases: novosAliases });
      toast.success(`"${alias}" agora é o nome`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao trocar o nome");
    }
  };

  const handleRemoveCulturaAlias = async (item: CulturaItem, aliasToRemove: string) => {
    const updatedAliases = item.aliases.filter((a) => a !== aliasToRemove);
    try {
      await onSaveCultura({ ...item, aliases: updatedAliases });
      toast.success("Apelido removido");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover apelido");
    }
  };

  const handleToggleActive = async (item: ClassificacaoItem) => {
    try {
      await onSaveClassificacao({ ...item, isActive: !item.isActive });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar");
    }
  };

  const handleColorChange = async (item: ClassificacaoItem, color: string) => {
    try {
      await onSaveClassificacao({ ...item, color });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alterar cor");
    }
  };

  // ─── Renomeação inline ───
  const startRename = (kind: "classificacao" | "cultura", id: string, currentName: string) => {
    setRenaming({ kind, id });
    setRenameDraft(currentName);
  };

  const commitRename = async (item: ClassificacaoItem | CulturaItem) => {
    const name = renameDraft.trim();
    setRenaming(null);
    if (!name || name === item.customName) return;
    try {
      if (renaming?.kind === "cultura") {
        await onSaveCultura({ ...(item as CulturaItem), customName: name });
      } else {
        await onSaveClassificacao({ ...(item as ClassificacaoItem), customName: name });
      }
      toast.success("Nome atualizado");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao renomear");
    }
  };

  // ─── Exclusão com confirmação ───
  const handleDeleteCulturaClick = async (cultura: CulturaItem) => {
    if (!window.confirm(`Excluir a cultura "${cultura.customName}"?\nEssa ação não pode ser desfeita.`)) return;
    try {
      await onDeleteCultura(cultura.id);
      toast.success("Cultura excluída");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir cultura");
    }
  };

  const handleDeleteClassificacaoClick = async (item: ClassificacaoItem) => {
    if (!window.confirm(`Excluir o grupo de produto "${item.customName}"?\nEssa ação não pode ser desfeita.`)) return;
    try {
      await onDeleteClassificacao(item.id);
      toast.success("Grupo de produto excluído");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir grupo de produto");
    }
  };

  // ─── Reordenação por arrastar (GripVertical) ───
  // displayOrder é reatribuído sequencialmente (0..N-1) pra lista inteira a
  // cada drop, não só pros dois itens trocados: a maioria dos registros
  // existentes nasceu com displayOrder 0 (default), então só mexer nos dois
  // extremos não bastaria pra fixar uma ordem real.
  const handleReorderCulturas = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const reordered = [...culturas];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    try {
      await Promise.all(
        reordered
          .map((c, displayOrder) => ({ c, displayOrder }))
          .filter(({ c, displayOrder }) => c.displayOrder !== displayOrder)
          .map(({ c, displayOrder }) => onSaveCultura({ ...c, displayOrder }))
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao reordenar");
    }
  };

  const handleReorderClassificacoes = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const reordered = [...roots];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    try {
      await Promise.all(
        reordered
          .map((c, displayOrder) => ({ c, displayOrder }))
          .filter(({ c, displayOrder }) => c.displayOrder !== displayOrder)
          .map(({ c, displayOrder }) => onSaveClassificacao({ ...c, displayOrder }))
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao reordenar");
    }
  };

  // Input de renomeação reutilizável
  const renderRenameInput = (item: ClassificacaoItem | CulturaItem) => (
    <input
      autoFocus
      type="text"
      value={renameDraft}
      onChange={(e) => setRenameDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commitRename(item);
        else if (e.key === "Escape") setRenaming(null);
      }}
      onBlur={() => commitRename(item)}
      className="px-2 py-1 rounded-lg border-2 border-primary/60 bg-white text-sm font-medium outline-none w-44"
    />
  );

  // ============================================================
  // Render
  // ============================================================

  // Determine which sections to show
  const showCulturas = !showOnlyClassifications;
  const showClassificacoes = !showOnlyCulturas;

  return (
    <div className="space-y-8">
      {/* Header — only shown when rendering both sections */}
      {!showOnlyCulturas && !showOnlyClassifications && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parametrização</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure as culturas e grupos de produtos do seu negócio.
            O sistema usará esses nomes em todos os relatórios e dashboards.
          </p>
        </div>
      )}

      {/* ========================================== */}
      {/* Section 1: Culturas */}
      {/* ========================================== */}
      {showCulturas && (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-green-500/10 text-green-600">
            <Sprout size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Culturas</h2>
            <p className="text-xs text-muted-foreground">
              Quais cultivos sua empresa trabalha? Esta é a lista usada no
              planejamento (VPM) — pra ligar/desligar itens do catálogo
              oficial do IBGE ou dar apelido a eles, use a aba{" "}
              <strong>Culturas</strong>, ao lado.
            </p>
          </div>
        </div>

        {/* Cultura list */}
        <div className="space-y-2 mb-4">
          {culturas.map((cultura, index) => (
            <motion.div
              key={cultura.id}
              layout
              draggable
              onDragStart={() => setDragCulturaIdx(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragCulturaIdx !== null) handleReorderCulturas(dragCulturaIdx, index);
                setDragCulturaIdx(null);
              }}
              onDragEnd={() => setDragCulturaIdx(null)}
              className={`rounded-xl border transition-all ${
                dragCulturaIdx === index ? "opacity-40" : ""
              } ${
                cultura.isActive
                  ? "bg-white/60 border-border/50"
                  : "bg-muted/20 border-border/20 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <GripVertical size={14} className="text-muted-foreground/40 cursor-grab" />
                  {renaming?.kind === "cultura" && renaming.id === cultura.id ? (
                    renderRenameInput(cultura)
                  ) : (
                    <span
                      className="font-medium text-sm cursor-text hover:bg-amber-50 rounded px-1 -mx-1 transition-colors"
                      title="Duplo clique para renomear"
                      onDoubleClick={() => startRename("cultura", cultura.id, cultura.customName)}
                    >
                      {cultura.customName}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded-full">
                    {cultura.internalKey}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpand(`cultura-aliases-${cultura.id}`)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
                  >
                    <Tag size={10} />
                    {cultura.aliases.length} apelido{cultura.aliases.length !== 1 && "s"}
                  </button>
                  <button
                    onClick={() =>
                      onSaveCultura({ ...cultura, isActive: !cultura.isActive })
                    }
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {cultura.isActive ? (
                      <ToggleRight size={20} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={20} />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteCulturaClick(cultura)}
                    className="text-muted-foreground/50 hover:text-destructive transition-colors"
                    title="Excluir cultura"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Apelidos panel */}
              <AnimatePresence>
                {expandedItems.has(`cultura-aliases-${cultura.id}`) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-1 border-t border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-bold">
                        Apelidos (nomes alternativos para matching do CSV/ERP)
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {/* O nome em uso aparece junto dos apelidos, mesmo padrão do
                            Grupo de Produtos — deixa claro qual rótulo vale hoje. */}
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          <Check size={10} />
                          {cultura.customName}
                          <span className="font-normal opacity-70">em uso</span>
                        </span>
                        {cultura.aliases.map((alias) => (
                          <span
                            key={alias}
                            className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-muted/40 text-[11px]"
                          >
                            {alias}
                            <button
                              onClick={() => handlePromoteCulturaAlias(cultura, alias)}
                              className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title={`Usar "${alias}" como nome desta cultura`}
                            >
                              usar como nome
                            </button>
                            <button
                              onClick={() => handleRemoveCulturaAlias(cultura, alias)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              title="Remover apelido"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Trocar o nome (duplo clique) sobrescreve sem guardar o anterior — pra
                        manter o reconhecimento de arquivos já importados, adicione o nome
                        antigo aqui como apelido antes de renomear.
                      </p>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={editingAliases[cultura.id] || ""}
                          onChange={(e) =>
                            setEditingAliases((p) => ({
                              ...p,
                              [cultura.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddCulturaAlias(cultura)
                          }
                          placeholder="Novo apelido..."
                          className="flex-1 px-3 py-1.5 rounded-lg border border-border/30 bg-white/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        <button
                          onClick={() => handleAddCulturaAlias(cultura)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Add Cultura */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newCulturaName}
            onChange={(e) => setNewCulturaName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateCultura()}
            placeholder="Nome da cultura (ex: Soja, Milho...)"
            className="flex-1 px-4 py-2 rounded-xl border border-border/50 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleCreateCultura}
            disabled={!newCulturaName.trim()}
            className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>

        {/* Totalizador */}
        {culturas.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{culturas.filter(c => c.isActive).length}</strong> cultura{culturas.filter(c => c.isActive).length !== 1 ? "s" : ""} ativa{culturas.filter(c => c.isActive).length !== 1 ? "s" : ""} de <strong className="text-foreground">{culturas.length}</strong> total
            </span>
            {culturas.some(c => !c.isActive) && (
              <span className="text-amber-600 font-medium">
                {culturas.filter(c => !c.isActive).length} desabilitada{culturas.filter(c => !c.isActive).length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </motion.section>
      )}

      {/* ========================================== */}
      {/* Section 2: Grupo de Produtos */}
      {/* ========================================== */}
      {showClassificacoes && (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
            <Layers size={20} />
          </div>
          <div>
            {onChangeLabelGrupoProduto && editingLabel ? (
              <input
                autoFocus
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={commitLabelGrupoProduto}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    setLabelDraft(labelGrupoProduto);
                    setEditingLabel(false);
                  }
                }}
                placeholder="Grupo de Produtos"
                className="text-lg font-semibold px-2 py-0.5 -mx-2 rounded-lg border-2 border-primary/60 bg-white outline-none w-56"
              />
            ) : onChangeLabelGrupoProduto ? (
              <button
                onClick={() => {
                  setLabelDraft(labelGrupoProduto);
                  setEditingLabel(true);
                }}
                className="text-lg font-semibold underline decoration-dotted decoration-blue-400 underline-offset-4 hover:text-blue-700 transition-colors"
                title="Clique pra dar seu próprio nome (ex.: Segmento)"
              >
                {labelGrupoProduto}
              </button>
            ) : (
              <h2 className="text-lg font-semibold">{labelGrupoProduto}</h2>
            )}
            <p className="text-xs text-muted-foreground">
              Como você organiza seu portfólio? Dê o nome que quiser
              {onChangeLabelGrupoProduto && (
                <>
                  {" "}— inclusive pro guarda-chuva em si, clicando no título
                  acima (ex.: chamar de &quot;Segmento&quot;).
                </>
              )}
            </p>
          </div>
        </div>

        {/* Classification tree */}
        <div className="space-y-3 mb-4">
          {roots.map((root, index) => {
            const children = getChildren(root.internalKey);
            const isExpanded = expandedItems.has(root.internalKey);

            return (
              <motion.div
                key={root.id}
                layout
                draggable
                onDragStart={() => setDragClassificacaoIdx(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragClassificacaoIdx !== null) handleReorderClassificacoes(dragClassificacaoIdx, index);
                  setDragClassificacaoIdx(null);
                }}
                onDragEnd={() => setDragClassificacaoIdx(null)}
                className={`space-y-1 ${dragClassificacaoIdx === index ? "opacity-40" : ""}`}
              >
                {/* Root classification */}
                <div
                  className={`rounded-xl border transition-all ${
                    root.isActive
                      ? "bg-white/60 border-border/50"
                      : "bg-muted/20 border-border/20 opacity-50"
                  }`}
                >
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <GripVertical
                        size={14}
                        className="text-muted-foreground/40 cursor-grab"
                      />
                      {/* Color swatch */}
                      <input
                        type="color"
                        value={root.color}
                        onChange={(e) => handleColorChange(root, e.target.value)}
                        className="w-5 h-5 rounded-full border-0 cursor-pointer p-0"
                        title="Cor nos gráficos"
                      />
                      {renaming?.kind === "classificacao" && renaming.id === root.id ? (
                        renderRenameInput(root)
                      ) : (
                        <span
                          className="font-medium text-sm cursor-text hover:bg-blue-50 rounded px-1 -mx-1 transition-colors"
                          title="Duplo clique para renomear"
                          onDoubleClick={() => startRename("classificacao", root.id, root.customName)}
                        >
                          {root.customName}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded-full">
                        {root.internalKey}
                      </span>
                      {children.length > 0 && (
                        <button
                          onClick={() => toggleExpand(root.internalKey)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Aliases count */}
                      <button
                        onClick={() => toggleExpand(`aliases-${root.id}`)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
                      >
                        <Tag size={10} />
                        {root.aliases.length} apelido{root.aliases.length !== 1 && "s"}
                      </button>
                      <button
                        onClick={() => handleToggleActive(root)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {root.isActive ? (
                          <ToggleRight size={20} className="text-green-500" />
                        ) : (
                          <ToggleLeft size={20} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteClassificacaoClick(root)}
                        className="text-muted-foreground/50 hover:text-destructive transition-colors"
                        title="Excluir grupo de produto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Aliases panel */}
                  <AnimatePresence>
                    {expandedItems.has(`aliases-${root.id}`) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 pt-1 border-t border-border/30">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-bold">
                            Apelidos (nomes alternativos para matching do CSV/ERP)
                          </p>
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            {/* O nome em uso aparece junto dos apelidos para deixar
                                claro qual dos rótulos está valendo hoje. */}
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              <Check size={10} />
                              {root.customName}
                              <span className="font-normal opacity-70">em uso</span>
                            </span>
                            {root.aliases.map((alias) => (
                              <span
                                key={alias}
                                className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-muted/40 text-[11px]"
                              >
                                {alias}
                                <button
                                  onClick={() => handlePromoteAlias(root, alias)}
                                  className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-emerald-700 hover:bg-emerald-100 transition-colors"
                                  title={`Usar "${alias}" como nome deste grupo de produto`}
                                >
                                  usar como nome
                                </button>
                                <button
                                  onClick={() => handleRemoveAlias(root, alias)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                  title="Remover apelido"
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground mb-2">
                            Trocar o nome mantém o código interno e move o nome anterior para
                            os apelidos, preservando o reconhecimento de arquivos já importados.
                          </p>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={editingAliases[root.id] || ""}
                              onChange={(e) =>
                                setEditingAliases((p) => ({
                                  ...p,
                                  [root.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleAddAlias(root)
                              }
                              placeholder="Novo apelido..."
                              className="flex-1 px-3 py-1.5 rounded-lg border border-border/30 bg-white/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                            <button
                              onClick={() => handleAddAlias(root)}
                              className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sub-classifications */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 space-y-1 overflow-hidden"
                    >
                      {children.map((child) => (
                        <div
                          key={child.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                            child.isActive
                              ? "bg-white/40 border-border/30"
                              : "bg-muted/10 border-border/10 opacity-40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={child.color}
                              onChange={(e) =>
                                handleColorChange(child, e.target.value)
                              }
                              className="w-4 h-4 rounded-full border-0 cursor-pointer p-0"
                            />
                            {renaming?.kind === "classificacao" && renaming.id === child.id ? (
                              renderRenameInput(child)
                            ) : (
                              <span
                                className="text-sm cursor-text hover:bg-blue-50 rounded px-1 -mx-1 transition-colors"
                                title="Duplo clique para renomear"
                                onDoubleClick={() => startRename("classificacao", child.id, child.customName)}
                              >
                                {child.customName}
                              </span>
                            )}
                            <span className="text-[9px] text-muted-foreground font-mono bg-muted/30 px-1.5 py-0.5 rounded-full">
                              {child.internalKey}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleActive(child)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {child.isActive ? (
                                <ToggleRight size={16} className="text-green-500" />
                              ) : (
                                <ToggleLeft size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteClassificacaoClick(child)}
                              className="text-muted-foreground/50 hover:text-destructive transition-colors"
                              title="Excluir subgrupo"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add sub-classification */}
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newSubClassName[root.internalKey] || ""}
                          onChange={(e) =>
                            setNewSubClassName((p) => ({
                              ...p,
                              [root.internalKey]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            handleCreateSubClassificacao(root.internalKey)
                          }
                          placeholder={`Nova sub de "${root.customName}"...`}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-dashed border-border/40 bg-white/30 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                        />
                        <button
                          onClick={() =>
                            handleCreateSubClassificacao(root.internalKey)
                          }
                          className="px-3 py-1.5 rounded-lg bg-muted/30 text-muted-foreground text-xs hover:bg-muted/50 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Add root classification */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateClassificacao()}
            placeholder="Nome do grupo de produto (ex: Defensivos, Sementes...)"
            className="flex-1 px-4 py-2 rounded-xl border border-border/50 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleCreateClassificacao}
            disabled={!newClassName.trim()}
            className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>
      </motion.section>
      )}
    </div>
  );
}

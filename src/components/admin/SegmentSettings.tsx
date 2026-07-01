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
} from "lucide-react";

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
  isActive: boolean;
  displayOrder: number;
}

interface SegmentSettingsProps {
  tenantId: string;
  classificacoes: ClassificacaoItem[];
  culturas: CulturaItem[];
  onSaveClassificacao: (item: ClassificacaoItem) => Promise<void>;
  onCreateClassificacao: (customName: string, parentKey?: string | null) => Promise<void>;
  onDeleteClassificacao: (id: string) => Promise<void>;
  onSaveCultura: (item: CulturaItem) => Promise<void>;
  onCreateCultura: (customName: string) => Promise<void>;
  onDeleteCultura: (id: string) => Promise<void>;
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
 * UI Label: "Classificação de Produtos" (not "Segmento")
 */
export function SegmentSettings({
  tenantId,
  classificacoes,
  culturas,
  onSaveClassificacao,
  onCreateClassificacao,
  onDeleteClassificacao,
  onSaveCultura,
  onCreateCultura,
  onDeleteCultura,
}: SegmentSettingsProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [newClassName, setNewClassName] = useState("");
  const [newSubClassName, setNewSubClassName] = useState<Record<string, string>>({});
  const [newCulturaName, setNewCulturaName] = useState("");
  const [editingAliases, setEditingAliases] = useState<Record<string, string>>({});

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

  const handleCreateClassificacao = async () => {
    if (!newClassName.trim()) return;
    await onCreateClassificacao(newClassName.trim());
    setNewClassName("");
  };

  const handleCreateSubClassificacao = async (parentKey: string) => {
    const name = newSubClassName[parentKey]?.trim();
    if (!name) return;
    await onCreateClassificacao(name, parentKey);
    setNewSubClassName((prev) => ({ ...prev, [parentKey]: "" }));
  };

  const handleCreateCultura = async () => {
    if (!newCulturaName.trim()) return;
    await onCreateCultura(newCulturaName.trim());
    setNewCulturaName("");
  };

  const handleAddAlias = async (item: ClassificacaoItem) => {
    const alias = editingAliases[item.id]?.trim();
    if (!alias) return;

    const updatedAliases = [...item.aliases, alias];
    await onSaveClassificacao({ ...item, aliases: updatedAliases });
    setEditingAliases((prev) => ({ ...prev, [item.id]: "" }));
  };

  const handleRemoveAlias = async (item: ClassificacaoItem, aliasToRemove: string) => {
    const updatedAliases = item.aliases.filter((a) => a !== aliasToRemove);
    await onSaveClassificacao({ ...item, aliases: updatedAliases });
  };

  const handleToggleActive = async (item: ClassificacaoItem) => {
    await onSaveClassificacao({ ...item, isActive: !item.isActive });
  };

  const handleColorChange = async (item: ClassificacaoItem, color: string) => {
    await onSaveClassificacao({ ...item, color });
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Parametrização</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure as culturas e classificações de produto do seu negócio.
          O sistema usará esses nomes em todos os relatórios e dashboards.
        </p>
      </div>

      {/* ========================================== */}
      {/* Section 1: Culturas */}
      {/* ========================================== */}
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
              Quais cultivos sua empresa trabalha?
            </p>
          </div>
        </div>

        {/* Cultura list */}
        <div className="space-y-2 mb-4">
          {culturas.map((cultura) => (
            <motion.div
              key={cultura.id}
              layout
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                cultura.isActive
                  ? "bg-white/60 border-border/50"
                  : "bg-muted/20 border-border/20 opacity-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <GripVertical size={14} className="text-muted-foreground/40 cursor-grab" />
                <span className="font-medium text-sm">{cultura.customName}</span>
                <span className="text-[10px] text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded-full">
                  {cultura.internalKey}
                </span>
              </div>
              <div className="flex items-center gap-2">
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
              </div>
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
      </motion.section>

      {/* ========================================== */}
      {/* Section 2: Classificação de Produtos */}
      {/* ========================================== */}
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
            <h2 className="text-lg font-semibold">Classificação de Produtos</h2>
            <p className="text-xs text-muted-foreground">
              Como você organiza seu portfólio? Dê o nome que quiser.
            </p>
          </div>
        </div>

        {/* Classification tree */}
        <div className="space-y-3 mb-4">
          {roots.map((root) => {
            const children = getChildren(root.internalKey);
            const isExpanded = expandedItems.has(root.internalKey);

            return (
              <motion.div key={root.id} layout className="space-y-1">
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
                      <span className="font-medium text-sm">{root.customName}</span>
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
                        {root.aliases.length} alias{root.aliases.length !== 1 && "es"}
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
                            Aliases (nomes alternativos para matching do CSV/ERP)
                          </p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {root.aliases.map((alias) => (
                              <span
                                key={alias}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted/40 text-[11px]"
                              >
                                {alias}
                                <button
                                  onClick={() => handleRemoveAlias(root, alias)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                          </div>
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
                              placeholder="Novo alias..."
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
                            <span className="text-sm">{child.customName}</span>
                            <span className="text-[9px] text-muted-foreground font-mono bg-muted/30 px-1.5 py-0.5 rounded-full">
                              {child.internalKey}
                            </span>
                          </div>
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
            placeholder="Nome da classificação (ex: Defensivos, Sementes...)"
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
    </div>
  );
}

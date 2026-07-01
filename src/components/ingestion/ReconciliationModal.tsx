"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, CheckCircle2, ChevronRight, Tag, ArrowRight } from "lucide-react";
import { TenantClassificacao } from "@/types/schema";

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  unmappedItems: string[];
  /** Available classifications from tenant dictionary (dynamic, not hardcoded) */
  availableClassifications: TenantClassificacao[];
  /** Called when user maps an alias to a classification. Saves alias in dictionary (learning loop). */
  onMap: (unmappedAlias: string, classificationId: string, classificationKey: string) => void;
}

/**
 * ReconciliationModal: "Câmara de Eco" (Smart Validation)
 * 
 * Updated for Dictionary Pattern:
 * - Shows classifications from tenant dictionary (not hardcoded)
 * - Saves alias mapping to dictionary (learning loop)
 * - Auto-enriches the dictionary to avoid repeated reconciliations
 * 
 * Per meeting Daniel × Marco Polo (16/06/2026):
 * "Cada um chama o que quiser... defensivos, mata-mato, veneno"
 */
export function ReconciliationModal({ 
  isOpen, 
  onClose, 
  unmappedItems, 
  availableClassifications,
  onMap,
}: ReconciliationModalProps) {
  // Track which items have been mapped in this session
  const [mappedItems, setMappedItems] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleMap = (alias: string, classification: TenantClassificacao) => {
    onMap(alias, classification.id, classification.internalKey);
    setMappedItems(prev => new Set(prev).add(alias));
  };

  const remainingItems = unmappedItems.filter(item => !mappedItems.has(item));
  const resolvedCount = mappedItems.size;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Blurred Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/40 backdrop-blur-xl"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg glass-card overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-8 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-accent/20 text-accent">
                <ShieldAlert size={24} />
              </div>
              <h2 className="text-xl font-bold">Conciliação Inteligente</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Encontramos <span className="font-bold text-foreground">{unmappedItems.length} classificação(ões)</span> não reconhecida(s) no CSV. 
              Associe cada uma à sua classificação para garantir o cálculo correto do TO-GO.
            </p>
            {resolvedCount > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 size={14} />
                <span>{resolvedCount} de {unmappedItems.length} resolvido(s) — aliases salvos automaticamente</span>
              </div>
            )}
          </div>

          {/* List of unmapped items */}
          <div className="px-8 max-h-[300px] overflow-y-auto space-y-4 py-4">
            {remainingItems.map((item) => (
              <motion.div 
                key={item} 
                layout
                className="p-4 rounded-2xl bg-muted/30 border border-border/50"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={12} className="text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    ORIGEM ERP: &quot;{item}&quot;
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2 text-[10px] text-muted-foreground">
                  <ArrowRight size={10} />
                  <span>Associar a qual classificação?</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableClassifications
                    .filter(c => c.isActive && c.parentKey === null)
                    .map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => handleMap(item, cls)}
                        className="px-4 py-2 rounded-full text-[10px] font-bold border transition-all uppercase tracking-tighter hover:scale-105"
                        style={{
                          borderColor: cls.color,
                          color: cls.color,
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = cls.color;
                          (e.target as HTMLElement).style.color = '#FFFFFF';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = 'transparent';
                          (e.target as HTMLElement).style.color = cls.color;
                        }}
                      >
                        {cls.customName}
                      </button>
                    ))}
                </div>
              </motion.div>
            ))}

            {/* All resolved state */}
            {remainingItems.length === 0 && resolvedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-8 text-center"
              >
                <div className="p-3 rounded-full bg-green-500/10 text-green-500 mb-3">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="font-semibold mb-1">Tudo conciliado!</h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Os aliases foram salvos no dicionário. Na próxima ingestão, 
                  esses nomes serão reconhecidos automaticamente.
                </p>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-muted/20 border-t flex justify-between items-center">
            <button 
              onClick={onClose}
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              IGNORAR POR ENQUANTO
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-full bg-foreground text-white text-xs font-bold flex items-center gap-2"
            >
              <span>CONCLUIR</span>
              <CheckCircle2 size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

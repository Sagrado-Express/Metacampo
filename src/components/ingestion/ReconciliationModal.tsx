"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, CheckCircle2, ChevronRight } from "lucide-react";

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  unmappedItems: string[];
  onMap: (item: string, segment: string) => void;
  availableSegments: string[];
}

/**
 * ReconciliationModal: "Câmara de Eco" (Smart Validation)
 * Elegant modal with background blur for resolving unmapped items.
 */
export function ReconciliationModal({ 
  isOpen, 
  onClose, 
  unmappedItems, 
  onMap, 
  availableSegments 
}: ReconciliationModalProps) {
  if (!isOpen) return null;

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
              Encontramos <span className="font-bold text-foreground">{unmappedItems.length} segmentos</span> não categorizados no CSV. 
              Deseja alocá-los agora para garantir o cálculo correto do TO-GO?
            </p>
          </div>

          {/* List of unmapped items */}
          <div className="px-8 max-h-[300px] overflow-y-auto space-y-4 py-4">
            {unmappedItems.map((item) => (
              <div key={item} className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                <div className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">ORIGEM ERP: "{item}"</div>
                <div className="flex flex-wrap gap-2">
                  {availableSegments.map((seg) => (
                    <button
                      key={seg}
                      onClick={() => onMap(item, seg)}
                      className="px-4 py-2 rounded-full text-[10px] font-bold border border-border bg-white hover:bg-primary hover:text-white hover:border-primary transition-all uppercase tracking-tighter"
                    >
                      {seg}
                    </button>
                  ))}
                </div>
              </div>
            ))}
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

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, AlertCircle } from "lucide-react";
import { validateSafeUpload } from "@/lib/security";

interface IngestionCenterProps {
  onUpload: (file: File) => Promise<void>;
  isProcessing: boolean;
  progress: number;
  error?: string | null;
  title?: string;
  description?: React.ReactNode;
}

/**
 * IngestionCenter: "Sand & Glass" Central de Ingestão
 * Features glassmorphism, drag-and-drop, and pill-style progress bar.
 */
export function IngestionCenter({
  onUpload,
  isProcessing,
  progress,
  error,
  title = 'Câmara de Ingestão',
  description = (
    <>
      Arraste o extrato YTD (.csv) do seu ERP legado <br />
      para atualizar o Saldo TO-GO em tempo real.
    </>
  ),
}: IngestionCenterProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const validationError = validateSafeUpload(file, 50);
      if (!validationError) {
        onUpload(file);
      } else {
        alert(validationError); // Ou integrar com o state `error` se possível
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8">
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative p-12 flex flex-col items-center justify-center border-2 border-dashed transition-all duration-500
          rounded-[24px] backdrop-blur-md
          ${isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border bg-white/40"}
          ${isProcessing ? "pointer-events-none opacity-80" : "cursor-pointer"}
        `}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute top-4 right-4">
          <div className="h-2 w-2 rounded-full bg-primary/20 animate-ping" />
        </div>

        <div className="mb-6 p-4 rounded-full bg-primary/10 text-primary">
          <UploadCloud size={48} />
        </div>

        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm text-center mb-8">{description}</p>

        {/* Action Button */}
        <input
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          id="csv-upload"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const validationError = validateSafeUpload(file, 50);
              if (!validationError) {
                onUpload(file);
              } else {
                alert(validationError);
              }
            }
          }}
        />
        <label
          htmlFor="csv-upload"
          className="px-8 py-3 rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          Selecionar Arquivo
        </label>

        {/* Progress Display */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-8 w-full max-w-xs"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Processando em Memória</span>
                <span className="text-[10px] font-tabular font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="pill-progress-container">
                <motion.div 
                  className="pill-progress-fill" 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 flex items-center gap-2 text-destructive text-sm"
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

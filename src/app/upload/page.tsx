"use client";

import React, { useState, useRef } from "react";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Trash2, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { validateSafeUpload } from "@/lib/security";

interface DocumentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

export default function DocumentUploadPage() {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const simulateUpload = (newFile: DocumentFile) => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 15) + 5;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setFiles(prev =>
          prev.map(f =>
            f.id === newFile.id ? { ...f, progress: 100, status: "success" } : f
          )
        );
      } else {
        setFiles(prev =>
          prev.map(f =>
            f.id === newFile.id ? { ...f, progress: currentProgress } : f
          )
        );
      }
    }, 200);
  };

  const processFiles = (uploadedFiles: FileList) => {
    Array.from(uploadedFiles).forEach(file => {
      // 1. Validação Segura de Arquivos (Tamanho e Tipo)
      const validationError = validateSafeUpload(file, 50); // 50MB máximo
      
      const newFile: DocumentFile = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        progress: 0,
        status: validationError ? "error" : "uploading",
        error: validationError || undefined
      };

      setFiles(prev => [newFile, ...prev]);

      if (!validationError) {
        simulateUpload(newFile);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-primary/30">
      
      {/* Dynamic/Vibrant Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur-md px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
              <Upload className="text-emerald-400 w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white uppercase leading-none">
                Câmara de Documentos
              </h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Upload Seguro • Isolado de Produção
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Sessão Criptografada
          </div>
        </div>
      </header>

      {/* Main Upload Space */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 flex flex-col gap-8 justify-center">
        
        {/* Intro */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Upload de Arquivos & Contratos
          </h2>
          <p className="text-sm text-slate-400">
            Arraste seus documentos ou relatórios para processamento imediato em memória. Sem gravação em disco para segurança total da informação.
          </p>
        </div>

        {/* Upload Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`relative group border-2 border-dashed rounded-3xl p-10 md:p-16 text-center cursor-pointer transition-all duration-300 ${
            dragActive
              ? "border-emerald-400 bg-emerald-500/5 shadow-2xl shadow-emerald-500/10"
              : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          
          <div className="flex flex-col items-center justify-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
              dragActive 
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 scale-110" 
                : "bg-slate-900 border-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:border-slate-700"
            }`}>
              <Upload className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-200">
                Arraste e solte arquivos aqui, ou <span className="text-emerald-400 underline decoration-2 underline-offset-4 font-bold">navegue</span>
              </p>
              <p className="text-xs text-slate-500">
                Suporta PDF, CSV, XLSX, DOCX e Imagens de até 50MB
              </p>
            </div>
          </div>
        </div>

        {/* Document List */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Arquivos em processamento ({files.length})
                </span>
                <button 
                  onClick={() => setFiles([])}
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 font-bold uppercase tracking-wider"
                >
                  Limpar tudo
                </button>
              </div>

              <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-1">
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                        <FileText className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-200 truncate leading-none">
                            {file.name}
                          </p>
                          <span className="text-[10px] text-slate-500 font-bold shrink-0">
                            {formatBytes(file.size)}
                          </span>
                        </div>
                        
                        {/* Progress Bar / Info */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-800 h-1 rounded-full overflow-hidden">
                            <motion.div 
                              className="bg-emerald-400 h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${file.progress}%` }}
                              transition={{ duration: 0.1 }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 shrink-0">
                            {file.progress}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {file.status === "success" && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      )}
                      {file.status === "uploading" && (
                        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      )}
                      {file.status === "error" && (
                        <div className="flex flex-col items-end">
                          <AlertCircle className="w-5 h-5 text-rose-500 mb-1" />
                        </div>
                      )}
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 px-8 text-center text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em]">
        MetaCampo Ingestion Engine • Zero-Footprint Security Scheme
      </footer>
    </div>
  );
}

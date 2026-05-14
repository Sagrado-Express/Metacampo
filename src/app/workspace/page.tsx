"use client";

import React, { useState } from "react";
import { IngestionCenter } from "@/components/ingestion/IngestionCenter";
import { ReconciliationModal } from "@/components/ingestion/ReconciliationModal";
import { PacingSpeedometer } from "@/components/dashboard/PacingSpeedometer";
import { HuntingRadar } from "@/components/dashboard/HuntingRadar";
import { IngestionMapper } from "@/domain/services/ingestionMapper";
import { motion } from "framer-motion";
import { LucideLayoutDashboard, LucideSettings, LucideUsers, LucideLogOut } from "lucide-react";

/**
 * METACAMPO SaaS (Premium Edition) - Main Workspace
 * Assembles the Executive Cockpit and Hunting Radar.
 */
export default function WorkspacePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [unmappedSegments, setUnmappedSegments] = useState<string[]>([]);
  
  // Mock Data for initial state
  const mockPacing = {
    realized: 450000,
    target: 1000000,
    shadowTarget: 500000,
  };

  const mockClients = [
    { id: "1", name: "Fazenda Sol Nascente", city: "Rio Verde - GO", vpmTotal: 850000, realizedMonth: 0, toGoMonth: 850000, pareto: "AZUL" as const },
    { id: "2", name: "Agropecuária Horizonte", city: "Jataí - GO", vpmTotal: 600000, realizedMonth: 150000, toGoMonth: 450000, pareto: "AZUL" as const },
    { id: "3", name: "Sítio Primavera", city: "Cristalina - GO", vpmTotal: 300000, realizedMonth: 0, toGoMonth: 300000, pareto: "VERDE" as const },
    { id: "4", name: "Fazenda Bela Vista", city: "Sorriso - MT", vpmTotal: 1200000, realizedMonth: 800000, toGoMonth: 400000, pareto: "AZUL" as const },
  ];

  const handleUpload = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    
    // Simulate processing steps
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Read file and check for anomalies
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const anomalies = IngestionMapper.identifyAnomalies(text, ["Sementes", "Fertilizantes", "Agroquímicos", "Nutrição", "Biológicos"]);
      
      if (anomalies.length > 0) {
        setUnmappedSegments(anomalies);
        setShowReconciliation(true);
      }
      
      setTimeout(() => {
        setIsProcessing(false);
        // Here we would update the state with actual processed data
      }, 2500);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar (Minimalist Premium) */}
      <aside className="w-20 lg:w-64 border-r border-border/50 flex flex-col p-6 bg-white/20 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl">M</div>
          <span className="hidden lg:block font-black text-xl tracking-tighter">METACAMPO</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          <NavItem icon={<LucideLayoutDashboard />} label="Cockpit" active />
          <NavItem icon={<LucideUsers />} label="Carteira" />
          <NavItem icon={<LucideSettings />} label="Ajustes" />
        </nav>

        <button className="mt-auto flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-destructive transition-colors">
          <LucideLogOut size={20} />
          <span className="hidden lg:block font-bold text-xs uppercase tracking-widest">Sair</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2">Workspace Executivo</h1>
            <p className="text-muted-foreground">Bem-vindo à Safra 26/27. Seu Saldo TO-GO aguarda ação.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="px-6 py-3 rounded-2xl glass-card border-primary/20 flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest">Live: Faturamento YTD</span>
             </div>
          </div>
        </header>

        {/* Executive Cockpit Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-1">
            <PacingSpeedometer 
              label="Realizado vs Meta Global"
              realized={mockPacing.realized}
              target={mockPacing.target}
              shadowTarget={mockPacing.shadowTarget}
            />
          </div>
          
          <div className="lg:col-span-2">
            <div className="glass-card p-8 h-full flex flex-col justify-center">
              <h3 className="text-xl font-bold mb-6">Câmara de Ingestão</h3>
              <IngestionCenter 
                onUpload={handleUpload}
                isProcessing={isProcessing}
                progress={progress}
              />
            </div>
          </div>
        </section>

        {/* Hunting Radar Section */}
        <section>
          <HuntingRadar clients={mockClients} />
        </section>
      </main>

      {/* Reconciliation Modal */}
      <ReconciliationModal 
        isOpen={showReconciliation}
        onClose={() => setShowReconciliation(false)}
        unmappedItems={unmappedSegments}
        availableSegments={["Sementes", "Fertilizantes", "Agroquímicos", "Nutrição", "Biológicos"]}
        onMap={(item, seg) => console.log(`Mapping ${item} to ${seg}`)}
      />
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`
      w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all
      ${active ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}
    `}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
      <span className="hidden lg:block font-bold text-xs uppercase tracking-widest">{label}</span>
    </button>
  );
}

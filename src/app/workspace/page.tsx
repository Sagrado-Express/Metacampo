"use client";

import React, { useState, useMemo } from "react";
import { IngestionCenter } from "@/components/ingestion/IngestionCenter";
import { ReconciliationModal } from "@/components/ingestion/ReconciliationModal";
import { PacingSpeedometer } from "@/components/dashboard/PacingSpeedometer";
import { HuntingRadar } from "@/components/dashboard/HuntingRadar";
import { IngestionMapper } from "@/domain/services/ingestionMapper";
import { MOCK_TEST_DATA } from "@/data/mock_database";
import { motion } from "framer-motion";
import { LayoutDashboard, Settings, Users, LogOut } from "lucide-react";

/**
 * METACAMPO SaaS (Premium Edition) - Main Workspace
 * Assembles the Executive Cockpit and Hunting Radar.
 */
import { MONTHLY_MASTER_BASE } from "@/data/monthly_master";

import { ExecutiveCockpit } from "@/components/dashboard/ExecutiveCockpit";

export default function WorkspacePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [unmappedSegments, setUnmappedSegments] = useState<string[]>([]);
  
  // Real data mapping for the Hunting Radar (The "Map")
  const radarClients = useMemo(() => {
    return MOCK_TEST_DATA.map(d => {
      // Calculate VPM based on standard ITAA factor (3500 R$/ha)
      const vpmTotal = (d.areas.soja + d.areas.milho + d.areas.algodao + d.areas.cana + d.areas.cafe) * 3500;
      
      // Get realized from MONTHLY_MASTER_BASE for this client (using CTV as proxy for now)
      const realized = MONTHLY_MASTER_BASE
        .filter(m => m.ctvId === "CTV01" && m.mes === "05") // Simulation
        .reduce((acc, curr) => acc + curr.realizado, 0) / 10; // Divided among clients

      return {
        id: d.id,
        name: d.name,
        city: `${d.city} - ${d.uf}`,
        vpmTotal: vpmTotal,
        realizedMonth: realized,
        toGoMonth: Math.max(0, vpmTotal - realized),
        pareto: d.rating === 'A' ? "AZUL" as const : "VERDE" as const
      };
    });
  }, []);

  const handleUpload = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

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
      }, 2500);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-12">
      {/* Executive Cockpit (RLS Simulation) */}
      <ExecutiveCockpit />

      <div className="p-8 lg:p-12 space-y-16">
        {/* Hunting Radar Section (The "Map" of Opportunities) */}
        <section>
          <HuntingRadar clients={radarClients} />
        </section>

        {/* Ingestion & Pipeline Section */}
        <section className="grid grid-cols-1 gap-10">
          <div className="glass-card-premium p-10 h-full flex flex-col justify-center border-primary/5">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h3 className="text-2xl font-black tracking-tight">Câmara de Ingestão</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Processamento Memory-First • Edge Runtime</p>
              </div>
              <div className="px-4 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full glow-primary">Automated Pipeline</div>
            </div>
            <IngestionCenter 
              onUpload={handleUpload}
              isProcessing={isProcessing}
              progress={progress}
            />
          </div>
        </section>

        {/* Reconciliation Modal */}
        <ReconciliationModal 
          isOpen={showReconciliation}
          onClose={() => setShowReconciliation(false)}
          unmappedItems={unmappedSegments}
          availableSegments={["Sementes", "Fertilizantes", "Agroquímicos", "Nutrição", "Biológicos"]}
          onMap={(item, seg) => console.log(`Mapping ${item} to ${seg}`)}
        />
      </div>
    </div>
  );
}




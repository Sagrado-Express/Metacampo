"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { IngestionCenter } from "@/components/ingestion/IngestionCenter";
import { ReconciliationModal } from "@/components/ingestion/ReconciliationModal";
import { PacingSpeedometer } from "@/components/dashboard/PacingSpeedometer";
import { HuntingRadar } from "@/components/dashboard/HuntingRadar";
import { IngestionMapper } from "@/domain/services/ingestionMapper";
import { MOCK_TEST_DATA } from "@/data/mock_database";
import { motion } from "framer-motion";
import { LayoutDashboard, Settings, Users, LogOut, Loader2 } from "lucide-react";
import { useSegmentDictionary } from "@/hooks/useSegmentDictionary";

/**
 * METACAMPO SaaS (Premium Edition) - Main Workspace
 * Assembles the Executive Cockpit and Hunting Radar.
 */
import { MONTHLY_MASTER_BASE } from "@/data/monthly_master";

import { ExecutiveCockpit } from "@/components/dashboard/ExecutiveCockpit";

import { useEffect } from "react";

export default function WorkspacePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [unmappedSegments, setUnmappedSegments] = useState<string[]>([]);
  
  const [dbClients, setDbClients] = useState<any[]>([]);
  const [faturamentoList, setFaturamentoList] = useState<any[]>([]);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
          
          // Fetch real db clients and faturamento snapshots
          const [clientsRes, faturamentoRes] = await Promise.all([
            fetch("/api/clientes"),
            fetch("/api/faturamento")
          ]);
          if (clientsRes.ok) {
            const clientsData = await clientsRes.json();
            setDbClients(clientsData);
          }
          if (faturamentoRes.ok) {
            const faturamentoData = await faturamentoRes.json();
            setFaturamentoList(faturamentoData);
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const tenantId = session?.user?.app_metadata?.tenant_id || "00000000-0000-0000-0000-000000000000";
  const { classifications, invertedMap, invalidate } = useSegmentDictionary(tenantId);
  
  // Real data mapping for the Hunting Radar (The "Map")
  const radarClients = useMemo(() => {
    const clientsSource = dbClients.length > 0 ? dbClients : MOCK_TEST_DATA.map(d => {
      const totalArea = d.areas.soja + d.areas.milho + d.areas.algodao + d.areas.cana + d.areas.cafe;
      return {
        id: d.id,
        name: d.name,
        city: d.city,
        state: d.uf,
        vpmTotalCentavos: totalArea * 3500 * 100,
        areas: [
          { cropName: "Soja", areaHa: d.areas.soja },
          { cropName: "Milho", areaHa: d.areas.milho },
          { cropName: "Algodão", areaHa: d.areas.algodao },
          { cropName: "Cana", areaHa: d.areas.cana },
          { cropName: "Café", areaHa: d.areas.cafe }
        ],
        performanceBand: d.rating === 'A' ? "AZUL" : "VERDE"
      };
    });

    return clientsSource.map(d => {
      const vpmTotal = (d.vpmTotalCentavos || 0) / 100;
      
      const relevantFaturamento = faturamentoList.filter(f => f.id_ctv === d.ctvId || f.id_ctv === "CTV01");
      const realized = relevantFaturamento.length > 0 
        ? relevantFaturamento.reduce((acc, curr) => acc + (curr.valor_realizado_centavos || 0), 0) / 100 / 10
        : (MONTHLY_MASTER_BASE.filter(m => m.ctvId === "CTV01" && m.mes === "05").reduce((acc, curr) => acc + curr.realizado, 0) / 10);

      const sojaHa = d.areas?.find((a: any) => a.cropName?.toUpperCase() === 'SOJA')?.areaHa || 0;
      const milhoHa = d.areas?.find((a: any) => a.cropName?.toUpperCase() === 'MILHO')?.areaHa || 0;
      const algodaoHa = d.areas?.find((a: any) => a.cropName?.toUpperCase() === 'ALGODAO')?.areaHa || 0;
      const canaHa = d.areas?.find((a: any) => a.cropName?.toUpperCase() === 'CANA')?.areaHa || 0;
      const cafeHa = d.areas?.find((a: any) => a.cropName?.toUpperCase() === 'CAFE')?.areaHa || 0;

      const recommendedInputs = 
        (sojaHa * 1800) + 
        (milhoHa * 1200) + 
        (algodaoHa * 3500) + 
        (canaHa * 2000) + 
        (cafeHa * 2500);
      
      const deficitTecnico = Math.max(0, recommendedInputs - realized);

      return {
        id: d.id,
        name: d.name,
        city: `${d.city} - ${d.state || d.uf || ''}`,
        vpmTotal: vpmTotal,
        realizedMonth: realized,
        toGoMonth: Math.max(0, vpmTotal - realized),
        pareto: d.performanceBand === 'AZUL' || d.rating === 'A' ? "AZUL" as const : "VERDE" as const,
        deficitTecnico
      };
    });
  }, [dbClients, faturamentoList]);

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
      const mapObj = new Map(Object.entries(invertedMap));
      const anomalies = IngestionMapper.identifyAnomalies(text, mapObj);
      
      if (anomalies.length > 0) {
        setUnmappedSegments(anomalies);
        setShowReconciliation(true);
      } else {
        const { data: aggregatedData } = IngestionMapper.aggregateBilling(text, mapObj);
        try {
          const response = await fetch("/api/faturamento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(aggregatedData.map(item => ({
              mes: "05",
              ctvId: item.ctvId || "CTV01",
              segmentId: item.segmentId,
              realizedValue: item.realizedValue || 0,
              targetValue: (item.realizedValue || 0) * 1.2
            })))
          });
          if (response.ok) {
            const updatedFat = await fetch("/api/faturamento").then(r => r.json());
            setFaturamentoList(updatedFat);
          }
        } catch (err) {
          console.error("Error saving faturamento:", err);
        }
      }
      
      setTimeout(() => {
        setIsProcessing(false);
      }, 2500);
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

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

        {/* Reconciliation Modal — Dynamic from tenant dictionary */}
        <ReconciliationModal 
          isOpen={showReconciliation}
          onClose={() => setShowReconciliation(false)}
          unmappedItems={unmappedSegments}
          availableClassifications={classifications.filter(c => c.isActive)}
          onMap={async (alias, classId, classKey) => {
            console.log(`[Learning Loop] Mapping "${alias}" → ${classKey} (${classId})`);
            try {
              const response = await fetch("/api/classifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  tenantId,
                  id: classId,
                  newAlias: alias,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erro desconhecido");
              }

              invalidate(); // Refresh dictionary cache & UI
            } catch (err: any) {
              console.error("Erro ao mapear alias:", err);
              alert(`Erro ao salvar mapeamento: ${err.message}`);
            }
          }}
        />
      </div>
    </div>
  );
}




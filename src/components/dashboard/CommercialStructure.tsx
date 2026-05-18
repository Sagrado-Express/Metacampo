"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LucideNetwork, 
  LucideMapPin, 
  LucideUserCheck, 
  LucideDollarSign, 
  LucideBuilding, 
  LucideChevronRight,
  LucideFilter,
  LucideShield,
  LucideUsers,
  LucideTrendingUp,
  LucideGauge,
  LucideFileSpreadsheet,
  LucideActivity
} from "lucide-react";
import { MOCK_TEST_DATA } from "@/data/mock_database";
import { MONTHLY_MASTER_BASE } from "@/data/monthly_master";

// Coordinates for visual layout of Brazil's agricultural regions
const TERRITORY_COORDINATES: Record<string, { x: number; y: number; state: string }> = {
  "Sorriso": { x: 38, y: 32, state: "MT" },
  "Sinop": { x: 40, y: 25, state: "MT" },
  "Lucas do Rio Verde": { x: 37, y: 39, state: "MT" },
  "Sapezal": { x: 25, y: 42, state: "MT" },
  "Rio Verde": { x: 54, y: 58, state: "GO" },
  "Jataí": { x: 49, y: 63, state: "GO" },
  "Unaí": { x: 68, y: 53, state: "MG" },
  "Luís Eduardo Magalhães": { x: 78, y: 38, state: "BA" },
  "Cascavel": { x: 44, y: 82, state: "PR" }
};

interface TerritoryNode {
  city: string;
  uf: string;
  ctvs: string[];
  totalVpm: number;
  clientCount: number;
  topRating: string;
  areas: { soja: number; milho: number; algodao: number; cana: number; cafe: number };
}

export function CommercialStructure() {
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [selectedCtv, setSelectedCtv] = useState<string | null>(null);
  const [hoveredTerritory, setHoveredTerritory] = useState<string | null>(null);

  // 1. Process database hierarchy & data consolidation
  const processedData = useMemo(() => {
    const director = "Onório Dias";
    const managers: Record<string, Set<string>> = {};
    const ctvData: Record<string, { manager: string; territories: Set<string>; vpm: number; realized: number; clients: number; areas: typeof initialAreas }> = {};
    const territories: Record<string, TerritoryNode> = {};
    
    const initialAreas = { soja: 0, milho: 0, algodao: 0, cana: 0, cafe: 0 };
    let totalPortfolioAreas = { ...initialAreas };

    MOCK_TEST_DATA.forEach(client => {
      // Setup Managers -> CTVs relation
      if (!managers[client.gerente]) {
        managers[client.gerente] = new Set();
      }
      managers[client.gerente].add(client.ctv);

      // Areas sum
      totalPortfolioAreas.soja += client.areas.soja;
      totalPortfolioAreas.milho += client.areas.milho;
      totalPortfolioAreas.algodao += client.areas.algodao;
      totalPortfolioAreas.cana += client.areas.cana;
      totalPortfolioAreas.cafe += client.areas.cafe;

      // Setup CTV details
      if (!ctvData[client.ctv]) {
        ctvData[client.ctv] = {
          manager: client.gerente,
          territories: new Set(),
          vpm: 0,
          realized: 0,
          clients: 0,
          areas: { ...initialAreas }
        };
      }
      const cData = ctvData[client.ctv];
      cData.territories.add(client.city);
      cData.clients += 1;
      cData.areas.soja += client.areas.soja;
      cData.areas.milho += client.areas.milho;
      cData.areas.algodao += client.areas.algodao;
      cData.areas.cana += client.areas.cana;
      cData.areas.cafe += client.areas.cafe;
      
      const vpmClient = (client.areas.soja + client.areas.milho + client.areas.algodao + client.areas.cana + client.areas.cafe) * 3500;
      cData.vpm += vpmClient;

      // Realized calculation (from MONTHLY_MASTER_BASE using CTV as proxy for now)
      const ctvRealized = MONTHLY_MASTER_BASE
        .filter(m => m.ctvId === "CTV01") // Mocked link
        .reduce((acc, curr) => acc + curr.realizado, 0) / 10; // Divided among our Mocked database clients
      cData.realized += ctvRealized;

      // Setup Territory breakdown
      if (!territories[client.city]) {
        territories[client.city] = {
          city: client.city,
          uf: client.uf,
          ctvs: [],
          totalVpm: 0,
          clientCount: 0,
          topRating: "E",
          areas: { ...initialAreas }
        };
      }
      const t = territories[client.city];
      if (!t.ctvs.includes(client.ctv)) t.ctvs.push(client.ctv);
      t.totalVpm += vpmClient;
      t.clientCount += 1;
      t.areas.soja += client.areas.soja;
      t.areas.milho += client.areas.milho;
      t.areas.algodao += client.areas.algodao;
      t.areas.cana += client.areas.cana;
      t.areas.cafe += client.areas.cafe;
      if (client.rating < t.topRating) t.topRating = client.rating;
    });

    // Consolidate Manager profiles for Director's dashboard
    const managerProfiles = Object.entries(managers).map(([mName, ctvsSet]) => {
      const ctvs = Array.from(ctvsSet);
      let mVpm = 0;
      let mRealized = 0;
      let mClients = 0;
      let mAreas = { ...initialAreas };

      ctvs.forEach(ctv => {
        const cMeta = ctvData[ctv];
        mVpm += cMeta.vpm;
        mRealized += cMeta.realized;
        mClients += cMeta.clients;
        mAreas.soja += cMeta.areas.soja;
        mAreas.milho += cMeta.areas.milho;
        mAreas.algodao += cMeta.areas.algodao;
        mAreas.cana += cMeta.areas.cana;
        mAreas.cafe += cMeta.areas.cafe;
      });

      return {
        name: mName,
        ctvs,
        vpm: mVpm,
        realized: mRealized,
        clients: mClients,
        areas: mAreas
      };
    });

    return {
      director,
      managers: managerProfiles,
      ctvData,
      territories: Object.values(territories),
      totalPortfolioAreas
    };
  }, []);

  // 2. Filters
  const filteredTerritories = useMemo(() => {
    return processedData.territories.filter(t => {
      if (selectedCtv) {
        return t.ctvs.includes(selectedCtv);
      }
      if (selectedManager) {
        const managerCtvs = processedData.managers.find(m => m.name === selectedManager)?.ctvs || [];
        return t.ctvs.some(ctv => managerCtvs.includes(ctv));
      }
      return true;
    });
  }, [processedData, selectedManager, selectedCtv]);

  // 3. Consolidated Statistics & Metrics for Director/Manager Cockpit
  const stats = useMemo(() => {
    const totalCtvs = Object.keys(processedData.ctvData).length;
    const activeStates = new Set(filteredTerritories.map(t => t.uf)).size;
    const totalPotential = filteredTerritories.reduce((acc, curr) => acc + curr.totalVpm, 0);
    const totalClients = filteredTerritories.reduce((acc, curr) => acc + curr.clientCount, 0);
    
    // Sum areas for the selected filter
    const currentAreas = { soja: 0, milho: 0, algodao: 0, cana: 0, cafe: 0 };
    filteredTerritories.forEach(t => {
      currentAreas.soja += t.areas.soja;
      currentAreas.milho += t.areas.milho;
      currentAreas.algodao += t.areas.algodao;
      currentAreas.cana += t.areas.cana;
      currentAreas.cafe += t.areas.cafe;
    });

    // Calculate actual billing from master base
    let realizedValue = 0;
    if (selectedCtv) {
      realizedValue = processedData.ctvData[selectedCtv]?.realized || 0;
    } else if (selectedManager) {
      realizedValue = processedData.managers.find(m => m.name === selectedManager)?.realized || 0;
    } else {
      realizedValue = processedData.managers.reduce((acc, curr) => acc + curr.realized, 0);
    }

    const walletShare = totalPotential > 0 ? (realizedValue / totalPotential) * 100 : 0;
    const totalHectares = currentAreas.soja + currentAreas.milho + currentAreas.algodao + currentAreas.cana + currentAreas.cafe;

    // Technical input deficit (Passo 5 - Agro 4.0 Governance)
    // Recommend: Soja 1800 R$/ha, Milho 1200 R$/ha, Algodao 3500 R$/ha, Cana 2000 R$/ha, Cafe 2500 R$/ha
    const recommendedInputsTotal = 
      (currentAreas.soja * 1800) + 
      (currentAreas.milho * 1200) + 
      (currentAreas.algodao * 3500) + 
      (currentAreas.cana * 2000) + 
      (currentAreas.cafe * 2500);

    const inputCoverageGap = Math.max(0, recommendedInputsTotal - realizedValue);

    return {
      activeCtvs: selectedManager 
        ? (processedData.managers.find(m => m.name === selectedManager)?.ctvs.length || 0)
        : totalCtvs,
      activeStates,
      totalPotential,
      totalClients,
      realizedValue,
      walletShare,
      totalHectares,
      currentAreas,
      recommendedInputsTotal,
      inputCoverageGap
    };
  }, [processedData, filteredTerritories, selectedManager, selectedCtv]);

  const handleResetFilters = () => {
    setSelectedManager(null);
    setSelectedCtv(null);
  };

  return (
    <div className="space-y-10 w-full max-w-7xl mx-auto p-8 lg:p-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/60">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
            <LucideNetwork className="text-primary h-9 w-9" />
            Estrutura Comercial & Territórios
          </h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium">
            Painel Executivo de Governança Comercial e Mapeamento de Potencial (GTM-GC)
          </p>
        </div>
        
        {(selectedManager || selectedCtv) && (
          <button 
            onClick={handleResetFilters}
            className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/20 transition-all cursor-pointer shadow-sm"
          >
            <LucideFilter size={14} />
            Limpar Filtros
          </button>
        )}
      </div>

      {/* KPI Dashboard - High Level Director's Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card-premium p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-black uppercase tracking-widest">Estados Ativos</span>
            <LucideMapPin className="text-primary h-5 w-5" />
          </div>
          <div className="mt-4">
            <span className="text-4xl font-black text-foreground">{stats.activeStates}</span>
            <span className="text-xs text-muted-foreground block mt-1">UFs sob Operação</span>
          </div>
        </div>

        <div className="glass-card-premium p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-black uppercase tracking-widest">Wallet Share</span>
            <LucideGauge className="text-primary h-5 w-5" />
          </div>
          <div className="mt-4">
            <span className="text-4xl font-black text-foreground">{stats.walletShare.toFixed(1)}%</span>
            <span className="text-xs text-muted-foreground block mt-1">Taxa de Penetração</span>
          </div>
        </div>

        <div className="glass-card-premium p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-black uppercase tracking-widest">Área Coberta</span>
            <LucideActivity className="text-primary h-5 w-5" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-foreground font-tabular">
              {new Intl.NumberFormat("pt-BR").format(stats.totalHectares)} ha
            </span>
            <span className="text-xs text-muted-foreground block mt-1">Total de Área Mapeada</span>
          </div>
        </div>

        <div className="glass-card-premium p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-black uppercase tracking-widest">Potencial (VPM)</span>
            <LucideDollarSign className="text-primary h-5 w-5" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-foreground font-tabular">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(stats.totalPotential)}
            </span>
            <span className="text-xs text-muted-foreground block mt-1">VPM Total do Portfólio</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Structure Tree on Left, Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Organization & Regional Managers Ranking */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Org Tree */}
          <div className="glass-card-premium p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-border/40 pb-4">
              <LucideShield className="text-primary" />
              <h3 className="text-lg font-black text-foreground uppercase tracking-wider">Organograma Comercial</h3>
            </div>

            {/* Director (Root) */}
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-white border border-border/80 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary/70">Diretor Comercial</span>
                  <h4 className="text-base font-black text-foreground">{processedData.director}</h4>
                </div>
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xs font-black">
                  DIR
                </div>
              </div>

              {/* Connector line */}
              <div className="pl-6 border-l-2 border-dashed border-border/80 space-y-6">
                
                {/* Managers */}
                {processedData.managers.map(manager => {
                  const isManagerSelected = selectedManager === manager.name;
                  return (
                    <div key={manager.name} className="space-y-4 relative">
                      <button
                        onClick={() => {
                          setSelectedManager(isManagerSelected ? null : manager.name);
                          setSelectedCtv(null); // Reset CTV filter
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                          isManagerSelected 
                            ? "bg-primary/5 border-primary shadow-sm" 
                            : "bg-white border-border/80 hover:border-primary/40 shadow-inner"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">Gerente Regional (G0)</span>
                            <h5 className="text-sm font-black text-foreground">{manager.name}</h5>
                            <span className="text-[9px] font-bold text-muted-foreground block mt-1">
                              {manager.ctvs.length} CTVs • {manager.clients} Contas
                            </span>
                          </div>
                          <LucideChevronRight 
                            size={16} 
                            className={`text-muted-foreground transition-transform ${isManagerSelected ? "rotate-90 text-primary" : ""}`} 
                          />
                        </div>
                      </button>

                      {/* CTVs under this manager (collapsible) */}
                      <AnimatePresence>
                        {isManagerSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pl-6 border-l border-primary/20 space-y-2 overflow-hidden"
                          >
                            {manager.ctvs.map(ctv => {
                              const isCtvSelected = selectedCtv === ctv;
                              const ctvMeta = processedData.ctvData[ctv];
                              return (
                                <button
                                  key={ctv}
                                  onClick={() => setSelectedCtv(isCtvSelected ? null : ctv)}
                                  className={`w-full text-left p-3 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                                    isCtvSelected 
                                      ? "bg-primary text-white border-primary shadow-md" 
                                      : "bg-white border-border/60 text-foreground hover:bg-muted/30"
                                  }`}
                                >
                                  <div>
                                    <span className={`text-[7px] font-black uppercase block tracking-widest ${isCtvSelected ? "text-white/80" : "text-primary/70"}`}>
                                      CTV (Consultor)
                                    </span>
                                    <span className="font-black text-[13px]">{ctv}</span>
                                  </div>
                                  <span className={`text-[10px] font-tabular font-bold ${isCtvSelected ? "text-white/90" : "text-muted-foreground"}`}>
                                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(ctvMeta.vpm)}
                                  </span>
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Culture Footprint Insights for Director */}
          <div className="glass-card-premium p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-border/40 pb-4">
              <LucideFileSpreadsheet className="text-primary" />
              <h3 className="text-lg font-black text-foreground uppercase tracking-wider">Matriz de Cultivo Mapeada</h3>
            </div>
            
            <div className="space-y-4">
              <CultureRow label="Soja" hectares={stats.currentAreas.soja} color="bg-primary" total={stats.totalHectares} />
              <CultureRow label="Milho" hectares={stats.currentAreas.milho} color="bg-band-azul" total={stats.totalHectares} />
              <CultureRow label="Algodão" hectares={stats.currentAreas.algodao} color="bg-yellow-500" total={stats.totalHectares} />
              <CultureRow label="Cana-de-Açúcar" hectares={stats.currentAreas.cana} color="bg-orange-500" total={stats.totalHectares} />
              <CultureRow label="Café" hectares={stats.currentAreas.cafe} color="bg-amber-800" total={stats.totalHectares} />
            </div>
          </div>
        </div>

        {/* Right: Map Grid & Technical Deficit Coverage */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          
          {/* Custom vector-styled interactive agricultural territory map */}
          <div className="glass-card-premium p-8 flex flex-col justify-between border-none relative overflow-hidden bg-gradient-to-br from-[#FDFDFD] to-[#F5F5F4] min-h-[460px]">
            
            {/* Topographical Lines Grid simulation */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.04] text-primary pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <pattern id="topo-grid" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                <path d="M0,60 Q30,30 60,60 T120,60" fill="none" stroke="currentColor" strokeWidth="1"/>
                <path d="M0,90 Q30,60 60,90 T120,90" fill="none" stroke="currentColor" strokeWidth="1"/>
                <path d="M0,30 Q30,0 60,30 T120,30" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#topo-grid)" />
            </svg>

            {/* Map Header */}
            <div className="flex justify-between items-start relative z-10">
              <div>
                <h3 className="text-base font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                  <LucideMapPin size={18} className="text-primary" />
                  Mapeamento de Cobertura Comercial
                </h3>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mt-1">
                  Exibindo {filteredTerritories.length} territórios na seleção atual
                </p>
              </div>
              
              <div className="px-3 py-1 bg-white border border-border rounded-xl text-[9px] font-black uppercase tracking-widest text-muted-foreground shadow-sm">
                Geolocalização Master
              </div>
            </div>

            {/* Vector Map area */}
            <div className="flex-1 w-full relative min-h-[350px] border border-border/40 rounded-3xl mt-6 bg-white/40 shadow-inner flex items-center justify-center">
              
              {/* Background Network sketch */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none select-none text-primary/30">
                <LucideNetwork size={300} strokeWidth={0.5} />
              </div>

              {/* Active Cities pins */}
              {Object.entries(TERRITORY_COORDINATES).map(([cityName, coords]) => {
                const matchedTerritory = filteredTerritories.find(t => t.city === cityName);
                
                return (
                  <div
                    key={cityName}
                    className="absolute"
                    style={{ top: `${coords.y}%`, left: `${coords.x}%` }}
                    onMouseEnter={() => setHoveredTerritory(cityName)}
                    onMouseLeave={() => setHoveredTerritory(null)}
                  >
                    {matchedTerritory ? (
                      <div className="relative flex items-center justify-center cursor-pointer">
                        <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-primary/20 opacity-75"></span>
                        <motion.div
                          whileHover={{ scale: 1.3 }}
                          className={`relative z-10 h-3.5 w-3.5 rounded-full flex items-center justify-center shadow-lg border border-white ${
                            matchedTerritory.topRating === 'A' 
                              ? "bg-band-azul animate-pulse" 
                              : "bg-primary"
                          }`}
                        />
                        
                        {/* Map Labels */}
                        <div className="absolute top-4 left-4 whitespace-nowrap bg-white/95 border border-border/80 shadow-md rounded-lg px-2 py-0.5 pointer-events-none">
                          <span className="text-[9px] font-black text-foreground">{cityName}</span>
                          <span className="text-[7px] font-black text-muted-foreground ml-1">{coords.state}</span>
                        </div>
                      </div>
                    ) : (
                      // Ghost pin out of filter
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 opacity-40" />
                    )}
                  </div>
                );
              })}

              {/* Hover Popover Details */}
              <AnimatePresence>
                {hoveredTerritory && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="absolute bottom-6 left-6 right-6 p-5 bg-white/95 backdrop-blur border border-border shadow-xl rounded-2xl z-30"
                  >
                    {(() => {
                      const territory = processedData.territories.find(t => t.city === hoveredTerritory);
                      const coords = TERRITORY_COORDINATES[hoveredTerritory];
                      if (!territory) return null;

                      return (
                        <div className="space-y-3">
                          <div className="flex justify-between items-start border-b border-border/50 pb-2">
                            <div>
                              <h4 className="text-sm font-black text-foreground flex items-center gap-1.5">
                                <LucideMapPin size={14} className="text-primary" />
                                {territory.city} - {coords.state}
                              </h4>
                              <p className="text-[8px] font-black uppercase text-primary/80 tracking-widest mt-0.5">Território Ativo</p>
                            </div>
                            <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase">
                              Potencial Máximo
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-xs font-medium">
                            <div>
                              <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider block">VPM Total</span>
                              <span className="font-black text-foreground font-tabular">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(territory.totalVpm)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider block">Mapeados</span>
                              <span className="font-black text-foreground">{territory.clientCount} Clientes</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider block">CTVs</span>
                              <span className="font-black text-primary truncate max-w-[100px] inline-block">{territory.ctvs.join(", ")}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Passo 5 / Passo 13 Governance: Technical input deficit */}
          <div className="glass-card-premium p-8">
            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <LucideGauge className="text-primary" />
                <h3 className="text-lg font-black text-foreground uppercase tracking-wider">Governança de Manejo Técnico</h3>
              </div>
              <span className="px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] font-black uppercase rounded-full glow-primary">
                Passos 5 e 13
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Deficit de Manejo Técnico</span>
                  <div className="text-2xl font-black text-destructive font-tabular">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(stats.inputCoverageGap)}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Gap de faturamento em relação ao potencial recomendado das áreas mapeadas.
                  </p>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Potencial Tecnológico Mapeado</span>
                  <div className="text-lg font-black text-foreground font-tabular">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(stats.recommendedInputsTotal)}
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-muted/20 border border-border/10 flex flex-col justify-center space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-foreground">
                  <span>Cobertura Realizada</span>
                  <span className="font-tabular font-black">
                    {stats.recommendedInputsTotal > 0 
                      ? ((stats.realizedValue / stats.recommendedInputsTotal) * 100).toFixed(1) 
                      : "0.0"}%
                  </span>
                </div>
                <div className="pill-progress-container h-2.5 bg-white shadow-inner">
                  <div 
                    className="pill-progress-fill !bg-primary glow-primary" 
                    style={{ 
                      width: `${Math.min(100, stats.recommendedInputsTotal > 0 
                        ? (stats.realizedValue / stats.recommendedInputsTotal) * 100 
                        : 0)}%` 
                    }}
                  />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">
                  Consumo Recomendado vs Vendas YTD
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function CultureRow({ label, hectares, color, total }: { label: string; hectares: number; color: string; total: number }) {
  const percent = total > 0 ? Math.round((hectares / total) * 100) : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-foreground uppercase text-[10px] font-black tracking-wider">{label}</span>
        <span className="text-muted-foreground font-tabular font-black">{new Intl.NumberFormat("pt-BR").format(hectares)} ha ({percent}%)</span>
      </div>
      <div className="w-full bg-[#F5F5F4] rounded-full h-1.5 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1 }}
          className={`${color} h-1.5 rounded-full`}
        />
      </div>
    </div>
  );
}

'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, MapPin, Search, Plus, Star, AlertTriangle, ChevronRight, Check, Compass } from 'lucide-react'
import VisitPlannerV4 from '@/components/ctv/VisitPlannerV4'
import { MOCK_TEST_DATA } from '@/data/mock_database'

export default function TacticalAgendaWorkspace() {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isOptimized, setIsOptimized] = useState(false)
  const [routeData, setRouteData] = useState({ time: "4h 20min", dist: "185 km" })

  // 1. Calculate Real Deficits and Priorities from Database
  const recommendations = useMemo(() => {
    return MOCK_TEST_DATA.map(d => {
      const vpmTotal = (d.areas.soja + d.areas.milho + d.areas.algodao + d.areas.cana + d.areas.cafe) * 3500;
      
      // Simulate faturamento based on relationship (relacionamento)
      // Fazenda União (id 4) has zero faturamento, Fazenda Jatobá (id 8) has very low
      let faturado = vpmTotal * (d.relacionamento / 5);
      if (d.id === "4") faturado = 0;
      if (d.id === "8") faturado = 120000;

      const recommendedInputs = 
        (d.areas.soja * 1800) + 
        (d.areas.milho * 1200) + 
        (d.areas.algodao * 3500) + 
        (d.areas.cana * 2000) + 
        (d.areas.cafe * 2500);

      const deficitTecnico = Math.max(0, recommendedInputs - faturado);
      const toGo = Math.max(0, vpmTotal - faturado);

      let type: "CRÍTICA" | "SUGERIDA" | "RECOMENDADA" = "RECOMENDADA";
      let reason = "Visita de Relacionamento e Acompanhamento";
      let color = "text-success border-success/30 bg-success/5";

      if (deficitTecnico > 0) {
        type = "CRÍTICA";
        reason = `Passo 16: Deficit Técnico de R$ ${(deficitTecnico / 1000).toFixed(0)}k! Risco de Fuga.`;
        color = "text-destructive border-destructive/30 bg-destructive/5";
      } else if (toGo > 1000000) {
        type = "SUGERIDA";
        reason = `Passo 12: Saldo TO-GO Elevado (R$ ${(toGo / 1000000).toFixed(1)}M)`;
        color = "text-accent border-accent/30 bg-accent/5";
      } else if (d.rating === 'A') {
        type = "RECOMENDADA";
        reason = "Protocolo Pareto A: Manutenção de Share de Carteira";
        color = "text-primary border-primary/30 bg-primary/5";
      }

      return {
        id: d.id,
        client: d.name,
        tag: d.rating === 'A' ? 'AZUL' : 'VERDE',
        type,
        reason,
        color,
        priorityScore: deficitTecnico * 2 + toGo
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore) // Sort by priority score
    .slice(0, 3); // Get top 3
  }, []);

  // 2. Handle Geographic Routing Optimization
  const handleOptimizeRoute = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      setIsOptimized(true);
      setRouteData({ time: "2h 45min", dist: "115 km" }); // Optimized route saves distance and time!
    }, 1500);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recommendation Engine */}
        <div className="glass-card p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <Star className="text-accent" size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest">Recomendações Inteligentes (GTMGC)</h3>
          </div>

          <div className="space-y-4 flex-1">
            {recommendations.map(rec => (
              <RecommendationItem 
                key={rec.id}
                type={rec.type}
                client={rec.client}
                tag={rec.tag}
                reason={rec.reason}
                color={rec.color}
              />
            ))}
          </div>

          <button 
            onClick={handleOptimizeRoute}
            disabled={isOptimizing || isOptimized}
            className={`mt-8 w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
              isOptimized 
                ? 'bg-success/20 text-success border border-success/30' 
                : isOptimizing 
                  ? 'bg-accent/20 text-accent border border-accent/30 animate-pulse'
                  : 'bg-white/5 border border-white/10 hover:bg-accent hover:text-white'
            }`}
          >
            {isOptimizing ? (
              <span>Calculando Melhor Rota...</span>
            ) : isOptimized ? (
              <>
                <Check size={14} /> Roteiro Otimizado GTMGC
              </>
            ) : (
              <>
                <Compass size={14} /> Gerar Roteiro Otimizado
              </>
            )}
          </button>
        </div>

        {/* Map Placeholder */}
        <div className="lg:col-span-2 glass-card p-0 overflow-hidden relative min-h-[400px] flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/-52.41,-28.26,9,0/800x400?access_token=pk.placeholder')] bg-cover opacity-50 grayscale" />
          
          <AnimatePresence mode="wait">
            {isOptimizing ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative z-10 text-center space-y-4"
              >
                <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-black uppercase tracking-widest bg-background/80 backdrop-blur px-4 py-2 rounded-full border border-white/10">Calculando Matriz de Distância...</p>
              </motion.div>
            ) : (
              <motion.div 
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative z-10 text-center space-y-2"
              >
                <div className="w-16 h-16 bg-background/80 backdrop-blur rounded-full flex items-center justify-center border border-white/10 mx-auto shadow-2xl">
                  <MapPin className={`text-accent ${isOptimized ? 'animate-none text-success' : 'animate-bounce'}`} size={32} />
                </div>
                <p className="text-sm font-black uppercase tracking-widest bg-background/85 backdrop-blur px-5 py-2 rounded-full border border-white/10">
                  {isOptimized ? "🧭 Rota Exclusiva de Alto Impacto" : "Roteirização Geográfica"}
                </p>
                {isOptimized && (
                  <p className="text-[10px] text-success uppercase font-black tracking-widest mt-1 bg-success/15 px-3 py-1 rounded-full border border-success/20 max-w-xs mx-auto">
                    Evitou R$ 1.200 em Custos Logísticos!
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map Overlays */}
          <div className="absolute top-4 right-4 space-y-2">
            <div className={`glass-card p-3 backdrop-blur text-[10px] font-bold border transition-colors ${isOptimized ? 'border-success/30 bg-success/5 text-success' : 'border-white/10 bg-background/80'}`}>
              <p className="text-muted-foreground uppercase text-[8px] tracking-widest mb-1">Tempo Estimado</p>
              <p className="text-lg font-black font-tabular">{routeData.time}</p>
            </div>
            <div className={`glass-card p-3 backdrop-blur text-[10px] font-bold border transition-colors ${isOptimized ? 'border-success/30 bg-success/5 text-success' : 'border-white/10 bg-background/80'}`}>
              <p className="text-muted-foreground uppercase text-[8px] tracking-widest mb-1">Distância Total</p>
              <p className="text-lg font-black font-tabular">{routeData.dist}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Planner Integration */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 ml-2">
          <Calendar className="text-accent" size={18} />
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Calendário de Campo (Passo 16)</h3>
        </div>
        <VisitPlannerV4 />
      </section>
    </div>
  )
}

function RecommendationItem({ type, client, tag, reason, color }: any) {
  return (
    <div className={`p-4 border rounded-xl hover:border-accent/30 transition-all cursor-pointer group ${color}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[8px] font-black px-2 py-0.5 rounded bg-black/20 tracking-wider">{type}</span>
        <span className="text-[8px] font-black text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">{tag}</span>
      </div>
      <h4 className="text-sm font-bold truncate text-foreground">{client}</h4>
      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{reason}</p>
      <div className="mt-3 flex items-center justify-end text-[8px] font-black uppercase text-accent opacity-0 group-hover:opacity-100 transition-opacity">
        Adicionar ao Roteiro <Plus size={10} className="ml-1" />
      </div>
    </div>
  )
}

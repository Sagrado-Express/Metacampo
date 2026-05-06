'use client'

import { motion } from 'framer-motion'
import { Calendar, MapPin, Search, Plus, Star, AlertTriangle, ChevronRight } from 'lucide-react'
import VisitPlannerV4 from '@/components/ctv/VisitPlannerV4'

export default function TacticalAgendaWorkspace() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recommendation Engine */}
        <div className="glass-card p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <Star className="text-accent" size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest">Recomendações de Agenda</h3>
          </div>

          <div className="space-y-4 flex-1">
            <RecommendationItem 
              type="OBRIGATÓRIA"
              client="Fazenda Boa Esperança"
              tag="AZUL"
              reason="Visita Semanal (Protocolo Pareto)"
              color="text-primary"
            />
            <RecommendationItem 
              type="SUGERIDA"
              client="Agropecuária Schneider"
              tag="VERDE"
              reason="Fechar Gap de Biológicos"
              color="text-success"
            />
            <RecommendationItem 
              type="CRÍTICA"
              client="Sítio Recanto"
              tag="AMARELO"
              reason="Portal no tempo fechando"
              color="text-warning"
            />
          </div>

          <button className="mt-8 w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-accent hover:text-white transition-all">
            Gerar Roteiro Otimizado
          </button>
        </div>

        {/* Map Placeholder */}
        <div className="lg:col-span-2 glass-card p-0 overflow-hidden relative min-h-[400px] flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/-52.41,-28.26,9,0/800x400?access_token=pk.placeholder')] bg-cover opacity-50 grayscale" />
          <div className="relative z-10 text-center space-y-2">
            <div className="w-16 h-16 bg-background/80 backdrop-blur rounded-full flex items-center justify-center border border-white/10 mx-auto shadow-2xl">
              <MapPin className="text-accent animate-bounce" size={32} />
            </div>
            <p className="text-sm font-black uppercase tracking-widest bg-background/50 backdrop-blur px-4 py-1 rounded-full">Roteirização Geográfica</p>
          </div>

          {/* Map Overlays */}
          <div className="absolute top-4 right-4 space-y-2">
            <div className="glass-card p-3 bg-background/80 backdrop-blur text-[10px] font-bold">
              <p className="text-muted-foreground uppercase">Tempo Estimado</p>
              <p className="text-lg font-black">4h 20min</p>
            </div>
            <div className="glass-card p-3 bg-background/80 backdrop-blur text-[10px] font-bold">
              <p className="text-muted-foreground uppercase">Distância Total</p>
              <p className="text-lg font-black">185 km</p>
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
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-accent/30 transition-all cursor-pointer group">
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded bg-white/10 ${color}`}>{type}</span>
        <span className="text-[8px] font-black text-muted-foreground">{tag}</span>
      </div>
      <h4 className="text-sm font-bold truncate">{client}</h4>
      <p className="text-[10px] text-muted-foreground mt-1">{reason}</p>
      <div className="mt-3 flex items-center justify-end text-[8px] font-black uppercase text-accent opacity-0 group-hover:opacity-100 transition-opacity">
        Adicionar ao Roteiro <Plus size={10} className="ml-1" />
      </div>
    </div>
  )
}

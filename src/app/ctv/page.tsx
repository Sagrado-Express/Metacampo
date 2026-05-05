'use client'

import PortfolioTable from '@/components/ctv/PortfolioTable'
import { GoalDiagnostic, SegmentDrillDown } from '@/components/ctv/PlanningWidgets'
import ParetoSegmentation from '@/components/ctv/ParetoSegmentation'
import VisitPlannerV4 from '@/components/ctv/VisitPlannerV4'
import { motion } from 'framer-motion'
import { MapPin, Calculator } from 'lucide-react'

export default function CTVPlanningPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-12">
      <header className="flex items-center justify-between border-b border-white/10 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/50 shadow-lg shadow-primary/20">
            <MapPin className="text-primary" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">Planejamento Estratégico</h1>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">CTV: Gestão de Carteira e Hectares</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Status do Plano</p>
            <p className="text-xs font-black text-warning uppercase">Aguardando Submissão</p>
          </div>
          <button className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
            Submeter para Revisão
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        {/* Top Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GoalDiagnostic />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SegmentDrillDown />
          </motion.div>
        </div>

        {/* Portfolio Table */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <PortfolioTable />
        </motion.section>

        {/* Pareto and Visits */}
        <div className="grid grid-cols-1 gap-12 pt-8">
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ParetoSegmentation />
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <VisitPlannerV4 />
          </motion.section>
        </div>
      </main>

      <footer className="pt-12 border-t border-white/10 text-center">
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">
          GTM-GC SaaS • Mapeamento de Chão de Fábrica
        </p>
      </footer>
    </div>
  )
}

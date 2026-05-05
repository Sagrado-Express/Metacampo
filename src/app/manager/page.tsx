'use client'

import BudgetManager from '@/components/manager/BudgetManager'
import ForecastToGo from '@/components/manager/ForecastToGo'
import { motion } from 'framer-motion'
import { Landmark, TrendingUp } from 'lucide-react'

export default function ManagerPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-12">
      <header className="flex items-center justify-between border-b border-white/10 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center border border-accent/50 shadow-lg shadow-accent/20">
            <Landmark className="text-accent" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">Execução Financeira</h1>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Gestor: Budget vs Real vs Forecast</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Budget Regional</p>
            <p className="text-lg font-black font-tabular">R$ 19.0M</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Forecast Atual</p>
            <p className="text-lg font-black font-tabular text-accent">R$ 18.5M</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-16">
        <motion.section 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <BudgetManager />
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ForecastToGo />
        </motion.section>
      </main>

      <footer className="pt-12 border-t border-white/10 text-center">
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">
          Finance Control Engine • GTMGC SaaS
        </p>
      </footer>
    </div>
  )
}

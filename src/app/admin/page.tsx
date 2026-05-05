'use client'

import ITAAConfig from '@/components/admin/ITAAConfig'
import ScoringConfig from '@/components/admin/ScoringConfig'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-12">
      <header className="flex items-center justify-between border-b border-white/10 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center border border-accent/50 shadow-lg shadow-accent/20">
            <ShieldCheck className="text-accent" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Antigravity AI Master Blueprint V4</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">Soberania de Dados Ativa</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-16">
        <motion.section 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ITAAConfig />
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ScoringConfig />
        </motion.section>
      </main>

      <footer className="pt-12 border-t border-white/10 text-center">
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">
          Executive Insight Engine • Valora Design System
        </p>
      </footer>
    </div>
  )
}

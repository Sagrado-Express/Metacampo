'use client'
import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ShieldCheck, MapPin, BarChart3, Lock, ChevronRight } from 'lucide-react'

export default function HomePortal() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 px-4 py-1.5 rounded-full mb-4">
          <Lock size={14} className="text-accent" />
          <span className="text-[10px] font-black uppercase tracking-widest text-accent">Protocolo V4 Ativo</span>
        </div>
        <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">
          Antigravity <span className="text-accent">AI</span>
        </h1>
        <p className="text-muted-foreground uppercase tracking-[0.3em] font-medium text-sm">
          Master Blueprint • GTMGC SaaS
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl">
        <PortalCard 
          href="/admin"
          icon={ShieldCheck}
          title="Admin"
          subtitle="Setup de Inteligência"
          description="Definição de ITAA (DNA Financeiro) e calibração de pesos do Scoring Multicriterial."
          color="hover:border-accent/50"
        />
        <PortalCard 
          href="/ctv"
          icon={MapPin}
          title="CTV"
          subtitle="Planejamento Estratégico"
          description="Gestão de hectares, mapeamento de chão de fábrica e diagnóstico de meta."
          color="hover:border-primary/50"
        />
        <PortalCard 
          href="/manager"
          icon={BarChart3}
          title="Gestor"
          subtitle="Execução Financeira"
          description="Distribuição de budget mensalizado e monitoramento de Forecast 'TO GO'."
          color="hover:border-accent/50"
        />
        <PortalCard 
          href="/governance"
          icon={Lock}
          title="Governança"
          subtitle="Handshake Protocol"
          description="Workflow de oficialização e congelamento imutável do plano de safra."
          color="hover:border-success/50"
        />
      </div>

      <footer className="mt-12 opacity-50">
        <p className="text-[10px] font-bold uppercase tracking-widest">
          Valora Design System • Architecture V4.0.0
        </p>
      </footer>
    </div>
  )
}

interface PortalCardProps {
  href: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  disabled?: boolean;
}

function PortalCard({ href, icon: Icon, title, subtitle, description, color, disabled = false }: PortalCardProps) {
  const CardContent = (
    <div className={`glass-card p-8 h-full flex flex-col group transition-all duration-500 ${color} ${disabled ? 'opacity-50 grayscale' : 'cursor-pointer'}`}>
      <div className="mb-6 flex justify-between items-start">
        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:bg-accent/10 group-hover:border-accent/30 transition-colors">
          <Icon className="text-muted-foreground group-hover:text-accent transition-colors" size={28} />
        </div>
        {disabled && <span className="text-[9px] font-bold uppercase bg-white/10 px-2 py-1 rounded">Em breve</span>}
      </div>
      
      <div className="space-y-2 flex-1">
        <p className="text-[10px] font-bold text-accent uppercase tracking-widest">{subtitle}</p>
        <h3 className="text-2xl font-black uppercase tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
        Acessar Módulo <ChevronRight size={14} />
      </div>
    </div>
  )

  if (disabled) return <div>{CardContent}</div>

  return (
    <Link href={href}>
      <motion.div 
        whileHover={{ y: -5 }}
        className="h-full"
      >
        {CardContent}
      </motion.div>
    </Link>
  )
}

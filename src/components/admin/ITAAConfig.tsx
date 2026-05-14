'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings2, Save, Info, TrendingUp } from 'lucide-react'
import { ITAAEngine, SEGMENTOS } from '@/domain/services/itAAEngine'
import { Segmento, ITAAConfig as ITAAConfigType } from '@/types/blueprint'

/**
 * ITAAConfig (The Master UI/UX Perspective)
 * Refactored to Matrix Layout: Categories as Columns, Cultures as Lines.
 */
export default function ITAAConfig() {
  const [configs, setConfigs] = useState<Record<string, ITAAConfigType>>({
    'Soja': ITAAEngine.calculateITAA('Soja', {
      'Semente': 800,
      'Fertilizante': 1200,
      'Agroquímicos': 900,
      'Nutrição': 300,
      'Biológico': 150,
      'Regulador de Crescimento': 0
    }),
    'Milho': ITAAEngine.calculateITAA('Milho', {
      'Semente': 600,
      'Fertilizante': 1500,
      'Agroquímicos': 700,
      'Nutrição': 250,
      'Biológico': 100,
      'Regulador de Crescimento': 0
    })
  })

  const handleValueChange = (cultura: string, segmento: Segmento, value: number) => {
    setConfigs(prev => {
      const currentValores = { ...prev[cultura].valores, [segmento]: value }
      return {
        ...prev,
        [cultura]: ITAAEngine.calculateITAA(cultura, currentValores)
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tighter flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <TrendingUp size={24} />
            </div>
            Matriz ITAA (DNA Financeiro)
          </h2>
          <p className="text-muted-foreground text-sm">Parametrização global de investimento tecnológico (R$/ha)</p>
        </div>
        
        <button className="bg-primary text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20">
          <Save size={16} /> Salvar Padrão Global
        </button>
      </div>

      {/* Matrix Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="p-6 text-left label-finance min-w-[140px]">Cultura</th>
                {SEGMENTOS.map((seg) => (
                  <th key={seg} className="p-6 text-center label-finance min-w-[120px]">
                    {seg}
                  </th>
                ))}
                <th className="p-6 text-right label-finance min-w-[140px] bg-primary/5">ITAA TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(configs).map(([cultura, config]) => (
                <tr key={cultura} className="border-b border-border/30 hover:bg-white/40 transition-colors group">
                  <td className="p-6">
                    <span className="text-lg font-black tracking-tight text-foreground/80 group-hover:text-primary transition-colors">
                      {cultura}
                    </span>
                  </td>
                  
                  {SEGMENTOS.map((seg) => {
                    const value = config.valores[seg as Segmento];
                    const mix = (config.mixTecnico[seg as Segmento] * 100).toFixed(1);
                    
                    return (
                      <td key={seg} className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="relative group/input">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold">R$</span>
                            <input 
                              type="number"
                              value={value}
                              onChange={(e) => handleValueChange(cultura, seg as Segmento, Number(e.target.value))}
                              className="w-24 bg-background/50 border border-border rounded-xl py-2 pl-6 pr-2 text-center text-xs font-black font-tabular focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-tighter">MIX:</span>
                            <span className="text-[10px] font-black text-primary font-tabular">{mix}%</span>
                          </div>
                        </div>
                      </td>
                    );
                  })}

                  <td className="p-6 text-right bg-primary/5">
                    <div className="flex flex-col">
                      <span className="text-xl font-black text-primary font-tabular">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(config.total)}
                      </span>
                      <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest">100.0% SOMATÓRIA</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info Footer */}
        <div className="p-6 bg-muted/20 border-t border-border/50 flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-white/50 text-muted-foreground">
            <Info size={14} />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground italic uppercase tracking-wider">
            O Mix Técnico é recalibrado automaticamente em tempo real com base no investimento total de cada cultura.
          </span>
        </div>
      </motion.div>
    </div>
  )
}


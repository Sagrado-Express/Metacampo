'use client'

import ParetoPlanning from '@/components/ctv/workspaces/ParetoPlanning'
import { Shell } from '@/components/Shell'

export default function PlanejamentoPareto() {
  return (
    <Shell 
      title="Segmentação de Pareto"
      subtitle="Passo 15: Análise de Concentração de Potencial (80/20)"
    >
      <ParetoPlanning />
    </Shell>
  )
}

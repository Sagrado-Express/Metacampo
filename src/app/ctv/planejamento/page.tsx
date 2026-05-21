'use client'

import { MagicCubeWorkspace } from '@/components/ctv/workspaces/MagicCubeWorkspace'

export default function PlanejamentoPareto() {
  return (
    <div className="p-8 lg:p-12 space-y-8 w-full max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Segmentação de Pareto</h1>
        <p className="text-muted-foreground mt-2 font-medium">Passo 15: Análise de Concentração de Potencial (80/20)</p>
      </div>
      <MagicCubeWorkspace />
    </div>
  )
}

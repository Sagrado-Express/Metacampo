'use client'

import { Shell } from '@/components/Shell'
import TabelaMae from '@/components/ctv/workspaces/TabelaMae'

export default function TabelaMaePage() {
  return (
    <Shell 
      title="Plano de Negócios" 
      subtitle="Mapeamento de Potencial e Materialização de Área (Passos 2 e 3)"
    >

      <TabelaMae />
    </Shell>
  )
}

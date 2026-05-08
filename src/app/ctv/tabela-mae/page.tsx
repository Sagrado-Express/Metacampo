'use client'

import { Shell } from '@/components/Shell'
import TabelaMae from '@/components/ctv/workspaces/TabelaMae'

export default function TabelaMaePage() {
  return (
    <Shell 
      title="Tabela Mãe" 
      subtitle="Mapeamento de Potencial e Materialização de Área (Passos 2 e 3)"
    >
      <TabelaMae />
    </Shell>
  )
}

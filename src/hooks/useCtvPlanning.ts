import { useState, useCallback, useMemo } from 'react';

export type StatusColor = 'vermelho' | 'amarelo' | 'verde' | 'azul' | 'neutro';

export interface PlanningRow {
  clientId: string;
  clientName: string;
  vpm: number;
  realizedLastYear: number;
  targetCurrentYear: number;
  // Derived
  shareProjected: number;
  growthYoY: number;
  statusColor: StatusColor;
}

export interface PlanningLimits {
  minGrowthVerde: number; // Ex: 5 (5%)
  minGrowthAzul: number;  // Ex: 15 (15%)
  minShareVerde: number;  // Ex: 10 (10%)
}

export function useCtvPlanning(initialData: Omit<PlanningRow, 'shareProjected' | 'growthYoY' | 'statusColor'>[], limits: PlanningLimits) {
  // Inicializamos o estado com os dados baseados na prop initialData, calculando os derivados.
  const [rows, setRows] = useState<PlanningRow[]>(() => {
    return initialData.map(row => calculateRow(row, limits));
  });

  // Função pura para calcular derivados
  function calculateRow(base: Omit<PlanningRow, 'shareProjected' | 'growthYoY' | 'statusColor'>, currentLimits: PlanningLimits): PlanningRow {
    const shareProjected = base.vpm > 0 ? (base.targetCurrentYear / base.vpm) * 100 : 0;
    const growthYoY = base.realizedLastYear > 0 
      ? ((base.targetCurrentYear - base.realizedLastYear) / base.realizedLastYear) * 100 
      : (base.targetCurrentYear > 0 ? 100 : 0); // Se não tinha ano anterior e colocou alvo, é 100% de crescimento.

    let statusColor: StatusColor = 'neutro';

    if (growthYoY < 0 || shareProjected < currentLimits.minShareVerde) {
      statusColor = 'vermelho';
    } else if (growthYoY >= 0 && growthYoY < currentLimits.minGrowthVerde) {
      statusColor = 'amarelo';
    } else if (growthYoY >= currentLimits.minGrowthVerde && growthYoY < currentLimits.minGrowthAzul) {
      statusColor = 'verde';
    } else if (growthYoY >= currentLimits.minGrowthAzul) {
      statusColor = 'azul';
    }

    return {
      ...base,
      shareProjected,
      growthYoY,
      statusColor,
    };
  }

  const updateTarget = useCallback((clientId: string, newTarget: number) => {
    setRows(prevRows => prevRows.map(row => {
      if (row.clientId === clientId) {
        return calculateRow({ ...row, targetCurrentYear: newTarget }, limits);
      }
      return row;
    }));
  }, [limits]);

  const sortByValue = useCallback((asc: boolean = false) => {
    setRows(prev => [...prev].sort((a, b) => asc ? a.targetCurrentYear - b.targetCurrentYear : b.targetCurrentYear - a.targetCurrentYear));
  }, []);

  const sortByShare = useCallback((asc: boolean = false) => {
    setRows(prev => [...prev].sort((a, b) => asc ? a.shareProjected - b.shareProjected : b.shareProjected - a.shareProjected));
  }, []);

  // Agregações totais para mostrar no header
  const totals = useMemo(() => {
    return rows.reduce((acc, row) => ({
      vpm: acc.vpm + row.vpm,
      realizedLastYear: acc.realizedLastYear + row.realizedLastYear,
      targetCurrentYear: acc.targetCurrentYear + row.targetCurrentYear,
    }), { vpm: 0, realizedLastYear: 0, targetCurrentYear: 0 });
  }, [rows]);

  return {
    rows,
    totals,
    updateTarget,
    sortByValue,
    sortByShare
  };
}

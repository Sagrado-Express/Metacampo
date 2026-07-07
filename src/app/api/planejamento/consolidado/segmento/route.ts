import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const LOCAL_CUSTOMERS_PATH = path.join(process.cwd(), 'src/data/local_customers.json');
const LOCAL_PLAN_PATH = path.join(process.cwd(), 'src/data/local_planejamento.json');

export async function GET() {
  const session = await getSession();
  const tenantId = session?.user?.app_metadata?.tenant_id || "00000000-0000-0000-0000-000000000000";

  try {
    const customers = fs.existsSync(LOCAL_CUSTOMERS_PATH) 
      ? JSON.parse(fs.readFileSync(LOCAL_CUSTOMERS_PATH, 'utf-8')).filter((c: any) => c.tenantId === tenantId || c.tenant_id === tenantId)
      : [];

    const planning = fs.existsSync(LOCAL_PLAN_PATH)
      ? JSON.parse(fs.readFileSync(LOCAL_PLAN_PATH, 'utf-8')).filter((p: any) => p.tenant_id === tenantId || p.tenantId === tenantId)
      : [];

    // Aggregate potential total VPM
    let totalPotentialCentavos = 0;
    customers.forEach((cust: any) => {
      cust.areas.forEach((area: any) => {
        totalPotentialCentavos += Number(area.vpmCentavos || 0);
      });
    });

    const segments = ['SEMENTES', 'FERTILIZANTES', 'AGROQUIMICOS'];
    const segmentAllocations: Record<string, number> = {
      'SEMENTES': 0.20, // 20%
      'FERTILIZANTES': 0.50, // 50%
      'AGROQUIMICOS': 0.30 // 30%
    };

    const segmentStats: Record<string, { segmento: string; potencial_centavos: number; planejado_centavos: number }> = {};
    segments.forEach(seg => {
      segmentStats[seg] = {
        segmento: seg.charAt(0) + seg.slice(1).toLowerCase(),
        potencial_centavos: Math.round(totalPotentialCentavos * (segmentAllocations[seg] || 0.33)),
        planejado_centavos: 0
      };
    });

    planning.forEach((plan: any) => {
      const segKey = plan.segmento.toUpperCase();
      if (segmentStats[segKey]) {
        segmentStats[segKey].planejado_centavos += Number(plan.valor_planejado_centavos || plan.valorPlanejadoCentavos || 0);
      }
    });

    const result = Object.values(segmentStats).map(stat => {
      const share = stat.potencial_centavos > 0
        ? (stat.planejado_centavos / stat.potencial_centavos) * 100
        : 0;

      return {
        segmento: stat.segmento,
        potencial_centavos: stat.potencial_centavos,
        planejado_centavos: stat.planejado_centavos,
        share_percentual: Number(share.toFixed(1))
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
    // Read local/fallback files
    const customers = fs.existsSync(LOCAL_CUSTOMERS_PATH) 
      ? JSON.parse(fs.readFileSync(LOCAL_CUSTOMERS_PATH, 'utf-8')).filter((c: any) => c.tenantId === tenantId || c.tenant_id === tenantId)
      : [];

    const planning = fs.existsSync(LOCAL_PLAN_PATH)
      ? JSON.parse(fs.readFileSync(LOCAL_PLAN_PATH, 'utf-8')).filter((p: any) => p.tenant_id === tenantId || p.tenantId === tenantId)
      : [];

    // Group by crop type (case-insensitive key)
    const cropStats: Record<string, { cultivo: string; area_total_ha: number; vpm_potencial_centavos: number; vpm_planejado_centavos: number }> = {};

    customers.forEach((cust: any) => {
      cust.areas.forEach((area: any) => {
        const cropName = area.cropName;
        const cropKey = cropName.toUpperCase();

        if (!cropStats[cropKey]) {
          cropStats[cropKey] = {
            cultivo: cropName,
            area_total_ha: 0,
            vpm_potencial_centavos: 0,
            vpm_planejado_centavos: 0
          };
        }

        cropStats[cropKey].area_total_ha += Number(area.areaHa || 0);
        cropStats[cropKey].vpm_potencial_centavos += Number(area.vpmCentavos || 0);
      });
    });

    // Sum planned values
    planning.forEach((plan: any) => {
      const cropKey = plan.cultivo.toUpperCase();
      if (cropStats[cropKey]) {
        cropStats[cropKey].vpm_planejado_centavos += Number(plan.valor_planejado_centavos || plan.valorPlanejadoCentavos || 0);
      }
    });

    const result = Object.values(cropStats).map(stat => ({
      cultivo: stat.cultivo,
      area_total_ha: Number(stat.area_total_ha.toFixed(2)),
      vpm_potencial_centavos: stat.vpm_potencial_centavos,
      vpm_planejado_centavos: stat.vpm_planejado_centavos,
      diferenca_centavos: Math.max(0, stat.vpm_potencial_centavos - stat.vpm_planejado_centavos)
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

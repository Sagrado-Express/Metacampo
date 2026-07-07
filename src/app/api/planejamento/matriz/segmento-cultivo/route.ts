import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const LOCAL_PLAN_PATH = path.join(process.cwd(), 'src/data/local_planejamento.json');

export async function GET() {
  const session = await getSession();
  const tenantId = session?.user?.app_metadata?.tenant_id || "00000000-0000-0000-0000-000000000000";

  try {
    const planning = fs.existsSync(LOCAL_PLAN_PATH)
      ? JSON.parse(fs.readFileSync(LOCAL_PLAN_PATH, 'utf-8')).filter((p: any) => p.tenant_id === tenantId || p.tenantId === tenantId)
      : [];

    const segments = ['SEMENTES', 'FERTILIZANTES', 'AGROQUIMICOS'];
    const cultures = ['SOJA', 'MILHO', 'ALGODAO', 'CANA', 'CAFE', 'HF'];

    const matrix = segments.map(seg => {
      const row: any = {
        segmento: seg.charAt(0) + seg.slice(1).toLowerCase(),
        total_centavos: 0
      };

      cultures.forEach(cult => {
        const key = cult.toLowerCase();
        row[`${key}_centavos`] = 0;
      });

      return row;
    });

    planning.forEach((plan: any) => {
      const segKey = plan.segmento.toUpperCase();
      const cultKey = plan.cultivo.toUpperCase();
      
      const rowIndex = segments.indexOf(segKey);
      if (rowIndex !== -1 && cultures.includes(cultKey)) {
        const val = Number(plan.valor_planejado_centavos || plan.valorPlanejadoCentavos || 0);
        const colKey = `${cultKey.toLowerCase()}_centavos`;
        matrix[rowIndex][colKey] += val;
        matrix[rowIndex].total_centavos += val;
      }
    });

    return NextResponse.json(matrix);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

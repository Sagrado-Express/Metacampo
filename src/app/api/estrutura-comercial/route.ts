import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';
import { EstruturaComercialService } from '@/lib/services/EstruturaComercialService';
import { getErrorMessage } from '@/lib/utils';
import { rateLimitResponse } from '@/lib/rateLimiter';

const UNAUTHORIZED = NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
const FORBIDDEN = NextResponse.json(
  { error: 'FORBIDDEN', message: 'Só administradores podem configurar a estrutura comercial.' },
  { status: 403 }
);

function unavailable(acao: string) {
  return NextResponse.json(
    {
      error: 'DATA_SOURCE_UNAVAILABLE',
      message: `Não foi possível ${acao} os dados no banco. Tente novamente em instantes.`,
    },
    { status: 503 }
  );
}

// GET /api/estrutura-comercial -> { regionais, distritais, territorios }
export async function GET() {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;

  try {
    const tree = await EstruturaComercialService.getAll(ctx.supabase);
    return NextResponse.json(tree);
  } catch (error) {
    console.error('[estrutura-comercial API] Supabase error (GET):', error);
    return unavailable('carregar');
  }
}

// POST /api/estrutura-comercial -> cadastro em formato de linha (planilha)
export async function POST(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;
  // Configura a estrutura comercial do tenant inteiro — mesmo padrão de
  // admin-only de cultures/classifications/indice-tecnologico (auditoria 11/08).
  if (ctx.role !== 'admin') return FORBIDDEN;
  const limited = rateLimitResponse(ctx.userId, 30);
  if (limited) return limited;

  try {
    const body = await request.json();
    const regionalCodigo = String(body.regionalCodigo || '').trim();
    const regionalUserId = String(body.regionalUserId || '').trim();
    const distritalCodigo = String(body.distritalCodigo || '').trim();
    const distritalUserId = String(body.distritalUserId || '').trim();
    const territorioNome = String(body.territorioNome || '').trim();
    const ctvUserId = String(body.ctvUserId || '').trim();

    if (!regionalCodigo || !regionalUserId || !distritalCodigo || !distritalUserId || !territorioNome || !ctvUserId) {
      return NextResponse.json(
        { error: 'Preencha código e responsável de cada nível (Regional, Distrital, Território, CTV).' },
        { status: 400 }
      );
    }

    const resultado = await EstruturaComercialService.upsertLinha(ctx.supabase, ctx.tenantId, {
      regionalCodigo,
      regionalUserId,
      distritalCodigo,
      distritalUserId,
      territorioNome,
      ctvUserId,
    });
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error('[estrutura-comercial API] Supabase error (POST):', error);
    const message = getErrorMessage(error);
    if (message.includes('já está atribuído')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return unavailable('salvar');
  }
}

// PATCH /api/estrutura-comercial -> reatribuir o responsável de um nó já existente
export async function PATCH(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;
  if (ctx.role !== 'admin') return FORBIDDEN;
  const limited = rateLimitResponse(ctx.userId, 30);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { nivel, id, userId } = body as { nivel: 'regional' | 'distrital' | 'territorio'; id: string; userId: string };
    if (!nivel || !id || !userId) {
      return NextResponse.json({ error: 'nivel, id e userId são obrigatórios' }, { status: 400 });
    }
    await EstruturaComercialService.reatribuir(ctx.supabase, nivel, id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[estrutura-comercial API] Supabase error (PATCH):', error);
    const message = getErrorMessage(error);
    if (message.includes('já está atribuído')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return unavailable('reatribuir');
  }
}

// DELETE /api/estrutura-comercial?nivel=regional|distrital|territorio&id=...
export async function DELETE(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;
  if (ctx.role !== 'admin') return FORBIDDEN;
  const limited = rateLimitResponse(ctx.userId, 30);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const nivel = searchParams.get('nivel') as 'regional' | 'distrital' | 'territorio' | null;
  const id = searchParams.get('id');
  if (!nivel || !id) {
    return NextResponse.json({ error: 'nivel e id são obrigatórios' }, { status: 400 });
  }

  try {
    // Excluir uma regional/distrital cai em cascata (ON DELETE CASCADE) sobre
    // os níveis abaixo — aviso disso fica a cargo da UI antes de chamar aqui.
    await EstruturaComercialService.excluir(ctx.supabase, nivel, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[estrutura-comercial API] Supabase error (DELETE):', error);
    return unavailable('excluir');
  }
}

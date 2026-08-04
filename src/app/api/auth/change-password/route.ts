import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createAnonClient, supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'MISSING_FIELDS', message: 'Informe a senha atual e a nova senha.' },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'PASSWORD_TOO_SHORT', message: 'A nova senha deve ter ao menos 8 caracteres.' },
      { status: 400 }
    );
  }

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: 'PASSWORD_REUSED', message: 'A nova senha não pode ser igual à senha anterior.' },
      { status: 400 }
    );
  }

  // Reautentica com a senha atual antes de trocar — prova posse da senha
  // corrente sem depender só do cookie de sessão já aberto.
  const anon = createAnonClient();
  const { error: authError } = await anon.auth.signInWithPassword({
    email: session.user.email,
    password: currentPassword,
  });

  if (authError) {
    return NextResponse.json(
      { error: 'CURRENT_PASSWORD_INVALID', message: 'Senha atual incorreta.' },
      { status: 401 }
    );
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(session.user.id, {
    password: newPassword,
  });

  if (updateError) {
    console.error('[api/auth/change-password]', updateError);
    return NextResponse.json(
      { error: 'UPDATE_FAILED', message: 'Erro ao atualizar a senha.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: 'Senha atualizada com sucesso.' });
}

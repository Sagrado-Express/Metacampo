/**
 * Toast minimalista, zero dependências.
 * Uso: toast.success('Salvo') | toast.error('Erro ao salvar')
 *
 * Motivo de não usar lib externa (sonner/shadcn): manter o bundle enxuto e
 * evitar nova dependência para uma necessidade simples de feedback.
 * Se o projeto adotar shadcn/sonner no futuro, basta trocar a implementação
 * mantendo a mesma interface (success/error).
 *
 * Erros ficam fixos até o usuário fechar no X — mensagens de erro tendem a
 * ser mais longas (ex.: "cultura já tem dado de cliente...") e sumiam antes
 * de dar tempo de ler (relatado pelo Marco Polo, 03/09/2026). Sucesso
 * continua desaparecendo sozinho, mas também ganhou um X pra fechar antes,
 * por consistência.
 */

type ToastType = 'success' | 'error';

const CONTAINER_ID = 'metacampo-toast-container';

function ensureContainer(): HTMLElement {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.setAttribute(
      'style',
      [
        'position:fixed',
        'top:16px',
        'right:16px',
        'z-index:9999',
        'display:flex',
        'flex-direction:column',
        'gap:8px',
        'pointer-events:none',
      ].join(';')
    );
    document.body.appendChild(container);
  }
  return container;
}

function show(message: string, type: ToastType, durationMs: number | null) {
  if (typeof document === 'undefined') return; // SSR guard

  const container = ensureContainer();
  const el = document.createElement('div');

  const bg = type === 'success' ? '#059669' : '#dc2626'; // emerald-600 / red-600
  const icon = type === 'success' ? '✓' : '✕';

  el.setAttribute(
    'style',
    [
      `background:${bg}`,
      'color:#fff',
      'padding:10px 12px 10px 16px',
      'border-radius:12px',
      'font-size:13px',
      'font-weight:700',
      'box-shadow:0 4px 12px rgba(0,0,0,0.15)',
      'display:flex',
      'align-items:center',
      'gap:10px',
      'opacity:0',
      'transform:translateY(-8px)',
      'transition:opacity 180ms ease, transform 180ms ease',
      'pointer-events:auto',
      'max-width:360px',
    ].join(';')
  );

  const text = document.createElement('span');
  text.textContent = `${icon} ${message}`;
  text.style.cssText = 'flex:1; line-height:1.4;';
  el.appendChild(text);

  let dismissTimer: number | undefined;
  const dismiss = () => {
    if (dismissTimer !== undefined) window.clearTimeout(dismissTimer);
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    window.setTimeout(() => el.remove(), 200);
  };

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Fechar');
  closeBtn.style.cssText = [
    'background:transparent',
    'border:0',
    'color:#fff',
    'opacity:0.8',
    'font-size:18px',
    'line-height:1',
    'cursor:pointer',
    'padding:0 2px',
    'font-weight:400',
  ].join(';');
  closeBtn.onclick = dismiss;
  el.appendChild(closeBtn);

  container.appendChild(el);

  // animate in
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  if (durationMs !== null) {
    dismissTimer = window.setTimeout(dismiss, durationMs);
  }
}

export const toast = {
  success: (message: string) => show(message, 'success', 3000),
  // Sem timeout: fica na tela até o usuário clicar no X.
  error: (message: string) => show(message, 'error', null),
};

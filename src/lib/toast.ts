/**
 * Toast minimalista, zero dependências.
 * Uso: toast.success('Salvo') | toast.error('Erro ao salvar')
 *
 * Motivo de não usar lib externa (sonner/shadcn): manter o bundle enxuto e
 * evitar nova dependência para uma necessidade simples de feedback.
 * Se o projeto adotar shadcn/sonner no futuro, basta trocar a implementação
 * mantendo a mesma interface (success/error).
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

function show(message: string, type: ToastType, durationMs = 2500) {
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
      'padding:10px 16px',
      'border-radius:12px',
      'font-size:13px',
      'font-weight:700',
      'box-shadow:0 4px 12px rgba(0,0,0,0.15)',
      'display:flex',
      'align-items:center',
      'gap:8px',
      'opacity:0',
      'transform:translateY(-8px)',
      'transition:opacity 180ms ease, transform 180ms ease',
      'pointer-events:auto',
      'max-width:320px',
    ].join(';')
  );
  el.textContent = `${icon} ${message}`;
  container.appendChild(el);

  // animate in
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  // animate out + remove
  window.setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    window.setTimeout(() => el.remove(), 200);
  }, durationMs);
}

export const toast = {
  success: (message: string) => show(message, 'success'),
  error: (message: string) => show(message, 'error'),
};

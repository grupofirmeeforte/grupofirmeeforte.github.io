/**
 * useLicenseGuard — Proteção de licenciamento
 * Monitora o DOM e reinsere o aviso de licenciamento caso seja removido.
 * Também injeta metadados ocultos no <head> para rastreabilidade.
 */
import { useEffect } from 'react';

const LICENSE_ID = 'gff-license-notice';
const LICENSE_META_ID = 'gff-license-meta';
const LICENSEE = 'Grupo Firme \u0026 Forte';
const LICENSOR = 'Sidnei H. Ultramare';
const LICENSE_TEXT = `\u{1F512} Este sistema \u00e9 licenciado para ${LICENSEE}`;

function injectMeta() {
  if (!document.getElementById(LICENSE_META_ID)) {
    const meta = document.createElement('meta');
    meta.id = LICENSE_META_ID;
    meta.name = 'application-license';
    meta.content = `Licensed to: ${LICENSEE} | Author: ${LICENSOR} | Unauthorized removal is prohibited`;
    document.head.appendChild(meta);
  }
}

function ensureLicenseNotice() {
  // Injeta metadado oculto no <head>
  injectMeta();

  // Verifica se o aviso existe no DOM
  const existing = document.getElementById(LICENSE_ID);
  if (existing) return;

  // Reinsere o aviso no body se foi removido
  const notice = document.createElement('div');
  notice.id = LICENSE_ID;
  notice.setAttribute('data-license', LICENSEE);
  notice.style.cssText = [
    'position:fixed',
    'bottom:0',
    'left:0',
    'right:0',
    'z-index:99999',
    'text-align:center',
    'padding:4px 8px',
    'font-size:11px',
    'background:rgba(0,0,0,0.75)',
    'color:rgba(255,255,255,0.55)',
    'pointer-events:none',
    'user-select:none',
  ].join(';');
  notice.textContent = LICENSE_TEXT;
  document.body.appendChild(notice);
}

export function useLicenseGuard() {
  useEffect(() => {
    // Injeta imediatamente
    ensureLicenseNotice();

    // Monitora remoções via MutationObserver
    const observer = new MutationObserver(() => {
      ensureLicenseNotice();
    });

    observer.observe(document.body, { childList: true, subtree: false });
    observer.observe(document.head, { childList: true, subtree: false });

    // Verificação periódica a cada 3 segundos como fallback
    const interval = setInterval(ensureLicenseNotice, 3000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
}

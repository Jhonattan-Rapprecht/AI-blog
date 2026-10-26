const API = import.meta.env.API_URL || 'http://localhost:3000/api/public';

export function trackArticleRead(articleId) {
  if (!articleId || typeof document === 'undefined') return;

  let viewId = null;
  let activeMilliseconds = 0;
  let visibleSince = document.visibilityState === 'visible' ? performance.now() : null;
  let pageEnded = false;

  const recordVisibleTime = () => {
    if (visibleSince === null) return;
    activeMilliseconds += Math.max(0, performance.now() - visibleSince);
    visibleSince = null;
  };

  const sendDuration = () => {
    if (!viewId) return;
    const body = JSON.stringify({ readSeconds: Math.floor(activeMilliseconds / 1000) });
    const payload = new Blob([body], { type: 'text/plain' });
    const url = `${API}/analytics/views/${encodeURIComponent(viewId)}/finish`;
    if (navigator.sendBeacon?.(url, payload)) return;
    fetch(url, { method: 'POST', body: payload, keepalive: true }).catch(() => {});
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      recordVisibleTime();
      sendDuration();
    } else if (!pageEnded) {
      visibleSince = performance.now();
    }
  };

  const onPageHide = () => {
    pageEnded = true;
    recordVisibleTime();
    sendDuration();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide, { once: true });

  fetch(`${API}/analytics/views`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articleId }),
  })
    .then((response) => response.ok ? response.json() : null)
    .then((data) => {
      viewId = data?.viewId || null;
      if (viewId && pageEnded) sendDuration();
    })
    .catch(() => {});

  return () => {
    pageEnded = true;
    recordVisibleTime();
    sendDuration();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', onPageHide);
  };
}

(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register(new URL('service-worker.js', base), {scope: base.pathname}).catch(() => {}));
  }

  const button = document.getElementById('install-app');
  if (!button) return;
  let installPrompt = null;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    button.hidden = false;
  });

  button.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    button.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    button.hidden = true;
  });
})();

// Suppression for web3 extension errors and global error handling
(function () {
  if (typeof window === 'undefined') return;

  const suppressPattern = /Talisman extension|onboarding|configured yet|MetaMask|web3|ethereum/i;

  // 1. CSS Injection
  const injectStyles = () => {
    const style = document.createElement('style');
    style.id = 'suppress-crypto-styles';
    style.textContent = `
      [id*="talisman"], [class*="talisman"], [id*="Talisman"], [class*="Talisman"],
      [id*="metamask"], [class*="metamask"], [id*="MetaMask"], [class*="MetaMask"],
      [id*="ethereum"], [class*="ethereum"], [id*="web3"], [class*="web3"],
      iframe[src*="talisman"], div[style*="talisman"],
      iframe[src*="metamask"], div[style*="metamask"],
      .talisman-onboarding, #talisman-onboarding,
      .metamask-onboarding, #metamask-onboarding,
      [data-talisman], [talisman-extension],
      [data-metamask], [metamask-extension] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        z-index: -9999 !important;
        position: absolute !important;
        left: -9999px !important;
        height: 0 !important;
        width: 0 !important;
      }
    `;
    if (!document.getElementById('suppress-crypto-styles')) {
      (document.head || document.documentElement).appendChild(style);
    }
  };

  try {
    injectStyles();
    setInterval(injectStyles, 1000);
  } catch (e) {}

  // 2. Neutralize window objects with silent proxy
  const silentHandler: ProxyHandler<object> = {
    get: (_target, prop) => {
      if (prop === 'isMetaMask' || prop === 'isTalisman') return true;
      if (prop === 'on' || prop === 'removeListener') return () => {};
      if (prop === 'request' || prop === 'send' || prop === 'sendAsync' || prop === 'enable') {
        return () => Promise.resolve([]);
      }
      if (prop === 'selectedAddress') return null;
      if (prop === 'networkVersion') return '1';
      if (prop === 'chainId') return '0x1';
      return undefined;
    },
  };

  const silentProxy = new Proxy({}, silentHandler);

  const neutralize = (name: string) => {
    try {
      const win = window as any;
      if (win[name] && win[name] !== silentProxy) {
        try {
          win[name] = silentProxy;
        } catch (e) {}
      } else if (!win[name]) {
        Object.defineProperty(win, name, {
          get: () => silentProxy,
          set: () => {},
          configurable: true,
        });
      }
    } catch (e) {}
  };

  ['talisman', 'metamask', 'ethereum', 'web3'].forEach(neutralize);

  // 3. Robust Console Override
  const wrapConsole = (method: 'log' | 'warn' | 'error' | 'info' | 'debug' | 'trace') => {
    const original = console[method];
    try {
      console[method] = function (...args: any[]) {
        try {
          const str = args.join(' ');
          if (suppressPattern.test(str)) return;
        } catch (e) {}
        return original.apply(console, args);
      };
    } catch (e) {}
  };

  (['log', 'warn', 'error', 'info', 'debug', 'trace'] as const).forEach(wrapConsole);

  // 4. Global Error Handlers
  window.addEventListener(
    'error',
    (e) => {
      if (e.message && suppressPattern.test(e.message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (e) => {
      const reason = e.reason ? (e.reason.message || e.reason).toString() : '';
      if (suppressPattern.test(reason)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  // 5. Intercept postMessage communication
  window.addEventListener(
    'message',
    (e) => {
      try {
        const dataStr = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
        if (suppressPattern.test(dataStr)) {
          e.stopImmediatePropagation();
        }
      } catch (err) {}
    },
    true
  );

  // 6. UI load error fallback
  window.addEventListener('error', function (e) {
    const root = document.getElementById('root');
    if (root && !root.innerHTML.trim()) {
      root.innerHTML =
        '<div style="padding: 20px; color: red; font-family: sans-serif;">' +
        '<h2>Помилка завантаження</h2>' +
        '<p>' +
        e.message +
        '</p>' +
        '<p><small>' +
        e.filename +
        ':' +
        e.lineno +
        '</small></p>' +
        '<button onclick="location.reload()">Оновити</button>' +
        '</div>';
    }
  });
})();

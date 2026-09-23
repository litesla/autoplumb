// Global early error suppression for third-party browser extensions (Talisman, MetaMask, etc.)
(function () {
  if (typeof window === 'undefined') return;

  var suppressPattern = /Talisman|onboarding|configured yet|MetaMask|web3|ethereum|evm|polkadot/i;

  // 1. Silent Console Wrapper
  var methods = ['error', 'warn', 'log', 'info', 'debug', 'trace'];
  for (var i = 0; i < methods.length; i++) {
    (function (method) {
      var orig = console[method];
      console[method] = function () {
        try {
          var args = Array.prototype.slice.call(arguments);
          var msg = args.map(function (a) {
            try {
              return typeof a === 'object' ? JSON.stringify(a) : String(a);
            } catch (e) {
              return String(a);
            }
          }).join(' ');
          if (suppressPattern.test(msg)) {
            return;
          }
        } catch (e) {}
        if (orig) {
          orig.apply(console, arguments);
        }
      };
    })(methods[i]);
  }

  // 2. Global Error Event Handlers
  var prevOnError = window.onerror;
  window.onerror = function (msg, url, lineNo, colNo, error) {
    var errStr = [msg, url, error ? error.message : '', error ? error.stack : ''].join(' ');
    if (suppressPattern.test(errStr)) {
      return true; // suppresses the error
    }
    if (prevOnError) {
      return prevOnError.apply(window, arguments);
    }
    return false;
  };

  window.addEventListener(
    'error',
    function (e) {
      var msg = (e.message || (e.error && e.error.message) || '').toString();
      if (suppressPattern.test(msg)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    function (e) {
      var reason = e.reason ? (e.reason.message || e.reason.stack || e.reason).toString() : '';
      if (suppressPattern.test(reason)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    },
    true
  );

  // 3. Prevent postMessage noise from extensions
  window.addEventListener(
    'message',
    function (e) {
      try {
        var dataStr = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
        if (suppressPattern.test(dataStr)) {
          e.stopImmediatePropagation();
        }
      } catch (err) {}
    },
    true
  );

  // 4. Neutralize web3 / talisman properties
  try {
    var dummyProxy = new Proxy({}, {
      get: function (_, prop) {
        if (prop === 'isMetaMask' || prop === 'isTalisman') return true;
        if (prop === 'request' || prop === 'send' || prop === 'enable') return function () { return Promise.resolve([]); };
        if (prop === 'on' || prop === 'removeListener') return function () {};
        return undefined;
      }
    });

    ['talisman', 'metamask', 'ethereum', 'web3'].forEach(function (key) {
      try {
        Object.defineProperty(window, key, {
          get: function () { return dummyProxy; },
          set: function () {},
          configurable: true
        });
      } catch (e) {}
    });
  } catch (e) {}

  // 5. CSS Injection to hide any overlay UI from extensions
  var injectStyles = function () {
    var style = document.createElement('style');
    style.id = 'suppress-crypto-styles';
    style.textContent = [
      '[id*="talisman"]', '[class*="talisman"]', '[id*="Talisman"]', '[class*="Talisman"]',
      '[id*="metamask"]', '[class*="metamask"]', '[id*="MetaMask"]', '[class*="MetaMask"]',
      '[id*="ethereum"]', '[class*="ethereum"]', '[id*="web3"]', '[class*="web3"]',
      'iframe[src*="talisman"]', 'div[style*="talisman"]',
      '.talisman-onboarding', '#talisman-onboarding'
    ].join(', ') + ' { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';

    if (!document.getElementById('suppress-crypto-styles')) {
      (document.head || document.documentElement).appendChild(style);
    }
  };

  try {
    injectStyles();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectStyles);
    }
  } catch (e) {}
})();

/**
 * Last-resort recovery for a boot that never happens.
 *
 * The chunk-load retry in src/main.tsx cannot help when the ENTRY module is
 * the thing that fails, because the handler lives inside that module. A stale
 * client asking for a chunk the current deploy no longer ships used to receive
 * index.html at status 200 under the immutable /assets/* cache header — HTML
 * parsed as a module, nothing mounts, and a blank page a reload cannot clear
 * because the bad response is cached for a year. netlify.toml now 404s those
 * paths, but any future variant leaves the same symptom, and the entry is
 * exactly the case with no in-app recovery.
 *
 * So this ships inline in <head>: it needs nothing from the network, which is
 * the whole point when the network is what betrayed us.
 *
 * Emitted only for production builds — a 20-second watchdog that redirects to
 * /reset would be a hostile surprise while developing.
 */
export const buildBootGuardScript = (): string => `(function () {
  var BREAKER_KEY = 'budgard-boot-recovered';
  var BACKSTOP_MS = 20000;

  // /reset is the recovery page itself; guarding it would loop.
  if (window.location.pathname === '/reset') return;

  var recovered = false;
  try {
    recovered = sessionStorage.getItem(BREAKER_KEY) === '1';
  } catch (error) {
    // Storage unavailable (private mode) — carry on with the breaker open.
  }

  var hasMounted = function () {
    var root = document.getElementById('root');

    return !!root && root.childNodes.length > 0;
  };

  var recover = function () {
    if (recovered || hasMounted()) return;

    recovered = true;
    try {
      sessionStorage.setItem(BREAKER_KEY, '1');
    } catch (error) {
      // The breaker cannot persist without storage. Still go once: a blank
      // page is worse than a redirect that might repeat on the next launch.
    }

    var from = window.location.pathname + window.location.search;
    window.location.replace('/reset?from=' + encodeURIComponent(from));
  };

  // Precise signal: one of our own module scripts failed to load or parse.
  // Scoped to /assets/ so a blocked third-party tag cannot trigger a reset,
  // and gated on hasMounted() so a failed lazy route falls to main.tsx.
  window.addEventListener('error', function (event) {
    var target = event.target;
    if (!target || target.tagName !== 'SCRIPT') return;
    if (String(target.src || '').indexOf('/assets/') === -1) return;

    recover();
  }, true);

  // Backstop: nothing threw, but nothing mounted either. Long enough not to
  // fire on a slow first load, and skipped offline, where a stalled boot is
  // expected rather than broken.
  window.setTimeout(function () {
    if (hasMounted()) {
      try {
        sessionStorage.removeItem(BREAKER_KEY);
      } catch (error) {
        // Advisory only — a stale breaker just costs one missed recovery.
      }

      return;
    }

    if (navigator.onLine === false) return;

    recover();
  }, BACKSTOP_MS);
})();`;

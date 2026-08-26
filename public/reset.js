var status = document.getElementById('status');
var params = new URLSearchParams(window.location.search);

// Resolve `?from=` against our own origin and keep only the path. A prefix
// check is not enough: browsers fold backslashes into slashes for http(s)
// URLs, so "/\\evil.com" survives a startsWith('//') test and then lands on
// https://evil.com. Comparing the resolved origin also rejects absolute URLs
// and javascript: (which resolves to a null origin).
var resolveReturnTo = function (raw) {
  if (!raw) {
    return '/';
  }

  try {
    var url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) {
      return '/';
    }

    return url.pathname + url.search + url.hash;
  } catch (err) {
    return '/';
  }
};

var returnTo = resolveReturnTo(params.get('from'));
var RESET_DEADLINE_MS = 4000;
var hasFinished = false;

// WebKit occasionally leaves Cache Storage or service-worker operations
// pending forever while a newly installed PWA worker is changing state. This
// page is itself the escape hatch, so it must never wait forever on either API.
var finish = function () {
  if (hasFinished) {
    return;
  }

  hasFinished = true;
  status.textContent = 'Done! Loading…';
  window.location.replace(returnTo);
};

window.setTimeout(finish, RESET_DEADLINE_MS);

var clearServiceWorkers = async function () {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  var registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map(function (reg) {
      return reg.unregister();
    }),
  );
};

var clearAppCaches = async function () {
  if (!('caches' in window)) {
    return;
  }

  var keys = await caches.keys();
  await Promise.all(
    keys.map(function (key) {
      return caches.delete(key);
    }),
  );
};

var reset = async function () {
  try {
    // Run independently: a stuck service-worker database must not prevent the
    // Cache Storage half of the repair (or vice versa) from completing.
    await Promise.all([clearServiceWorkers(), clearAppCaches()]);

    finish();
  } catch (err) {
    // A rejected cleanup is no reason to strand the user here. Continue to
    // the app; its boot guard remains the final breaker if recovery failed.
    finish();
  }
};

reset();

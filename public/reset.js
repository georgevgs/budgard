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

var reset = async function () {
  try {
    if ('serviceWorker' in navigator) {
      var registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(function (reg) {
          return reg.unregister();
        }),
      );
    }

    if ('caches' in window) {
      var keys = await caches.keys();
      await Promise.all(
        keys.map(function (key) {
          return caches.delete(key);
        }),
      );
    }

    status.textContent = 'Done! Loading…';
    window.location.replace(returnTo);
  } catch (err) {
    status.textContent =
      'Could not reset automatically. Go to iOS Settings → Safari → Clear History and Website Data, then reopen the app.';
  }
};

reset();

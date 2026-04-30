var status = document.getElementById('status');
var params = new URLSearchParams(window.location.search);
var returnTo = params.get('from') || '/';
if (!returnTo.startsWith('/') || returnTo.startsWith('//')) {
  returnTo = '/';
}

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

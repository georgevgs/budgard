(function() {
  var savedTheme = localStorage.getItem('theme') || 'light';
  var root = document.documentElement;
  root.setAttribute('data-theme', savedTheme);
  if (savedTheme === 'dark') {
    root.classList.add('dark');
  }
})();

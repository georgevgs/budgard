(function () {
  var savedTheme = localStorage.getItem('theme') || 'light';
  var root = document.documentElement;
  root.setAttribute('data-theme', savedTheme);
  if (savedTheme === 'dark') {
    root.classList.add('dark');
  }

  // Barbie has its own fixed palette — skip accent override
  if (savedTheme === 'barbie') return;

  // Apply saved accent color to prevent flash
  var accents = {
    sunset:   { light: ['24 75% 50%', '0 0% 100%'],  dark: ['22 78% 58%', '24 40% 6%'] },
    ocean:    { light: ['215 68% 50%', '0 0% 100%'],  dark: ['213 70% 62%', '215 45% 6%'] },
    lavender: { light: ['262 60% 56%', '0 0% 100%'],  dark: ['264 58% 66%', '262 35% 6%'] },
    mint:     { light: ['162 55% 38%', '0 0% 100%'],  dark: ['160 50% 50%', '162 35% 6%'] },
    coral:    { light: ['350 62% 52%', '0 0% 100%'],  dark: ['348 58% 62%', '350 35% 6%'] },
    gold:     { light: ['40 70% 46%', '0 0% 100%'],   dark: ['42 65% 55%', '40 40% 6%'] },
    slate:    { light: ['220 20% 42%', '0 0% 100%'],  dark: ['218 18% 58%', '220 15% 6%'] }
  };
  var key = localStorage.getItem('accent-color');
  var a = key && accents[key];
  if (a) {
    var vals = savedTheme === 'dark' ? a.dark : a.light;
    root.style.setProperty('--primary', vals[0]);
    root.style.setProperty('--primary-foreground', vals[1]);
    root.style.setProperty('--ring', vals[0]);
    root.style.setProperty('--chart-1', vals[0]);
  }
})();

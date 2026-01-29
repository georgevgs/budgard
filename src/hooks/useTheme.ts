import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'barbie';

const getInitialTheme = (): Theme => {
  try {
    const savedTheme = localStorage.getItem('theme');

    if (
      savedTheme === 'light' ||
      savedTheme === 'dark' ||
      savedTheme === 'barbie'
    ) {
      return savedTheme;
    }

    return 'light';
  } catch (error) {
    console.error('Error reading theme from localStorage:', error);
    return 'light';
  }
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    try {
      localStorage.setItem('theme', theme);
      console.log('Theme saved to localStorage:', theme);
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
    }

    const root = window.document.documentElement;
    root.setAttribute('data-theme', theme);

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return { theme, setTheme };
}

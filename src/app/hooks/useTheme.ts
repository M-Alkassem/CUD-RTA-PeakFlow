import { useState, useEffect } from 'react';
import { ThemeMode } from '../lib/types';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [realTime, setRealTime] = useState('');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setRealTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  return { theme, setTheme, toggleTheme, realTime };
}

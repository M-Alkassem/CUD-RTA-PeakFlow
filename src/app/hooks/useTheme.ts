import { useState, useEffect } from 'react';
import { ThemeMode } from '../lib/types';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [realTime, setRealTime] = useState('');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('light');
    root.classList.remove('dark');
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setRealTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {};

  return { theme: 'light' as const, setTheme, toggleTheme, realTime };
}

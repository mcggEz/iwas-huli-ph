'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Theme, getStoredTheme, setStoredTheme, applyTheme, getEffectiveTheme } from '@/lib/theme';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = getStoredTheme();
    setThemeState(storedTheme);
    setEffectiveTheme(getEffectiveTheme());
    applyTheme(storedTheme);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    setStoredTheme(theme);
    applyTheme(theme);
    setEffectiveTheme(getEffectiveTheme());
  }, [theme, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
        setEffectiveTheme(getEffectiveTheme());
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // Always provide a context value, even before mounted
  const contextValue = {
    theme,
    setTheme,
    effectiveTheme: mounted ? effectiveTheme : 'light' // Default to light before mounted
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return a default context instead of throwing an error
    return {
      theme: 'system' as Theme,
      setTheme: () => {},
      effectiveTheme: 'light' as const
    };
  }
  return context;
} 
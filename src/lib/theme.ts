export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'theme-preference';

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return (stored as Theme) || 'system';
  } catch {
    return 'system';
  }
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Handle localStorage errors gracefully
  }
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getEffectiveTheme(): 'light' | 'dark' {
  const storedTheme = getStoredTheme();
  
  if (storedTheme === 'system') {
    return getSystemTheme();
  }
  
  return storedTheme;
}

export function applyTheme(theme: Theme): void {
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
  
  // Remove existing theme classes
  document.documentElement.classList.remove('light', 'dark');
  
  // Add the current theme class
  document.documentElement.classList.add(effectiveTheme);
  
  // Update the data attribute for Tailwind
  document.documentElement.setAttribute('data-theme', effectiveTheme);
}

export function initializeTheme(): void {
  const theme = getStoredTheme();
  applyTheme(theme);
} 
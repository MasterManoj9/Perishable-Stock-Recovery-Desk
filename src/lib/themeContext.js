/**
 * themeContext.js — Unified Application Theme Provider
 * 
 * Enforces the unified FYND light peach design palette across the entire application:
 * - Ensures dark mode class is cleared from document.documentElement and body.
 * - Provides consistent context values (isDark: false) for backward compatibility.
 */

import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {}
});

export function ThemeProvider({ children }) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;

    root.classList.remove('dark');
    if (body) body.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';

    try {
      localStorage.removeItem('c30_theme');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const value = {
    theme: 'light',
    isDark: false,
    toggleTheme: () => {},
    setTheme: () => {}
  };

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  try {
    const context = useContext(ThemeContext);
    if (!context) {
      return { theme: 'light', isDark: false, toggleTheme: () => {}, setTheme: () => {} };
    }
    return context;
  } catch {
    return { theme: 'light', isDark: false, toggleTheme: () => {}, setTheme: () => {} };
  }
}

export default ThemeContext;

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AppTheme,
  AppThemeId,
  APP_THEMES,
  DEFAULT_THEME_ID,
  getSavedThemeId,
  saveThemeId,
  applyThemeToDocument,
} from '@/lib/theme-manager';

interface ThemeContextValue {
  themeId: AppThemeId;
  theme: AppTheme;
  setTheme: (id: AppThemeId) => void;
  themes: AppTheme[];
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: DEFAULT_THEME_ID,
  theme: APP_THEMES[0],
  setTheme: () => {},
  themes: APP_THEMES,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<AppThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    // Hydrate saved theme or fallback to DEFAULT_THEME_ID (theme_2)
    const initial = getSavedThemeId();
    setThemeIdState(initial);
    applyThemeToDocument(initial);

    // Listen for theme changes across modals/components
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ themeId: AppThemeId }>;
      if (customEvent.detail?.themeId) {
        setThemeIdState(customEvent.detail.themeId);
      }
    };

    window.addEventListener('beyondlimits_theme_changed', handleThemeChange);
    return () => {
      window.removeEventListener('beyondlimits_theme_changed', handleThemeChange);
    };
  }, []);

  const setTheme = (id: AppThemeId) => {
    setThemeIdState(id);
    saveThemeId(id);
  };

  const theme = APP_THEMES.find((t) => t.id === themeId) || APP_THEMES[0];

  return (
    <ThemeContext.Provider value={{ themeId, theme, setTheme, themes: APP_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}


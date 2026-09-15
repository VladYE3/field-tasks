import React, { createContext, useContext, useMemo } from 'react';
import { useTaskStore } from '../store/useTaskStore';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  border: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
}

export const lightColors: ThemeColors = {
  background: '#F4F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#EAEEF2',
  text: '#1A1F24',
  textMuted: '#66717D',
  primary: '#1F6FEB',
  onPrimary: '#FFFFFF',
  border: '#D7DEE5',
  danger: '#D64545',
  success: '#2E9E5B',
  warning: '#D98A16',
  info: '#4B8FD6',
};

export const darkColors: ThemeColors = {
  background: '#121619',
  surface: '#1C2228',
  surfaceAlt: '#262E36',
  text: '#E8EDF2',
  textMuted: '#8B97A3',
  primary: '#4C8DFF',
  onPrimary: '#0B1220',
  border: '#333D47',
  danger: '#E06161',
  success: '#4FBF7E',
  warning: '#E0A23E',
  info: '#6FA6DC',
};

export interface Theme {
  colors: ThemeColors;
  dark: boolean;
}

const ThemeContext = createContext<Theme>({ colors: lightColors, dark: false });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dark = useTaskStore((state) => state.darkMode);
  const value = useMemo<Theme>(
    () => ({ colors: dark ? darkColors : lightColors, dark }),
    [dark],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

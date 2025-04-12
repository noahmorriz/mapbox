/**
 * Theme System
 * 
 * Central repository for all theme-related styling across the application.
 * Each theme controls map appearance, highlight colors, icon styling, and text formatting.
 */

import { ThemeType } from './mapboxTypes';

/**
 * Complete theme definition interface
 */
export interface Theme {
  // Map styling
  mapStyle: string;
  backgroundColor: string;
  
  // Highlight styling
  highlight: {
    fillColor: string;
    lineColor: string;
    fillOpacity: number;
    lineOpacity: number;
    lineWidth?: number;
  };
  
  // Icon styling
  icon: {
    defaultColor: string;
    useDropShadow: boolean;
    dropShadowColor?: string;
    dropShadowBlur?: number;
  };
  
  // Text styling
  text: {
    color: string;
    fontSize: string;
    fontWeight: string;
  };
  
  // Info box styling
  infoBox: {
    backgroundColor: string;
    textColor: string;
    borderRadius: string;
    padding: string;
    maxWidth: string;
    fontSize: string;
  };
}

/**
 * Available themes
 */
export const THEMES: Record<ThemeType, Theme> = {
  // Dark theme
  dark: {
    mapStyle: 'mapbox://styles/noahmorriz/cm97zlzie00gf01qlaitpaodq',
    backgroundColor: '#000000',
    
    highlight: {
      fillColor: '#0C8E8E',
      lineColor: '#0C8E8E',
      fillOpacity: 0.6,
      lineOpacity: 1.0,
      lineWidth: 2,
    },
    
    icon: {
      defaultColor: '#FFFFFF',
      useDropShadow: true,
      dropShadowColor: 'rgba(0,0,0,0.7)',
      dropShadowBlur: 8,
    },
    
    text: {
      color: '#FFFFFF',
      fontSize: '16px',
      fontWeight: '500',
    },
    
    infoBox: {
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      textColor: '#FFFFFF',
      borderRadius: '4px',
      padding: '8px 12px',
      maxWidth: '240px',
      fontSize: '14px',
    },
  },
  
  // Light theme
  light: {
    mapStyle: 'mapbox://styles/noahmorriz/cm97zlzie00gf01qlaitpaodq',
    backgroundColor: '#FFFFFF',
    
    highlight: {
      fillColor: '#1A73E8',
      lineColor: '#1A73E8',
      fillOpacity: 0.5,
      lineOpacity: 0.9,
      lineWidth: 2,
    },
    
    icon: {
      defaultColor: '#1A73E8',
      useDropShadow: true,
      dropShadowColor: 'rgba(0,0,0,0.3)',
      dropShadowBlur: 6,
    },
    
    text: {
      color: '#333333',
      fontSize: '16px',
      fontWeight: '500',
    },
    
    infoBox: {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      textColor: '#333333',
      borderRadius: '4px',
      padding: '8px 12px',
      maxWidth: '240px',
      fontSize: '14px',
    },
  },
};

/**
 * Get a theme by name
 * @param themeName Name of theme to retrieve
 * @returns Theme object with all styling definitions
 */
export const getTheme = (themeName: ThemeType = 'light'): Theme => {
  return THEMES[themeName] || THEMES.light;
};

/**
 * Get highlight colors for a specific theme
 * @param themeName Theme name
 * @returns Highlight color settings
 */
export const getHighlightColors = (themeName: ThemeType = 'light') => {
  const theme = getTheme(themeName);
  return theme.highlight;
}; 
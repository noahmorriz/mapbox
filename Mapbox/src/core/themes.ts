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
    opacity: number;
  };
  
  // Text styling
  text: {
    color: string;
    fontSize: string;
    fontWeight: string;
    fontFamily?: string;
    opacity?: number;
  };
  
  // Text overlay styling
  textOverlay?: {
    backgroundColor: string;
    padding: string;
    borderRadius?: string;
    textShadow?: string;
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
  
  // Vignette styling
  vignette: {
    color: string;
    intensity: number;
    feather: number;
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
      fillColor: '#8B0000',
      lineColor: '#8B0000',
      fillOpacity: 0.4,
      lineOpacity: 1.0,
      lineWidth: 2,
    },
    
    icon: {
      defaultColor: '#FFFFFF',
      useDropShadow: true,
      dropShadowColor: 'rgba(0,0,0,0.7)',
      dropShadowBlur: 8,
      opacity: 1.0,
    },
    
    text: {
      color: '#FFFFFF',
      fontSize: '16px',
      fontWeight: '500',
      fontFamily: '"Bebas Neue", sans-serif',
      opacity: 0.95,
    },
    
    textOverlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      padding: '10px 20px',
      borderRadius: '4px',
    },
    
    infoBox: {
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      textColor: '#FFFFFF',
      borderRadius: '4px',
      padding: '8px 12px',
      maxWidth: '240px',
      fontSize: '14px',
    },
    
    vignette: {
      color: 'rgba(0, 0, 0, 0.9)',
      intensity: 0.85,
      feather: 0.6,
    },
  },
  
  // Light theme
  light: {
    mapStyle: 'mapbox://styles/mapbox/light-v11',
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
      opacity: 1.0,
    },
    
    text: {
      color: '#333333',
      fontSize: '16px',
      fontWeight: '500',
      fontFamily: 'Arial, sans-serif',
      opacity: 1.0,
    },
    
    textOverlay: {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      padding: '10px 20px',
      borderRadius: '4px',
    },
    
    infoBox: {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      textColor: '#333333',
      borderRadius: '4px',
      padding: '8px 12px',
      maxWidth: '240px',
      fontSize: '14px',
    },
    
    vignette: {
      color: 'rgba(0, 0, 0, 0.6)',
      intensity: 0.6,
      feather: 0.5,
    },
  },
  
  // Vintage theme
  vintage: {
    mapStyle: 'mapbox://styles/noahmorriz/cm9eeq2p700gx01s80mtc5517',
    backgroundColor: '#F8F0E3',
    
    highlight: {
      fillColor: '#DBB66A',
      lineColor: '#6C4C1D',
      fillOpacity: 0.4,
      lineOpacity: 0.8,
      lineWidth: 2,
    },
    
    icon: {
      defaultColor: '#1a160c',
      useDropShadow: true,
      dropShadowColor: 'rgba(139,69,19,0.4)',
      dropShadowBlur: 5,
      opacity: 0.5,
    },
    
    text: {
      color: '#5C4033',
      fontSize: '16px',
      fontWeight: '500',
      fontFamily: '"Playfair Display", serif',
      opacity: 0.9,
    },
    
    textOverlay: {
      backgroundColor: 'transparent',
      padding: '5px 10px',
      textShadow: '1px 1px 2px rgba(139,69,19,0.4)',
    },
    
    infoBox: {
      backgroundColor: 'rgba(248, 240, 227, 0.9)',
      textColor: '#5C4033',
      borderRadius: '4px',
      padding: '10px 14px',
      maxWidth: '240px',
      fontSize: '14px',
    },
    
    vignette: {
      color: 'rgba(48, 30, 16, 0.7)',
      intensity: 0.55,
      feather: 0.7,
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
import React from 'react';
import { AbsoluteFill } from 'remotion';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapboxAnimation } from './components/MapboxAnimation';
import { AnimationProps, AnimationSettings } from './core/animationModel';
import { THEMES } from './core/themes';
import { ANIMATION_PHYSICS, UI_DEFAULTS } from './core/animationConstants';
import { ThemeType, MotionType, ProjectionType, IconType } from './core/mapboxTypes';
import { DEFAULT_TIMELINE } from './core/animationTiming';

// =====================================================================
// CONTROL PANEL - MAIN SETTINGS
// =====================================================================

/**
 * VISUAL SETTINGS - Appearance controls
 */
const VISUAL = {
  THEME: "dark" as ThemeType,         // "dark" or "light"
  ICON_TYPE: "skull" as IconType,    // Icon visual style
  ICON_SIZE: 40,         // Size as percentage (1-100) of country's optimal base size
  SHOW_HIGHLIGHT: true,  // Whether to display country highlight
  SHOW_ICON: true,       // Whether to display icon
};

/**
 * MAP SETTINGS - How the map behaves
 */
const MAP = {
  MOTION: "slowRotate" as MotionType,  // Map motion type
  PROJECTION: "mercator" as ProjectionType, // Map projection
  COUNTRY: "NLD",        // Default country code
};

/**
 * Main Composition component used by Remotion
 */
export const Composition: React.FC<AnimationProps> = (props) => {
  // Default settings using control panel values
  const defaults: Partial<AnimationProps> = {
    // Visual settings
    theme: VISUAL.THEME,
    iconType: VISUAL.SHOW_ICON ? VISUAL.ICON_TYPE : "none", // Use "none" when showIcon is false
    iconSize: VISUAL.ICON_SIZE,
    showHighlight: VISUAL.SHOW_HIGHLIGHT,
    showIcon: VISUAL.SHOW_ICON,
    
    // Map settings
    motion: MAP.MOTION,
    projection: MAP.PROJECTION,
    countryCode: MAP.COUNTRY,
    
    // Animation timing - use the standardized system
    animationTiming: {
      ...DEFAULT_TIMELINE,
      // No individual frame overrides here, use the standard timing
    }
  };

  // Merge defaults with props (props override defaults)
  const defaultedProps = { ...defaults, ...props };
  
  // Ensure iconType is set to "none" if showIcon is false
  if (!defaultedProps.showIcon) {
    defaultedProps.iconType = "none";
  }
  
  // Get theme settings
  const theme = THEMES[defaultedProps.theme || VISUAL.THEME];
  
  // Build settings
  const additionalSettings = {
    settings: {
      general: {
        backgroundColor: theme.backgroundColor,
        mapStyle: theme.mapStyle,
      },
      
      highlight: {
        fillColor: theme.highlight.fillColor,
        lineColor: theme.highlight.lineColor,
        fillOpacityTarget: defaultedProps.showHighlight ? theme.highlight.fillOpacity : 0,
        lineOpacityTarget: defaultedProps.showHighlight ? theme.highlight.lineOpacity : 0,
        labelOpacityTarget: defaultedProps.showIcon ? 1.0 : 0,
        
        fillAnimationDamping: ANIMATION_PHYSICS.HIGHLIGHT.FILL_DAMPING,
        fillAnimationStiffness: ANIMATION_PHYSICS.HIGHLIGHT.FILL_STIFFNESS,
        fillAnimationMass: ANIMATION_PHYSICS.HIGHLIGHT.FILL_MASS,
        lineAnimationDamping: ANIMATION_PHYSICS.HIGHLIGHT.LINE_DAMPING,
        lineAnimationStiffness: ANIMATION_PHYSICS.HIGHLIGHT.LINE_STIFFNESS,
        lineAnimationMass: ANIMATION_PHYSICS.HIGHLIGHT.LINE_MASS,
        labelAnimationDamping: ANIMATION_PHYSICS.HIGHLIGHT.LABEL_DAMPING,
        labelAnimationStiffness: ANIMATION_PHYSICS.HIGHLIGHT.LABEL_STIFFNESS,
        labelAnimationMass: ANIMATION_PHYSICS.HIGHLIGHT.LABEL_MASS
      },
      
      // Use the standardized timing system
      timing: defaultedProps.animationTiming,
      
      ui: {
        iconSize: defaultedProps.iconSize, // Unified icon size source
        iconColor: theme.icon.defaultColor,
        iconScale: UI_DEFAULTS.ICON_SCALE,
        iconDropShadow: theme.icon.useDropShadow,
        textColor: theme.text.color,
        textFontSize: theme.text.fontSize,
        textFontWeight: theme.text.fontWeight,
        infoBackgroundColor: theme.infoBox.backgroundColor,
        infoTextColor: theme.infoBox.textColor,
        infoMaxWidth: theme.infoBox.maxWidth,
        infoFontSize: theme.infoBox.fontSize,
        infoBorderRadius: theme.infoBox.borderRadius,
        infoPadding: theme.infoBox.padding
      }
    } as Partial<AnimationSettings>
  };
  
  // Icon settings - use the same value for consistency
  const iconSettings = {
    iconSettings: {
      size: defaultedProps.iconSize, // Use the same source for consistency
      color: theme.icon.defaultColor,
      scale: UI_DEFAULTS.ICON_SCALE,
    },
    enableIconDropShadow: theme.icon.useDropShadow
  };
  
  return (
    <AbsoluteFill style={{ backgroundColor: theme.backgroundColor }}>
      <MapboxAnimation 
        {...defaultedProps} 
        {...additionalSettings}
        {...iconSettings}
      />
    </AbsoluteFill>
  );
};
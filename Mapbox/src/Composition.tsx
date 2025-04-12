import React from 'react';
import { AbsoluteFill } from 'remotion';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapboxAnimation } from './components/MapboxAnimation';
import { AnimationProps, HighlightSettings } from './core/animationModel';
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
  ICON_TYPE: "flag" as IconType,    // Icon visual style
  ICON_COVERAGE: 35,      // NEW: Desired coverage percentage (e.g., 1-95) of the country's rendered smaller dimension
  ICON_SCALE_FACTOR: 1.0, // Scaling factor to make icons larger (>1.0) or smaller (<1.0) than the calculated size
  SHOW_HIGHLIGHT: false,  // Whether to display country highlight
  SHOW_ICON: true,       // Whether to display icon
};

/**
 * MAP SETTINGS - How the map behaves
 */
const MAP = {
  MOTION: "slowRotate" as MotionType,  // Map motion type
  PROJECTION: "mercator" as ProjectionType, // Map projection
  COUNTRY: "AUS",        // Default country code (Ensure this exists as iso_code in boundingbox.json)
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
    iconCoverage: VISUAL.ICON_COVERAGE, // Pass coverage percentage instead of size
    iconScaleFactor: VISUAL.ICON_SCALE_FACTOR, // Pass scaling factor to adjust the final size
    showHighlight: VISUAL.SHOW_HIGHLIGHT,
    showIcon: VISUAL.SHOW_ICON,
    
    // Map settings
    motion: MAP.MOTION,
    projection: MAP.PROJECTION,
    countryCode: MAP.COUNTRY, // Use ISO code for easier lookup in boundingbox.json
    
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
  
  // Extract highlight settings
  const highlightSettings: HighlightSettings = {
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
  };

  // Build general and UI settings (moved from additionalSettings)
  const generalSettings = {
    backgroundColor: theme.backgroundColor,
    mapStyle: theme.mapStyle,
  };

  // The icon size itself is now determined dynamically in MapboxAnimation
  // We primarily pass base styling and the coverage factor.
  const uiSettings = {
    // iconSize removed - now we use iconCoverage instead
    iconColor: theme.icon.defaultColor,
    iconScale: UI_DEFAULTS.ICON_SCALE, // Base scale, final size is dynamic
    iconScaleFactor: defaultedProps.iconScaleFactor, // Additional scale adjustment
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
  };
  
  // Icon settings - size is now dynamic based on coverage
  const iconSettings = {
    iconSettings: {
      // size property removed - determined dynamically in MapboxAnimation
      color: theme.icon.defaultColor,
      scale: UI_DEFAULTS.ICON_SCALE, // Base scale
      scaleFactor: defaultedProps.iconScaleFactor, // Pass the scale factor
    },
    enableIconDropShadow: theme.icon.useDropShadow
  };
  
  return (
    <AbsoluteFill style={{ backgroundColor: theme.backgroundColor }}>
      <MapboxAnimation 
        // Pass all defaulted props, including the new iconCoverage
        {...defaultedProps} 
        highlightSettings={highlightSettings} 
        backgroundColor={generalSettings.backgroundColor}
        // Pass base icon style settings (color, base scale, shadow)
        iconSettings={{
          ...iconSettings.iconSettings,
          // Explicitly include scale factor to ensure it's passed correctly
          scaleFactor: defaultedProps.iconScaleFactor,
        }}
        enableIconDropShadow={iconSettings.enableIconDropShadow}
        // Explicitly pass the iconCoverage and iconScaleFactor
        iconCoverage={defaultedProps.iconCoverage}
        iconScaleFactor={defaultedProps.iconScaleFactor}
        // Pass text settings if needed
        textSettings={{ 
          fontSize: uiSettings.textFontSize, 
          color: uiSettings.textColor, 
          fontWeight: uiSettings.textFontWeight 
        }}
        // Pass info settings if needed
        infoSettings={{
          maxWidth: uiSettings.infoMaxWidth,
          fontSize: uiSettings.infoFontSize,
          backgroundColor: uiSettings.infoBackgroundColor,
          textColor: uiSettings.infoTextColor,
          borderRadius: uiSettings.infoBorderRadius,
          padding: uiSettings.infoPadding,
        }}
      />
    </AbsoluteFill>
  );
};
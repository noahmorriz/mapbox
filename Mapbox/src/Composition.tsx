import React from 'react';
import { AbsoluteFill } from 'remotion';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapboxAnimation } from './components/MapboxAnimation';
import { AnimationProps, HighlightSettings } from './core/animationModel';
import { THEMES } from './core/themes';
import { ANIMATION_PHYSICS, UI_DEFAULTS } from './core/animationConstants';
import { ThemeType, MotionType, ProjectionType, IconType, TextDisplayType, TextAnimationType, TextPositionType } from './core/mapboxTypes';
import { DEFAULT_TIMELINE } from './core/animationTiming';

// =====================================================================
// CONTROL PANEL - MAIN SETTINGS
// =====================================================================

/**
 * VISUAL SETTINGS - Appearance controls
 */
const VISUAL = {
  THEME: "vintage" as ThemeType,         // Changed from "dark" to "light"
  ICON_TYPE: "flag" as IconType,    // Icon visual style
  ICON_COVERAGE: 20,      // NEW: Desired coverage percentage (e.g., 1-95) of the country's rendered smaller dimension
  ICON_SCALE_FACTOR: 1.0, // Scaling factor to make icons larger (>1.0) or smaller (<1.0) than the calculated size
  SHOW_HIGHLIGHT: true,  // Whether to display country highlight
  SHOW_ICON: true,       // Whether to display icon
  // Text display settings
  SHOW_TEXT: true,       // Whether to display text
  TEXT_DISPLAY: "custom" as TextDisplayType, // Text display type (country name, custom, or none)
  CUSTOM_TEXT: "Netherlands",       // Custom text to display (used when TEXT_DISPLAY is "custom")
  TEXT_POSITION: "bottom-left" as TextPositionType, // Text position (bottom-left, lower-third, center, top, custom)
  TEXT_ANIMATION_TYPE: "typewriter" as TextAnimationType, // Text animation type (none, fadeIn, typewriter)
  TEXT_FONT_SIZE: "60px", // Very large font size
  TEXT_FONT_WEIGHT: 700, // Bold font weight
  // Vignette settings
  SHOW_VIGNETTE: true,    // Whether to show vignette effect
  VIGNETTE_INTENSITY: 0.7, // Vignette intensity (0-1)
  VIGNETTE_FEATHER: 0.5,   // Vignette feathering (0-1)
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
    
    // Text settings
    textDisplay: VISUAL.SHOW_TEXT ? VISUAL.TEXT_DISPLAY : "none", // Use "none" when showText is false
    customText: VISUAL.CUSTOM_TEXT, // Custom text content
    showText: VISUAL.SHOW_TEXT, // Whether to show text
    textPosition: VISUAL.TEXT_POSITION, // Text position
    textAnimationType: VISUAL.TEXT_ANIMATION_TYPE, // Text animation type
    
    // Vignette settings
    showVignette: VISUAL.SHOW_VIGNETTE,
    vignetteSettings: {
      intensity: VISUAL.VIGNETTE_INTENSITY,
      feather: VISUAL.VIGNETTE_FEATHER,
    },
    
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
  
  // Ensure textDisplay is set to "none" if showText is false
  if (!defaultedProps.showText) {
    defaultedProps.textDisplay = "none";
  }
  
  // Get theme settings
  const theme = THEMES[defaultedProps.theme || VISUAL.THEME];
  
  // Force refresh when theme changes
  const [refreshKey, setRefreshKey] = React.useState(0);
  React.useEffect(() => {
    // Update key to force a remount when theme changes
    setRefreshKey(prev => prev + 1);
  }, [defaultedProps.theme]);
  
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
    textFontSize: VISUAL.TEXT_FONT_SIZE || theme.text.fontSize, // Use custom font size if available
    textFontWeight: VISUAL.TEXT_FONT_WEIGHT ? String(VISUAL.TEXT_FONT_WEIGHT) : theme.text.fontWeight, // Convert to string
    textFontFamily: theme.text.fontFamily,
    textOpacity: theme.text.opacity,
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
  
  // Get vignette settings from theme if not provided in props
  const vignetteSettings = {
    color: defaultedProps.vignetteSettings?.color || theme.vignette.color,
    intensity: defaultedProps.vignetteSettings?.intensity || theme.vignette.intensity,
    feather: defaultedProps.vignetteSettings?.feather || theme.vignette.feather,
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
          // Explicitly include the theme color to ensure it's used for all icons
          color: theme.icon.defaultColor, 
        }}
        enableIconDropShadow={iconSettings.enableIconDropShadow}
        // Explicitly pass the iconCoverage and iconScaleFactor
        iconCoverage={defaultedProps.iconCoverage}
        iconScaleFactor={defaultedProps.iconScaleFactor}
        // Pass text settings
        textSettings={{ 
          fontSize: uiSettings.textFontSize, 
          color: uiSettings.textColor, 
          fontWeight: uiSettings.textFontWeight,
          fontFamily: uiSettings.textFontFamily,
          opacity: uiSettings.textOpacity
        }}
        textDisplay={defaultedProps.textDisplay}
        showText={defaultedProps.showText}
        customText={defaultedProps.customText}
        textPosition={defaultedProps.textPosition}
        textAnimationType={defaultedProps.textAnimationType}
        // Pass info settings if needed
        infoSettings={{
          maxWidth: uiSettings.infoMaxWidth,
          fontSize: uiSettings.infoFontSize,
          backgroundColor: uiSettings.infoBackgroundColor,
          textColor: uiSettings.infoTextColor,
          borderRadius: uiSettings.infoBorderRadius,
          padding: uiSettings.infoPadding,
        }}
        // Pass vignette settings
        showVignette={defaultedProps.showVignette}
        vignetteSettings={vignetteSettings}
        key={refreshKey}
      />
    </AbsoluteFill>
  );
};
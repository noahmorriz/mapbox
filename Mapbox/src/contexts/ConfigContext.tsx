import React, { createContext, useContext, useMemo } from 'react';
import { AnimationSettings } from '../core/animationModel';
import { ThemeType, MotionType, IconType, CountryData, ProjectionType } from '../core/mapboxTypes';
import { getCountry, defaultCountry, countries } from '../countryData';
import { THEMES } from '../core/themes';

/**
 * Configuration Context
 * 
 * This context uses the centralized theme system from core/themes.ts as the single
 * source of truth for all visual styling. All themes are defined in the central
 * THEMES object and imported here, rather than having duplicate theme definitions.
 */

// Define motion settings directly in this file
const RotateAndPitch = {
  camera: {
    initialRotation: 0,
    finalRotation: 45,
    initialPitch: 0,
    finalPitch: 45,
    rotationDamping: 30,
    rotationStiffness: 50,
    rotationMass: 1,
    pitchDamping: 30,
    pitchStiffness: 50,
    pitchMass: 1,
  },
  zoom: {
    zoomDamping: 30,
    zoomStiffness: 50,
    zoomMass: 1,
  },
  timing: {
    animationStartFrame: 0,
    highlightDelayFrames: 30,
    labelDelayFrames: 45,
    padding: 100,
    fadeDuration: 0,
  }
};

const NorthToRotate = {
  camera: {
    initialRotation: 0,
    finalRotation: 30,
    initialPitch: 0,
    finalPitch: 30,
    rotationDamping: 40,
    rotationStiffness: 60,
    rotationMass: 1.2,
    pitchDamping: 40,
    pitchStiffness: 60,
    pitchMass: 1.2,
  },
  zoom: {
    zoomDamping: 40,
    zoomStiffness: 60,
    zoomMass: 1.2,
  },
  timing: {
    animationStartFrame: 0,
    highlightDelayFrames: 15,
    labelDelayFrames: 30,
    padding: 80,
    fadeDuration: 0,
  }
};

const SlowRotate = {
  camera: {
    initialRotation: 0,
    finalRotation: 25,
    initialPitch: 0,
    finalPitch: 35,
    rotationDamping: 200,
    rotationStiffness: 8,
    rotationMass: 5,
    pitchDamping: 220,
    pitchStiffness: 6,
    pitchMass: 5,
  },
  // Add zoom settings with parameters to control how country zoom is applied
  zoom: {
    zoomDamping: 150,
    zoomStiffness: 5,
    zoomMass: 4,
    zoomLevelOffset: -0.9,
  },
  timing: {
    animationStartFrame: 10,
    highlightDelayFrames: 80,
    labelDelayFrames: 0,
    padding: 80,
    fadeDuration: 0,
  }
};

/**
 * Creates UI settings for customization
 */
const createUISettings = (
  options: {
    iconSettings?: {
      size?: number;
      color?: string;
      scale?: number;
    };
    textSettings?: {
      fontSize?: string;
      color?: string;
      fontWeight?: string;
    };
    infoSettings?: {
      maxWidth?: string;
      fontSize?: string;
      backgroundColor?: string;
      textColor?: string;
    };
  } = {}
) => {
  const { iconSettings, textSettings, infoSettings } = options;
  
  const partialUI = {
    ...(iconSettings ? {
      iconSize: iconSettings.size,
      iconColor: iconSettings.color,
      iconScale: iconSettings.scale,
    } : {}),
    ...(textSettings ? {
      textFontSize: textSettings.fontSize,
      textColor: textSettings.color,
      textFontWeight: textSettings.fontWeight,
    } : {}),
    ...(infoSettings ? {
      infoMaxWidth: infoSettings.maxWidth,
      infoFontSize: infoSettings.fontSize,
      infoBackgroundColor: infoSettings.backgroundColor,
      infoTextColor: infoSettings.textColor,
    } : {})
  };
  
  return {
    ui: partialUI
  };
};

/**
 * Creates country-specific settings
 */
const createCountrySettings = (
  countryCode: string,
  theme: ThemeType = "light",
  motion: MotionType = "northToRotate",
  customSettings: Partial<AnimationSettings> = {}
) => {
  // Get country data
  const countryData = countryCode 
    ? (countries[countryCode] || getCountry(countryCode) || defaultCountry) 
    : defaultCountry;
    
  // Get theme styles from the centralized theme system
  const themeObj = THEMES[theme];
  
  // Get motion settings - same for all countries
  const motionSettings = motion === "northToRotate" 
    ? NorthToRotate 
    : motion === "slowRotate" 
      ? SlowRotate 
      : RotateAndPitch;
  
  // Create base settings - now standardized across all countries
  const baseSettings = {
    camera: motionSettings.camera,
    highlight: {
      fillColor: themeObj.highlight.fillColor,
      lineColor: themeObj.highlight.lineColor, 
      lineWidth: themeObj.highlight.lineWidth || 2,
      fillOpacityTarget: themeObj.highlight.fillOpacity,
      lineOpacityTarget: themeObj.highlight.lineOpacity,
      labelOpacityTarget: 1,
      fillAnimationDamping: 25,
      fillAnimationStiffness: 80,
      fillAnimationMass: 1,
      lineAnimationDamping: 25,
      lineAnimationStiffness: 80,
      lineAnimationMass: 1,
      labelAnimationDamping: 25,
      labelAnimationStiffness: 80,
      labelAnimationMass: 1,
    },
    general: {
      animationStartFrame: motionSettings.timing.animationStartFrame,
      highlightDelayFrames: motionSettings.timing.highlightDelayFrames,
      labelDelayFrames: motionSettings.timing.labelDelayFrames,
      padding: motionSettings.timing.padding,
      backgroundColor: themeObj.backgroundColor,
      mapStyle: themeObj.mapStyle,
      renderWorldCopies: false,
      fadeDuration: motionSettings.timing.fadeDuration,
    },
    ui: {
      iconSize: 24,
      iconColor: themeObj.icon.defaultColor,
      iconScale: 1,
      iconDropShadow: themeObj.icon.useDropShadow,
      textFontSize: themeObj.text.fontSize,
      textColor: themeObj.text.color,
      textFontWeight: themeObj.text.fontWeight,
      infoMaxWidth: themeObj.infoBox.maxWidth,
      infoFontSize: themeObj.infoBox.fontSize,
      infoBackgroundColor: themeObj.infoBox.backgroundColor,
      infoTextColor: themeObj.infoBox.textColor,
      infoBorderRadius: themeObj.infoBox.borderRadius,
      infoPadding: themeObj.infoBox.padding
    },
    // Pass the timing settings without country-specific logic
    timing: customSettings.timing || undefined
  };
  
  // Merge all settings
  const mergedSettings = {
    camera: { 
      ...baseSettings.camera,
      ...customSettings.camera 
    },
    highlight: { 
      ...baseSettings.highlight, 
      ...customSettings.highlight 
    },
    general: { 
      ...baseSettings.general,
      ...customSettings.general 
    },
    ui: {
      ...baseSettings.ui,
      ...customSettings.ui
    },
    // Include the timing orchestration settings
    timing: baseSettings.timing
  };
  
  return {
    countryData,
    settings: mergedSettings
  };
};

interface ConfigContextValue {
  countryData: CountryData;
  settings: AnimationSettings;
  themeType: ThemeType;
  motionType: MotionType;
  projectionType: ProjectionType;
  iconType: IconType;
  customText?: string;
  additionalInfo?: string;
  motionSettings: typeof RotateAndPitch | typeof NorthToRotate | typeof SlowRotate;
  iconSize?: number;
  // Add a direct reference to the country code for animation timing
  countryCode: string;
}

const ConfigContext = createContext<ConfigContextValue>({
  countryData: {
    name: '',
    alpha2: '',
    alpha3: '',
    coordinates: [0, 0],
    zoomLevel: 0,
  },
  settings: {} as AnimationSettings,
  themeType: 'light',
  motionType: 'northToRotate',
  projectionType: 'mercator',
  iconType: 'marker',
  customText: '',
  motionSettings: NorthToRotate,
  iconSize: undefined,
  countryCode: '',
});

interface ConfigProviderProps {
  children: React.ReactNode;
  countryCode: string;
  customText?: string;
  iconType?: IconType;
  theme?: ThemeType;
  motion?: MotionType;
  projection?: ProjectionType;
  disableFallbackIcon?: boolean;
  enableIconDropShadow?: boolean;
  iconSettings?: {
    size?: number;
    color?: string;
    scale?: number;
  };
  textSettings?: {
    fontSize?: string;
    color?: string;
    fontWeight?: string;
  };
  infoSettings?: {
    maxWidth?: string;
    fontSize?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  backgroundColor?: string;
  highlightColor?: string;
  additionalInfo?: string;
  settings?: Partial<AnimationSettings>;
  iconSize?: number;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({
  children,
  countryCode,
  customText,
  iconType = 'marker',
  theme = 'light',
  motion = 'northToRotate',
  projection = 'mercator',
  disableFallbackIcon = false,
  enableIconDropShadow = true,
  iconSettings,
  textSettings,
  infoSettings,
  backgroundColor,
  highlightColor,
  additionalInfo,
  settings = {},
  iconSize,
}) => {
  // Create settings based on country code, theme, and motion
  const { countryData, settings: configuredSettings } = useMemo(() => {
    return createCountrySettings(
      countryCode,
      theme,
      motion,
      settings
    );
  }, [countryCode, theme, motion, settings]);
  
  // Apply UI customization settings
  const uiSettings = useMemo(() => {
    return createUISettings({
      iconSettings,
      textSettings,
      infoSettings,
    });
  }, [iconSettings, textSettings, infoSettings]);
  
  // Apply highlight color if provided
  const highlightSettings = useMemo(() => {
    return highlightColor ? {
      highlight: {
        fillColor: highlightColor,
        lineColor: highlightColor,
      }
    } : {};
  }, [highlightColor]);
  
  // Apply background color if provided
  const bgSettings = useMemo(() => {
    return backgroundColor ? {
      general: {
        backgroundColor,
      }
    } : {};
  }, [backgroundColor]);
  
  // Merge all settings
  const mergedSettings = useMemo(() => {
    const finalGeneral = {
       ...configuredSettings.general,
       ...bgSettings.general,
       projection: projection,
    };

    return {
      camera: { ...configuredSettings.camera },
      highlight: { 
        ...configuredSettings.highlight,
        ...highlightSettings.highlight,
      },
      general: finalGeneral,
      ui: {
        ...configuredSettings.ui,
        ...uiSettings.ui,
        iconDropShadow: enableIconDropShadow,
      }
    };
  }, [
    configuredSettings, 
    highlightSettings, 
    bgSettings, 
    uiSettings, 
    enableIconDropShadow,
    projection
  ]);
  
  // Get the appropriate motion settings
  const motionSettings = useMemo(() => {
    return motion === 'northToRotate' ? NorthToRotate : motion === 'slowRotate' ? SlowRotate : RotateAndPitch;
  }, [motion]);
  
  // Get the theme object from the centralized theme system
  const themeObject = useMemo(() => {
    return THEMES[theme];
  }, [theme]);
  
  const value: ConfigContextValue = {
    countryData,
    settings: mergedSettings,
    themeType: theme,
    motionType: motion,
    projectionType: projection,
    iconType,
    customText,
    additionalInfo,
    motionSettings,
    iconSize,
    countryCode,
  };
  
  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

// Hook to access the config context
export const useConfigContext = () => useContext(ConfigContext); 
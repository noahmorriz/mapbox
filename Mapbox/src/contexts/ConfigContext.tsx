import React, { createContext, useContext, useMemo } from 'react';
import { ThemeType, MotionType, IconType, CountryData, ProjectionType, TextDisplayType, TextPositionType } from '../core/mapboxTypes';
import { getCountry, defaultCountry, countries } from '../countryData';
import { THEMES } from '../core/themes';
import { TextAnimationType } from '../core/textAnimations';

/**
 * Configuration Context
 * 
 * This context is responsible for static configuration of the map and UI elements.
 * It handles country data, theme settings, and icon configuration.
 */

// Define motion presets - these will be accessed by AnimationContext
export const MotionPresets = {
  RotateAndPitch: {
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
  },

  NorthToRotate: {
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
  },

  SlowRotate: {
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
      borderRadius?: string;
      padding?: string;
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
      infoBorderRadius: infoSettings.borderRadius,
      infoPadding: infoSettings.padding,
    } : {})
  };
  
  return {
    ui: partialUI
  };
};

interface ConfigContextValue {
  // Country data
  countryData: CountryData;
  countryCode: string;
  
  // Appearance settings
  themeType: ThemeType;
  iconType: IconType;
  iconSize?: number;
  iconCoverage?: number;
  iconScaleFactor?: number;
  backgroundColor?: string;
  highlightColor?: string;
  
  // Icon settings
  iconSettings?: {
    size?: number;
    color?: string;
    scale?: number;
    scaleFactor?: number;
  };
  
  // Text settings
  textDisplay?: TextDisplayType;
  textSettings?: {
    fontSize?: string;
    color?: string;
    fontWeight?: string;
    fontFamily?: string;
    opacity?: number;
  };
  showText?: boolean;
  textAnimationType?: TextAnimationType;
  textPosition?: TextPositionType;
  
  // Map settings
  motionType: MotionType;
  projectionType: ProjectionType;
  mapStyle: string;
  
  // Text content
  customText?: string;
  additionalInfo?: string;
  
  // Motion settings for animation (but not animation state)
  motionSettings: typeof MotionPresets.NorthToRotate;
}

const ConfigContext = createContext<ConfigContextValue>({
  countryData: {
    name: '',
    alpha2: '',
    alpha3: '',
    coordinates: [0, 0],
    zoomLevel: 0,
  },
  countryCode: '',
  themeType: 'light',
  motionType: 'northToRotate',
  projectionType: 'mercator',
  iconType: 'marker',
  textDisplay: 'none',
  showText: false,
  motionSettings: MotionPresets.NorthToRotate,
  mapStyle: 'mapbox://styles/mapbox/light-v11',
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
    scaleFactor?: number;
  };
  textSettings?: {
    fontSize?: string;
    color?: string;
    fontWeight?: string;
    fontFamily?: string;
    opacity?: number;
  };
  textDisplay?: TextDisplayType;
  showText?: boolean;
  textAnimationType?: TextAnimationType;
  textPosition?: TextPositionType;
  infoSettings?: {
    maxWidth?: string;
    fontSize?: string;
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    padding?: string;
  };
  backgroundColor?: string;
  highlightColor?: string;
  additionalInfo?: string;
  iconSize?: number;
  iconCoverage?: number;
  iconScaleFactor?: number;
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
  textDisplay = 'none',
  showText = false,
  textAnimationType = 'none',
  textPosition = 'lower-third',
  infoSettings,
  backgroundColor,
  highlightColor,
  additionalInfo,
  iconSize,
  iconCoverage,
  iconScaleFactor,
}) => {
  // Get country data
  const countryData = useMemo(() => {
    return countryCode 
      ? (countries[countryCode] || getCountry(countryCode) || defaultCountry) 
      : defaultCountry;
  }, [countryCode]);
  
  // Get theme settings
  const themeObject = useMemo(() => {
    return THEMES[theme];
  }, [theme]);
  
  // Get map style from theme
  const mapStyle = useMemo(() => {
    return themeObject.mapStyle;
  }, [themeObject]);
  
  // Apply UI customization settings
  const uiSettings = useMemo(() => {
    return createUISettings({
      iconSettings,
      textSettings,
      infoSettings,
    });
  }, [iconSettings, textSettings, infoSettings]);
  
  // Get the appropriate motion settings
  const motionSettings = useMemo(() => {
    return motion === 'northToRotate' 
      ? MotionPresets.NorthToRotate 
      : motion === 'slowRotate' 
        ? MotionPresets.SlowRotate 
        : MotionPresets.RotateAndPitch;
  }, [motion]);
  
  const value: ConfigContextValue = {
    countryData,
    countryCode,
    themeType: theme,
    motionType: motion,
    projectionType: projection,
    iconType,
    customText,
    additionalInfo,
    motionSettings,
    iconSize: iconSize || uiSettings.ui.iconSize,
    iconCoverage,
    iconScaleFactor,
    backgroundColor: backgroundColor || themeObject.backgroundColor,
    highlightColor: highlightColor,
    mapStyle,
    iconSettings,
    textSettings,
    textDisplay,
    showText,
    textAnimationType,
    textPosition,
  };
  
  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

// Hook to access the config context
export const useConfigContext = () => useContext(ConfigContext); 
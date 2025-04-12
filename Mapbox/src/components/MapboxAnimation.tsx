import React, { useRef } from 'react';
import { MapProvider } from '../contexts/MapContext';
import { AnimationProvider } from '../contexts/AnimationContext';
import { ConfigProvider, useConfigContext } from '../contexts/ConfigContext';
import { Map } from './Map';
import { ThemeType, MotionType, IconType, ProjectionType } from '../core/mapboxTypes';
import DeckMarkerOverlay from './DeckMarkerOverlay';
import { HighlightSettings } from '../core/animationModel';
import { ANIMATION_PHYSICS, DEFAULT_OPACITIES } from '../core/animationConstants';

// Define a default HighlightSettings object
const DEFAULT_HIGHLIGHT_SETTINGS: HighlightSettings = {
  fillColor: '#cccccc', // Default neutral color
  lineColor: '#aaaaaa', // Default neutral color
  fillOpacityTarget: DEFAULT_OPACITIES.FILL,
  lineOpacityTarget: DEFAULT_OPACITIES.LINE,
  labelOpacityTarget: DEFAULT_OPACITIES.LABEL,
  fillAnimationDamping: ANIMATION_PHYSICS.HIGHLIGHT.FILL_DAMPING,
  fillAnimationStiffness: ANIMATION_PHYSICS.HIGHLIGHT.FILL_STIFFNESS,
  fillAnimationMass: ANIMATION_PHYSICS.HIGHLIGHT.FILL_MASS,
  lineAnimationDamping: ANIMATION_PHYSICS.HIGHLIGHT.LINE_DAMPING,
  lineAnimationStiffness: ANIMATION_PHYSICS.HIGHLIGHT.LINE_STIFFNESS,
  lineAnimationMass: ANIMATION_PHYSICS.HIGHLIGHT.LINE_MASS,
  labelAnimationDamping: ANIMATION_PHYSICS.HIGHLIGHT.LABEL_DAMPING,
  labelAnimationStiffness: ANIMATION_PHYSICS.HIGHLIGHT.LABEL_STIFFNESS,
  labelAnimationMass: ANIMATION_PHYSICS.HIGHLIGHT.LABEL_MASS,
};

interface MapboxAnimationProps {
  countryCode?: string;
  iconType?: IconType;
  theme?: ThemeType;
  motion?: MotionType;
  projection?: ProjectionType;
  disableFallbackIcon?: boolean;
  enableIconDropShadow?: boolean;
  customText?: string;
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
  };
  iconSize?: number;
  iconCoverage?: number;
  iconScaleFactor?: number;
  children?: React.ReactNode;
  highlightSettings?: HighlightSettings;
  // Custom animation timing
  animationTiming?: {
    labelDelay?: number;
    labelFadeDuration?: number;
    stabilizationBuffer?: number;
    animationStartFrame?: number;
    highlightDelayFrames?: number;
  };
}

// Inner component that has access to ConfigContext
const AnimationWrapper: React.FC<{ 
  children: React.ReactNode; 
  additionalInfo?: string;
  frameRenderHandleRef: React.MutableRefObject<number | null>;
  animationTiming?: MapboxAnimationProps['animationTiming'];
  highlightSettings?: HighlightSettings;
}> = ({ children, additionalInfo, frameRenderHandleRef, animationTiming, highlightSettings = DEFAULT_HIGHLIGHT_SETTINGS }) => {
  const { countryData, motionSettings, iconType, countryCode, mapStyle } = useConfigContext();
  
  // Get coordinates in a compatible format
  const coordinates = countryData.coordinates;
  
  return (
    <MapProvider>
      <AnimationProvider
        coordinates={coordinates}
        zoomLevel={countryData.zoomLevel}
        motionSettings={motionSettings}
        countryCode={countryCode}
        highlightSettings={highlightSettings}
        additionalInfo={additionalInfo}
        frameRenderHandleRef={frameRenderHandleRef}
        timing={animationTiming}
      >
        <Map mapStyle={mapStyle} countryCode={countryCode}>
          {/* Only render the icon if iconType is not 'none' */}
          {iconType !== 'none' && <DeckMarkerOverlay />}
          {children}
        </Map>
      </AnimationProvider>
    </MapProvider>
  );
};

/**
 * Main MapboxAnimation component
 * 
 * @example
 * // Basic usage:
 * <MapboxAnimation countryCode="USA" theme="dark" />
 */
export const MapboxAnimation: React.FC<MapboxAnimationProps> = ({
  countryCode = "NLD",
  iconType = "marker",
  theme = "light",
  motion = "northToRotate",
  projection = "mercator",
  disableFallbackIcon = false,
  enableIconDropShadow = true,
  customText,
  infoSettings,
  backgroundColor,
  highlightColor,
  additionalInfo,
  iconSettings,
  textSettings,
  iconSize,
  iconCoverage,
  iconScaleFactor,
  children,
  animationTiming,
  highlightSettings,
}) => {
  const frameRenderHandleRef = useRef<number | null>(null);
  
  // Render with context providers
  return (
    <ConfigProvider
      countryCode={countryCode}
      iconType={iconType}
      theme={theme}
      motion={motion}
      projection={projection}
      disableFallbackIcon={disableFallbackIcon}
      enableIconDropShadow={enableIconDropShadow}
      customText={customText}
      infoSettings={infoSettings}
      backgroundColor={backgroundColor}
      highlightColor={highlightColor}
      additionalInfo={additionalInfo}
      iconSettings={iconSettings}
      textSettings={textSettings}
      iconSize={iconSize}
      iconCoverage={iconCoverage}
      iconScaleFactor={iconScaleFactor}
    >
      <AnimationWrapper 
        additionalInfo={additionalInfo}
        frameRenderHandleRef={frameRenderHandleRef}
        animationTiming={animationTiming}
        highlightSettings={highlightSettings}
      >
        {children}
      </AnimationWrapper>
    </ConfigProvider>
  );
}; 
import React, { useRef } from 'react';
import { MapProvider } from '../contexts/MapContext';
import { AnimationProvider } from '../contexts/AnimationContext';
import { ConfigProvider, useConfigContext } from '../contexts/ConfigContext';
import { Map } from './Map';
import { CountryLayer } from './CountryLayer';
import { ThemeType, MotionType, IconType, ProjectionType } from '../core/mapboxTypes';
import { AnimationSettings } from '../core/animationModel';
import DeckMarkerOverlay from './DeckMarkerOverlay';

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
  };
  backgroundColor?: string;
  highlightColor?: string;
  additionalInfo?: string;
  settings?: Partial<AnimationSettings>;
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
  iconSize?: number;
  children?: React.ReactNode;
}

// Inner component that has access to ConfigContext
const AnimationWrapper: React.FC<{ 
  children: React.ReactNode; 
  additionalInfo?: string;
  frameRenderHandleRef: React.MutableRefObject<number | null>;
}> = ({ children, additionalInfo, frameRenderHandleRef }) => {
  const { settings, countryData, motionSettings, iconType } = useConfigContext();
  
  return (
    <AnimationProvider
      settings={settings}
      countryData={countryData}
      motionSettings={motionSettings}
      additionalInfo={additionalInfo}
      frameRenderHandleRef={frameRenderHandleRef}
    >
      <Map>
        <CountryLayer />
        {/* Only render the icon if iconType is not 'none' */}
        {iconType !== 'none' && <DeckMarkerOverlay />}
        {children}
      </Map>
    </AnimationProvider>
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
  settings = {},
  iconSettings,
  textSettings,
  iconSize,
  children,
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
      settings={settings}
      iconSettings={iconSettings}
      textSettings={textSettings}
      iconSize={iconSize}
    >
      <MapProvider>
        <AnimationWrapper 
          additionalInfo={additionalInfo}
          frameRenderHandleRef={frameRenderHandleRef}
        >
          {children}
        </AnimationWrapper>
      </MapProvider>
    </ConfigProvider>
  );
}; 
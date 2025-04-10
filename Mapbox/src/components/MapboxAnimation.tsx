import React, { useRef } from 'react';
import { AbsoluteFill } from 'remotion';
import { MapProvider } from '../contexts/MapContext';
import { AnimationProvider } from '../contexts/AnimationContext';
import { ConfigProvider, useConfigContext } from '../contexts/ConfigContext';
import { Map } from './Map';
import { CountryLayer } from './CountryLayer';
import { Marker } from './Marker';
import { InfoBox } from './InfoBox';
import { ThemeType, MotionType, IconType, ProjectionType, MarkerType, MarkerPositioningType } from '../core/mapboxTypes';
import { AnimationSettings } from '../core/animationModel';

interface MapboxAnimationProps {
  countryCode?: string;
  markerType?: MarkerType;
  markerText?: string;
  iconType?: IconType;
  markerPositioning?: MarkerPositioningType;
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
  const { settings, countryData, motionSettings } = useConfigContext();
  
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
 * 
 * // With combined marker (text + icon):
 * <MapboxAnimation countryCode="USA" markerType="combined" markerText="United States" />
 * 
 * // With compound components:
 * <MapboxAnimation countryCode="USA">
 *   <MapboxAnimation.Marker iconType="flag" />
 *   <MapboxAnimation.InfoBox>Additional information</MapboxAnimation.InfoBox>
 * </MapboxAnimation>
 */
export const MapboxAnimation: React.FC<MapboxAnimationProps> & {
  Marker: typeof MarkerSubcomponent;
  InfoBox: typeof InfoBoxSubcomponent;
} = ({
  countryCode = "NLD",
  markerType = "icon",
  markerText = "",
  iconType = "marker",
  markerPositioning = "viewport",
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
  
  // Check if we have subcomponents or should use the default setup
  const hasSubcomponents = React.Children.count(children) > 0;
  
  // Render with context providers
  return (
    <ConfigProvider
      countryCode={countryCode}
      markerType={markerType}
      markerText={markerText}
      iconType={iconType}
      markerPositioning={markerPositioning}
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
          {hasSubcomponents ? (
            children
          ) : (
            markerType !== 'none' && <Marker disableFallback={disableFallbackIcon} />
          )}
        </AnimationWrapper>
      </MapProvider>
    </ConfigProvider>
  );
};

// Marker subcomponent
interface MarkerSubcomponentProps {
  iconType?: IconType;
  disableFallback?: boolean;
  markerType?: MarkerType;
}

const MarkerSubcomponent: React.FC<MarkerSubcomponentProps> = ({
  iconType,
  disableFallback = false,
  markerType,
}) => {
  // This component is just a configuration wrapper
  // It doesn't actually render anything directly
  return <Marker disableFallback={disableFallback} />;
};

// InfoBox subcomponent
interface InfoBoxSubcomponentProps {
  children?: string;
}

const InfoBoxSubcomponent: React.FC<InfoBoxSubcomponentProps> = ({
  children,
}) => {
  // This component is just a configuration wrapper
  // It doesn't actually render anything directly
  return <InfoBox />;
};

// Attach subcomponents
MapboxAnimation.Marker = MarkerSubcomponent;
MapboxAnimation.InfoBox = InfoBoxSubcomponent; 
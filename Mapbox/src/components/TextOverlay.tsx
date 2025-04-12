import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { useConfigContext } from '../contexts/ConfigContext';
import { useAnimationContext } from '../contexts/AnimationContext';
import { interpolate } from 'remotion';
import { useMapContext } from '../contexts/MapContext';
import { getCountryVisualCenter, getCountryBounds, calculateIconSize } from '../utils/iconSizeCalculator';
import { DeckGL } from '@deck.gl/react';
import { TextLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { TextAnimationType, useTextAnimation } from '../core/textAnimations';

interface TextData {
  id: string;
  coordinates: [number, number];
  text: string;
  opacity: number;
}

interface TextOverlayProps {
  customText?: string;
  isVisible?: boolean;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({ customText, isVisible = true }) => {
  const frame = useCurrentFrame();
  const { textDisplay, textSettings, countryData, countryCode, iconCoverage, iconScaleFactor, textAnimationType = 'none' } = useConfigContext();
  const { animationTiming } = useAnimationContext();
  const { mapInstance, isMapLoaded } = useMapContext();
  const [displayText, setDisplayText] = useState<string>('');
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const initialViewStateRef = useRef<any>(null);
  const [isStabilized, setIsStabilized] = useState(false);
  const [initialTextSize, setInitialTextSize] = useState<number | null>(null);
  const countryBoundsRef = useRef(countryCode ? getCountryBounds(countryCode) : null);
  
  // Update countryBoundsRef when countryCode changes
  useEffect(() => {
    countryBoundsRef.current = countryCode ? getCountryBounds(countryCode) : null;
  }, [countryCode]);

  // Reset initialTextSize when country changes
  useEffect(() => {
    setInitialTextSize(null);
  }, [countryData?.alpha3, iconCoverage, iconScaleFactor]);

  // Determine which text to display based on textDisplay setting
  useEffect(() => {
    if (textDisplay === 'none') {
      setDisplayText('');
    } else if (textDisplay === 'country' && countryData) {
      setDisplayText(countryData.name);
    } else if (textDisplay === 'custom' && customText) {
      setDisplayText(customText);
    } else {
      setDisplayText('');
    }
  }, [textDisplay, countryData, customText]);

  // Get country coordinates for map positioning
  useEffect(() => {
    if (countryCode) {
      // First try to get coordinates from the visual center in our boundingbox data
      const visualCenterFromBounds = getCountryVisualCenter(countryCode);

      // Use visualCenter from country bounds if available, then from countryData if available, 
      // otherwise fall back to the default coordinates
      const coords = visualCenterFromBounds ||
        (countryData?.visualCenter) || 
        (Array.isArray(countryData?.coordinates) 
          ? countryData.coordinates as [number, number]
          : countryData?.coordinates ? [countryData.coordinates.lng, countryData.coordinates.lat] : null);
      
      setCoordinates(coords);
    }
  }, [countryCode, countryData]);

  // Wait for map to stabilize
  useEffect(() => {
    if (isMapLoaded && mapInstance && !isStabilized) {
      const timer = setTimeout(() => {
        initialViewStateRef.current = {
          longitude: mapInstance.getCenter().lng,
          latitude: mapInstance.getCenter().lat,
          zoom: mapInstance.getZoom(),
          pitch: mapInstance.getPitch(),
          bearing: mapInstance.getBearing(),
        };
        setIsStabilized(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isMapLoaded, mapInstance, isStabilized]);

  // Animation timing calculations
  const labelDelayFrames = animationTiming?.labelDelay || 60;
  const labelFadeDuration = animationTiming?.labelFadeDuration || 30;
  const animationStartFrame = animationTiming?.animationStartFrame || 10;
  
  // Use the new text animation system - ALWAYS call this hook regardless of conditions
  const animatedText = useTextAnimation(
    displayText || '', // Provide a fallback empty string to avoid null
    textAnimationType as TextAnimationType,
    animationStartFrame + labelDelayFrames,
    labelFadeDuration
  );

  // Determine critical startup period like in DeckMarkerOverlay
  const isInCriticalStartupPeriod = frame < 60;
  const isAnimationComplete = frame >= (animationStartFrame + labelDelayFrames + labelFadeDuration + 15);

  // Create text data for DeckGL
  const textData: TextData[] = useMemo(() => {
    if (!coordinates || !displayText) return [];
    
    return [{
      id: 'main-text',
      coordinates,
      text: animatedText.text,
      opacity: animatedText.opacity
    }];
  }, [coordinates, displayText, animatedText.text, animatedText.opacity]);

  // Create layers - like in DeckMarkerOverlay, using a single useMemo that returns [] if conditions not met
  const layers = useMemo(() => {
    // Don't render any layers if conditions aren't met - match DeckMarkerOverlay pattern exactly
    if (!isMapLoaded || !mapInstance || !coordinates || !displayText || !isVisible || !isStabilized || textData.length === 0) {
      return [];
    }

    // Parse text color to RGB - inside the useMemo to keep hook order consistent
    const getTextColor = (): [number, number, number, number] => {
      const color = textSettings?.color || '#FFFFFF';
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      // Use theme opacity if available, fallback to animation opacity
      const themeOpacity = textSettings?.opacity !== undefined ? textSettings.opacity : 1.0;
      return [r, g, b, animatedText.opacity * themeOpacity * 255];
    };

    // Calculate text size using the same methodology as the icon
    const computeTextSize = (): number => {
      // If we already have a fixed initial size, use it for consistent animation
      if (initialTextSize !== null) {
        return initialTextSize;
      }
      
      // If we have the map instance and country bounds, calculate the size
      if (isMapLoaded && mapInstance && countryBoundsRef.current) {
        try {
          // Use the same coverage and scale factor logic as the icon
          const effectiveCoverage = iconCoverage || 75;
          const effectiveScaleFactor = typeof iconScaleFactor === 'number' ? 
                                      Math.max(iconScaleFactor, 0.1) : 1.0;
          
          // Use the same icon size calculator but scale down for text
          const calculatedSize = calculateIconSize(
            mapInstance,
            countryBoundsRef.current,
            effectiveCoverage * 0.6, // Scale down for text (60% of icon coverage)
            countryCode,
            effectiveScaleFactor
          );
          
          // Apply a scaling factor for text vs icons
          const textScaling = parseFloat(textSettings?.fontSize || '24') / 24;
          const finalSize = Math.max(calculatedSize * textScaling, 16);
          
          // Store the initial size so it remains fixed during animation
          setInitialTextSize(finalSize);
          
          return finalSize;
        } catch (error) {
          console.error('Error calculating text size:', error);
        }
      }
      
      // Fallback to the standard approach if the calculator fails
      return parseFloat(textSettings?.fontSize || '24');
    };

    return [
      new TextLayer({
        id: 'text-layer',
        data: textData,
        pickable: false,
        coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
        getPosition: d => d.coordinates,
        getText: d => d.text,
        getSize: initialTextSize || computeTextSize(),
        getColor: getTextColor(),
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        fontFamily: textSettings?.fontFamily || 'Arial',
        fontWeight: Number(textSettings?.fontWeight) || 600,
        sizeUnits: 'pixels',
        sizeScale: 1,
        billboard: false,
        // Disable transitions for stability
        transitions: {
          getPosition: 0,
          getColor: 0,
          getSize: 0
        },
        // Use the same update trigger pattern as the icon layer
        updateTriggers: isInCriticalStartupPeriod || isAnimationComplete ? {} : {
          // Only discretized opacity changes during animation
          getColor: [Math.floor(animatedText.opacity * 5) / 5]
          // Explicitly NOT including getPosition to prevent position updates
        }
      })
    ];
  }, [
    isMapLoaded,
    mapInstance, 
    coordinates, 
    displayText, 
    isVisible, 
    isStabilized,
    textData,
    animatedText.opacity,
    isInCriticalStartupPeriod,
    isAnimationComplete,
    initialTextSize,
    iconCoverage,
    iconScaleFactor,
    countryCode,
    textSettings
  ]);

  // No need to render if there are no layers
  if (layers.length === 0) {
    return null;
  }

  // Use the initial view state during critical startup period to prevent jitter
  // Exactly the same as DeckMarkerOverlay
  const viewState = isInCriticalStartupPeriod && initialViewStateRef.current 
    ? initialViewStateRef.current 
    : {
        longitude: mapInstance.getCenter().lng,
        latitude: mapInstance.getCenter().lat,
        zoom: mapInstance.getZoom(),
        pitch: mapInstance.getPitch(),
        bearing: mapInstance.getBearing(),
      };

  return (
    <DeckGL
      viewState={viewState}
      layers={layers}
      controller={false}
      style={{
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      _animate={false}
    />
  );
}; 
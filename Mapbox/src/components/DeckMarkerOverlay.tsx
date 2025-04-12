import React, { useMemo, useEffect, useState, useRef } from 'react';
import { DeckGL } from '@deck.gl/react';
import { IconLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { useCurrentFrame, interpolate } from 'remotion';
import { useMapContext } from '../contexts/MapContext';
import { useConfigContext } from '../contexts/ConfigContext';
import { useAnimationContext } from '../contexts/AnimationContext';
import { ICON_URLS, getIconColor } from '../core/iconData';

interface MarkerData {
  id: string;
  coordinates: [number, number];
  opacity: number;
  scale: number;
  color: [number, number, number, number];
  iconType: string;
}

export const DeckMarkerOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { mapInstance, isMapLoaded } = useMapContext();
  const { countryData, settings, iconType, iconSize } = useConfigContext();
  const { animationState } = useAnimationContext();
  const [isStabilized, setIsStabilized] = useState(false);
  const initialViewStateRef = useRef<any>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [initialIconSize, setInitialIconSize] = useState<number | null>(null);
  const [initialZoomLevel, setInitialZoomLevel] = useState<number | null>(null);
  const [initialCoordinates, setInitialCoordinates] = useState<[number, number] | null>(null);
  
  // Get container dimensions on mount and when window resizes
  useEffect(() => {
    const updateContainerSize = () => {
      if (mapInstance && mapInstance.getCanvas()) {
        const canvas = mapInstance.getCanvas();
        setContainerSize({
          width: canvas.clientWidth,
          height: canvas.clientHeight
        });
      }
    };
    
    // Initial size update
    if (isMapLoaded && mapInstance) {
      updateContainerSize();
    }
    
    // Update size when window resizes
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, [isMapLoaded, mapInstance]);
  
  // Much more aggressive stabilization - wait longer and store the initial state
  useEffect(() => {
    if (isMapLoaded && mapInstance && !isStabilized) {
      // Ensure the map is completely settled before we consider it stable
      // Use a longer delay for rendering vs preview
      const timer = setTimeout(() => {
        // Store the initial view state when we consider the map stable
        const currentZoom = mapInstance.getZoom();
        initialViewStateRef.current = {
          longitude: mapInstance.getCenter().lng,
          latitude: mapInstance.getCenter().lat,
          zoom: currentZoom,
          pitch: mapInstance.getPitch(),
          bearing: mapInstance.getBearing(),
        };
        setInitialZoomLevel(currentZoom);
        setIsStabilized(true);
      }, 500); // Much longer delay (500ms instead of 100ms)
      return () => clearTimeout(timer);
    }
  }, [isMapLoaded, mapInstance, isStabilized]);

  // Reset initialIconSize when country changes
  useEffect(() => {
    setInitialIconSize(null);
    setInitialZoomLevel(null);
    setInitialCoordinates(null);
  }, [countryData?.alpha3]);
  
  // Also reset initialIconSize when iconSize changes
  useEffect(() => {
    setInitialIconSize(null);
  }, [iconSize]);

  // Use getIconColor from iconData.ts
  const getMarkerColor = (type: string = 'marker'): [number, number, number] => {
    return getIconColor(type);
  };

  // Animation parameters from settings - fixed to use timing instead of referencing non-existent properties on general
  const labelDelayFrames = settings?.timing?.labelDelay || 30;
  const labelFadeDuration = settings?.timing?.labelFadeDuration || 15;
  const animationStartFrame = settings?.timing?.stabilizationBuffer || 0;
  
  // Determine critical startup period where we want to prevent any rendering changes
  const isInCriticalStartupPeriod = frame < (animationStartFrame + 60); // Don't change for first 60 frames

  // Base marker data (if country coordinates exist)
  const baseMarkerData = useMemo<MarkerData[]>(() => {
    if (!countryData?.coordinates) return [];
    
    const markerColor = getMarkerColor(iconType || 'marker');
    
    // Use visualCenter from countryData if available, otherwise fall back to the default coordinates
    const coordinates: [number, number] = initialCoordinates || 
      countryData.visualCenter || 
      (Array.isArray(countryData.coordinates) 
        ? countryData.coordinates as [number, number]
        : [countryData.coordinates.lng, countryData.coordinates.lat]);
    
    // Store the initial coordinates to prevent movement during animation
    if (!initialCoordinates && coordinates) {
      setInitialCoordinates(coordinates);
    }
    
    console.log(`Using coordinates for ${countryData.alpha3}:`, coordinates, countryData.visualCenter ? '(visual center)' : '(default)');
    
    return [{
      id: 'main-marker',
      coordinates,
      opacity: 0,                    // Initial opacity, will be animated
      scale: 0.8,                    // Initial scale, will be animated
      color: [...markerColor, 255],  // RGBA color
      iconType: iconType || 'marker'
    }];
  }, [countryData, iconType, initialCoordinates]);

  // Compute animated opacity and scale using the animation state from context
  const animatedMarkerData = useMemo(() => {
    return baseMarkerData.map(marker => {
      // Much larger stabilization buffer - ensure map is fully settled
      const stabilizationBuffer = 45; // Triple the previous value
      
      // Calculate opacity transition - use the same timing as the rest of the animation
      const opacity = interpolate(
        frame,
        [animationStartFrame + labelDelayFrames + stabilizationBuffer, 
         animationStartFrame + labelDelayFrames + labelFadeDuration + stabilizationBuffer],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      );
      
      // Fixed scale - no animation
      const scale = 1.0;
      
      return {
        ...marker,
        opacity,
        scale,
        color: [marker.color[0], marker.color[1], marker.color[2], opacity * 255]
      };
    });
  }, [baseMarkerData, frame, labelDelayFrames, labelFadeDuration, animationStartFrame]);
  
  // Calculate icon size based on the country's zoom level
  const calculateIconSize = useMemo(() => {
    // If we already have a fixed initial size, use it
    if (initialIconSize !== null) {
      return initialIconSize;
    }
    
    // Default fallback if country data isn't available
    if (!countryData) {
      return 40; // Default fallback
    }
    
    try {
      // Base size calculation using the country's zoom level
      // Lower zoom (large countries) = larger base size
      // Higher zoom (small countries) = smaller base size
      const baseSize = 300 / Math.pow(1.5, countryData.zoomLevel - 4);
      
      // Apply iconSize as a simple percentage scaling factor
      const calculatedSize = baseSize * (iconSize || 40) / 100;
      
      // Store the initial size so it remains fixed regardless of zoom level changes
      setInitialIconSize(calculatedSize);
      
      return calculatedSize;
    } catch (error) {
      console.error('Error calculating icon size:', error);
      return 40; // Simple fallback on error
    }
  }, [countryData, iconSize, initialIconSize]);

  // Create layers based on marker type
  const layers = useMemo(() => {
    // Don't render any layers during critical startup period
    if (!animatedMarkerData.length || !isStabilized) return [];
    
    const layers = [];
    
    // Add icon markers for all marker types using IconLayer
    if (animatedMarkerData.length > 0) {
      layers.push(
        new IconLayer({
          id: 'icon-layer',
          data: animatedMarkerData,
          pickable: false,
          coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
          getIcon: d => ({
            url: ICON_URLS[d.iconType] || ICON_URLS['marker'],
            width: 512,
            height: 512,
            anchorX: 256, // Center anchor horizontally
            anchorY: 256, // Center anchor vertically
            mask: true  // Mask enables transparency
          }),
          getPosition: d => d.coordinates as [number, number],
          getSize: d => (initialIconSize || calculateIconSize) * (d.scale || 1),
          getColor: d => d.color,
          sizeScale: 1,
          billboard: false, // Keep it flat on the map surface for consistency
          // Completely disable updates/triggers during critical periods
          updateTriggers: isInCriticalStartupPeriod ? {} : {
            // Remove getPosition from update triggers to prevent position changes
            getColor: [(opacity: number) => Math.floor(opacity * 5) / 5], // More aggressive discretization
            // Add getSize to update triggers so it responds to iconSize changes
            getSize: [iconSize, initialIconSize, containerSize]
          },
          // Disable ALL transitions
          transitions: {
            getPosition: 0,
            getSize: 0, 
            getColor: 0
          }
        })
      );
    }
    
    return layers;
  }, [animatedMarkerData, frame, isStabilized, isInCriticalStartupPeriod, initialIconSize]);

  // Now we can have conditional rendering AFTER all hooks are called
  const shouldRender = isMapLoaded && mapInstance && layers.length > 0 && frame >= 30;
  
  if (!shouldRender) {
    return null;
  }

  // Use the initial view state during critical startup period to prevent jitter
  const viewState = isInCriticalStartupPeriod && initialViewStateRef.current 
    ? initialViewStateRef.current 
    : {
        longitude: mapInstance!.getCenter().lng,
        latitude: mapInstance!.getCenter().lat,
        zoom: mapInstance!.getZoom(),
        pitch: mapInstance!.getPitch(),
        bearing: mapInstance!.getBearing(),
      };

  return (
    <DeckGL
      viewState={viewState}
      layers={layers}
      controller={false} // Let Mapbox handle the map controls
      style={{
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Don't catch pointer events, pass them through to the map
      }}
      // Disable any deck.gl animations
      _animate={false}
    />
  );
};

export default DeckMarkerOverlay; 
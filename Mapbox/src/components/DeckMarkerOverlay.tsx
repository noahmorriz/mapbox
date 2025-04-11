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

// SVG definitions moved to core/iconData.ts

export const DeckMarkerOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { mapInstance, isMapLoaded } = useMapContext();
  const { countryData, settings, iconType } = useConfigContext();
  const { animationState } = useAnimationContext();
  const [isStabilized, setIsStabilized] = useState(false);
  const initialViewStateRef = useRef<any>(null);
  
  // Much more aggressive stabilization - wait longer and store the initial state
  useEffect(() => {
    if (isMapLoaded && mapInstance && !isStabilized) {
      // Ensure the map is completely settled before we consider it stable
      // Use a longer delay for rendering vs preview
      const timer = setTimeout(() => {
        // Store the initial view state when we consider the map stable
        initialViewStateRef.current = {
          longitude: mapInstance.getCenter().lng,
          latitude: mapInstance.getCenter().lat,
          zoom: mapInstance.getZoom(),
          pitch: mapInstance.getPitch(),
          bearing: mapInstance.getBearing(),
        };
        setIsStabilized(true);
      }, 500); // Much longer delay (500ms instead of 100ms)
      return () => clearTimeout(timer);
    }
  }, [isMapLoaded, mapInstance, isStabilized]);

  // Use getIconColor from iconData.ts
  const getMarkerColor = (type: string = 'marker'): [number, number, number] => {
    return getIconColor(type);
  };

  // Animation parameters from settings
  const labelDelayFrames = settings?.general?.labelDelayFrames || 30;
  const labelFadeDuration = settings?.general?.labelFadeDuration || 15;
  const animationStartFrame = settings?.general?.animationStartFrame || 0;
  
  // Determine critical startup period where we want to prevent any rendering changes
  const isInCriticalStartupPeriod = frame < (animationStartFrame + 60); // Don't change for first 60 frames

  // Base marker data (if country coordinates exist)
  const baseMarkerData = useMemo<MarkerData[]>(() => {
    if (!countryData?.coordinates) return [];
    
    const markerColor = getMarkerColor(iconType || 'marker');
    
    return [{
      id: 'main-marker',
      coordinates: Array.isArray(countryData.coordinates) 
        ? countryData.coordinates as [number, number]
        : [countryData.coordinates.lng, countryData.coordinates.lat],
      opacity: 0,                    // Initial opacity, will be animated
      scale: 0.8,                    // Initial scale, will be animated
      color: [...markerColor, 255],  // RGBA color
      iconType: iconType || 'marker'
    }];
  }, [countryData, iconType]);

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
  
  // Use the initial stable view state for the first few seconds
  // This prevents jiggling during early frames when the map might still be settling
  const viewState = useMemo(() => {
    // During critical period, always use the initial view state if available
    if (isInCriticalStartupPeriod && initialViewStateRef.current) {
      return initialViewStateRef.current;
    }
    
    // Otherwise, use the current map state (but only if stabilized)
    if (!mapInstance || !isStabilized) return null;
    
    return {
      longitude: mapInstance.getCenter().lng,
      latitude: mapInstance.getCenter().lat,
      zoom: mapInstance.getZoom(),
      pitch: mapInstance.getPitch(),
      bearing: mapInstance.getBearing(),
    };
  }, [mapInstance, animationState, isStabilized, isInCriticalStartupPeriod]);

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
            anchorY: 512, // Bottom anchor for markers like MapMarker
            mask: true  // Mask enables transparency
          }),
          getPosition: d => d.coordinates as [number, number],
          getSize: d => 80 * (d.scale || 1), 
          getColor: d => d.color,
          sizeScale: 1,
          billboard: false, // Keep it flat on the map surface for consistency
          // Completely disable updates/triggers during critical periods
          updateTriggers: isInCriticalStartupPeriod ? {} : {
            getPosition: [Math.floor(frame / 30) * 30], // Only update every 30 frames
            getColor: [(opacity: number) => Math.floor(opacity * 5) / 5], // More aggressive discretization
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
  }, [animatedMarkerData, frame, isStabilized, isInCriticalStartupPeriod]);

  // Now we can have conditional rendering AFTER all hooks are called
  const shouldRender = isMapLoaded && viewState && layers.length > 0 && frame >= 30;
  
  if (!shouldRender) {
    return null;
  }

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
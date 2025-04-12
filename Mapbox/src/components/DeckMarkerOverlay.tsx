import React, { useMemo, useEffect, useState, useRef } from 'react';
import { DeckGL } from '@deck.gl/react';
import { IconLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { useCurrentFrame, interpolate } from 'remotion';
import { useMapContext } from '../contexts/MapContext';
import { useConfigContext } from '../contexts/ConfigContext';
import { useAnimationContext } from '../contexts/AnimationContext';
import { ICON_URLS, getIconColor } from '../core/iconData';
import { getCountryVisualCenter, getCountryBounds, calculateIconSize } from '../utils/iconSizeCalculator';

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
  const { countryData, iconType, iconSize, iconCoverage, iconScaleFactor, countryCode } = useConfigContext();
  const { timing } = useAnimationContext();
  const [isStabilized, setIsStabilized] = useState(false);
  const initialViewStateRef = useRef<any>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [initialIconSize, setInitialIconSize] = useState<number | null>(null);
  const [initialCoordinates, setInitialCoordinates] = useState<[number, number] | null>(null);
  const countryBoundsRef = useRef(countryCode ? getCountryBounds(countryCode) : null);
  
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
        setIsStabilized(true);
      }, 500); // Much longer delay (500ms instead of 100ms)
      return () => clearTimeout(timer);
    }
  }, [isMapLoaded, mapInstance, isStabilized]);

  // Update countryBoundsRef when countryCode changes
  useEffect(() => {
    countryBoundsRef.current = countryCode ? getCountryBounds(countryCode) : null;
  }, [countryCode]);

  // Reset initialIconSize when country changes
  useEffect(() => {
    setInitialIconSize(null);
    setInitialCoordinates(null);
  }, [countryData?.alpha3]);
  
  // Also reset initialIconSize when iconSize or iconCoverage changes
  useEffect(() => {
    setInitialIconSize(null);
  }, [iconSize, iconCoverage]);

  // Use getIconColor from iconData.ts
  const getMarkerColor = (type: string = 'marker'): [number, number, number] => {
    return getIconColor(type);
  };

  // Animation parameters from the timing context
  const labelDelayFrames = timing?.labelDelay || 30;
  const labelFadeDuration = timing?.labelFadeDuration || 15;
  const animationStartFrame = timing?.stabilizationBuffer || 0;
  
  // Determine critical startup period where we want to prevent any rendering changes
  const isInCriticalStartupPeriod = frame < (animationStartFrame + 60); // Don't change for first 60 frames

  // Base marker data (if country coordinates exist)
  const baseMarkerData = useMemo<MarkerData[]>(() => {
    if (!countryData?.coordinates) return [];
    
    const markerColor = getMarkerColor(iconType || 'marker');
    
    // First try to get coordinates from the visual center in our boundingbox data
    const visualCenterFromBounds = countryCode ? getCountryVisualCenter(countryCode) : null;

    // Use visualCenter from country bounds if available, then from countryData if available, 
    // otherwise fall back to the default coordinates
    const coordinates: [number, number] = initialCoordinates || 
      visualCenterFromBounds ||
      countryData.visualCenter || 
      (Array.isArray(countryData.coordinates) 
        ? countryData.coordinates as [number, number]
        : [countryData.coordinates.lng, countryData.coordinates.lat]);
    
    // Store the initial coordinates to prevent movement during animation
    if (!initialCoordinates && coordinates) {
      setInitialCoordinates(coordinates);
    }
    
    console.log(`Using coordinates for ${countryData.alpha3}:`, coordinates, 
      visualCenterFromBounds ? '(bounding box visual center)' : 
      countryData.visualCenter ? '(country data visual center)' : '(default)');
    
    return [{
      id: 'main-marker',
      coordinates,
      opacity: 0,                    // Initial opacity, will be animated
      scale: 0.8,                    // Initial scale, will be animated
      color: [...markerColor, 255],  // RGBA color
      iconType: iconType || 'marker'
    }];
  }, [countryData, iconType, initialCoordinates, countryCode]);

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
  
  // Calculate icon size based on the country's rendered dimensions using iconCoverage
  const computeIconSize = useMemo(() => {
    // Log current values for debugging
    console.log('DeckMarkerOverlay icon size params:', {
      initialIconSize,
      iconCoverage,
      iconScaleFactor,
      countryCode
    });

    // If we already have a fixed initial size, use it for consistent animation
    if (initialIconSize !== null) {
      return initialIconSize;
    }
    
    // If we have the map instance and country bounds, use the new calculation
    if (isMapLoaded && mapInstance && countryBoundsRef.current) {
      try {
        // Ensure iconCoverage is within a reasonable range (at least 10)
        const effectiveCoverage = iconCoverage || 75;
        // Ensure iconScaleFactor is at least 0.1 to prevent icons from becoming too small
        const effectiveScaleFactor = typeof iconScaleFactor === 'number' ? 
                                    Math.max(iconScaleFactor, 0.1) : 1.0;
        
        console.log('Using effective values:', {
          effectiveCoverage,
          effectiveScaleFactor
        });
        
        // Use the new icon size calculator that considers the country's rendered dimensions
        const calculatedSize = calculateIconSize(
          mapInstance,
          countryBoundsRef.current,
          effectiveCoverage,
          countryCode, // Pass the countryCode for special case handling
          effectiveScaleFactor // Pass the optional scale factor
        );
        
        console.log(`Calculated icon size: ${calculatedSize}`);
        
        // If calculated size is too small, apply a minimum
        const finalSize = Math.max(calculatedSize, 25);
        
        // Store the initial size so it remains fixed during animation
        setInitialIconSize(finalSize);
        
        return finalSize;
      } catch (error) {
        console.error('Error calculating icon size with coverage:', error);
      }
    }
    
    // Fallback to the old method if the new one fails
    try {
      // Old calculation based on zoom level
      const baseSize = 300 / Math.pow(1.5, countryData.zoomLevel - 4);
      
      // Apply iconSize as a simple percentage scaling factor
      // and also apply the iconScaleFactor if available
      const effectiveIconSize = iconSize || 40;
      // Ensure iconScaleFactor is at least 0.1 to prevent icons from becoming too small
      const effectiveScaleFactor = typeof iconScaleFactor === 'number' ? 
                                  Math.max(iconScaleFactor, 0.1) : 1.0;
      
      console.log('Fallback calculation with:', {
        baseSize,
        effectiveIconSize,
        effectiveScaleFactor
      });
      
      const calculatedSize = baseSize * (effectiveIconSize / 100) * effectiveScaleFactor;
      const finalSize = Math.max(calculatedSize, 25); // Ensure minimum size
      
      console.log(`Fallback icon size: ${finalSize}`);
      
      // Store the initial size
      setInitialIconSize(finalSize);
      
      return finalSize;
    } catch (error) {
      console.error('Error calculating icon size with fallback method:', error);
      return 40; // Simple fallback on error
    }
  }, [countryData, iconSize, iconCoverage, iconScaleFactor, initialIconSize, isMapLoaded, mapInstance, countryCode]);

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
          getSize: d => (initialIconSize || computeIconSize) * (d.scale || 1),
          getColor: d => d.color,
          sizeScale: 1,
          billboard: false, // Keep it flat on the map surface for consistency
          // Completely disable updates/triggers during critical periods
          updateTriggers: isInCriticalStartupPeriod ? {} : {
            // Remove getPosition from update triggers to prevent position changes
            getColor: [(opacity: number) => Math.floor(opacity * 5) / 5], // More aggressive discretization
            // Add getSize to update triggers so it responds to iconSize/iconCoverage/iconScaleFactor changes
            getSize: [iconSize, iconCoverage, iconScaleFactor, initialIconSize, containerSize]
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
  }, [animatedMarkerData, frame, isStabilized, isInCriticalStartupPeriod, initialIconSize, computeIconSize, iconCoverage, iconScaleFactor]);

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
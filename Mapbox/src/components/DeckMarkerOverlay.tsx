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
import { MapView } from '@deck.gl/core';

interface MarkerData {
  id: string;
  coordinates: [number, number];
  opacity: number;
  scale: number;
  color: [number, number, number, number];
  iconType: string;
}

// Cache outside component to persist across re-renders if needed, or keep inside if reset is desired
const iconSizeCache = new Map<string, number>();
const visualCenterCache = new Map<string, [number, number]>();

export const DeckMarkerOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { mapInstance, isMapLoaded } = useMapContext();
  const { 
    countryCode, 
    iconType, 
    iconCoverage = 50, // Default coverage
    iconScaleFactor = 1.0, // Default scale factor
    iconSettings, 
    themeType, // To potentially bust cache on theme change if needed
    enableIconDropShadow // Assuming this might affect icon URL or style
  } = useConfigContext();
  const { timing } = useAnimationContext();
  
  // --- Get DeckGL Context Provider --- 
  // Call useContext at the top level
  const { DeckGLContext } = useMapContext();

  // --- State Hooks ---
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const [stableViewState, setStableViewState] = useState<any>(null); // Store the view state once stable
  const [visualCenter, setVisualCenter] = useState<[number, number] | null>(null);
  const [calculatedIconSize, setCalculatedIconSize] = useState<number | null>(null);
  const isStyleLoadedRef = useRef(false); // Track if style load event fired

  // --- Refs ---
  const countryBoundsRef = useRef(countryCode ? getCountryBounds(countryCode) : null);
  const stabilizationTimer = useRef<NodeJS.Timeout | null>(null);

  // --- Constants and Timing ---
  const labelDelayFrames = timing?.labelDelay || 30;
  const labelFadeDuration = timing?.labelFadeDuration || 15;
  const animationStartFrame = timing?.animationStartFrame || 10; // Use standard start frame
  const stabilizationDelayMs = 300; // Shorter delay, relying more on map events

  // --- Effects ---

  // 1. Update Country Bounds when countryCode changes
  useEffect(() => {
    countryBoundsRef.current = countryCode ? getCountryBounds(countryCode) : null;
    setVisualCenter(null); // Reset visual center when country changes
    setCalculatedIconSize(null); // Reset calculated size
    setStableViewState(null); // Reset view state
    isStyleLoadedRef.current = false; // Reset style loaded flag
    console.log(`[DeckMarkerOverlay] Country changed to ${countryCode}. Bounds updated. State reset.`);
  }, [countryCode]);

  // 2. Get Container Dimensions
  useEffect(() => {
    if (!mapInstance) return;

    const updateSize = () => {
      const canvas = mapInstance.getCanvas();
      if (canvas) {
        setContainerSize({ width: canvas.clientWidth, height: canvas.clientHeight });
        console.log(`[DeckMarkerOverlay] Container size updated: ${canvas.clientWidth}x${canvas.clientHeight}`);
      }
    };

    if (isMapLoaded) {
      updateSize(); // Initial size
    }

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isMapLoaded, mapInstance]);


  // 3. Determine Visual Center Coordinates
  useEffect(() => {
    if (!countryCode || visualCenter) return; // Only run if needed and not already set

    const cacheKey = countryCode;
    if (visualCenterCache.has(cacheKey)) {
        const cachedCenter = visualCenterCache.get(cacheKey)!;
        setVisualCenter(cachedCenter);
        console.log(`[DeckMarkerOverlay] Using cached visual center for ${countryCode}:`, cachedCenter);
        return;
    }

    const center = getCountryVisualCenter(countryCode);
    if (center) {
      setVisualCenter(center);
      visualCenterCache.set(cacheKey, center);
      console.log(`[DeckMarkerOverlay] Determined visual center for ${countryCode}:`, center);
    } else {
      console.warn(`[DeckMarkerOverlay] Could not determine visual center for ${countryCode}.`);
      // Potentially fall back to countryData.coordinates if needed
    }
  }, [countryCode, visualCenter]); // Re-run if country changes or visualCenter needs calculation


  // 4. Stabilize Map and Calculate Icon Size
  useEffect(() => {
    // Clear any previous timer
    if (stabilizationTimer.current) {
      clearTimeout(stabilizationTimer.current);
      stabilizationTimer.current = null;
    }

    // Conditions needed to proceed
    if (!isMapLoaded || !mapInstance || !visualCenter || !countryBoundsRef.current || !containerSize) {
        console.log(`[DeckMarkerOverlay] Waiting for prerequisites: isMapLoaded=${isMapLoaded}, hasMapInstance=${!!mapInstance}, hasVisualCenter=${!!visualCenter}, hasBounds=${!!countryBoundsRef.current}, hasContainerSize=${!!containerSize}`);
        return;
    }
    
    // Function to perform stabilization actions
    const performStabilization = () => {
        console.log('[DeckMarkerOverlay] Performing stabilization actions...');
        
        // a. Capture Stable View State (only once)
        if (!stableViewState) {
             const currentViewState = {
                longitude: mapInstance.getCenter().lng,
                latitude: mapInstance.getCenter().lat,
                zoom: mapInstance.getZoom(),
                pitch: mapInstance.getPitch(),
                bearing: mapInstance.getBearing(),
                // Add container size for DeckGL context
                width: containerSize.width, 
                height: containerSize.height,
             };
            setStableViewState(currentViewState);
            console.log('[DeckMarkerOverlay] Stable view state captured:', currentViewState);
        }

        // b. Calculate Icon Size (if not already done for this config)
        const cacheKey = `${countryCode}_${iconCoverage}_${iconScaleFactor}_${containerSize.width}x${containerSize.height}`; // Include container size
        if (calculatedIconSize === null) { // Check if size needs calculation
            if (iconSizeCache.has(cacheKey)) {
                const cachedSize = iconSizeCache.get(cacheKey)!;
                setCalculatedIconSize(cachedSize);
                console.log(`[DeckMarkerOverlay] Using cached icon size for ${cacheKey}: ${cachedSize}`);
            } else if (countryBoundsRef.current) {
                 try {
                    const size = calculateIconSize(
                        mapInstance,
                        countryBoundsRef.current,
                        iconCoverage,
                        countryCode,
                        iconScaleFactor
                    );
                    const finalSize = Math.max(size, 10); // Ensure a minimum size
                    setCalculatedIconSize(finalSize);
                    iconSizeCache.set(cacheKey, finalSize); // Cache the calculated size
                    console.log(`[DeckMarkerOverlay] Calculated icon size for ${cacheKey}: ${finalSize}`);
                } catch (error) {
                    console.error('[DeckMarkerOverlay] Error calculating icon size:', error);
                    setCalculatedIconSize(40); // Fallback size on error
                    iconSizeCache.set(cacheKey, 40);
                }
            }
        }
    };

    // Check if style is loaded
    if (mapInstance.isStyleLoaded()) {
      if (!isStyleLoadedRef.current) {
        console.log('[DeckMarkerOverlay] Map style already loaded or loaded now.');
        isStyleLoadedRef.current = true; // Mark as loaded
        // Perform stabilization immediately after a short delay for rendering settlement
        stabilizationTimer.current = setTimeout(performStabilization, stabilizationDelayMs);
      } else {
         // If style was already loaded, still ensure we run stabilization 
         // if other dependencies (like containerSize) have just resolved
         if (!stableViewState || calculatedIconSize === null) {
             performStabilization(); // Run immediately if needed
         }
      }
    } else {
      // Style not loaded yet, listen for the 'load' event
      const onStyleLoad = () => {
        console.log('[DeckMarkerOverlay] Map style.load event fired.');
        isStyleLoadedRef.current = true; // Mark as loaded
        mapInstance.off('style.load', onStyleLoad); // Clean up listener
        // Perform stabilization after a delay
        stabilizationTimer.current = setTimeout(performStabilization, stabilizationDelayMs);
      };

      console.log('[DeckMarkerOverlay] Map style not loaded yet, attaching style.load listener.');
      mapInstance.once('style.load', onStyleLoad); // Use once to auto-remove

      // Clean up listener and timer on unmount or dependency change
      return () => {
          console.log('[DeckMarkerOverlay] Cleanup: Removing style.load listener (if any) and clearing stabilization timer.');
          mapInstance.off('style.load', onStyleLoad);
          if (stabilizationTimer.current) {
            clearTimeout(stabilizationTimer.current);
            stabilizationTimer.current = null;
          }
      };
    }
    
    // Cleanup for the main effect dependencies
    return () => {
        if (stabilizationTimer.current) {
          clearTimeout(stabilizationTimer.current);
          stabilizationTimer.current = null;
        }
    };

  }, [isMapLoaded, mapInstance, visualCenter, countryBoundsRef.current, containerSize, stableViewState, calculatedIconSize, countryCode, iconCoverage, iconScaleFactor]); // Add all dependencies


  // --- Memoized Calculations ---

  // 5. Calculate Animated Opacity
  const animatedOpacity = useMemo(() => {
    const startOpacityFrame = animationStartFrame + labelDelayFrames;
    const endOpacityFrame = startOpacityFrame + labelFadeDuration;

    return interpolate(
      frame,
      [startOpacityFrame, endOpacityFrame],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }, [frame, animationStartFrame, labelDelayFrames, labelFadeDuration]);

  // 6. Prepare Marker Data for DeckGL
  const markerData = useMemo<MarkerData[]>(() => {
    if (!visualCenter || calculatedIconSize === null || animatedOpacity === 0) {
      return []; // No data if coordinates/size missing or fully transparent
    }

    const baseColor = getIconColor(iconType || 'marker');
    const colorWithOpacity: [number, number, number, number] = [
        baseColor[0],
        baseColor[1],
        baseColor[2],
        Math.round(animatedOpacity * 255) // Apply animated alpha
    ];

    return [{
      id: `marker-${countryCode}`,
      coordinates: visualCenter,
      opacity: animatedOpacity, // Keep opacity property if needed elsewhere
      scale: 1.0, // Use fixed scale, size is handled by getSize
      color: colorWithOpacity,
      iconType: iconType || 'marker',
    }];
  }, [visualCenter, calculatedIconSize, animatedOpacity, iconType, countryCode]);

  // 7. Create DeckGL Layers
  const layers = useMemo(() => {
    // Render only when we have data, size, and the map view is stable
    if (markerData.length === 0 || calculatedIconSize === null || !stableViewState) {
        console.log(`[DeckMarkerOverlay Frame ${frame}] Skipping layer creation: markerData=${markerData.length}, calculatedIconSize=${calculatedIconSize}, stableViewState=${!!stableViewState}`);
        return [];
    }
     console.log(`[DeckMarkerOverlay Frame ${frame}] Creating IconLayer with size ${calculatedIconSize} and opacity ${animatedOpacity}`);

    return [
      new IconLayer<MarkerData>({
        id: 'icon-layer',
        data: markerData,
        pickable: false,
        coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
        getIcon: d => {
            const iconUrl = ICON_URLS[d.iconType] || ICON_URLS['marker'];
            return {
                url: iconUrl,
                width: 512,  // Specify icon width (adjust if icons vary)
                height: 512, // Specify icon height (adjust if icons vary)
                anchorX: 256, // Center anchor horizontally
                anchorY: 256, // Center anchor vertically
                mask: true    // Enable masking for transparency
            };
        },
        getPosition: d => d.coordinates,
        getSize: calculatedIconSize, // Use the calculated, stable size
        getColor: d => d.color,
        sizeScale: 1, // Size is absolute in pixels via getSize
        billboard: false, // Keep flat on map, align with pitch/bearing
        
        // More conservative update triggers
        updateTriggers: {
          // Update color only when opacity changes significantly (e.g., steps of 0.1)
          getColor: Math.floor(animatedOpacity * 10) / 10, 
          // Update size only if calculatedIconSize actually changes
          getSize: calculatedIconSize 
        },
      })
    ];
  }, [markerData, calculatedIconSize, stableViewState, animatedOpacity]); // Dependencies for layer creation

  // --- Render ---

  // Render DeckGL only when the view state is stable
  if (!stableViewState) {
    console.log(`[DeckMarkerOverlay Frame ${frame}] Skipping DeckGL render: No stable view state.`);
    return null;
  }
  
  console.log(`[DeckMarkerOverlay Frame ${frame}] Rendering DeckGL.`);

  return (
    <DeckGL
      viewState={stableViewState} // Use the captured stable view state
      layers={layers}
      controller={false} // Disable DeckGL interaction
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
};

export default DeckMarkerOverlay; 
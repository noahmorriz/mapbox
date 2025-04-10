import React, { useEffect, useRef, useMemo } from 'react';
import { useConfigContext } from '../contexts/ConfigContext';
import { useMapContext } from '../contexts/MapContext';
import { useCurrentFrame, interpolate, delayRender, continueRender, cancelRender } from 'remotion';
import { 
  createMarker, 
  updateMarkerProperties,
  MarkerOptions,
  MarkerStyleOptions
} from '../services/MarkerService';
import { MarkerType } from '../core/mapboxTypes';

// Define CSS classes (could be moved to a constants file)
// const MARKER_CONTAINER_CLASS = 'marker-container';
// const MARKER_ICON_CLASS = 'marker-icon';
// const MARKER_TEXT_CLASS = 'marker-text';

/**
 * Manages a Mapbox marker, using delayRender for robust creation synchronization.
 */
export const Marker: React.FC = () => {
  const { mapInstance, isMapLoaded } = useMapContext();
  const {
    countryData, 
    settings, 
    iconType, 
    markerType, 
    markerText, 
    iconSize,
    markerPositioning
  } = useConfigContext();
  
  const frame = useCurrentFrame();
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  // Ref to store the delayRender handle
  const delayRenderHandleRef = useRef<number | null>(null);
  
  // --- Configuration Memoization --- 
  const { markerKey, markerContent, markerOptions } = useMemo(() => {
    if (!countryData || !settings?.ui) return {};

    const uiStyles = settings.ui;
    const styleOptions: MarkerStyleOptions = {
      color: uiStyles.iconColor || '#FFFFFF',
      fontSize: iconSize || uiStyles.iconSize || '24px',
      dropShadow: uiStyles.iconDropShadow || true,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      fontWeight: uiStyles.textFontWeight || 'bold',
      includeIcon: markerType === 'combined' || false
    };

    const resolvedOptions: MarkerOptions = {
      pitchAlignment: markerPositioning || 'map',
      rotationAlignment: markerPositioning || 'map',
      anchor: 'center',
      style: styleOptions
    };

    let content = '';
    if (markerType === 'icon') {
      content = iconType || 'flag';
    } else if (markerType === 'text' || markerType === 'combined') {
      content = markerText || countryData.name || 'Location';
    }

    const key = `${markerType}-${content}-${JSON.stringify(resolvedOptions)}`;
    return { markerKey: key, markerContent: content, markerOptions: resolvedOptions };
  }, [
    countryData, settings?.ui, markerType, iconType, markerText, 
    iconSize, markerPositioning
  ]);

  // Single effect for marker lifecycle and animation
  useEffect(() => {
    let currentDelayHandle: number | null = null;

    // --- Timing --- 
    const labelDelayFrames = settings?.general?.labelDelayFrames || 30;
    const animationStartFrame = settings?.general?.animationStartFrame || 0;
    const totalLabelDelay = animationStartFrame + labelDelayFrames;
    const animationDuration = settings?.general?.labelFadeDuration || 20;

    // --- Conditions --- 
    const baseConditionsMet = 
      mapInstance && 
      isMapLoaded && 
      countryData?.coordinates && 
      markerType !== 'none' && 
      markerOptions &&
      markerContent;

    // --- Logic --- 
    if (frame < totalLabelDelay || !baseConditionsMet) {
      // ---- BEFORE Animation Start ----
      if (markerRef.current) {
        try { markerRef.current.remove(); } catch (e) {}
        markerRef.current = null;
      }
    } else if (frame === totalLabelDelay) {
      // ---- EXACTLY on Animation Start Frame ----
      if (!markerRef.current) {
        // ---- Create Marker ----
        try {
          // **Delay rendering this specific frame**
          console.log(`[Frame ${frame}] Delaying render for marker creation...`);
          currentDelayHandle = delayRender(`Marker creation frame ${frame}`);
          delayRenderHandleRef.current = currentDelayHandle; // Store handle in ref

          const newMarker = createMarker(
            mapInstance,
            countryData.coordinates,
            markerType as MarkerType,
            markerContent,
            markerOptions
          );
          
          if (newMarker) {
            markerRef.current = newMarker;
            const element = newMarker.getElement();
            if (element) {
              // **Initial style is now handled by the animation logic below**
              element.style.transform = 'scale(0.1)';
              console.log(`[Frame ${frame}] Marker created, continuing render...`);
            } else {
               console.warn(`[Frame ${frame}] Marker created but element not found immediately.`);
            }
          } else {
             console.warn(`[Frame ${frame}] createMarker returned null.`);
          }

        } catch (error) {
          console.error("[Marker] Failed to create:", error);
          // If creation fails, cancel the render delay with an error
          if (currentDelayHandle !== null) {
            cancelRender(error as Error);
            delayRenderHandleRef.current = null; 
          }
        } finally {
          // **Crucially, continue render *after* creation attempt**
          if (currentDelayHandle !== null) {
             // Use requestAnimationFrame to ensure DOM updates might have flushed
             requestAnimationFrame(() => { 
               if (delayRenderHandleRef.current === currentDelayHandle) { // Ensure it's the same handle
                 console.log(`[Frame ${frame}] Calling continueRender(${currentDelayHandle}) after marker creation attempt`);
                 if (currentDelayHandle !== null) {
                   continueRender(currentDelayHandle);
                 }
                 delayRenderHandleRef.current = null; // Clear the ref
               }
             });
          }
        }
      }
    } else {
      // ---- AFTER Animation Start Frame (or exactly on it if marker existed) ----
      if (frame >= totalLabelDelay && baseConditionsMet) {
        if (markerRef.current) {
          // ---- Update LngLat Properties (if needed) ----
          if (countryData?.coordinates && markerRef.current.getLngLat().toArray().toString() !== countryData.coordinates.toString()) {
              markerRef.current.setLngLat(countryData.coordinates);
          }
          // ---- Update Other Properties (if needed) ----
          if (markerOptions) {
              updateMarkerProperties(markerRef.current, {
                  pitchAlignment: markerOptions.pitchAlignment,
                  rotationAlignment: markerOptions.rotationAlignment
              });
          }

          // ---- Apply Animation ----
          const markerElement = markerRef.current.getElement();
          if (markerElement) {
            const frameOffset = frame - totalLabelDelay;
            // Ensure animationDuration is at least 1 to avoid division by zero or weird interpolation
            const safeAnimationDuration = Math.max(1, animationDuration); 
            
            const scale = interpolate(
              frameOffset, [0, safeAnimationDuration], [0.1, 1], // Scale from 0.1 to 1
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
            markerElement.style.transform = `scale(${scale})`; // Apply scale transform for the current frame
          }
        } else {
          // Marker should exist based on frame number and conditions, but doesn't.
          // This might happen briefly if creation is delayed or failed.
          console.warn(`[Frame ${frame}] Marker ref is null, expected marker to exist.`);
        }
      }
    }

    // --- Cleanup --- 
    return () => {
      // If the effect cleans up while a render is delayed, ensure we continue it.
      // This prevents renders from getting stuck if dependencies change rapidly.
      if (delayRenderHandleRef.current !== null) {
        console.warn(`[Cleanup Frame ${frame}] Effect cleaning up with active delayRender handle ${delayRenderHandleRef.current}. Calling continueRender.`);
        continueRender(delayRenderHandleRef.current);
        delayRenderHandleRef.current = null;
      }
      // Standard cleanup: Remove marker if conditions are no longer met
      // This removal might be better handled *only* by the main logic (frame < totalLabelDelay)
      // to avoid removing/recreating constantly if other deps change.
      // Consider if this specific cleanup logic is necessary.
      // If removing here: Check if marker exists AND if it *shouldn't* exist now.
      // if (markerRef.current && (frame < totalLabelDelay || !baseConditionsMet)) { ... remove ... }
    };
    
  }, [
    // Dependencies
    frame, 
    mapInstance, 
    isMapLoaded, 
    countryData?.coordinates, 
    markerType, 
    markerKey, 
    settings?.general?.labelDelayFrames, 
    settings?.general?.animationStartFrame, 
    settings?.general?.labelFadeDuration
  ]);

  return null;
};
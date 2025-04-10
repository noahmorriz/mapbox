import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useMapContext } from '../contexts/MapContext';
import { useConfigContext } from '../contexts/ConfigContext';
import { useCurrentFrame, interpolate, delayRender, continueRender, cancelRender } from 'remotion';
import { 
  createMarker,
  updateMarkerProperties,
  MarkerOptions,
  MarkerStyleOptions,
  MarkerType
} from '../services/MarkerService';

/**
 * Manages a Mapbox marker, using delayRender for robust creation synchronization.
 */
export const MapMarker: React.FC = () => {
  const { mapInstance, mapStatus } = useMapContext();
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
  const delayRenderHandleRef = useRef<number | null>(null);
  
  // Memoize marker options to prevent unnecessary recreation
  const { markerKey, markerContent, markerOptions } = useMemo(() => {
    if (!countryData || !settings?.ui) return {};

    const uiStyles = settings.ui;
    const isDarkTheme = uiStyles.textColor === '#E2E8F0';
    const styleOptions: MarkerStyleOptions = {
      color: uiStyles.iconColor || '#FFFFFF',
      fontSize: iconSize || uiStyles.iconSize,
      fontWeight: uiStyles.textFontWeight || 'bold',
      // Opacity handled by animation effect
      dropShadow: uiStyles.iconDropShadow || true,
      includeIcon: markerType === 'combined' || false,
      shadowEffect: uiStyles.markerShadowEffect || true,
      shadowColor: isDarkTheme ? 'rgba(0, 150, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
      shadowBlur: isDarkTheme ? 8 : 4,
      shadowOffsetX: isDarkTheme ? 0 : 1,
      shadowOffsetY: isDarkTheme ? 0 : 1
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
      mapStatus === 'idle' && // MapMarker specific
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
          // Delay rendering
          currentDelayHandle = delayRender(`MapMarker creation frame ${frame}`);
          delayRenderHandleRef.current = currentDelayHandle;

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
              element.style.opacity = '0'; 
              element.style.transform = 'translateY(10px) scale(0.8)';
            }
          }
        } catch (error) {
          console.error("[MapMarker] Failed to create:", error);
          if (currentDelayHandle !== null) {
            cancelRender(error as Error);
            delayRenderHandleRef.current = null;
          }
        } finally {
          if (currentDelayHandle !== null) {
             requestAnimationFrame(() => { 
               if (delayRenderHandleRef.current === currentDelayHandle) {
                 continueRender(currentDelayHandle);
                 delayRenderHandleRef.current = null;
               }
             });
          }
        }
      } else {
         const markerElement = markerRef.current.getElement();
         if (markerElement) {
            markerElement.style.opacity = '0';
            markerElement.style.transform = 'translateY(10px) scale(0.8)';
         }
      }
    } else { // frame > totalLabelDelay
      // ---- AFTER Animation Start Frame ----
      if (markerRef.current) {
        // ---- Update Properties ----
        if (markerRef.current.getLngLat().toArray().toString() !== countryData.coordinates.toString()) {
            markerRef.current.setLngLat(countryData.coordinates);
        }
        updateMarkerProperties(markerRef.current, {
            pitchAlignment: markerOptions.pitchAlignment,
            rotationAlignment: markerOptions.rotationAlignment
        });

        // ---- Apply Animation ----
        const markerElement = markerRef.current.getElement();
        if (markerElement) {
          const frameOffset = frame - totalLabelDelay;
          const opacity = interpolate(
            frameOffset, [0, animationDuration], [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const scale = interpolate(
            frameOffset, [0, animationDuration], [0.8, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const y = interpolate(
            frameOffset, [0, animationDuration], [10, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          
          // Apply styles directly for this frame, using !important to override conflicts
          markerElement.style.setProperty('opacity', opacity.toString(), 'important');
          markerElement.style.setProperty('transform', `translateY(${y}px) scale(${scale})`, 'important');
          // Also ensure no stray transitions interfere
          markerElement.style.setProperty('transition', 'none', 'important');
        }
      } else {
        console.warn(`[MapMarker Frame ${frame}] Marker should exist but doesn't.`);
      }
    }

    // --- Cleanup --- 
    return () => {
      if (delayRenderHandleRef.current !== null) {
        continueRender(delayRenderHandleRef.current);
        delayRenderHandleRef.current = null;
      }
    };
    
  }, [
    // Dependencies
    frame, 
    mapInstance, 
    mapStatus,
    countryData?.coordinates, 
    markerType, 
    markerKey, 
    settings?.general?.labelDelayFrames, 
    settings?.general?.animationStartFrame, 
    settings?.general?.labelFadeDuration
  ]);

  return null;
}; 
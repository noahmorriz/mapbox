import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../contexts/MapContext';
import { useAnimationContext } from '../contexts/AnimationContext';
import { useConfigContext } from '../contexts/ConfigContext';
import { createMapboxMarker, updateMarkerOpacity } from '../services/MarkerService';

export const InfoBox: React.FC = () => {
  const { mapInstance, isMapLoaded } = useMapContext();
  const { animationState } = useAnimationContext();
  const { animatedCenter, infoOpacity } = animationState;
  const { additionalInfo, settings } = useConfigContext();
  
  const infoMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [markerCreated, setMarkerCreated] = useState(false);
  
  // Create the info marker when map is loaded and additional info is provided
  useEffect(() => {
    if (!mapInstance || !isMapLoaded || !additionalInfo) {
      console.log('Not creating info marker - prerequisites not met', {
        hasMap: !!mapInstance,
        isMapLoaded,
        hasInfo: !!additionalInfo
      });
      return;
    }
    
    // Validate required data
    if (!animatedCenter || !settings?.ui) {
      console.warn('Missing required data for info marker creation', { 
        hasCenter: !!animatedCenter, 
        hasSettings: !!settings?.ui 
      });
      return;
    }
    
    // Prevent multiple marker creations
    if (markerCreated) {
      console.log('Info marker already created, not recreating');
      return;
    }
    
    try {
      console.log('Creating info marker with text:', additionalInfo);
      
      // Create adjusted coordinates - slightly above main marker
      const adjustedCoordinates: [number, number] = [
        animatedCenter[0],
        animatedCenter[1] + 0.02
      ];
      
      // Create info marker with the info icon and additional text
      const { marker } = createMapboxMarker(
        mapInstance,
        adjustedCoordinates,
        'info',
        undefined,
        additionalInfo,
        settings.ui,
        0 // Start with 0 opacity, will be animated
      );
      
      // Store the marker reference
      infoMarkerRef.current = marker;
      setMarkerCreated(true);
      console.log('Info marker created successfully');
      
      // Clean up on unmount
      return () => {
        console.log('Cleaning up info marker');
        if (infoMarkerRef.current) {
          try {
            infoMarkerRef.current.remove();
          } catch (error) {
            console.error('Error removing info marker:', error);
          }
          infoMarkerRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error creating info marker:', error);
      return undefined;
    }
  }, [
    mapInstance, 
    isMapLoaded, 
    additionalInfo,
    animatedCenter,
    settings?.ui,
    markerCreated
  ]);
  
  // Update info marker opacity on animation changes
  useEffect(() => {
    // Skip if no marker or not created yet
    if (!infoMarkerRef.current || !markerCreated) return;
    
    try {
      updateMarkerOpacity(infoMarkerRef.current, infoOpacity, 'info');
    } catch (error) {
      console.error('Error updating info marker opacity:', error);
    }
  }, [infoOpacity, markerCreated]);
  
  // This is a logical component that doesn't render any UI
  return null;
}; 
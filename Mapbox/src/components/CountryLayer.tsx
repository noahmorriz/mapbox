import React, { useEffect } from 'react';
import { useMapContext } from '../contexts/MapContext';
import { useAnimationContext } from '../contexts/AnimationContext';

export const CountryLayer: React.FC = () => {
  const { mapService, mapLayersReady } = useMapContext();
  const { animationState } = useAnimationContext();
  const { fillOpacity, lineOpacity } = animationState;
  
  // Update layer opacities based on animation state
  useEffect(() => {
    if (mapService && mapLayersReady) {
      mapService.updateLayerOpacity(fillOpacity, lineOpacity);
    }
  }, [mapService, mapLayersReady, fillOpacity, lineOpacity]);
  
  // This is a logical component that doesn't render any UI
  return null;
}; 
import React from 'react';
import { useAnimationContext } from '../contexts/AnimationContext';
import { useConfigContext } from '../contexts/ConfigContext';

export const InfoBox: React.FC = () => {
  const { animationState } = useAnimationContext();
  const { additionalInfo } = useConfigContext();
  
  // This is a simplified version without marker logic
  // The InfoBox component is kept but doesn't render any markers
  
  // Log info for debugging purposes
  React.useEffect(() => {
    if (additionalInfo) {
      console.log('InfoBox has additionalInfo:', additionalInfo);
    }
  }, [additionalInfo]);
  
  // This is a logical component that doesn't render any UI
  return null;
}; 
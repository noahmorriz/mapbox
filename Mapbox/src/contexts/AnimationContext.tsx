import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { useMapContext } from './MapContext';
import { AnimationSettings, AnimationFrameState } from '../core/animationModel';
import { CountryData } from '../core/mapboxTypes';
import { calculateAnimationFrame } from '../services/AnimationService';

// Define the MotionSettings type directly here
interface MotionSettings {
  camera: {
    initialRotation: number;
    finalRotation: number;
    initialPitch: number;
    finalPitch: number;
    rotationDamping: number;
    rotationStiffness: number;
    rotationMass: number;
    pitchDamping: number;
    pitchStiffness: number;
    pitchMass: number;
  };
  zoom: {
    zoomDamping: number;
    zoomStiffness: number;
    zoomMass: number;
  };
  timing: {
    animationStartFrame: number;
    highlightDelayFrames: number;
    labelDelayFrames: number;
    padding: number;
    fadeDuration: number;
  };
}

// Define the simplified AnimationFrameState type locally if needed, or rely on Omit from service
type SimplifiedAnimationFrameState = Omit<AnimationFrameState, 'labelOpacity' | 'labelScale' | 'labelY'>;

// Default state (already updated in AnimationService, ensure consistency here)
const DEFAULT_ANIMATION_STATE: SimplifiedAnimationFrameState = {
  bearing: 0,
  pitch: 0,
  animatedCenter: [0, 0],
  animatedZoom: 1,
  fillOpacity: 0,
  lineOpacity: 0,
  infoOpacity: 0,
};

interface AnimationContextValue {
  frame: number;
  fps: number;
  animationState: SimplifiedAnimationFrameState;
  frameRenderHandleRef: React.MutableRefObject<number | null>;
  error: string | null;
}

const AnimationContext = createContext<AnimationContextValue | undefined>(undefined);

interface AnimationProviderProps {
  children: React.ReactNode;
  settings: AnimationSettings;
  countryData: CountryData;
  motionSettings: MotionSettings;
  additionalInfo?: string;
  frameRenderHandleRef: React.MutableRefObject<number | null>;
}

export const AnimationProvider: React.FC<AnimationProviderProps> = ({
  children,
  settings,
  countryData,
  motionSettings,
  additionalInfo,
  frameRenderHandleRef,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { mapLayersReady } = useMapContext();
  const [error, setError] = useState<string | null>(null);
  
  // Validate inputs before calculating animation state
  useEffect(() => {
    if (!settings || !settings.general) {
      console.error('Invalid animation settings:', settings);
      setError('Invalid animation settings');
      return;
    }
    
    if (!countryData || !countryData.coordinates) {
      console.error('Invalid country data:', countryData);
      setError('Invalid country data');
      return;
    }
    
    if (!motionSettings || !motionSettings.camera || !motionSettings.zoom) {
      console.error('Invalid motion settings:', motionSettings);
      setError('Invalid motion settings');
      return;
    }
    
    setError(null);
  }, [settings, countryData, motionSettings]);
  
  // Calculate animation state for current frame - memoized to avoid recalculation
  const animationState = useMemo(() => {
    try {
      // Only calculate if we have valid settings
      if (error || !settings?.general || !countryData?.coordinates || !motionSettings?.zoom) {
        return DEFAULT_ANIMATION_STATE;
      }
      
      return calculateAnimationFrame(
        frame,
        fps,
        settings,
        countryData.coordinates,
        countryData.zoomLevel,
        motionSettings,
        additionalInfo
      );
    } catch (err) {
      console.error('Error calculating animation state:', err);
      return DEFAULT_ANIMATION_STATE;
    }
  }, [frame, fps, settings, countryData, motionSettings, additionalInfo, error]);
  
  const contextValue = useMemo<AnimationContextValue>(() => ({
    frame,
    fps,
    animationState,
    frameRenderHandleRef,
    error,
  }), [
    frame, 
    fps, 
    animationState,
    frameRenderHandleRef,
    error
  ]);
  
  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
    </AnimationContext.Provider>
  );
};

// Update hook type
export const useAnimationContext = (): AnimationContextValue => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimationContext must be used within an AnimationProvider');
  }
  return context;
}; 
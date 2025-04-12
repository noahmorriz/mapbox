import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimationFrameState, HighlightSettings, CameraSettings, ZoomSettings } from '../core/animationModel';
import { calculateAnimationFrame } from '../services/AnimationService';
import { AnimationTimeline, createAnimationTimeline } from '../core/animationTiming';

// Define the MotionSettings type directly here
interface MotionSettings {
  camera: CameraSettings;
  zoom: ZoomSettings;
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
};

interface AnimationContextValue {
  frame: number;
  fps: number;
  animationState: SimplifiedAnimationFrameState;
  frameRenderHandleRef: React.MutableRefObject<number | null>;
  error: string | null;
  timing: AnimationTimeline;
}

const AnimationContext = createContext<AnimationContextValue | undefined>(undefined);

// Fixed: Changed from interface to type to properly use union type
export type Coordinates = {
  lng: number;
  lat: number;
} | [number, number];

interface AnimationProviderProps {
  children: React.ReactNode;
  coordinates: Coordinates;
  zoomLevel: number;
  motionSettings: MotionSettings;
  highlightSettings: HighlightSettings;
  countryCode: string;
  additionalInfo?: string;
  frameRenderHandleRef: React.MutableRefObject<number | null>;
  timing?: Partial<AnimationTimeline>;
}

export const AnimationProvider: React.FC<AnimationProviderProps> = ({
  children,
  coordinates,
  zoomLevel,
  motionSettings,
  highlightSettings,
  countryCode,
  additionalInfo,
  frameRenderHandleRef,
  timing: customTiming = {}
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [error, setError] = useState<string | null>(null);
  
  // Use createAnimationTimeline to manage timing
  const timeline = useMemo(() => createAnimationTimeline(countryCode, customTiming), [countryCode, customTiming]);
  
  // Validate inputs before calculating animation state
  useEffect(() => {
    if (!coordinates) {
      console.error('Invalid coordinates:', coordinates);
      setError('Invalid coordinates');
      return;
    }
    
    if (typeof zoomLevel !== 'number') {
      console.error('Invalid zoom level:', zoomLevel);
      setError('Invalid zoom level');
      return;
    }
    
    if (!motionSettings || !motionSettings.camera || !motionSettings.zoom) {
      console.error('Invalid motion settings:', motionSettings);
      setError('Invalid motion settings');
      return;
    }
    
    setError(null);
  }, [coordinates, zoomLevel, motionSettings]);
  
  // Calculate animation state for current frame - memoized to avoid recalculation
  const animationState = useMemo(() => {
    try {
      // Only calculate if we have valid settings
      if (error || !coordinates || typeof zoomLevel !== 'number' || !motionSettings?.zoom) {
        return DEFAULT_ANIMATION_STATE;
      }
      
      return calculateAnimationFrame(
        frame,
        fps,
        coordinates,
        zoomLevel,
        motionSettings,
        timeline,
        highlightSettings,
        additionalInfo,
        countryCode
      );
    } catch (err) {
      console.error('Error calculating animation state:', err);
      return DEFAULT_ANIMATION_STATE;
    }
  }, [frame, fps, coordinates, zoomLevel, motionSettings, timeline, highlightSettings, additionalInfo, error, countryCode]);
  
  const contextValue = useMemo<AnimationContextValue>(() => ({
    frame,
    fps,
    animationState,
    frameRenderHandleRef,
    error,
    timing: timeline
  }), [
    frame, 
    fps, 
    animationState,
    frameRenderHandleRef,
    error,
    timeline
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
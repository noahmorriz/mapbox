import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import React, { useMemo } from 'react';
import { 
  AnimationFrameState, 
  HighlightSettings, 
  CameraSettings, 
  ZoomSettings 
} from '../core/animationModel';
import { AnimationTimeline, getAnimationFrames, getAnimationPhase } from '../core/animationTiming';

// Define MotionSettings type locally combining Camera and Zoom settings
interface MotionSettings {
  camera: CameraSettings;
  zoom: ZoomSettings & { zoomLevelOffset?: number };
}

// Default animation state if an error occurs
const DEFAULT_ANIMATION_STATE = {
  bearing: 0,
  pitch: 0,
  animatedCenter: [0, 0] as [number, number],
  animatedZoom: 1,
  fillOpacity: 0,
  lineOpacity: 0,
};

// Restore local getSafe helper function
const getSafe = <T, K extends keyof T>(obj: T | undefined, key: K, defaultValue: T[K]): T[K] => {
  if (!obj) return defaultValue;
  // Check if the key exists and the value is not undefined
  return obj[key] !== undefined ? obj[key] : defaultValue;
};

/**
 * Calculates all animation values for a specific frame - Updated for new context structure
 * 
 * All timing values are based on 30fps throughout this file
 * All countries now share identical animation behavior
 * 
 * @param frame Current frame number
 * @param fps Frames per second
 * @param coordinates Country coordinates
 * @param zoomLevel Target zoom level
 * @param motionSettings Motion settings
 * @param timing Animation timing settings
 * @param highlightSettings Highlight settings
 * @param additionalInfo Whether additional info is shown
 * @param countryCode Country code for animation orchestration
 * @returns Animation state for the current frame
 */
export const calculateAnimationFrame = (
  frame: number,
  fps: number,
  coordinates: any, // Accept any type for coordinates
  zoomLevel: number,
  motionSettings: MotionSettings,
  timing: AnimationTimeline,
  highlightSettings: HighlightSettings,
  additionalInfo?: string,
  countryCode: string = 'default'
): Omit<AnimationFrameState, 'labelOpacity' | 'labelScale' | 'labelY'> => {
  // Validate inputs to prevent errors
  if (!coordinates) {
    console.error('Invalid country coordinates: undefined');
    return DEFAULT_ANIMATION_STATE;
  }
  
  if (Array.isArray(coordinates) && coordinates.length !== 2) {
    console.error('Invalid country coordinates array:', coordinates);
    return DEFAULT_ANIMATION_STATE;
  } 
  
  if (!motionSettings || !motionSettings.zoom) {
    console.error('Invalid motion settings:', motionSettings);
    return DEFAULT_ANIMATION_STATE;
  }
  
  try {
    const camera = motionSettings.camera;
    
    // Calculate animation frame points using the helper function
    const animationFrames = getAnimationFrames(timing, 0); // Assuming baseFrame is 0 for now

    // Define phases based on the current frame and calculated points
    const phases = getAnimationPhase(frame, animationFrames);
    
    // Debug logging
    if (frame % 15 === 0) {
      console.log(`Animation timing:`, { 
        frame, 
        phases,
        animationFrames
      });
    }

    // Animate camera parameters with safe defaults
    const bearing = spring({
      frame,
      fps,
      from: getSafe(camera, 'initialRotation', 0),
      to: getSafe(camera, 'finalRotation', 0),
      config: { 
        damping: getSafe(camera, 'rotationDamping', 30), 
        stiffness: getSafe(camera, 'rotationStiffness', 50), 
        mass: getSafe(camera, 'rotationMass', 1)
      },
    });
    
    const pitch = spring({
      frame,
      fps,
      from: getSafe(camera, 'initialPitch', 0),
      to: getSafe(camera, 'finalPitch', 0),
      config: { 
        damping: getSafe(camera, 'pitchDamping', 30), 
        stiffness: getSafe(camera, 'pitchStiffness', 50), 
        mass: getSafe(camera, 'pitchMass', 1)
      },
    });
    
    // Use the country coordinates - Handle both array and object types
    let animatedCenter: [number, number];
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      animatedCenter = coordinates as [number, number];
    } else if (coordinates && typeof coordinates === 'object' && 'lng' in coordinates && 'lat' in coordinates) {
      animatedCenter = [coordinates.lng, coordinates.lat];
    } else {
      // Fallback
      animatedCenter = [0, 0];
    }
    
    // Apply zoom level offset safely
    const zoomLevelOffset = getSafe(motionSettings.zoom, 'zoomLevelOffset', 0);
    const currentZoom = typeof zoomLevel === 'number' ? zoomLevel : 1;
    const adjustedZoomLevel = Math.max(currentZoom + (zoomLevelOffset ?? 0), 0);
    
    // Animate zoom level
    const animatedZoom = spring({
      frame,
      fps,
      // Always start at the target zoom level to prevent initial zoom-in effect
      from: adjustedZoomLevel,
      to: adjustedZoomLevel,
      config: {
        damping: getSafe(motionSettings.zoom, 'zoomDamping', 30), 
        stiffness: getSafe(motionSettings.zoom, 'zoomStiffness', 50),
        mass: getSafe(motionSettings.zoom, 'zoomMass', 1),
      },
    });

    // Animate country highlight opacities with direct calculation
    let fillOpacity = 0;
    let lineOpacity = 0;
    
    // Only calculate opacity values when in the appropriate animation phase
    if (phases.isHighlightActive) {
      // Calculate the precise opacity value based on elapsed frames since highlight start
      const highlightElapsedFrames = frame - animationFrames.highlightStart;
      const highlightDurationFrames = timing.highlightFadeDuration;
      
      // For maximum determinism, use a simple linear interpolation with clamping
      // This ensures identical results across all Remotion rendering instances
      const progress = Math.min(1, Math.max(0, highlightElapsedFrames / highlightDurationFrames));
      
      // Apply easing for smoother animation (still deterministic)
      const eased = progress * progress * (3 - 2 * progress); // Smoothstep easing
      
      fillOpacity = eased * highlightSettings.fillOpacityTarget;
      lineOpacity = eased * highlightSettings.lineOpacityTarget;
      
      // Periodic logging to help with debugging
      if (frame % 30 === 0) {
        console.log(`Frame ${frame}: Highlight animation progress=${progress.toFixed(2)}, opacity=${fillOpacity.toFixed(3)}`);
      }
    }

    return {
      bearing,
      pitch,
      animatedCenter,
      animatedZoom,
      fillOpacity,
      lineOpacity,
    };
  } catch (error) {
    console.error('Error calculating animation frame:', error);
    return DEFAULT_ANIMATION_STATE;
  }
};

/**
 * Hook that provides animation values for the current frame
 */
export const useAnimationFrame = (
  coordinates: any,
  zoomLevel: number,
  motionSettings: MotionSettings,
  timing: AnimationTimeline,
  highlightSettings: HighlightSettings,
  additionalInfo?: string
): Omit<AnimationFrameState, 'labelOpacity' | 'labelScale' | 'labelY'> => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  try {
    return calculateAnimationFrame(
      frame,
      fps,
      coordinates,
      zoomLevel,
      motionSettings,
      timing,
      highlightSettings,
      additionalInfo
    );
  } catch (error) {
    console.error('Error in useAnimationFrame:', error);
    return DEFAULT_ANIMATION_STATE;
  }
};

// Calculate marker animation values - completely deterministic with rounded values
const computeIconOpacity = (
  frame: number,
  animationStartFrame: number,
  labelDelayFrames: number,
  labelFadeDuration: number
): number => {
  // Round all frame values to ensure consistent results
  const safeFrame = Math.floor(frame);
  const safeStartFrame = Math.floor(animationStartFrame + labelDelayFrames);
  const safeDuration = Math.max(Math.floor(labelFadeDuration), 1);
  
  // Early phase - no opacity
  if (safeFrame < safeStartFrame) {
    return 0;
  }
  
  // Completed phase - full opacity
  if (safeFrame >= safeStartFrame + safeDuration) {
    return 1;
  }
  
  // Animation phase - calculate with deterministic math instead of interpolate
  const progress = (safeFrame - safeStartFrame) / safeDuration;
  
  // Apply smoothstep easing for a nicer transition (still deterministic)
  // smoothstep(x) = 3x² - 2x³ for x in [0,1]
  const smoothProgress = progress * progress * (3 - 2 * progress);
  
  // Return with 2 decimal precision to ensure consistent rendering
  return Math.round(smoothProgress * 100) / 100;
};

// Convert the loose useMemo into a proper hook function
export const useAnimatedMarkerData = (
  baseMarkerData: any[],
  animationStartFrame: number,
  labelDelayFrames: number,
  labelFadeDuration: number
) => {
  const frame = useCurrentFrame();
  
  return useMemo(() => {
    if (!baseMarkerData.length) return [];
    
    // Calculate opacity using the deterministic method
    const opacity = computeIconOpacity(
      frame, 
      animationStartFrame, 
      labelDelayFrames, 
      labelFadeDuration
    );
    
    // Apply opacity to each marker with deterministic RGB color values
    return baseMarkerData.map(marker => {
      // Extract RGB components
      const [r, g, b] = [marker.color[0], marker.color[1], marker.color[2]];
      
      // Apply opacity to alpha channel with rounding
      const alpha = Math.round(opacity * 255);
      
      return {
        ...marker,
        opacity,
        scale: 1.0, // Fixed scale value
        color: [r, g, b, alpha]
      };
    });
  }, [baseMarkerData, frame, animationStartFrame, labelDelayFrames, labelFadeDuration]);
}; 
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { AnimationSettings, AnimationFrameState } from '../core/animationModel';
import { Coordinates } from '../core/mapboxTypes';
import { createAnimationTimeline, getAnimationFrames, getAnimationPhase } from '../core/animationTiming';

// Define MotionSettings type directly here
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
    zoomLevelOffset?: number;
  };
  timing: {
    animationStartFrame: number;
    highlightDelayFrames: number;
    labelDelayFrames: number;
    padding: number;
    fadeDuration: number;
  };
}

// Default animation state if an error occurs
const DEFAULT_ANIMATION_STATE = {
  bearing: 0,
  pitch: 0,
  animatedCenter: [0, 0] as [number, number],
  animatedZoom: 1,
  fillOpacity: 0,
  lineOpacity: 0,
  infoOpacity: 0,
};

// Helper to safely get value from potentially undefined object
const getSafe = <T, K extends keyof T>(obj: T | undefined, key: K, defaultValue: T[K]): T[K] => {
  if (!obj) return defaultValue;
  return obj[key] !== undefined ? obj[key] : defaultValue;
};

/**
 * Calculates all animation values for a specific frame
 * 
 * All timing values are based on 30fps throughout this file
 * All countries now share identical animation behavior
 * 
 * @param frame Current frame number
 * @param fps Frames per second
 * @param settings Animation settings
 * @param countryCoordinates Country coordinates
 * @param zoomLevel Target zoom level
 * @param motionSettings Motion settings
 * @param additionalInfo Whether additional info is shown
 * @param countryCode Country code for animation orchestration
 * @returns Animation state for the current frame
 */
export const calculateAnimationFrame = (
  frame: number,
  fps: number,
  settings: AnimationSettings,
  countryCoordinates: Coordinates,
  zoomLevel: number,
  motionSettings: MotionSettings,
  additionalInfo?: string,
  countryCode: string = 'default'
): Omit<AnimationFrameState, 'labelOpacity' | 'labelScale' | 'labelY'> => {
  // Validate inputs to prevent errors
  if (!settings || !settings.camera || !settings.highlight || !settings.general) {
    console.error('Invalid animation settings:', settings);
    return DEFAULT_ANIMATION_STATE;
  }
  
  // Validate country coordinates based on type
  if (!countryCoordinates) {
    console.error('Invalid country coordinates: undefined');
    return DEFAULT_ANIMATION_STATE;
  }
  if (Array.isArray(countryCoordinates) && countryCoordinates.length !== 2) {
    console.error('Invalid country coordinates array:', countryCoordinates);
    return DEFAULT_ANIMATION_STATE;
  } 
  
  if (!motionSettings || !motionSettings.zoom) {
    console.error('Invalid motion settings:', motionSettings);
    return DEFAULT_ANIMATION_STATE;
  }
  
  try {
    const { camera, highlight, general } = settings;
    
    // Use the orchestrated timing if available, otherwise fall back to legacy settings
    let animationStartFrame, highlightDelayFrames;
    
    if (settings.timing) {
      // Create a timeline from the timing settings
      // Country code is now disregarded to ensure consistent behavior
      const timeline = createAnimationTimeline('FRA', settings.timing);
      const animationFrames = getAnimationFrames(timeline, 0); // 0 is base frame
      
      // Get the animation phases for the current frame
      const phases = getAnimationPhase(frame, animationFrames);
      
      // Use these for timing calculations below
      animationStartFrame = 0; // Timeline handles this
      highlightDelayFrames = animationFrames.highlightStart;
      
      // Debug logging
      if (frame % 15 === 0) {
        console.log(`Standard animation timing (based on France):`, { 
          frame, 
          phases,
          animationFrames
        });
      }
    } else {
      // Legacy approach (30fps values)
      animationStartFrame = general.animationStartFrame || 0;
      highlightDelayFrames = general.highlightDelayFrames || 15;
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
    const animatedCenter: [number, number] = Array.isArray(countryCoordinates)
      ? countryCoordinates // If it's an array [lng, lat]
      : [countryCoordinates.lng, countryCoordinates.lat]; // If it's an object {lng, lat}
    
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

    // Calculate total delay for highlight animation with safe defaults
    const totalHighlightDelay = animationStartFrame + highlightDelayFrames;
    
    // Animate country highlight opacities with delayed start
    const fillOpacity = spring({
      frame: Math.max(0, frame - totalHighlightDelay),
      fps,
      from: 0,
      to: getSafe(highlight, 'fillOpacityTarget', 0.5),
      config: { 
        damping: getSafe(highlight, 'fillAnimationDamping', 25), 
        stiffness: getSafe(highlight, 'fillAnimationStiffness', 80), 
        mass: getSafe(highlight, 'fillAnimationMass', 1)
      },
    });
    
    const lineOpacity = spring({
      frame: Math.max(0, frame - totalHighlightDelay),
      fps,
      from: 0,
      to: getSafe(highlight, 'lineOpacityTarget', 0.8),
      config: { 
        damping: getSafe(highlight, 'lineAnimationDamping', 25), 
        stiffness: getSafe(highlight, 'lineAnimationStiffness', 80), 
        mass: getSafe(highlight, 'lineAnimationMass', 1)
      },
    });

    // Additional info animation (30fps values)
    const infoOpacity = additionalInfo ? spring({
      // Adjust timing relative to highlight or other relevant event if needed
      frame: Math.max(0, frame - totalHighlightDelay - 8), // Changed from 15 to 8 for 30fps
      fps,
      from: 0,
      to: 1,
      config: {
        damping: 30,
        stiffness: 30,
        mass: 1,
      }
    }) : 0;

    return {
      bearing,
      pitch,
      animatedCenter,
      animatedZoom,
      fillOpacity,
      lineOpacity,
      infoOpacity,
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
  settings: AnimationSettings,
  countryCoordinates: Coordinates,
  zoomLevel: number,
  motionSettings: MotionSettings,
  additionalInfo?: string
): Omit<AnimationFrameState, 'labelOpacity' | 'labelScale' | 'labelY'> => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  try {
    return calculateAnimationFrame(
      frame,
      fps,
      settings,
      countryCoordinates,
      zoomLevel,
      motionSettings,
      additionalInfo
    );
  } catch (error) {
    console.error('Error in useAnimationFrame:', error);
    return DEFAULT_ANIMATION_STATE;
  }
}; 
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { AnimationSettings, AnimationFrameState } from '../core/animationModel';
import { Coordinates } from '../core/mapboxTypes';

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

// Default animation state for fallback
const DEFAULT_ANIMATION_STATE: Omit<AnimationFrameState, 'labelOpacity' | 'labelScale' | 'labelY'> = {
  bearing: 0,
  pitch: 0,
  animatedCenter: [0, 0],
  animatedZoom: 1,
  fillOpacity: 0,
  lineOpacity: 0,
  infoOpacity: 0,
};

/**
 * Safely gets a property with a default value if not available
 */
function getSafe<T, K extends keyof T>(obj: T | undefined | null, key: K, defaultValue: T[K]): T[K] {
  if (!obj) return defaultValue;
  return obj[key] ?? defaultValue;
}

/**
 * Calculates all animation values for a specific frame
 * 
 * @param frame Current frame number
 * @param fps Frames per second
 * @param settings Animation settings
 * @param countryCoordinates Country coordinates
 * @param zoomLevel Target zoom level
 * @param motionSettings Motion settings
 * @param additionalInfo Whether additional info is shown
 * @returns Animation state for the current frame
 */
export const calculateAnimationFrame = (
  frame: number,
  fps: number,
  settings: AnimationSettings,
  countryCoordinates: Coordinates,
  zoomLevel: number,
  motionSettings: MotionSettings,
  additionalInfo?: string
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
  // No specific check needed for object type if lng/lat access below is sufficient, 
  // or add checks like: 
  // if (!Array.isArray(countryCoordinates) && (typeof countryCoordinates.lng !== 'number' || typeof countryCoordinates.lat !== 'number')) { ... }
  
  if (!motionSettings || !motionSettings.zoom) {
    console.error('Invalid motion settings:', motionSettings);
    return DEFAULT_ANIMATION_STATE;
  }
  
  try {
    const { camera, highlight, general } = settings;
    const { animationStartFrame, highlightDelayFrames, labelDelayFrames } = general;

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
      // If zoomStiffness is very low, don't apply any zoom animation (maintain exact target zoom)
      from: getSafe(motionSettings.zoom, 'zoomStiffness', 50) < 15 ? adjustedZoomLevel : Math.max(adjustedZoomLevel - 1, 0),
      to: adjustedZoomLevel,
      config: {
        damping: getSafe(motionSettings.zoom, 'zoomDamping', 30), 
        stiffness: getSafe(motionSettings.zoom, 'zoomStiffness', 50),
        mass: getSafe(motionSettings.zoom, 'zoomMass', 1),
      },
    });

    // Calculate total delay for highlight animation with safe defaults
    const totalHighlightDelay = (animationStartFrame || 0) + (highlightDelayFrames || 30);

    // Calculate total delay for label animation with safe defaults
    const totalLabelDelay = (animationStartFrame || 0) + (labelDelayFrames || 45);
    
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

    // Additional info animation (can remain if used separately)
    const infoOpacity = additionalInfo ? spring({
      // Adjust timing relative to highlight or other relevant event if needed
      frame: Math.max(0, frame - totalHighlightDelay - 15), // Example: Delay after highlight
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
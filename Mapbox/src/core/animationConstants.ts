/**
 * Animation Constants
 * 
 * Central repository for animation physics parameters and default values
 * used throughout the application.
 * 
 * Note: All timing-related constants have been moved to animationTiming.ts.
 */

/**
 * Animation physics parameters
 */
export const ANIMATION_PHYSICS = {
  // Camera animation physics
  CAMERA: {
    ROTATION_DAMPING: 40,
    ROTATION_STIFFNESS: 25,
    ROTATION_MASS: 1,
    PITCH_DAMPING: 40,
    PITCH_STIFFNESS: 25,
    PITCH_MASS: 1,
  },
  
  // Zoom animation physics
  ZOOM: {
    DAMPING: 40,
    STIFFNESS: 25,
    MASS: 1,
  },
  
  // Highlight animation physics
  HIGHLIGHT: {
    FILL_DAMPING: 40,
    FILL_STIFFNESS: 25,
    FILL_MASS: 1,
    LINE_DAMPING: 40,
    LINE_STIFFNESS: 25,
    LINE_MASS: 1,
    LABEL_DAMPING: 15,
    LABEL_STIFFNESS: 12,
    LABEL_MASS: 2.5,
  }
};

/**
 * UI constants for sizing
 */
export const UI_DEFAULTS = {
  // Icon sizing
  ICON_SIZE: 30, // Percentage relative to calculated size based on zoom
  ICON_SCALE: 1,
  
  // Padding/margins
  MAP_PADDING: 50, // Map padding in pixels
};

/**
 * Projection-specific constants
 */
export const PROJECTION_DEFAULTS = {
  mercator: {
    DEFAULT_PITCH: 0,
    MAX_PITCH: 60,
  },
  globe: {
    DEFAULT_PITCH: 30,
    MAX_PITCH: 80,
  }
};

/**
 * Default opacity values for animations
 */
export const DEFAULT_OPACITIES = {
  FILL: 0.6,
  LINE: 1.0,
  LABEL: 1.0,
}; 
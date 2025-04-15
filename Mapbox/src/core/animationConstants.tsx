// The animation physics settings determine the spring behavior for animations.
// Higher stiffness = faster, more rigid animation
// Higher damping = less oscillation
// Higher mass = more inertia, slower movement
export const ANIMATION_PHYSICS = {
  // Camera movement physics
  CAMERA: {
    POSITION_STIFFNESS: 180, // Reduced from 220 - smoother camera movement
    POSITION_DAMPING: 26,  // Increased from 24 - reduced oscillation
    POSITION_MASS: 1.2,   // Increased from 1 - slightly more inertia
    
    ZOOM_STIFFNESS: 180, // Reduced from 200
    ZOOM_DAMPING: 25,    // Increased from 22
    ZOOM_MASS: 1.1,      // Increased from 1
    
    BEARING_STIFFNESS: 150, // Reduced from 180
    BEARING_DAMPING: 25,   // Increased from 20
    BEARING_MASS: 1.2,    // Increased from 1
    
    PITCH_STIFFNESS: 150, // Reduced from 180
    PITCH_DAMPING: 25,   // Increased from 20
    PITCH_MASS: 1.2,    // Increased from 1
  },
  
  // Country highlight animation physics
  HIGHLIGHT: {
    FILL_STIFFNESS: 120, // Reduced from 150
    FILL_DAMPING: 24,   // Increased from 20
    FILL_MASS: 1.2,    // Increased from 1
    
    LINE_STIFFNESS: 140, // Reduced from 170
    LINE_DAMPING: 22,   // Increased from 18
    LINE_MASS: 1.1,    // Increased from 1
    
    LABEL_STIFFNESS: 160, // Reduced from 200
    LABEL_DAMPING: 24,   // Increased from 20
    LABEL_MASS: 1.2,    // Increased from 1
  },
  
  // Text animation physics
  TEXT: {
    OPACITY_STIFFNESS: 100, // Reduced from 120
    OPACITY_DAMPING: 22,   // Increased from 18 
    OPACITY_MASS: 1.0,    // Unchanged
    
    SCALE_STIFFNESS: 120, // Reduced from 150
    SCALE_DAMPING: 20,   // Increased from 16
    SCALE_MASS: 1.1,    // Increased from 1
  },
};

// Default opacity values for highlighting and other animations
export const DEFAULT_OPACITIES = {
  FILL: 0.45, // Reduced from 0.6 - less intense fill
  LINE: 0.75, // Reduced from 0.9 - less intense borders
  LABEL: 0.9, // Unchanged
  TEXT: 0.9,  // Unchanged
};

// UI default settings
export const UI_DEFAULTS = {
  ICON_SCALE: 0.85, // Reduced from 1.0 for slightly smaller default icons
  MIN_ICON_SIZE: 50, // Minimum size in pixels for icons
  MAX_ICON_SIZE: 250, // Maximum size in pixels for icons
}; 
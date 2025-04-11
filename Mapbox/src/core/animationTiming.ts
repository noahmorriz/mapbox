/**
 * Animation timing orchestrator
 * 
 * This centralized system controls all animation timing across the application,
 * ensuring consistent 30fps-based timing throughout the project.
 * All countries now share identical timing regardless of size or location.
 */

export interface AnimationTimeline {
  // Core timing controls (all values in frames at 30fps)
  stabilizationBuffer: number;  // Extra frames to wait after map loads
  highlightDelay: number;       // When country highlight starts
  labelDelay: number;           // When marker/icon appears
  
  // Animation durations
  highlightFadeDuration: number; // How long the highlight fade-in takes
  labelFadeDuration: number;     // How long the icon/label fade-in takes
  
  // No country-specific overrides to ensure consistent timing
  countrySpecificOverrides?: Record<string, Partial<AnimationTimeline>>;
}

/**
 * Default animation timeline values (based on 30fps)
 * These values are standardized for all countries based on France's timing
 */
export const DEFAULT_TIMELINE: AnimationTimeline = {
  stabilizationBuffer: 22,  // ~0.75s buffer at 30fps
  highlightDelay: 10,       // ~0.33s delay at 30fps
  labelDelay: 15,           // 0.5s delay at 30fps
  highlightFadeDuration: 8, // ~0.25s duration at 30fps
  labelFadeDuration: 10,    // ~0.33s duration at 30fps
  
  // No country-specific overrides to ensure France-like timing for all countries
  countrySpecificOverrides: {}
};

/**
 * Animation sequence interface for phase-based timing
 */
export interface AnimationSequence {
  // Animation phases with their relative timing (in frames at 30fps)
  phases: {
    movement: number;      // When camera movement starts (base: 0)
    highlight: number;     // Frames after movement when highlight starts
    icon: number;          // Frames after highlight when icon appears
  };
}

/**
 * Creates a normalized animation timeline
 * @param countryCode ISO country code
 * @param customTimeline Custom timing overrides from Composition component
 * @returns Complete animation timeline with applied overrides
 */
export const createAnimationTimeline = (
  countryCode: string,
  customTimeline?: Partial<AnimationTimeline>
): AnimationTimeline => {
  // Start with defaults (France timing)
  const timeline = { ...DEFAULT_TIMELINE };
  
  // Apply custom overrides from Composition.tsx
  if (customTimeline) {
    // Apply only the non-country-specific overrides
    const { countrySpecificOverrides, ...globalSettings } = customTimeline;
    Object.assign(timeline, globalSettings);
  }
  
  // No country-specific overrides - all countries get the same timing
  return timeline;
};

/**
 * Calculate animation frame points based on timeline
 * @param timeline Animation timeline configuration
 * @param baseFrame Start frame for the animation sequence
 * @returns Object with exact frame numbers for each animation point
 */
export const getAnimationFrames = (
  timeline: AnimationTimeline,
  baseFrame: number = 0
) => {
  return {
    // When map is considered stable enough for animations
    stabilizationComplete: baseFrame + timeline.stabilizationBuffer,
    
    // When country highlight begins to fade in
    highlightStart: baseFrame + timeline.stabilizationBuffer + timeline.highlightDelay,
    
    // When highlight fade completes
    highlightComplete: baseFrame + timeline.stabilizationBuffer + 
                       timeline.highlightDelay + timeline.highlightFadeDuration,
    
    // When icon/label begins to fade in
    labelStart: baseFrame + timeline.stabilizationBuffer + timeline.labelDelay,
    
    // When icon/label fade completes
    labelComplete: baseFrame + timeline.stabilizationBuffer + 
                   timeline.labelDelay + timeline.labelFadeDuration
  };
};

/**
 * Helper to determine if a particular animation phase should be active
 * @param currentFrame Current animation frame
 * @param animationFrames Calculated frame points
 * @returns Object with boolean flags for each animation phase
 */
export const getAnimationPhase = (
  currentFrame: number,
  animationFrames: ReturnType<typeof getAnimationFrames>
) => {
  return {
    isStabilized: currentFrame >= animationFrames.stabilizationComplete,
    isHighlightActive: currentFrame >= animationFrames.highlightStart,
    isHighlightComplete: currentFrame >= animationFrames.highlightComplete,
    isLabelActive: currentFrame >= animationFrames.labelStart,
    isLabelComplete: currentFrame >= animationFrames.labelComplete,
    
    // For precise animation progress calculations
    highlightProgress: Math.min(1, Math.max(0, 
      (currentFrame - animationFrames.highlightStart) / 
      (animationFrames.highlightComplete - animationFrames.highlightStart)
    )),
    
    labelProgress: Math.min(1, Math.max(0,
      (currentFrame - animationFrames.labelStart) / 
      (animationFrames.labelComplete - animationFrames.labelStart)
    ))
  };
}; 
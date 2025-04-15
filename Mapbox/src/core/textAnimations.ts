import { useCurrentFrame } from 'remotion';
import { interpolate } from 'remotion';

/**
 * Text animation types available in the application
 */
export type TextAnimationType = 'none' | 'fadeIn' | 'typewriter';

/**
 * Text animation interface
 */
export interface TextAnimation {
  /**
   * Calculate the text to display and its properties based on animation
   * @param text The full text to animate
   * @param frame Current frame number
   * @param startFrame Frame when animation should start
   * @param duration Duration of the animation in frames
   * @returns Animated text content and properties
   */
  getAnimatedText: (
    text: string,
    frame: number,
    startFrame: number,
    duration: number
  ) => {
    text: string;      // Text content to display (possibly partial for typewriter)
    opacity: number;   // Text opacity for fade effects
    displayedChars?: number; // Number of characters currently displayed
  };
}

/**
 * No animation implementation (full text immediately visible)
 */
export const NoAnimation: TextAnimation = {
  getAnimatedText: (text, frame, startFrame, duration) => {
    return {
      text,
      opacity: 1.0,
      displayedChars: text.length,
    };
  },
};

/**
 * Fade-in animation implementation with improved determinism
 */
export const FadeInAnimation: TextAnimation = {
  getAnimatedText: (text, frame, startFrame, duration) => {
    // Round frame and duration values to ensure consistent calculations
    const safeFrame = Math.floor(frame);
    const safeStartFrame = Math.floor(startFrame);
    const safeDuration = Math.max(Math.floor(duration), 1);
    
    // Ensure we don't start animation too early or late
    if (safeFrame < safeStartFrame) {
      return { text, opacity: 0, displayedChars: text.length };
    }
    
    if (safeFrame >= safeStartFrame + safeDuration) {
      return { text, opacity: 1.0, displayedChars: text.length };
    }
    
    // Calculate progress as a simple linear value with 2 decimal precision
    const progress = (safeFrame - safeStartFrame) / safeDuration;
    const roundedOpacity = Math.round(progress * 100) / 100;
    
    return {
      text,
      opacity: roundedOpacity,
      displayedChars: text.length,
    };
  },
};

/**
 * Typewriter animation implementation with improved determinism
 */
export const TypewriterAnimation: TextAnimation = {
  getAnimatedText: (text, frame, startFrame, duration) => {
    // Round all values for deterministic behavior
    const safeFrame = Math.floor(frame);
    const safeStartFrame = Math.floor(startFrame);
    const safeDuration = Math.max(Math.floor(duration), 1);
    
    // Use 80% of the duration for typing, 20% for cursor blinking at the end
    const typingDuration = Math.max(Math.floor(safeDuration * 0.8), 1);
    
    // Maximum characters that can be displayed
    const totalChars = text.length;
    
    // Handle pre-animation state
    if (safeFrame < safeStartFrame) {
      return { text: '', opacity: 1.0, displayedChars: 0 };
    }
    
    // Handle completed animation
    if (safeFrame >= safeStartFrame + typingDuration) {
      return { text, opacity: 1.0, displayedChars: totalChars };
    }
    
    // Calculate progress with high precision then round to whole number
    const progress = (safeFrame - safeStartFrame) / typingDuration;
    const displayedChars = Math.min(Math.floor(progress * totalChars), totalChars);
    
    // Extract substring up to current character count
    const displayText = text.substring(0, displayedChars);
    
    return {
      text: displayText,
      opacity: 1.0,
      displayedChars,
    };
  },
};

/**
 * Map of animation types to their implementations
 */
export const TextAnimations: Record<TextAnimationType, TextAnimation> = {
  none: NoAnimation,
  fadeIn: FadeInAnimation,
  typewriter: TypewriterAnimation,
};

/**
 * Hook to apply text animations with improved determinism
 * @param text The text to animate
 * @param animationType The type of animation to apply
 * @param startFrame Frame when animation should start
 * @param duration Duration of the animation in frames
 * @returns Animated text and properties
 */
export const useTextAnimation = (
  text: string,
  animationType: TextAnimationType,
  startFrame: number,
  duration: number
) => {
  // Get current frame and ensure it's an integer
  const frame = Math.floor(useCurrentFrame());
  
  // Ensure we have a valid animation type or fallback to none
  const animation = TextAnimations[animationType] || NoAnimation;
  
  // Cache result to prevent recalculation within the same frame
  return animation.getAnimatedText(text, frame, startFrame, duration);
}; 
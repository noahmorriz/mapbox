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
 * Fade-in animation implementation
 */
export const FadeInAnimation: TextAnimation = {
  getAnimatedText: (text, frame, startFrame, duration) => {
    // Calculate opacity using interpolation
    const opacity = interpolate(
      frame,
      [startFrame, startFrame + duration],
      [0, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );
    
    return {
      text,
      opacity,
      displayedChars: text.length,
    };
  },
};

/**
 * Typewriter animation implementation
 */
export const TypewriterAnimation: TextAnimation = {
  getAnimatedText: (text, frame, startFrame, duration) => {
    // Calculate the number of characters to show
    // Use 80% of the duration for typing, 20% for cursor blinking at the end
    const typingDuration = Math.max(Math.floor(duration * 0.8), 1);
    
    // Maximum characters that can be displayed
    const totalChars = text.length;
    
    // Calculate displayed characters using interpolation
    const displayedChars = Math.floor(
      interpolate(
        frame,
        [startFrame, startFrame + typingDuration],
        [0, totalChars],
        {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }
      )
    );
    
    // Extract substring up to current character count
    const displayText = text.substring(0, displayedChars);
    
    // Always fully opaque
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
 * Hook to apply text animations
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
  const frame = useCurrentFrame();
  const animation = TextAnimations[animationType] || NoAnimation;
  
  return animation.getAnimatedText(text, frame, startFrame, duration);
}; 
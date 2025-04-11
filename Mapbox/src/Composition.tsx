import React from 'react';
import { AbsoluteFill } from 'remotion';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapboxAnimation } from './components/MapboxAnimation';
import { AnimationProps, AnimationSettings } from './core/animationModel';

// ======================================================================
// MAPBOX ANIMATION COMPONENT
// ======================================================================

/**
 * Main component that wraps the MapboxAnimation component
 * 
 * This file now delegates all functionality to our new component architecture.
 * 
 * The MapboxAnimation component can be used in two ways:
 * 
 * 1. Simple usage with props:
 *    <MapboxAnimation countryCode="USA" theme="dark" iconType="flag" />
 *
 * 2. Compound component usage for more control:
 *    <MapboxAnimation countryCode="USA" theme="dark">
 *      <MapboxAnimation.InfoBox>Population: 331 million</MapboxAnimation.InfoBox>
 *    </MapboxAnimation>
 */

/**
 * This is the main export component used by Remotion
 * Contains central configuration for the application
 */
export const Composition: React.FC<AnimationProps> = (props) => {
  console.log('Rendering Composition component with props:', props);
  
  // Define central control defaults
  const defaults: Partial<AnimationProps> = {
    // Visual style controls
    theme: "dark",
    iconType: "skull",
    iconSize: 100,
    
    // Map controls
    motion: "slowRotate",
    projection: "mercator",
    
    // Default country
    countryCode: "TWN", // Default country set to Russia
    
    // Centralized animation timing (30fps values)
    // All countries now use France's animation timing
    animationTiming: {
      // Standard animation timing (based on France)
      stabilizationBuffer: 22,  // ~0.75s buffer (22 frames at 30fps)
      highlightDelay: 10,       // ~0.33s delay (10 frames at 30fps)
      labelDelay: 15,           // 0.5s delay (15 frames at 30fps)
      highlightFadeDuration: 8, // ~0.25s duration (8 frames at 30fps)
      labelFadeDuration: 10,    // ~0.33s duration (10 frames at 30fps)
      
      // No country-specific overrides to ensure consistent timing
      countrySpecificOverrides: {}
    }
  };

  // Merge defaults with incoming props
  const defaultedProps = {
    ...defaults,
    ...props, // Incoming props override defaults
  };
  
  // Optional: Additional settings can be passed to override theme styling
  const additionalSettings = {
    settings: {
      // Override just the timing settings in general section
      general: {
        // France-like timing values for all countries (30fps)
        highlightDelayFrames: 10, // When the country highlight fades in
        labelDelayFrames: 15,     // When the marker/icon fades in 
        labelFadeDuration: 10     // How many frames the label fade-in takes
      },
      // Add highlight settings for animation speed
      highlight: {
        // Control the highlight fill and line animation timing
        fillColor: '#0C8E8E',
        lineColor: '#0C8E8E',
        fillOpacityTarget: 0.6,
        lineOpacityTarget: 1.0,
        labelOpacityTarget: 1.0,
        
        // Animation settings that apply to all countries equally
        fillAnimationDamping: 40,
        fillAnimationStiffness: 25,
        fillAnimationMass: 1,

        lineAnimationDamping: 40,
        lineAnimationStiffness: 25,
        lineAnimationMass: 1,
        
        // Optimized for consistent fade-in of label/icon across all countries
        labelAnimationDamping: 15,    
        labelAnimationStiffness: 12,  
        labelAnimationMass: 2.5       
      },
      // Add our centralized timing settings - standard for all countries
      timing: defaultedProps.animationTiming
    } as Partial<AnimationSettings>
  };
  
  console.log('Using props:', defaultedProps);
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <MapboxAnimation 
        {...defaultedProps} 
        {...additionalSettings}
      />
    </AbsoluteFill>
  );
};
import React from 'react';
import { AbsoluteFill } from 'remotion';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapboxAnimation } from './components/MapboxAnimation';
import { MarkerType, MarkerPositioningType } from './core/mapboxTypes';
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
 *      <MapboxAnimation.Marker iconType="flag" markerPositioning="map" />
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
    projection: "globe",
    
    // Marker controls
    markerType: "icon" as MarkerType, 
    markerText: "", 
    markerPositioning: "map" as MarkerPositioningType, // Map alignment vs viewport alignment
    
    // Default country
    countryCode: "FRA", 
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
        // We only want to override these specific timing properties
        highlightDelayFrames: 20, // When the country highlight fades in
        labelDelayFrames: 30,     // When the marker/icon fades in - much later
        labelFadeDuration: 20     // How many frames the label fade-in takes
      },
      // Add highlight settings for animation speed
      highlight: {
        // Control the highlight fill and line animation timing
        fillColor: '#0C8E8E',
        lineColor: '#0C8E8E',
        fillOpacityTarget: 0.6,
        lineOpacityTarget: 1.0,
        labelOpacityTarget: 1.0,
        
        // Slower animation settings with gentler spring parameters
        fillAnimationDamping: 40,
        fillAnimationStiffness: 25,
        fillAnimationMass: 1,

        lineAnimationDamping: 40,
        lineAnimationStiffness: 25,
        lineAnimationMass: 1,
        
        // Optimized for slower fade-in of label/icon
        labelAnimationDamping: 15,    // Lower damping for extended oscillation
        labelAnimationStiffness: 12,  // Lower stiffness for slower acceleration
        labelAnimationMass: 2.5       // Higher mass creates more inertia
      }
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
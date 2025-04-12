import React from 'react';
import { AbsoluteFill } from 'remotion';

interface VignetteProps {
  enabled: boolean;
  color?: string;
  intensity?: number;
  feather?: number;
}

/**
 * Vignette component that adds a darkened frame effect around the edges of the map
 */
export const Vignette: React.FC<VignetteProps> = ({
  enabled = false,
  color = 'rgba(0, 0, 0, 0.7)',
  intensity = 0.7,
  feather = 0.5,
}) => {
  if (!enabled) return null;

  // Calculate feather value between 0-100% based on input (0-1)
  const featherPercentage = Math.max(0, Math.min(100, feather * 100));
  
  // Calculate opacity based on intensity (0-1)
  const opacity = Math.max(0, Math.min(1, intensity));
  
  // Create radial gradient for vignette effect
  const background = `radial-gradient(
    circle,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0) ${100 - featherPercentage}%,
    ${color.replace(/[^,]+(?=\))/, opacity.toString())} 100%
  )`;
  
  return (
    <AbsoluteFill
      style={{
        background,
        pointerEvents: 'none', // Makes the vignette non-interactive
        zIndex: 10, // Ensure it's above other elements
      }}
    />
  );
}; 
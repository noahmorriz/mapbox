/**
 * Coordinate type used throughout the application
 */
export type Coordinates = [number, number] | { lng: number; lat: number };

/**
 * Base theme types
 */
export type ThemeType = "dark" | "light";

/**
 * Animation motion types
 */
export type MotionType = "rotateAndPitch" | "northToRotate" | "slowRotate";

/**
 * Icon types for markers
 */
export type IconType = 
  | "marker" 
  | "pin" 
  | "marker-alt" 
  | "location" 
  | "location-fill" 
  | "compass" 
  | "arrow" 
  | "gps" 
  | "info" 
  | "warning" 
  | "cross" 
  | "star" 
  | "flag" 
  | "skull" 
  | "death-skull" 
  | "target" 
  | "none";

/**
 * Defines the available map projections.
 */
export type ProjectionType = 'mercator' | 'globe';

/**
 * Defines the type of marker to display.
 */
export type MarkerType = 'icon' | 'text' | 'combined' | 'none';

/**
 * Defines how the marker is positioned.
 */
export type MarkerPositioningType = 'viewport' | 'map';

/**
 * Defines alignment options for marker pitch.
 */
export type MarkerPitchAlignment = 'map' | 'viewport' | 'auto';

/**
 * Defines alignment options for marker rotation.
 */
export type MarkerRotationAlignment = 'map' | 'viewport' | 'horizon' | 'auto';

/**
 * Defines anchor points for markers.
 */
export type MarkerAnchor = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Country data structure
 */
export interface CountryData {
  name: string;
  alpha2: string;
  alpha3: string;
  coordinates: Coordinates;
  zoomLevel: number;
} 
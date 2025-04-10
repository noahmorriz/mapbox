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
 * Country data structure
 */
export interface CountryData {
  name: string;
  alpha2: string;
  alpha3: string;
  coordinates: Coordinates;
  zoomLevel: number;
} 
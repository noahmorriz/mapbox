import { Coordinates, ThemeType, MotionType, ProjectionType, IconType } from './mapboxTypes';
import { AnimationTimeline } from './animationTiming';

/**
 * Camera animation settings
 */
export interface CameraSettings {
  initialRotation: number;
  finalRotation: number;
  initialPitch: number;
  finalPitch: number;
  rotationDamping: number;
  rotationStiffness: number;
  rotationMass: number;
  pitchDamping: number;
  pitchStiffness: number;
  pitchMass: number;
}

/**
 * Zoom animation settings
 */
export interface ZoomSettings {
  zoomDamping: number;
  zoomStiffness: number;
  zoomMass: number;
}

/**
 * Highlight animation settings
 */
export interface HighlightSettings {
  fillColor: string;
  lineColor: string;
  lineWidth?: number;
  fillOpacityTarget: number;
  lineOpacityTarget: number;
  labelOpacityTarget: number;
  fillAnimationDamping: number;
  fillAnimationStiffness: number;
  fillAnimationMass: number;
  lineAnimationDamping: number;
  lineAnimationStiffness: number;
  lineAnimationMass: number;
  labelAnimationDamping: number;
  labelAnimationStiffness: number;
  labelAnimationMass: number;
}

/**
 * UI style settings
 */
export interface UISettings {
  // Icon settings
  /**
   * Icon size as a percentage of the visible map area (1-100)
   * - 100: Icon fills 100% of the visible map area (adjusted for display)
   * - 50: Icon fills 50% of the visible map area
   * 
   * Size is calculated based on visible map area, not full country boundaries.
   */
  iconSize: number;
  iconColor: string;
  iconScale: number;
  iconDropShadow: boolean;
  
  // Text settings
  textFontSize: string;
  textColor: string;
  textFontWeight: string;
  
  // Info box settings
  infoMaxWidth: string;
  infoFontSize: string;
  infoBackgroundColor: string;
  infoTextColor: string;
  infoBorderRadius: string;
  infoPadding: string;
}

/**
 * General settings
 */
export interface GeneralSettings {
  backgroundColor: string;
  mapStyle: string;
  renderWorldCopies?: boolean;
  projection?: ProjectionType;
  mapSimplificationMode?: 'minimal' | 'labelsOnly' | 'none';
}

/**
 * Complete animation settings
 */
export interface AnimationSettings {
  camera: CameraSettings;
  highlight: HighlightSettings;
  general: GeneralSettings;
  ui: UISettings;
  // Standard timing system from animationTiming.ts
  timing?: Partial<AnimationTimeline>;
}

/**
 * Animation state structure for a frame
 */
export interface AnimationFrameState {
  bearing: number;
  pitch: number;
  animatedCenter: Coordinates;
  animatedZoom: number;
  fillOpacity: number;
  lineOpacity: number;
}

export interface AnimationProps {
  // Basic appearance controls
  countryCode?: string;
  theme?: ThemeType;
  motion?: MotionType;
  iconType?: IconType;
  /**
   * Icon size as a percentage of the visible map area (1-100)
   * - 100: Icon fills 100% of the visible map area (adjusted for display)
   * - 50: Icon fills 50% of the visible map area
   * - 25: Icon fills 25% of the visible map area
   * 
   * Size is calculated based on visible map area, not full country boundaries,
   * ensuring proper display for countries with distant territories.
   */
  iconSize?: number;
  projection?: ProjectionType;
  
  // Show/hide controls
  showHighlight?: boolean;
  showIcon?: boolean;
  
  // Animation timing controls using the standardized system
  animationTiming?: Partial<AnimationTimeline>;
} 
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
 * Timing settings for animations
 */
export interface TimingSettings {
  animationStartFrame: number;
  highlightDelayFrames: number;
  labelDelayFrames: number;
  padding: number;
  fadeDuration: number;
}

/**
 * UI style settings
 */
export interface UISettings {
  // Icon settings
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
  animationStartFrame: number;
  highlightDelayFrames: number;
  labelDelayFrames: number;
  labelFadeDuration?: number;
  padding: number;
  backgroundColor: string;
  mapStyle: string;
  renderWorldCopies?: boolean;
  fadeDuration?: number;
  projection?: ProjectionType;
  mapSimplificationMode?: 'minimal' | 'labelsOnly' | 'none';
}

/**
 * Complete animation settings
 */
export interface AnimationSettings {
  camera: CameraSettings;
  highlight: HighlightSettings;
  general: GeneralSettings & TimingSettings;
  ui: UISettings;
  // New orchestrated timing settings
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
  infoOpacity: number;
}

export interface AnimationProps {
  countryCode?: string;
  theme?: ThemeType;
  motion?: MotionType;
  iconType?: IconType;
  iconSize?: number;
  projection?: ProjectionType;
  
  // Animation timing controls
  animationTiming?: Partial<AnimationTimeline>;
} 
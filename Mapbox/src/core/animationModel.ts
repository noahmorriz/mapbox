import { Coordinates, ThemeType, MotionType, ProjectionType, IconType, TextDisplayType, TextAnimationType } from './mapboxTypes';
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
  textFontFamily?: string;
  textOpacity?: number;
  
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
  /**
   * Icon coverage as a percentage of the country's rendered smaller dimension (1-95)
   * - 75: Icon covers 75% of the country's smaller dimension
   * - 50: Icon covers 50% of the country's smaller dimension
   * 
   * Coverage is calculated based on the country's actual rendered dimensions on the map,
   * adapting to projection, zoom level, and country shape.
   */
  iconCoverage?: number;
  /**
   * Additional scaling factor applied to the icon after size calculation (default: 1.0)
   * - Values < 1.0: Make the icon smaller than the calculated size
   * - Values > 1.0: Make the icon larger than the calculated size
   * 
   * This allows fine-tuning the icon size without changing the coverage percentage.
   */
  iconScaleFactor?: number;
  projection?: ProjectionType;
  
  // Text display options
  textDisplay?: TextDisplayType;
  customText?: string;
  textSize?: number;
  textColor?: string;
  /**
   * Text animation type
   * - none: No animation (text appears immediately)
   * - fadeIn: Text fades in
   * - typewriter: Text appears character by character
   */
  textAnimationType?: TextAnimationType;
  
  // Show/hide controls
  showHighlight?: boolean;
  showIcon?: boolean;
  showText?: boolean;
  
  // Vignette controls
  /**
   * Whether to display the vignette effect
   */
  showVignette?: boolean;
  /**
   * Vignette appearance settings
   * - color: The color of the vignette (typically dark)
   * - intensity: The opacity/intensity of the vignette effect (0-1)
   * - feather: How much the vignette effect should be feathered (0-1)
   */
  vignetteSettings?: {
    color?: string;
    intensity?: number;
    feather?: number;
  };
  
  // Animation timing controls using the standardized system
  animationTiming?: Partial<AnimationTimeline>;
} 
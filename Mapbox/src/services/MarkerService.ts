import mapboxgl from 'mapbox-gl';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { 
  IconType, 
  MarkerType, 
  Coordinates,
  MarkerPitchAlignment,
  MarkerRotationAlignment,
  MarkerAnchor
} from '../core/mapboxTypes';
import { Icon } from '../components/Icon';

// Constants for marker classes
export const MARKER_CONTAINER_CLASS = 'marker-container';
export const MARKER_ICON_CLASS = 'marker-icon';
export const MARKER_TEXT_CLASS = 'marker-text';

// Types for marker options
export interface MarkerStyleOptions {
  color?: string;
  backgroundColor?: string;
  fontSize?: string | number;
  fontWeight?: string;
  padding?: string;
  borderRadius?: string;
  dropShadow?: boolean;
  opacity?: number;
  zIndex?: number;
  includeIcon?: boolean;
  // Shadow effect properties
  shadowEffect?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export interface MarkerOptions {
  pitchAlignment?: MarkerPitchAlignment;
  rotationAlignment?: MarkerRotationAlignment;
  anchor?: MarkerAnchor;
  offset?: [number, number];
  draggable?: boolean;
  clickTolerance?: number;
  style?: MarkerStyleOptions;
}

/**
 * Create a basic HTML element for a marker with styling
 */
export const createMarkerElement = (
  type: MarkerType,
  content: string | IconType,
  options: MarkerStyleOptions = {}
): HTMLDivElement => {
  const element = document.createElement('div');
  
  // Base styling for all markers - NO opacity/visibility here
  element.className = MARKER_CONTAINER_CLASS;
  
  // Efficient style initialization - basic layout and performance hints ONLY
  Object.assign(element.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    pointerEvents: 'none',
    position: 'relative',
    willChange: 'opacity, transform' // Hint for browser optimization
  });
  
  if (options.zIndex !== undefined) {
    element.style.zIndex = options.zIndex.toString();
  }
  
  // Create content based on marker type
  if (type === 'icon' && typeof content === 'string') {
    // Create a React icon element
    const iconReactElement = React.createElement(Icon, { 
      type: content as IconType,
      size: options.fontSize || 28,
      color: options.color || '#FFFFFF'
    });
    
    // Render the React element to HTML
    const iconHtml = renderToString(iconReactElement);
    
    // Create the icon container
    const iconElement = document.createElement('div');
    iconElement.className = MARKER_ICON_CLASS;
    iconElement.innerHTML = iconHtml;
    iconElement.style.marginTop = '-10px';
    
    if (options.dropShadow) {
      iconElement.style.filter = 'drop-shadow(0 0 4px rgba(0,0,0,0.7))';
    }
    
    // Add the icon element to the container
    element.appendChild(iconElement);
  } 
  else if (type === 'text' && typeof content === 'string') {
    // Text marker - create text element
    const textElement = document.createElement('div');
    textElement.className = MARKER_TEXT_CLASS;
    textElement.textContent = content;
    
    // Apply text styling
    if (options.color) {
      textElement.style.color = options.color;
    } else {
      textElement.style.color = '#FFFFFF';
    }
    
    if (options.fontSize) {
      textElement.style.fontSize = typeof options.fontSize === 'number' ? 
        `${options.fontSize}px` : options.fontSize;
    } else {
      textElement.style.fontSize = '24px';
    }
    
    if (options.fontWeight) {
      textElement.style.fontWeight = options.fontWeight;
    } else {
      textElement.style.fontWeight = 'bold';
    }
    
    textElement.style.textShadow = '0 0 4px #000000, 0 0 4px #000000';
    textElement.style.padding = '10px';
    textElement.style.textAlign = 'center';
    
    // Add the text element to the container
    element.appendChild(textElement);
    
    // Optionally add an icon/pin below the text
    if (options.includeIcon) {
      // Create a React icon element
      const iconReactElement = React.createElement(Icon, { 
        type: 'pin',
        size: options.fontSize ? Number(options.fontSize) * 1.2 : 28,
        color: options.color || '#FFFFFF'
      });
      
      // Render the React element to HTML
      const iconHtml = renderToString(iconReactElement);
      
      // Create the icon container
      const iconElement = document.createElement('div');
      iconElement.className = MARKER_ICON_CLASS;
      iconElement.innerHTML = iconHtml;
      iconElement.style.marginTop = '-10px';
      
      if (options.dropShadow) {
        iconElement.style.filter = 'drop-shadow(0 0 4px rgba(0,0,0,0.7))';
      }
      
      // Add the icon element after the text
      element.appendChild(iconElement);
    }
  } else if (type === 'combined' && typeof content === 'string') {
    // Combined text and icon
    
    // Create text element first
    const textElement = document.createElement('div');
    textElement.className = MARKER_TEXT_CLASS;
    textElement.textContent = content;
    
    // Apply text styling
    if (options.color) {
      textElement.style.color = options.color;
    } else {
      textElement.style.color = '#FFFFFF';
    }
    
    if (options.fontSize) {
      textElement.style.fontSize = typeof options.fontSize === 'number' ? 
        `${options.fontSize}px` : options.fontSize;
    } else {
      textElement.style.fontSize = '24px';
    }
    
    if (options.fontWeight) {
      textElement.style.fontWeight = options.fontWeight;
    } else {
      textElement.style.fontWeight = 'bold';
    }
    
    textElement.style.textShadow = '0 0 4px #000000, 0 0 4px #000000';
    textElement.style.padding = '10px';
    textElement.style.textAlign = 'center';
    
    // Create a React icon element
    const iconReactElement = React.createElement(Icon, { 
      type: 'pin',
      size: options.fontSize ? Number(options.fontSize) * 1.2 : 28,
      color: options.color || '#FFFFFF'
    });
    
    // Render the React element to HTML
    const iconHtml = renderToString(iconReactElement);
    
    // Create the icon container
    const iconElement = document.createElement('div');
    iconElement.className = MARKER_ICON_CLASS;
    iconElement.innerHTML = iconHtml;
    iconElement.style.marginTop = '-10px';
    
    if (options.dropShadow) {
      iconElement.style.filter = 'drop-shadow(0 0 4px rgba(0,0,0,0.7))';
    }
    
    // Add both elements to the container
    element.appendChild(textElement);
    element.appendChild(iconElement);
  }
  
  return element;
};

/**
 * Renders a React component into an HTML element for a marker
 */
export const createReactMarkerElement = (
  reactElement: React.ReactElement,
  options: MarkerStyleOptions = {}
): HTMLDivElement => {
  const element = document.createElement('div');
  element.className = MARKER_CONTAINER_CLASS;
  
  // Apply base styling
  element.style.opacity = options.opacity !== undefined ? options.opacity.toString() : '1';
  element.style.pointerEvents = 'auto';
  element.style.willChange = 'transform, opacity';
  
  if (options.zIndex !== undefined) {
    element.style.zIndex = options.zIndex.toString();
  }
  
  // Render React element to HTML string and set as innerHTML
  const htmlString = renderToString(reactElement);
  element.innerHTML = htmlString;
  
  return element;
};

/**
 * Creates a Mapbox marker and adds it to the map
 */
export const createMapboxMarker = (
  map: mapboxgl.Map,
  coordinates: Coordinates,
  element: HTMLElement,
  options: MarkerOptions = {}
): mapboxgl.Marker => {
  // Configure marker options
  const markerOptions: mapboxgl.MarkerOptions = {
    element,
    anchor: options.anchor || 'bottom',
    pitchAlignment: options.pitchAlignment || 'map',
    rotationAlignment: options.rotationAlignment || 'map',
    offset: options.offset,
    draggable: options.draggable || false,
    clickTolerance: options.clickTolerance
  };
  
  // Create and add the marker to the map
  const marker = new mapboxgl.Marker(markerOptions)
    .setLngLat(coordinates)
    .addTo(map);
    
  return marker;
};

/**
 * Helper function to create a marker in a single call
 * Enhanced with the new marker rendering logic from WORKING.md
 */
export const createMarker = (
  map: mapboxgl.Map,
  coordinates: Coordinates,
  type: MarkerType,
  content: string | IconType,
  options: MarkerOptions = {}
): mapboxgl.Marker | null => {
  if (type === 'none' || !content) {
    return null;
  }

  // Create the marker element
  const element = createMarkerElement(type, content, options.style);
  
  // Enhanced marker options with defaults
  const enhancedOptions: MarkerOptions = {
    anchor: options.anchor || 'center',
    rotationAlignment: options.rotationAlignment || 'map',
    pitchAlignment: options.pitchAlignment || 'map',
    ...options
  };
  
  // Create shadow marker if requested
  if (options.style?.shadowEffect) {
    createShadowMarker(map, coordinates, type, content, options);
  }
  
  // Create and return the Mapbox marker
  return createMapboxMarker(map, coordinates, element, enhancedOptions);
};

/**
 * Creates a shadow marker that sits below the main marker to create a shadow/glow effect
 */
export const createShadowMarker = (
  map: mapboxgl.Map,
  coordinates: Coordinates,
  type: MarkerType,
  content: string | IconType,
  options: MarkerOptions = {}
): mapboxgl.Marker | null => {
  if (!options.style?.shadowEffect || type === 'none' || !content) {
    return null;
  }

  // Clone the style options but modify for shadow effect
  const shadowStyle: MarkerStyleOptions = {
    ...(options.style || {}),
    color: options.style.shadowColor || '#000000',
    opacity: (options.style.opacity || 1) * 0.7,
    zIndex: (options.style.zIndex || 0) - 1,
    dropShadow: false
  };

  // Create shadow element with slightly larger size for blur effect
  const shadowElement = createMarkerElement(type, content, shadowStyle);
  
  // Apply blur and offset to create shadow effect
  shadowElement.style.filter = `blur(${options.style.shadowBlur || 4}px)`;
  
  // Shadow marker options
  const shadowOptions: MarkerOptions = {
    ...options,
    anchor: options.anchor || 'center',
    rotationAlignment: options.rotationAlignment || 'map',
    pitchAlignment: options.pitchAlignment || 'map',
    offset: [(options.style.shadowOffsetX || 2), (options.style.shadowOffsetY || 2)]
  };
  
  // Create and return the shadow marker
  return createMapboxMarker(map, coordinates, shadowElement, shadowOptions);
};

/**
 * Updates a marker's color by accessing its SVG element
 */
export const updateMarkerColor = (
  marker: mapboxgl.Marker,
  color: string
): void => {
  const element = marker.getElement();
  try {
    // Try to locate SVG element and change fill color
    const svgElement = element.querySelector('svg');
    if (svgElement) {
      const paths = svgElement.querySelectorAll('path');
      paths.forEach(path => {
        path.setAttribute('fill', color);
      });
    } else {
      // If no SVG, try to update text color
      element.style.color = color;
    }
  } catch (e) {
    console.error('Failed to update marker color:', e);
  }
};

/**
 * Updates marker properties like pitchAlignment or rotationAlignment
 */
export const updateMarkerProperties = (
  marker: mapboxgl.Marker,
  options: Partial<MarkerOptions>
): void => {
  if (options.pitchAlignment) {
    marker.setPitchAlignment(options.pitchAlignment);
  }
  
  if (options.rotationAlignment) {
    marker.setRotationAlignment(options.rotationAlignment);
  }
  
  if (options.draggable !== undefined) {
    marker.setDraggable(options.draggable);
  }
  
  if (options.offset) {
    marker.setOffset(options.offset);
  }
};

/**
 * Updates the opacity of a marker
 * @param marker The mapboxgl.Marker instance
 * @param opacity The new opacity value (0-1)
 * @param markerType Optional type identifier for debugging
 */
export const updateMarkerOpacity = (
  marker: mapboxgl.Marker,
  opacity: number,
  markerType: string = 'unknown'
): void => {
  if (!marker) {
    console.warn(`Cannot update opacity for ${markerType} marker: Marker is null or undefined`);
    return;
  }
  
  const element = marker.getElement();
  if (!element) {
    console.warn(`Cannot update opacity for ${markerType} marker: Element not found`);
    return;
  }
  
  try {
    // Set opacity on the marker element
    element.style.opacity = opacity.toString();
    
    // For debugging
    // console.log(`Updated ${markerType} marker opacity to ${opacity}`);
  } catch (e) {
    console.error(`Failed to update ${markerType} marker opacity:`, e);
  }
}; 
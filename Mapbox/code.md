import { useEffect, useRef, useState } from 'react';
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion';
import mapboxgl, { AnyLayer, VectorSourceSpecification } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { defaultCountry, countries, getCountry } from './countryData';

// ======================================================================
// MAPBOX CONFIGURATION
// ======================================================================
mapboxgl.accessToken =
  'pk.eyJ1Ijoibm9haG1vcnJpeiIsImEiOiJjbThoZnZvbTAwMWoyMnNxMGQ1MGRyZ3VqIn0.HtrVBbWJzrviJZJn7vr66g';

// ======================================================================
// COMPOSITION SETTINGS
// ======================================================================

// Country to animate (use any ISO Alpha-3 code)
const COUNTRY_CODE = "USA";  // Options: "USA", "FRA", "DEU", "GBR", "CHN", "JPN", etc.

// List of large countries that span multiple time zones
const LARGE_COUNTRIES = ['RUS', 'USA', 'CAN', 'CHN', 'BRA', 'AUS'];

// Define zoom level boundaries that trigger new detail rendering
const ZOOM_RENDERING_BOUNDARIES = [0, 3, 4, 6, 10, 15];

// ======================================================================
// UI CONTROLS & TEXT SETTINGS
// ======================================================================

// Label marker settings (country name display)
const LABEL_MARKER_SETTINGS = {
  className: 'country-label-marker',
  pointerEvents: 'none',
  color: '#FFFFFF',
  fontSize: '24px',
  fontWeight: 'bold',
  textShadow: '0 0 4px #000000, 0 0 4px #000000',
  padding: '10px',
  textAlign: 'center' as const,
  initialOpacity: '0',
};

// Error message settings
const ERROR_MESSAGE_SETTINGS = {
  color: 'white',
  textAlign: 'center' as const,
  padding: '2rem',
  backgroundColor: 'rgba(255, 0, 0, 0.7)',
};

// Mapbox marker settings
const MARKER_SETTINGS = {
  anchor: 'center' as const,
  rotationAlignment: 'map' as const,
  pitchAlignment: 'map' as const,
};

// ======================================================================
// ANIMATION SETTINGS
// ======================================================================

// Default animation settings
const DEFAULT_ANIMATION_SETTINGS = {
  // Camera animation settings
  camera: {
    initialRotation: 0,
    finalRotation: 45,
    initialPitch: 0,
    finalPitch: 30,
    rotationDamping: 150,
    rotationStiffness: 10,
    rotationMass: 20,
    pitchDamping: 150,
    pitchStiffness: 10,
    pitchMass: 20,
  },
  // Highlight animation settings
  highlight: {
    fillColor: '#0C8E8E',
    fillOpacityTarget: 0.5,
    lineColor: '#0C8E8E',
    lineWidth: 3,
    lineOpacityTarget: 1,
    fillAnimationDamping: 40,
    fillAnimationStiffness: 30,
    fillAnimationMass: 1.5,
    lineAnimationDamping: 35,
    lineAnimationStiffness: 25,
    lineAnimationMass: 1.5,
  },
  // General settings
  general: {
    animationStartFrame: 10,
    padding: 300,
    backgroundColor: '#111',
    mapStyle: 'mapbox://styles/noahmorriz/cm91i3crt009t01sde62v5bsa',
    renderWorldCopies: false,
  }
};

// Map layer settings
const MAP_LAYER_SETTINGS = {
  countryBoundaries: {
    id: 'country-boundaries',
    source: {
      type: 'vector',
      url: 'mapbox://mapbox.country-boundaries-v1'
    } as VectorSourceSpecification,
    sourceLayer: 'country_boundaries',
    type: 'fill' as 'fill',
    paint: {
      fillColor: '#888888',
      fillOpacity: 0.1
    }
  },
  countryFill: {
    id: 'country-fill',
    source: {
      type: 'vector',
      url: 'mapbox://mapbox.country-boundaries-v1'
    } as VectorSourceSpecification,
    sourceLayer: 'country_boundaries',
    type: 'fill' as 'fill',
  },
  countryOutline: {
    id: 'country-outline',
    source: {
      type: 'vector',
      url: 'mapbox://mapbox.country-boundaries-v1'
    } as VectorSourceSpecification,
    sourceLayer: 'country_boundaries',
    type: 'line' as 'line',
  }
};

// ======================================================================
// TYPE DEFINITIONS
// ======================================================================

export interface AnimationSettings {
  camera: {
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
  };
  highlight: {
    fillColor: string;
    fillOpacityTarget: number;
    lineColor: string;
    lineWidth: number;
    lineOpacityTarget: number;
    fillAnimationDamping: number;
    fillAnimationStiffness: number;
    fillAnimationMass: number;
    lineAnimationDamping: number;
    lineAnimationStiffness: number;
    lineAnimationMass: number;
  };
  general: {
    animationStartFrame: number;
    padding: number;
    backgroundColor: string;
    mapStyle: string;
    renderWorldCopies: boolean;
  };
}

interface MyCompositionProps {
  countryCode?: string;
  settings?: Partial<AnimationSettings>;
}

// ======================================================================
// UTILITY FUNCTIONS
// ======================================================================

/**
 * Check if a zoom transition would cross a rendering boundary
 */
const crossesRenderingBoundary = (startZoom: number, endZoom: number): boolean => {
  for (const boundary of ZOOM_RENDERING_BOUNDARIES) {
    if ((startZoom < boundary && endZoom > boundary) || 
        (startZoom > boundary && endZoom < boundary)) {
      return true;
    }
  }
  return false;
};

/**
 * Get a safe zoom level for animation that doesn't cross rendering boundaries
 */
const getSafeZoomLevel = (targetZoom: number, currentZoom: number): number => {
  if (!crossesRenderingBoundary(currentZoom, targetZoom)) {
    return targetZoom;
  }
  
  let closestBoundary = ZOOM_RENDERING_BOUNDARIES[0];
  let minDistance = Math.abs(currentZoom - closestBoundary);
  
  for (const boundary of ZOOM_RENDERING_BOUNDARIES) {
    const distance = Math.abs(currentZoom - boundary);
    if (distance < minDistance) {
      closestBoundary = boundary;
      minDistance = distance;
    }
  }
  
  if (targetZoom > currentZoom && currentZoom < closestBoundary) {
    return Math.min(targetZoom, closestBoundary - 0.01);
  }
  
  if (targetZoom < currentZoom && currentZoom > closestBoundary) {
    return Math.max(targetZoom, closestBoundary + 0.01);
  }
  
  return currentZoom;
};

// ======================================================================
// MAIN COMPONENT
// ======================================================================

export const MyComposition: React.FC<MyCompositionProps> = ({ 
  countryCode = COUNTRY_CODE,
  settings = {}
}) => {
  // Get the country data from the code - needed to initialize refs
  const countryData = countryCode ? (countries[countryCode] || getCountry(countryCode) || defaultCountry) : defaultCountry;
  
  // ======================================================================
  // STATE & REFS
  // ======================================================================
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const currentZoomRef = useRef<number>(countryData.zoomLevel);
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const [renderHandle] = useState(() => delayRender('Loading map...'));
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [mapLayersReady, setMapLayersReady] = useState(false);
  const [labelMarker, setLabelMarker] = useState<mapboxgl.Marker | null>(null);

  // ======================================================================
  // SETTINGS & COUNTRY DATA CONFIGURATION
  // ======================================================================
  
  // Check if this is a large country
  const isLargeCountry = LARGE_COUNTRIES.includes(countryData.alpha3);
  
  // Merge default settings with provided settings and country-specific overrides
  const mergedSettings: AnimationSettings = {
    camera: { 
      ...DEFAULT_ANIMATION_SETTINGS.camera, 
      ...(isLargeCountry ? { 
        finalRotation: 20, 
        finalPitch: 15,
        rotationStiffness: 8,
        pitchStiffness: 8, 
      } : {}),
      ...settings.camera 
    },
    highlight: { 
      ...DEFAULT_ANIMATION_SETTINGS.highlight, 
      ...settings.highlight 
    },
    general: { 
      ...DEFAULT_ANIMATION_SETTINGS.general, 
      ...(isLargeCountry ? { 
        renderWorldCopies: true 
      } : {}),
      ...settings.general 
    },
  };

  // Destructure settings for easier access
  const { camera, highlight, general } = mergedSettings;
  const { animationStartFrame, padding, backgroundColor, mapStyle, renderWorldCopies } = general;

  // ======================================================================
  // ANIMATION CALCULATIONS
  // ======================================================================
  
  // Animate camera parameters
  const bearing = spring({
    frame,
    fps,
    from: camera.initialRotation,
    to: camera.finalRotation,
    config: { 
      damping: camera.rotationDamping, 
      stiffness: camera.rotationStiffness, 
      mass: camera.rotationMass 
    },
  });
  
  const pitch = spring({
    frame,
    fps,
    from: camera.initialPitch,
    to: camera.finalPitch,
    config: { 
      damping: camera.pitchDamping, 
      stiffness: camera.pitchStiffness, 
      mass: camera.pitchMass 
    },
  });
  
  // Use the selected country's center coordinates
  const animatedCenter: [number, number] = countryData.coordinates;
  
  // Get a safe zoom level that won't cross rendering boundaries
  const safeZoom = getSafeZoomLevel(countryData.zoomLevel, currentZoomRef.current);

  // Animate country highlight opacities with delayed start
  const fillOpacity = spring({
    frame: Math.max(0, frame - animationStartFrame),
    fps,
    from: 0,
    to: highlight.fillOpacityTarget,
    config: { 
      damping: highlight.fillAnimationDamping, 
      stiffness: highlight.fillAnimationStiffness, 
      mass: highlight.fillAnimationMass 
    },
  });
  
  const lineOpacity = spring({
    frame: Math.max(0, frame - animationStartFrame),
    fps,
    from: 0,
    to: highlight.lineOpacityTarget,
    config: { 
      damping: highlight.lineAnimationDamping, 
      stiffness: highlight.lineAnimationStiffness, 
      mass: highlight.lineAnimationMass 
    },
  });

  // ======================================================================
  // MAP HELPER FUNCTIONS
  // ======================================================================
  
  // Helper function to safely check if a layer exists
  const layerExists = (layerId: string): boolean => {
    if (!map || !isMapReady) return false;
    try {
      return map.getLayer(layerId) !== undefined;
    } catch (e) {
      console.warn(`Error checking if layer ${layerId} exists:`, e);
      return false;
    }
  };

  // Helper function to safely update a layer property
  const updateLayerOpacity = (layerId: string, property: string, value: number): boolean => {
    if (!map || !isMapReady || !layerExists(layerId)) return false;
    try {
      map.setPaintProperty(layerId, property as any, value);
      return true;
    } catch (e) {
      console.warn(`Error updating ${property} for layer ${layerId}:`, e);
      return false;
    }
  };

  // Setup map layers in proper order
  const setupMapLayers = (mapInstance: mapboxgl.Map) => {
    // 1. Basic country boundaries (background)
    mapInstance.addLayer({
      id: MAP_LAYER_SETTINGS.countryBoundaries.id,
      source: MAP_LAYER_SETTINGS.countryBoundaries.source,
      'source-layer': MAP_LAYER_SETTINGS.countryBoundaries.sourceLayer,
      type: MAP_LAYER_SETTINGS.countryBoundaries.type,
      paint: {
        'fill-color': MAP_LAYER_SETTINGS.countryBoundaries.paint.fillColor,
        'fill-opacity': MAP_LAYER_SETTINGS.countryBoundaries.paint.fillOpacity
      }
    });

    // 2. Highlighted country fill
    mapInstance.addLayer({
      id: MAP_LAYER_SETTINGS.countryFill.id,
      source: MAP_LAYER_SETTINGS.countryFill.source,
      'source-layer': MAP_LAYER_SETTINGS.countryFill.sourceLayer,
      type: MAP_LAYER_SETTINGS.countryFill.type,
      paint: {
        'fill-color': highlight.fillColor,
        'fill-opacity': 0
      },
      filter: ['==', ['get', 'iso_3166_1_alpha_3'], countryData.alpha3]
    });

    // 3. Highlighted country outline
    mapInstance.addLayer({
      id: MAP_LAYER_SETTINGS.countryOutline.id,
      source: MAP_LAYER_SETTINGS.countryOutline.source,
      'source-layer': MAP_LAYER_SETTINGS.countryOutline.sourceLayer,
      type: MAP_LAYER_SETTINGS.countryOutline.type,
      paint: {
        'line-color': highlight.lineColor,
        'line-width': highlight.lineWidth,
        'line-opacity': 0
      },
      filter: ['==', ['get', 'iso_3166_1_alpha_3'], countryData.alpha3]
    });
    
    // Check periodically until all layers are fully loaded
    const checkLayersLoaded = () => {
      if (
        mapInstance.isStyleLoaded() && 
        mapInstance.getLayer(MAP_LAYER_SETTINGS.countryFill.id) && 
        mapInstance.getLayer(MAP_LAYER_SETTINGS.countryOutline.id)
      ) {
        setMapLayersReady(true);
      } else {
        setTimeout(checkLayersLoaded, 50);
      }
    };
    
    checkLayersLoaded();
  };
  
  // Create and add label marker to the map
  const createLabelMarker = (mapInstance: mapboxgl.Map) => {
    const markerElement = document.createElement('div');
    markerElement.className = LABEL_MARKER_SETTINGS.className;
    markerElement.style.pointerEvents = LABEL_MARKER_SETTINGS.pointerEvents;
    markerElement.style.color = LABEL_MARKER_SETTINGS.color;
    markerElement.style.fontSize = LABEL_MARKER_SETTINGS.fontSize;
    markerElement.style.fontWeight = LABEL_MARKER_SETTINGS.fontWeight;
    markerElement.style.textShadow = LABEL_MARKER_SETTINGS.textShadow;
    markerElement.style.padding = LABEL_MARKER_SETTINGS.padding;
    markerElement.style.textAlign = LABEL_MARKER_SETTINGS.textAlign;
    markerElement.style.opacity = LABEL_MARKER_SETTINGS.initialOpacity;
    markerElement.textContent = countryData.name;
    
    const marker = new mapboxgl.Marker({
      element: markerElement,
      anchor: MARKER_SETTINGS.anchor,
      rotationAlignment: MARKER_SETTINGS.rotationAlignment,
      pitchAlignment: MARKER_SETTINGS.pitchAlignment,
    })
      .setLngLat(countryData.coordinates)
      .addTo(mapInstance);
    
    setLabelMarker(marker);
  };

  // ======================================================================
  // MAP INITIALIZATION
  // ======================================================================
  
  // Initialize the map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let mapInstance: mapboxgl.Map | null = null;
    try {
      mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center: countryData.coordinates,
        zoom: countryData.zoomLevel,
        bearing: camera.initialRotation,
        pitch: camera.initialPitch,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
        preserveDrawingBuffer: true,
        antialias: true,
        renderWorldCopies,
      });
    } catch (error) {
      console.error('Map initialization failed:', error);
      setHasError(true);
      continueRender(renderHandle);
      return;
    }

    mapInstance.on('load', () => {
      try {
        // Simplify the style: remove extraneous layers
        const style = mapInstance.getStyle();
        if (style && style.layers) {
          style.layers.forEach((layer: AnyLayer) => {
            if (
              layer.id.includes('label') ||
              layer.id.includes('poi') ||
              layer.id.includes('road') ||
              layer.id.includes('symbol')
            ) {
              try {
                mapInstance?.removeLayer(layer.id);
              } catch (e) {
                // Ignore removal errors
              }
            }
          });
        }
        
        // Set padding to load extra tiles around the visible area
        mapInstance.setPadding({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
        });
        
        // Add map layers in proper order
        setupMapLayers(mapInstance);
        
        // Create and add the country label marker
        createLabelMarker(mapInstance);
        
        // Set map as ready
        setMap(mapInstance);
        setIsMapReady(true);
        continueRender(renderHandle);
      } catch (e) {
        console.error('Error during map setup:', e);
        setHasError(true);
        continueRender(renderHandle);
      }
    });

    mapInstance.on('error', (e) => {
      console.error('Map error:', e.error);
      setHasError(true);
      continueRender(renderHandle);
    });

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [
    renderHandle, 
    countryData, 
    camera.initialPitch, 
    camera.initialRotation, 
    mapStyle, 
    padding, 
    highlight.fillColor, 
    highlight.lineColor, 
    highlight.lineWidth, 
    renderWorldCopies
  ]);

  // ======================================================================
  // ANIMATION UPDATES
  // ======================================================================
  
  // Update camera and highlight layers every frame
  useEffect(() => {
    if (!map || !isMapReady) return;
    
    try {
      // Update the camera
      map.easeTo({
        center: animatedCenter,
        zoom: safeZoom,
        bearing: bearing,
        pitch: pitch,
        duration: 0,
      });
      
      // Update the current zoom reference
      currentZoomRef.current = safeZoom;
      
      // Only update highlight layers when they're ready
      if (mapLayersReady && map.isStyleLoaded()) {
        // Update the country filter if it changed
        if (layerExists(MAP_LAYER_SETTINGS.countryFill.id) && layerExists(MAP_LAYER_SETTINGS.countryOutline.id)) {
          map.setFilter(MAP_LAYER_SETTINGS.countryFill.id, ['==', ['get', 'iso_3166_1_alpha_3'], countryData.alpha3]);
          map.setFilter(MAP_LAYER_SETTINGS.countryOutline.id, ['==', ['get', 'iso_3166_1_alpha_3'], countryData.alpha3]);
        }
        
        // Apply opacity to all animated layers
        updateLayerOpacity(MAP_LAYER_SETTINGS.countryFill.id, 'fill-opacity', fillOpacity);
        updateLayerOpacity(MAP_LAYER_SETTINGS.countryOutline.id, 'line-opacity', lineOpacity);
        
        // Update marker position and opacity
        if (labelMarker) {
          labelMarker.setLngLat(countryData.coordinates);
          const markerElement = labelMarker.getElement();
          if (markerElement) {
            markerElement.style.opacity = String(fillOpacity);
            markerElement.textContent = countryData.name;
          }
        }
        
        // Apply static fallback if animation is nearly complete
        if (frame > animationStartFrame + fps) {
          if (fillOpacity > 0.95 * highlight.fillOpacityTarget) {
            updateLayerOpacity(MAP_LAYER_SETTINGS.countryFill.id, 'fill-opacity', highlight.fillOpacityTarget);
            if (labelMarker) {
              const markerElement = labelMarker.getElement();
              if (markerElement) {
                markerElement.style.opacity = String(highlight.fillOpacityTarget);
              }
            }
          }
          if (lineOpacity > 0.95 * highlight.lineOpacityTarget) {
            updateLayerOpacity(MAP_LAYER_SETTINGS.countryOutline.id, 'line-opacity', highlight.lineOpacityTarget);
          }
        }
      }
      
      map.triggerRepaint();
    } catch (e) {
      console.error('Error updating map:', e);
    }
  }, [
    map, 
    isMapReady, 
    mapLayersReady, 
    bearing, 
    pitch, 
    animatedCenter, 
    safeZoom, 
    fillOpacity, 
    lineOpacity, 
    frame, 
    countryData, 
    animationStartFrame, 
    fps, 
    highlight.fillOpacityTarget, 
    highlight.lineOpacityTarget,
    labelMarker
  ]);

  // ======================================================================
  // RENDER
  // ======================================================================
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {hasError ? (
        <div style={ERROR_MESSAGE_SETTINGS}>
          An error occurred while loading the map.
        </div>
      ) : null}
      <AbsoluteFill ref={mapContainerRef} />
    </AbsoluteFill>
  );
};

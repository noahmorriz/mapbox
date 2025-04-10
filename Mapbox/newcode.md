import { useEffect, useRef, useState, FC } from 'react';
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
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
const COUNTRY_CODE = "FRA";  // Options: "USA", "FRA", "DEU", "GBR", "CHN", "JPN", etc.

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
    labelOpacityTarget: 1,
    labelAnimationDamping: 40,
    labelAnimationStiffness: 30,
    labelAnimationMass: 1.5,
  },
  // General settings
  general: {
    animationStartFrame: 10,
    highlightDelayFrames: 45, // Delay before highlight animation starts
    labelDelayFrames: 60, // Delay before label appears
    labelFadeDuration: 30, // How many frames the label fade-in takes
    padding: 20,
    backgroundColor: '#111',
    mapStyle: 'mapbox://styles/noahmorriz/cm91i3crt009t01sde62v5bsa',
    renderWorldCopies: false,
    fadeDuration: 0, // Ensuring no fade between styles
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
    labelOpacityTarget: number;
    labelAnimationDamping: number;
    labelAnimationStiffness: number;
    labelAnimationMass: number;
  };
  general: {
    animationStartFrame: number;
    highlightDelayFrames: number;
    labelDelayFrames: number;
    labelFadeDuration: number;
    padding: number;
    backgroundColor: string;
    mapStyle: string;
    renderWorldCopies: boolean;
    fadeDuration: number;
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
 * Simple debounce function to prevent too frequent map updates
 */
const debounce = <T extends (...args: any[]) => any>(fn: T, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

// ======================================================================
// COUNTRY LABEL COMPONENT
// ======================================================================

interface CountryLabelProps {
  countryName: string;
  delay: number;
  isVisible: boolean;
}

const CountryLabel: FC<CountryLabelProps> = ({ countryName, delay, isVisible }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const opacity = spring({
    frame: Math.max(0, frame - delay),
    fps,
    from: 0,
    to: isVisible ? 1 : 0,
    config: {
      damping: 40,
      stiffness: 30,
      mass: 1.5,
    },
  });
  
  const scale = spring({
    frame: Math.max(0, frame - delay),
    fps,
    from: 0.8,
    to: isVisible ? 1 : 0.8,
    config: {
      damping: 35,
      stiffness: 40,
      mass: 1.2,
    },
  });
  
  const y = interpolate(
    spring({
      frame: Math.max(0, frame - delay),
      fps,
      from: 0,
      to: 1,
      config: {
        damping: 30,
        stiffness: 35,
        mass: 1,
      },
    }),
    [0, 1],
    [10, 0]
  );
  
  return (
    <div 
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) translateY(${y}px) scale(${scale})`,
        color: '#FFFFFF',
        fontSize: '24px',
        fontWeight: 'bold',
        textShadow: '0 0 4px #000000, 0 0 4px #000000',
        padding: '10px',
        textAlign: 'center',
        opacity,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {countryName}
    </div>
  );
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
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const [initialRenderHandle] = useState(() => delayRender('Loading map...'));
  const frameRenderHandleRef = useRef<number | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [mapLayersReady, setMapLayersReady] = useState(false);
  const [showLabel, setShowLabel] = useState(false);

  // Safety timeout to ensure rendering continues even if map fails to load
  useEffect(() => {
    // Set a timeout to ensure we don't block rendering indefinitely
    const safetyTimeout = setTimeout(() => {
      console.warn('Map load safety timeout triggered - continuing render anyway');
      setHasError(true);
      setIsMapReady(true); // Set ready anyway to allow rendering to proceed
      continueRender(initialRenderHandle);
    }, 20000); // 20 seconds max wait time
    
    return () => {
      clearTimeout(safetyTimeout);
    };
  }, [initialRenderHandle]);

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
  const highlightDelayFrames = general.highlightDelayFrames || 0;
  const labelDelayFrames = general.labelDelayFrames || 0;
  const labelFadeDuration = general.labelFadeDuration || 30;

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
  
  // Animate the zoom level using spring function
  const animatedZoom = spring({
    frame,
    fps,
    from: Math.max(countryData.zoomLevel - 1, 0),
    to: countryData.zoomLevel,
    config: {
      damping: 60,
      stiffness: 10,
      mass: 1,
    },
  });

  // Calculate total delay for highlight animation
  const totalHighlightDelay = animationStartFrame + highlightDelayFrames;

  // Calculate total delay for label animation
  const totalLabelDelay = animationStartFrame + labelDelayFrames;

  // Animate country highlight opacities with delayed start
  const fillOpacity = spring({
    frame: Math.max(0, frame - totalHighlightDelay),
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
    frame: Math.max(0, frame - totalHighlightDelay),
    fps,
    from: 0,
    to: highlight.lineOpacityTarget,
    config: { 
      damping: highlight.lineAnimationDamping, 
      stiffness: highlight.lineAnimationStiffness, 
      mass: highlight.lineAnimationMass 
    },
  });

  // Separate animation for label opacity
  const labelOpacity = spring({
    frame: Math.max(0, frame - totalLabelDelay),
    fps,
    from: 0,
    to: highlight.labelOpacityTarget,
    config: { 
      damping: highlight.labelAnimationDamping,
      stiffness: highlight.labelAnimationStiffness,
      mass: highlight.labelAnimationMass
    },
  });

  // ======================================================================
  // MAP INITIALIZATION
  // ======================================================================
  
  // Initialize the map
  useEffect(() => {
    if (!mapContainerRef.current) {
      // If map container isn't available, don't block rendering
      setHasError(true);
      continueRender(initialRenderHandle);
      return;
    }

    let mapInstance: mapboxgl.Map | null = null;
    let loadTimeout: NodeJS.Timeout | null = null;
    
    // Set a timeout specifically for map loading
    loadTimeout = setTimeout(() => {
      console.error('Map load timeout - continuing without map');
      setHasError(true);
      setIsMapReady(true);
      setShowLabel(true);
      continueRender(initialRenderHandle);
    }, 15000); // 15 second timeout for map loading
    
    try {
      mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center: countryData.coordinates,
        zoom: Math.max(countryData.zoomLevel - 1, 0), // Start slightly zoomed out
        bearing: camera.initialRotation,
        pitch: camera.initialPitch,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
        preserveDrawingBuffer: true,
        antialias: true,
        renderWorldCopies,
      });
      
      // Store the map instance in ref for access outside of state updates
      mapInstanceRef.current = mapInstance;
    } catch (error) {
      console.error('Map initialization failed:', error);
      setHasError(true);
      setIsMapReady(true); // Set ready anyway to allow rendering to proceed
      setShowLabel(true); // Show label even without map
      if (loadTimeout) clearTimeout(loadTimeout);
      continueRender(initialRenderHandle);
      return;
    }

    // Handle load event
    mapInstance.on('load', () => {
      if (loadTimeout) clearTimeout(loadTimeout);
      
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
                console.warn(`Failed to remove layer ${layer.id}`, e);
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

        // Add layers with retries and better error handling
        const addMapLayers = () => {
          // Check if map is still valid
          if (!mapInstance || !mapInstance.isStyleLoaded()) {
            console.warn('Map instance not ready for adding layers');
            return false;
          }
          
          try {
            // 1. Basic country boundaries
            if (!mapInstance.getLayer(MAP_LAYER_SETTINGS.countryBoundaries.id)) {
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
            }

            // 2. Highlighted country fill
            if (!mapInstance.getLayer(MAP_LAYER_SETTINGS.countryFill.id)) {
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
            }

            // 3. Highlighted country outline
            if (!mapInstance.getLayer(MAP_LAYER_SETTINGS.countryOutline.id)) {
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
            }
            
            return true;
          } catch (layerError) {
            console.error('Error adding map layers:', layerError);
            return false;
          }
        };
        
        // Try to add layers, with a retry if it fails
        let layersAdded = addMapLayers();
        
        // Retry after a short delay if adding layers failed
        if (!layersAdded) {
          setTimeout(() => {
            layersAdded = addMapLayers();
            setMapLayersReady(layersAdded);
          }, 1000);
        } else {
          setMapLayersReady(true);
        }
        
        // Set map as ready and continue initial render
        setMap(mapInstance);
        setIsMapReady(true);
        setShowLabel(true);
        
        // Trigger a single repaint to ensure everything is rendered
        mapInstance.triggerRepaint();
        
        continueRender(initialRenderHandle);
      } catch (e) {
        console.error('Error during map setup:', e);
        setHasError(true);
        setIsMapReady(true); // Set ready anyway
        setShowLabel(true);
        continueRender(initialRenderHandle);
      }
    });

    // Handle error event
    mapInstance.on('error', (e) => {
      console.error('Map error:', e.error);
      setHasError(true);
      setIsMapReady(true); // Set ready anyway
      setShowLabel(true); 
      if (loadTimeout) clearTimeout(loadTimeout);
      continueRender(initialRenderHandle);
    });

    return () => {
      if (loadTimeout) clearTimeout(loadTimeout);
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [
    initialRenderHandle, 
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
    
    // If map layers aren't ready but we want to show something anyway
    if (!mapLayersReady && frame > 60) {
      setMapLayersReady(true);
    }

    // Create a new render handle for each frame
    const handle = delayRender(`Rendering frame ${frame}`);
    frameRenderHandleRef.current = handle;
    
    try {
      // Support accessing map via both state and ref
      const mapToUse = map || mapInstanceRef.current;
      
      if (!mapToUse) {
        continueRender(handle);
        return;
      }
      
      // Update the camera with error handling
      try {
        mapToUse.jumpTo({
          center: animatedCenter,
          zoom: animatedZoom,
          bearing: bearing,
          pitch: pitch,
        });
      } catch (cameraError) {
        console.warn('Camera update error:', cameraError);
      }
      
      // Update opacity values with safety checks
      if (mapLayersReady) {
        try {
          if (mapToUse.isStyleLoaded() && mapToUse.getLayer(MAP_LAYER_SETTINGS.countryFill.id)) {
            mapToUse.setPaintProperty(MAP_LAYER_SETTINGS.countryFill.id, 'fill-opacity', fillOpacity);
          }
          
          if (mapToUse.isStyleLoaded() && mapToUse.getLayer(MAP_LAYER_SETTINGS.countryOutline.id)) {
            mapToUse.setPaintProperty(MAP_LAYER_SETTINGS.countryOutline.id, 'line-opacity', lineOpacity);
          }
        } catch (paintError) {
          console.warn('Paint property update error:', paintError);
        }
      }
      
      // Debounce resize to prevent too many calls
      const debouncedResize = debounce(() => {
        try {
          if (mapToUse) mapToUse.resize();
        } catch (resizeError) {
          console.warn('Map resize error:', resizeError);
        }
      }, 100);
      
      debouncedResize();
      
      // Use requestAnimationFrame to wait for browser to render
      // This is more reliable than the map's idle event which might not fire
      requestAnimationFrame(() => {
        if (frameRenderHandleRef.current === handle) {
          continueRender(handle);
        }
      });
    } catch (error) {
      console.error('Error during animation update:', error);
      continueRender(handle);
    }
    
    // Clean up
    return () => {
      if (frameRenderHandleRef.current === handle) {
        continueRender(handle);
        frameRenderHandleRef.current = null;
      }
    };
  }, [
    map, 
    isMapReady, 
    mapLayersReady, 
    frame,
    animatedCenter, 
    animatedZoom, 
    bearing, 
    pitch, 
    fillOpacity, 
    lineOpacity
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
      <CountryLabel 
        countryName={countryData.name}
        delay={totalLabelDelay}
        isVisible={showLabel || hasError}
      />
    </AbsoluteFill>
  );
};

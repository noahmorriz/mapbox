import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { continueRender, delayRender, useCurrentFrame } from 'remotion';
import { MapService } from '../services/MapService';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ProjectionType } from '../core/mapboxTypes';

// Make sure Mapbox token is set
if (!mapboxgl.accessToken) {
  mapboxgl.accessToken = 'pk.eyJ1Ijoibm9haG1vcnJpeiIsImEiOiJjbThoZnZvbTAwMWoyMnNxMGQ1MGRyZ3VqIn0.HtrVBbWJzrviJZJn7vr66g';
}

// Types for map status
type MapStatus = 'uninitialized' | 'initializing' | 'idle' | 'updating_style' | 'error';

// Add a type for render handles
type RenderHandle = {
  handle: number;
  description: string;
  timestamp: number;
};

interface MapContextValue {
  mapService: MapService | null;
  mapInstance: mapboxgl.Map | null;
  mapContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  isMapLoaded: boolean;
  mapLayersReady: boolean;
  mapStatus: MapStatus;
  syncMapState: (mapStyle: string, countryCode: string, projection: ProjectionType) => void;
  isMapError: boolean;
  currentCountry: string | null;
  frameRenderHandleRef: React.MutableRefObject<number | null>;
}

const MapContext = createContext<MapContextValue>({
  mapService: null,
  mapInstance: null,
  mapContainerRef: React.createRef<HTMLDivElement>(),
  isMapLoaded: false,
  mapLayersReady: false,
  mapStatus: 'uninitialized',
  syncMapState: () => {},
  isMapError: false,
  currentCountry: null,
  frameRenderHandleRef: { current: null }
});

interface MapProviderProps {
  children: React.ReactNode;
}

export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapService, setMapService] = useState<MapService | null>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [mapStatus, setMapStatus] = useState<MapStatus>('uninitialized');
  const [currentCountry, setCurrentCountry] = useState<string | null>(null);
  
  // Use a ref for the render handle queue so it doesn't cause rerenders
  const renderHandleQueue = useRef<RenderHandle[]>([]);
  const frameRenderHandleRef = useRef<number | null>(null);
  const currentFrame = useCurrentFrame();
  
  // Refs to track current state needed within callbacks without causing re-renders
  const currentCountryRef = useRef<string | null>(null);
  const currentStyleRef = useRef<string | null>(null);
  const currentProjectionRef = useRef<ProjectionType | null>(null);

  // Derived state for simplicity
  const isMapLoaded = mapStatus === 'idle' || mapStatus === 'updating_style'; 
  const mapLayersReady = isMapLoaded; // Assuming layers ready if map is loaded/idle
  const isMapError = mapStatus === 'error';
  
  // Helper function to create a delayed render handle
  const createDelayedRender = useCallback((description: string): number => {
    const handle = delayRender(description);
    
    // Add to queue
    renderHandleQueue.current.push({
      handle,
      description,
      timestamp: Date.now()
    });
    
    console.log(`Created render handle: ${handle} (${description})`);
    return handle;
  }, []);
  
  // Helper function to continue a render by handle ID
  const continueDelayedRender = useCallback((handle: number): boolean => {
    // Find the handle in the queue
    const index = renderHandleQueue.current.findIndex(h => h.handle === handle);
    
    if (index !== -1) {
      // Remove from queue
      const removed = renderHandleQueue.current.splice(index, 1)[0];
      console.log(`Continuing render handle: ${handle} (${removed.description}), duration: ${Date.now() - removed.timestamp}ms`);
      
      // Continue the render
      continueRender(handle);
      return true;
    }
    
    // Only log a warning if the handle is actual and missing
    // This prevents noise for already continued handles
    if (handle) {
      console.log(`Render handle ${handle} already continued (not in queue)`);
    }
    return false;
  }, []);
  
  // Helper to clean up all render handles
  const cleanupAllRenderHandles = useCallback(() => {
    // Continue all renders in queue
    renderHandleQueue.current.forEach(h => {
      console.log(`Cleaning up render handle: ${h.handle} (${h.description})`);
      continueRender(h.handle);
    });
    
    // Empty queue
    renderHandleQueue.current = [];
  }, []);

  // Effect for cleanup
  useEffect(() => {
    const service = mapService;
    return () => {
      if (service) {
        console.log('MapProvider unmounting: Destroying map service.');
        service.destroy();
      }
      setMapStatus('uninitialized'); // Reset status on unmount
      
      // Clean up any render handles
      cleanupAllRenderHandles();
    };
  }, [mapService, cleanupAllRenderHandles]);
  
  // Add per-frame delay to ensure map has time to render in each headless browser
  useEffect(() => {
    // Create render handle for this frame
    const handle = createDelayedRender(`Rendering map frame ${currentFrame}`);
    
    // Store the current frame's handle for reference
    frameRenderHandleRef.current = handle;
    
    // Create a simple object to track if this handle has been continued
    const continuationState = { continued: false };
    
    // Safe wrapper to continue render only once
    const safelyContinueRender = () => {
      if (!continuationState.continued) {
        continuationState.continued = true;
        continueDelayedRender(handle);
      }
    };
    
    // Define idleHandler in the outer scope so it's accessible to all inner functions
    const idleHandler = () => {
      // Short grace period for final rendering
      setTimeout(() => {
        safelyContinueRender();
      }, 100);
    };
    
    // Check if map has loaded necessary tiles
    const checkMapLoaded = () => {
      // If already continued, don't proceed
      if (continuationState.continued) return;
      
      // If the map isn't loaded yet, just continue rendering immediately
      if (!isMapLoaded || !mapInstance) {
        safelyContinueRender();
        return;
      }
      
      // Event-based synchronization approach
      // If map is already idle (areTilesLoaded), call handler immediately
      if (mapInstance.areTilesLoaded()) {
        idleHandler();
      } else {
        // Otherwise, wait for the idle event
        mapInstance.once('idle', idleHandler);
      }
    };
    
    // Start checking if map is loaded
    const initialDelay = currentFrame < 10 ? 300 : 150;
    const initialDelayId = setTimeout(checkMapLoaded, initialDelay);
    
    // Safety timeout - prevent infinite waiting if the idle event never fires
    const maxTimeout = currentFrame < 10 ? 10000 : 6000;
    const safetyTimeoutId = setTimeout(() => {
      if (!continuationState.continued) {
        console.warn(`Map render safety timeout reached after ${maxTimeout}ms - continuing render regardless`);
        // Remove the idle event listener if it's still there
        if (mapInstance) {
          mapInstance.off('idle', idleHandler);
        }
        safelyContinueRender();
      }
    }, maxTimeout);
    
    // Cleanup function - ensure we continue this frame's render and remove event listeners
    return () => {
      // Clean up timeouts
      clearTimeout(initialDelayId);
      clearTimeout(safetyTimeoutId);
      
      // Remove any idle event listeners if we can
      if (mapInstance) {
        mapInstance.off('idle', idleHandler);
      }
      
      // Continue the render if it's still pending
      if (!continuationState.continued) {
        safelyContinueRender();
      }
    };
  }, [currentFrame, isMapLoaded, mapInstance, createDelayedRender, continueDelayedRender]);

  // The core synchronization logic - simplified to focus on map functionality only
  const syncMapState = useCallback(async (mapStyle: string, countryCode: string, projection: ProjectionType = 'mercator') => {
    // Prevent updates if crucial data is missing
    if (!mapStyle || !countryCode) {
      console.warn('SyncMapState skipped: Missing mapStyle or countryCode.');
      return;
    }

    const newStyleUrl = mapStyle;
    const newProjection = projection;
    
    // --- Check current status and decide action --- 
    switch (mapStatus) {
      case 'initializing':
      case 'updating_style':
        console.log(`SyncMapState skipped: Map is busy (${mapStatus}).`);
        return; // Don't interrupt ongoing operations

      case 'error':
        console.log('SyncMapState skipped: Map is in error state.');
        return; // Don't operate if in error

      case 'uninitialized':
        console.log('SyncMapState: Initializing map...');
        setMapStatus('initializing');
        const initHandle = createDelayedRender('Initializing map...'); // Delay render for init
        
        // Add safety timeout to ensure render continues even if initialization fails
        const safetyTimeout = setTimeout(() => {
          console.warn('Map initialization safety timeout reached. Continuing render regardless.');
          continueDelayedRender(initHandle);
        }, 25000); // 25 second safety timeout
        
        try {
          // Create service instance here if it doesn't exist
          let service = mapService;
          if (!service) {
            service = new MapService('map-container');
            setMapService(service); // Store the new service
          }

          // Initialize map with our new parameters
          const map = await service.initializeMap(mapStyle, countryCode, projection);
          
          // Update state on successful initialization
          setMapInstance(map);
          setCurrentCountry(countryCode);
          currentCountryRef.current = countryCode;
          currentStyleRef.current = newStyleUrl;
          currentProjectionRef.current = newProjection;
          setMapStatus('idle'); 
          console.log('SyncMapState: Initialization complete.');
          
          // Clear safety timeout since initialization completed successfully
          clearTimeout(safetyTimeout);
          
          // Continue render after brief delay to allow for initial rendering
          setTimeout(() => {
            continueDelayedRender(initHandle);
          }, 1000); // Reduced from 3000ms to 1000ms to avoid timeouts
          
        } catch (error) {
          console.error('SyncMapState: Initialization failed:', error);
          setMapStatus('error');
          setMapService(null); // Clean up service if init failed
          
          // Clear safety timeout since we're handling the error now
          clearTimeout(safetyTimeout);
          
          // Ensure render continues regardless of error
          continueDelayedRender(initHandle);
        }
        break;

      case 'idle':
        const styleChanged = newStyleUrl !== currentStyleRef.current;
        const countryChanged = countryCode !== currentCountryRef.current;
        const projectionChanged = newProjection !== currentProjectionRef.current;

        if (!styleChanged && !countryChanged && !projectionChanged) {
          // console.log('SyncMapState: No change detected.'); // Can be noisy
          return; // Nothing to do
        }

        if (styleChanged) {
          console.log(`SyncMapState: Style change detected (to ${newStyleUrl}). Updating style...`);
          setMapStatus('updating_style');
          const styleHandle = createDelayedRender('Updating map style...'); // Delay render for style update
          
          // Add safety timeout for style updates
          const styleUpdateTimeout = setTimeout(() => {
            console.warn('Map style update safety timeout reached. Continuing render regardless.');
            continueDelayedRender(styleHandle);
          }, 25000); // 25 second safety timeout
          
          try {
            if (!mapService) throw new Error('Map service missing during style update');
            
            // Update map style with our new parameters
            await mapService.updateMapStyle(newStyleUrl, countryCode, projection);
            
            // Update refs and state
            setCurrentCountry(countryCode);
            currentCountryRef.current = countryCode;
            currentStyleRef.current = newStyleUrl;
            currentProjectionRef.current = newProjection;
            setMapStatus('idle'); 
            console.log('SyncMapState: Style update complete.');

            // Clear safety timeout since style update completed successfully
            clearTimeout(styleUpdateTimeout);

            // Continue render after brief delay
            setTimeout(() => {
               continueDelayedRender(styleHandle);
            }, 1000); // Reduced from 3000ms to 1000ms to avoid timeouts

          } catch (error) {
            console.error('SyncMapState: Style update failed:', error);
            setMapStatus('error'); // Enter error state
            
            // Clear safety timeout since we're handling the error
            clearTimeout(styleUpdateTimeout);
            
            continueDelayedRender(styleHandle); // Ensure render continues
          }

        } else if (countryChanged || projectionChanged) {
          console.log(`SyncMapState: Country or projection change detected. Updating map...`);
          try {
              if (!mapService) throw new Error('Map service missing during update');
              
              // Update projection if changed
              if (projectionChanged) {
                  console.log(`SyncMapState: Projection change detected (to ${newProjection}). Updating projection...`);
                  mapService.setProjection(newProjection);
                  currentProjectionRef.current = newProjection;
              }

              // Update filter if changed
              if (countryChanged) {
                  console.log(`SyncMapState: Country change detected (to ${countryCode}). Updating filter...`);
                  mapService.updateHighlightFilter(countryCode);
                  setCurrentCountry(countryCode);
                  currentCountryRef.current = countryCode;
              }
              console.log('SyncMapState: Idle update(s) complete.');
          } catch (error) { 
              console.error('SyncMapState: Idle update failed unexpectedly:', error);
              setMapStatus('error');
          }
        }
        break;
        
      default:
         console.warn(`SyncMapState: Unhandled status ${mapStatus}`);
    }
  }, [mapStatus, mapService, createDelayedRender, continueDelayedRender]);

  const value: MapContextValue = {
    mapService,
    mapInstance,
    mapContainerRef,
    isMapLoaded,
    mapLayersReady,
    mapStatus,
    syncMapState,
    isMapError,
    currentCountry,
    frameRenderHandleRef
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
};

// Hook to access the map context
export const useMapContext = () => useContext(MapContext); 
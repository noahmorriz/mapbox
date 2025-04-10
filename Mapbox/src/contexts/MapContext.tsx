import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { continueRender, delayRender } from 'remotion';
import { MapService } from '../services/MapService';
import { AnimationSettings } from '../core/animationModel';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ProjectionType } from '../core/mapboxTypes';

// Make sure Mapbox token is set
if (!mapboxgl.accessToken) {
  mapboxgl.accessToken = 'pk.eyJ1Ijoibm9haG1vcnJpeiIsImEiOiJjbThoZnZvbTAwMWoyMnNxMGQ1MGRyZ3VqIn0.HtrVBbWJzrviJZJn7vr66g';
}

// Types for map status
type MapStatus = 'uninitialized' | 'initializing' | 'idle' | 'updating_style' | 'error';

interface MapContextValue {
  mapService: MapService | null;
  mapInstance: mapboxgl.Map | null;
  mapContainerRef: React.RefObject<HTMLDivElement>;
  isMapLoaded: boolean;
  mapLayersReady: boolean;
  mapStatus: MapStatus;
  syncMapState: (settings: AnimationSettings, countryCode: string) => void;
  isMapError: boolean;
  currentCountry: string | null;
}

const MapContext = createContext<MapContextValue>({
  mapService: null,
  mapInstance: null,
  mapContainerRef: { current: null },
  isMapLoaded: false,
  mapLayersReady: false,
  mapStatus: 'uninitialized',
  syncMapState: () => {},
  isMapError: false,
  currentCountry: null,
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
  // Refs to track current state needed within callbacks without causing re-renders
  const currentCountryRef = useRef<string | null>(null);
  const currentStyleRef = useRef<string | null>(null);
  const currentProjectionRef = useRef<ProjectionType | null>(null);

  // Derived state for simplicity
  const isMapLoaded = mapStatus === 'idle' || mapStatus === 'updating_style'; 
  const mapLayersReady = isMapLoaded; // Assuming layers ready if map is loaded/idle
  const isMapError = mapStatus === 'error';

  // Effect for cleanup
  useEffect(() => {
    const service = mapService;
    return () => {
      if (service) {
        console.log('MapProvider unmounting: Destroying map service.');
        service.destroy();
      }
      setMapStatus('uninitialized'); // Reset status on unmount
    };
  }, [mapService]);

  // The core synchronization logic
  const syncMapState = useCallback(async (settings: AnimationSettings, countryCode: string) => {
    // Prevent updates if crucial data is missing
    if (!settings?.general?.mapStyle || !countryCode) {
      console.warn('SyncMapState skipped: Missing settings or countryCode.');
      return;
    }

    const newStyleUrl = settings.general.mapStyle;
    const newProjection = settings.general.projection || 'mercator';
    
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
        let renderHandle = delayRender('Initializing map...'); // Delay render for init
        try {
          // Create service instance here if it doesn't exist
          let service = mapService;
          if (!service) {
            service = new MapService('map-container');
            setMapService(service); // Store the new service
          }

          const map = await service.initializeMap(settings, countryCode);
          
          // Update state on successful initialization
          setMapInstance(map);
          setCurrentCountry(countryCode);
          currentCountryRef.current = countryCode;
          currentStyleRef.current = newStyleUrl;
          currentProjectionRef.current = newProjection;
          setMapStatus('idle'); 
          console.log('SyncMapState: Initialization complete.');
          
        } catch (error) {
          console.error('SyncMapState: Initialization failed:', error);
          setMapStatus('error');
          setMapService(null); // Clean up service if init failed
        } finally {
          continueRender(renderHandle); // Ensure render continues regardless
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
          let styleRenderHandle = delayRender('Updating map style...'); // Delay render for style update
          try {
            if (!mapService) throw new Error('Map service missing during style update');
            
            await mapService.updateMapStyle(newStyleUrl, settings, countryCode);
            
            // Update refs and state
            setCurrentCountry(countryCode);
            currentCountryRef.current = countryCode;
            currentStyleRef.current = newStyleUrl;
            currentProjectionRef.current = newProjection;
            setMapStatus('idle'); 
            console.log('SyncMapState: Style update complete.');

          } catch (error) {
            console.error('SyncMapState: Style update failed:', error);
            setMapStatus('error'); // Enter error state
          } finally {
             continueRender(styleRenderHandle); // Ensure render continues
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
  // Dependencies: Include mapStatus and mapService to react to their changes.
  // settings and countryCode are passed as arguments, so don't need to be deps here.
  }, [mapStatus, mapService]);

  const value: MapContextValue = {
    mapService,
    mapInstance,
    mapContainerRef,
    isMapLoaded,
    mapLayersReady,
    mapStatus,
    syncMapState, // Expose the new function
    isMapError,
    currentCountry,
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
};

// Hook to access the map context
export const useMapContext = () => useContext(MapContext); 
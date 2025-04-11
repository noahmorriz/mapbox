import React, { useEffect, useState, useRef } from 'react';
import { AbsoluteFill } from 'remotion';
import { useMapContext } from '../contexts/MapContext';
import { useConfigContext } from '../contexts/ConfigContext';
import { useAnimationContext } from '../contexts/AnimationContext';

interface MapProps {
  children?: React.ReactNode;
}

export const Map: React.FC<MapProps> = ({ children }) => {
  const { 
    mapContainerRef, 
    syncMapState,
    mapInstance, 
    mapService,
    isMapLoaded,
    isMapError,
    mapStatus
  } = useMapContext();
  
  const { countryData, settings } = useConfigContext();
  const { animationState } = useAnimationContext();
  const { bearing, pitch, animatedCenter, animatedZoom } = animationState;
  
  const [mapCompError, setMapCompError] = useState<string | null>(null);
  const [mapRenderingStatus, setMapRenderingStatus] = useState<string>("initializing");
  // Add a ref to track if the map container is ready
  const containerReadyRef = useRef<boolean>(false);
  
  useEffect(() => {
    console.log('Map.tsx: Sync effect running.');
    const currentSettings = settings;
    const currentCountryCode = countryData?.alpha3;

    if (!currentSettings || !currentSettings.general?.mapStyle || !currentCountryCode) {
      console.warn('Map.tsx: Sync skipped - Missing settings, style URL, or country code.', 
         { hasSettings: !!currentSettings, hasStyle: !!currentSettings?.general?.mapStyle, hasCode: !!currentCountryCode });
      setMapCompError('Invalid settings or country data provided to Map component.');
      return;
    } else {
       setMapCompError(null);
    }

    // Check if container element exists before syncing map state
    const containerElement = document.getElementById('map-container');
    if (!containerElement) {
      console.warn('Map.tsx: Container element not ready yet, delaying map initialization');
      return;
    }
    
    // Mark container as ready
    containerReadyRef.current = true;

    console.log(`Map.tsx: Calling syncMapState with country ${currentCountryCode} and style ${currentSettings.general.mapStyle}`);
    syncMapState(currentSettings, currentCountryCode);

  }, [settings, countryData?.alpha3, syncMapState]);
  
  // Add effect to check for container element
  useEffect(() => {
    // Check if container is ready periodically if not already
    if (!containerReadyRef.current) {
      const checkContainer = setInterval(() => {
        const containerElement = document.getElementById('map-container');
        if (containerElement) {
          clearInterval(checkContainer);
          containerReadyRef.current = true;
          
          // Trigger map sync when container becomes available
          if (settings && countryData?.alpha3) {
            console.log('Map container found, initializing map');
            syncMapState(settings, countryData.alpha3);
          }
        }
      }, 100);
      
      return () => clearInterval(checkContainer);
    }
  }, [syncMapState, settings, countryData?.alpha3]);
  
  useEffect(() => {
    if (mapService && isMapLoaded) {
      mapService.updateCamera(
        animatedCenter,
        animatedZoom,
        bearing,
        pitch,
        countryData?.alpha3
      );
    }
  }, [mapService, isMapLoaded, animatedCenter, animatedZoom, bearing, pitch, countryData?.alpha3]);
  
  // Monitor map tile loading status
  useEffect(() => {
    // Define functions outside conditionals
    const checkTilesStatus = () => {
      if (!mapInstance) return;
      
      // Check if tiles are loaded
      if (mapInstance.areTilesLoaded()) {
        setMapRenderingStatus("complete");
      } else {
        setMapRenderingStatus("loading tiles");
        
        // Keep checking until tiles are loaded
        setTimeout(checkTilesStatus, 100);
      }
    };
    
    const loadingListener = () => {
      console.log("Map data loading started");
      setMapRenderingStatus("loading tiles");
    };
    
    const loadedListener = () => {
      console.log("Map tiles loaded");
      setMapRenderingStatus("complete");
    };
    
    const errorListener = (e: any) => {
      console.error("Map tile loading error:", e);
      setMapRenderingStatus("error loading tiles");
    };
    
    // Set initial state regardless of conditions
    if (!mapInstance || !isMapLoaded) {
      setMapRenderingStatus("initializing");
      return; // Early return, but after hooks are defined
    }
    
    // Start monitoring tile loading
    setMapRenderingStatus("checking tiles");
    checkTilesStatus();
    
    // Register events - only if we have a map instance
    mapInstance.on('dataloading', loadingListener);
    mapInstance.on('idle', loadedListener); 
    mapInstance.on('error', errorListener);
    
    // Cleanup function is always defined
    return () => {
      // Clean up events
      if (mapInstance) {
        mapInstance.off('dataloading', loadingListener);
        mapInstance.off('idle', loadedListener);
        mapInstance.off('error', errorListener);
      }
    };
  }, [mapInstance, isMapLoaded]);
  
  const bgStyle: React.CSSProperties = {
    backgroundColor: settings?.general?.backgroundColor || '#ffffff',
  };
  
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: '400px',
    position: 'relative'
  };
  
  return (
    <AbsoluteFill style={bgStyle}>
      {isMapError || mapCompError ? (
        <div className="error-message" style={{
          color: 'red',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: 'rgba(255,255,255,0.8)',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000
        }}>
          Error loading map: {mapCompError || 'Map context error'}
        </div>
      ) : !isMapLoaded ? (
        <div className="loading-message" style={{
          color: '#333',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: 'rgba(255,255,255,0.8)',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000
        }}>
          Loading map...
        </div>
      ) : null}
      
      <div 
        ref={mapContainerRef} 
        id="map-container" 
        style={containerStyle}
        data-testid="map-container"
        data-render-status={mapRenderingStatus}
      />
      
      {mapStatus === 'idle' && mapInstance && children}
    </AbsoluteFill>
  );
}; 
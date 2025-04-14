import React, { useEffect, useState, useRef } from 'react';
import { AbsoluteFill } from 'remotion';
import { useMapContext } from '../contexts/MapContext';
import { useConfigContext } from '../contexts/ConfigContext';
import { useAnimationContext } from '../contexts/AnimationContext';
import { THEMES } from '../core/themes';

interface MapProps {
  children?: React.ReactNode;
  mapStyle?: string;
  countryCode?: string;
}

export const Map: React.FC<MapProps> = ({ children, mapStyle, countryCode }) => {
  const { 
    mapContainerRef, 
    syncMapState,
    mapInstance, 
    mapService,
    isMapLoaded,
    isMapError,
  } = useMapContext();
  
  const { countryData, projectionType, mapStyle: contextMapStyle, backgroundColor: contextBgColor, themeType } = useConfigContext();
  const { animationState } = useAnimationContext();
  const { bearing, pitch, animatedCenter, animatedZoom, fillOpacity, lineOpacity } = animationState;
  
  const [mapCompError, setMapCompError] = useState<string | null>(null);
  const [mapRenderingStatus, setMapRenderingStatus] = useState<string>("initializing");
  // Add a ref to track if the map container is ready
  const containerReadyRef = useRef<boolean>(false);
  
  // Use provided props or fall back to context values
  const effectiveCountryCode = countryCode || countryData?.alpha3;
  const effectiveMapStyle = mapStyle || contextMapStyle;
  
  useEffect(() => {
    console.log('Map.tsx: Sync effect running.');

    if (!effectiveMapStyle || !effectiveCountryCode) {
      console.warn('Map.tsx: Sync skipped - Missing style URL or country code.', 
         { hasStyle: !!effectiveMapStyle, hasCode: !!effectiveCountryCode });
      setMapCompError('Invalid map style or country code provided to Map component.');
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

    console.log(`Map.tsx: Calling syncMapState with country ${effectiveCountryCode} and style ${effectiveMapStyle}`);
    syncMapState(effectiveMapStyle, effectiveCountryCode, projectionType);

  }, [effectiveMapStyle, effectiveCountryCode, projectionType, syncMapState]);
  
  useEffect(() => {
    if (mapService && isMapLoaded) {
      mapService.updateCamera(
        animatedCenter,
        animatedZoom,
        bearing,
        pitch,
        effectiveCountryCode
      );
    }
  }, [mapService, isMapLoaded, animatedCenter, animatedZoom, bearing, pitch, effectiveCountryCode]);
  
  // Add Effect to update layer opacity based on animation state
  useEffect(() => {
    if (mapService && isMapLoaded) {
      // Update highlight layer opacities
      mapService.updateLayerOpacity(fillOpacity, lineOpacity);
    }
  }, [mapService, isMapLoaded, fillOpacity, lineOpacity]);
  
  // Apply theme highlight colors when theme changes or map loads
  useEffect(() => {
    if (mapService && isMapLoaded) {
      const themeHighlight = THEMES[themeType]?.highlight;
      if (themeHighlight && themeHighlight.fillColor && themeHighlight.lineColor) {
        console.log(`Map.tsx: Updating highlight colors for theme '${themeType}': fill=${themeHighlight.fillColor}, line=${themeHighlight.lineColor}`);
        mapService.updateHighlightColors(themeHighlight.fillColor, themeHighlight.lineColor);
      } else {
        console.warn(`Map.tsx: Highlight colors not found for theme '${themeType}'`);
      }
    }
  }, [mapService, isMapLoaded, themeType]);
  
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
    
    // Add style loading related handlers
    const styleLoadingListener = () => {
      console.log("Map style loading started");
      setMapRenderingStatus("loading style");
    };
    
    const styleLoadedListener = () => {
      console.log("Map style fully loaded");
      // After style is loaded, check tile loading
      checkTilesStatus();
    };
    
    // Set initial state regardless of conditions
    if (!mapInstance || !isMapLoaded) {
      setMapRenderingStatus("initializing");
      return; // Early return, but after hooks are defined
    }
    
    // Check if style is loaded
    if (mapInstance && !mapInstance.isStyleLoaded()) {
      console.log("Style not fully loaded, waiting for style.load event");
      setMapRenderingStatus("loading style");
    } else {
      // Start monitoring tile loading
      setMapRenderingStatus("checking tiles");
      checkTilesStatus();
    }
    
    // Register events - only if we have a map instance
    mapInstance.on('dataloading', loadingListener);
    mapInstance.on('idle', loadedListener); 
    mapInstance.on('error', errorListener);
    mapInstance.on('styledata', styleLoadingListener);
    mapInstance.on('styleloaded', styleLoadedListener);
    
    // Cleanup function is always defined
    return () => {
      // Clean up events
      if (mapInstance) {
        mapInstance.off('dataloading', loadingListener);
        mapInstance.off('idle', loadedListener);
        mapInstance.off('error', errorListener);
        mapInstance.off('styledata', styleLoadingListener);
        mapInstance.off('styleloaded', styleLoadedListener);
      }
    };
  }, [mapInstance, isMapLoaded]);
  
  // Get background color from context or fallback to white
  const backgroundColor = contextBgColor || '#ffffff';
  
  const bgStyle: React.CSSProperties = {
    backgroundColor,
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
      
      {/* Render children simply when the map instance is loaded */}
      {isMapLoaded && mapInstance && children}
    </AbsoluteFill>
  );
}; 
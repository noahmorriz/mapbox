import React, { useEffect, useState } from 'react';
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

    console.log(`Map.tsx: Calling syncMapState with country ${currentCountryCode} and style ${currentSettings.general.mapStyle}`);
    syncMapState(currentSettings, currentCountryCode);

  }, [settings, countryData?.alpha3, syncMapState]);
  
  useEffect(() => {
    if (mapService && isMapLoaded) {
      mapService.updateCamera(
        animatedCenter,
        animatedZoom,
        bearing,
        pitch
      );
    }
  }, [mapService, isMapLoaded, animatedCenter, animatedZoom, bearing, pitch]);
  
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
      ) : null}
      
      <div 
        ref={mapContainerRef} 
        id="map-container" 
        style={containerStyle}
        data-testid="map-container"
      />
      
      {mapStatus === 'idle' && mapInstance && children}
    </AbsoluteFill>
  );
}; 
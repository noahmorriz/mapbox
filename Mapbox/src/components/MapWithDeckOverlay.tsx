import React from 'react';
import { AbsoluteFill } from 'remotion';
import { useMapContext } from '../contexts/MapContext';
import DeckMarkerOverlay from './DeckMarkerOverlay';
import { CountryLayer } from './CountryLayer';

export const MapWithDeckOverlay: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { mapContainerRef } = useMapContext();

  return (
    <AbsoluteFill>
      {/* Map container, rendered by Mapbox GL */}
      <div
        ref={mapContainerRef}
        id="map-container"
        style={{ width: '100%', height: '100%', position: 'relative' }}
      />
      <CountryLayer />
      {/* Overlay the deck.gl layer */}
      <DeckMarkerOverlay />
      {children}
    </AbsoluteFill>
  );
};

export default MapWithDeckOverlay; 
import React, { useMemo } from 'react';
import { DeckGL } from '@deck.gl/react';
import { ScatterplotLayer, IconLayer } from '@deck.gl/layers';
import { useCurrentFrame, interpolate } from 'remotion';
import { useMapContext } from '../contexts/MapContext';
import { useConfigContext } from '../contexts/ConfigContext';
import { useAnimationContext } from '../contexts/AnimationContext';

interface MarkerData {
  id: string;
  coordinates: [number, number];
  opacity: number;
  scale: number;
  color: [number, number, number, number];
  iconType: string;
}

// SVG definitions for marker icons
const ICON_SVGS: Record<string, string> = {
  'marker': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="384" height="512"><path fill="#FFFFFF" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/></svg>`,
  'pin': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 288 512" width="288" height="512"><path fill="#FFFFFF" d="M112 316.94v156.69l22.02 33.02c4.75 7.12 15.22 7.12 19.97 0L176 473.63V316.94c-10.39 1.92-21.06 3.06-32 3.06s-21.61-1.14-32-3.06zM144 0C64.47 0 0 64.47 0 144s64.47 144 144 144 144-64.47 144-144S223.53 0 144 0zm0 76c-37.5 0-68 30.5-68 68 0 6.62-5.38 12-12 12s-12-5.38-12-12c0-50.73 41.28-92 92-92 6.62 0 12 5.38 12 12s-5.38 12-12 12z"/></svg>`,
  'flag': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><path fill="#FFFFFF" d="M336.174 80c-49.132 0-93.305-32-161.913-32-31.301 0-58.303 6.482-80.721 15.168a48.04 48.04 0 0 0 2.142-20.727C93.067 19.575 74.167 1.594 51.201.104 23.242-1.71 0 20.431 0 48c0 17.764 9.657 33.262 24 41.562V496c0 8.837 7.163 16 16 16h16c8.837 0 16-7.163 16-16v-83.443C109.869 395.28 143.259 384 199.826 384c49.132 0 93.305 32 161.913 32 58.479 0 101.972-22.617 128.548-39.981C503.846 367.161 512 352.051 512 335.855V95.937c0-34.459-35.264-57.768-66.904-44.117C409.193 67.309 371.641 80 336.174 80z"/></svg>`,
  'skull': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><path fill="#FFFFFF" d="M256 0C114.6 0 0 100.3 0 224c0 70.1 36.9 132.6 94.5 173.7 9.6 6.9 15.2 18.1 13.5 29.9l-9.4 66.2c-1.4 9.6 6 18.2 15.7 18.2H192v-56c0-4.4 3.6-8 8-8h16c4.4 0 8 3.6 8 8v56h64v-56c0-4.4 3.6-8 8-8h16c4.4 0 8 3.6 8 8v56h77.7c9.7 0 17.1-8.6 15.7-18.2l-9.4-66.2c-1.7-11.7 3.8-23 13.5-29.9C475.1 356.6 512 294.1 512 224 512 100.3 397.4 0 256 0zm-96 320c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64zm192 0c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z"/></svg>`,
  'star': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="576" height="512"><path fill="#FFFFFF" d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"/></svg>`,
  'info': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><path fill="#FFFFFF" d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z"/></svg>`
};

// Encode SVG to data URL
const svgToDataUrl = (svg: string): string => {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

// Map of icon types to icon URLs
const iconUrls: Record<string, string> = {
  'marker': svgToDataUrl(ICON_SVGS['marker']),
  'pin': svgToDataUrl(ICON_SVGS['pin']),
  'flag': svgToDataUrl(ICON_SVGS['flag']),
  'skull': svgToDataUrl(ICON_SVGS['skull']),
  'star': svgToDataUrl(ICON_SVGS['star']),
  'info': svgToDataUrl(ICON_SVGS['info'])
};

export const DeckMarkerOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { mapInstance, isMapLoaded } = useMapContext();
  const { countryData, settings, iconType } = useConfigContext();
  const { animationState } = useAnimationContext();

  // Get color based on iconType
  const getMarkerColor = (type: string = 'marker'): [number, number, number] => {
    // Map icon types to colors
    const colorMap: Record<string, [number, number, number]> = {
      'marker': [255, 0, 0],     // Red
      'pin': [0, 0, 255],        // Blue
      'flag': [0, 128, 0],       // Green
      'skull': [255, 255, 255],  // White for skull (was dark gray)
      'star': [255, 215, 0],     // Gold
      'info': [0, 191, 255]      // Deep Sky Blue
    };
    
    return colorMap[type] || colorMap['marker'];
  };

  // Animation parameters from settings
  const labelDelayFrames = settings?.general?.labelDelayFrames || 30;
  const labelFadeDuration = settings?.general?.labelFadeDuration || 15;
  
  // Base marker data (if country coordinates exist)
  const baseMarkerData = useMemo<MarkerData[]>(() => {
    if (!countryData?.coordinates) return [];
    
    const markerColor = getMarkerColor(iconType || 'marker');
    
    return [{
      id: 'main-marker',
      coordinates: Array.isArray(countryData.coordinates) 
        ? countryData.coordinates as [number, number]
        : [countryData.coordinates.lng, countryData.coordinates.lat],
      opacity: 0,                    // Initial opacity, will be animated
      scale: 0.8,                    // Initial scale, will be animated
      color: [...markerColor, 255],  // RGBA color
      iconType: iconType || 'marker'
    }];
  }, [countryData, iconType]);

  // Compute animated opacity and scale using Remotion's interpolate
  const animatedMarkerData = useMemo(() => {
    return baseMarkerData.map(marker => {
      // Calculate opacity transition
      const opacity = interpolate(
        frame,
        [labelDelayFrames, labelDelayFrames + labelFadeDuration],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      );
      
      // Calculate scale transition (slight bounce effect)
      const scale = interpolate(
        frame,
        [labelDelayFrames, labelDelayFrames + labelFadeDuration, labelDelayFrames + labelFadeDuration + 5],
        [0.6, 1.1, 1.0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      );
      
      return {
        ...marker,
        opacity,
        scale,
        color: [marker.color[0], marker.color[1], marker.color[2], opacity * 255]
      };
    });
  }, [baseMarkerData, frame, labelDelayFrames, labelFadeDuration]);

  // Get the current view state from Mapbox
  const viewState = useMemo(() => {
    if (!mapInstance) return null;
    
    // Extract the current view parameters from the Mapbox instance
    return {
      longitude: mapInstance.getCenter().lng,
      latitude: mapInstance.getCenter().lat,
      zoom: mapInstance.getZoom(),
      pitch: mapInstance.getPitch(),
      bearing: mapInstance.getBearing(),
    };
  }, [mapInstance, animationState]);

  // Create layers based on marker type
  const layers = useMemo(() => {
    if (!animatedMarkerData.length) return [];
    
    const layers = [];
    
    // Add icon markers for all marker types using IconLayer
    if (animatedMarkerData.length > 0) {
      layers.push(
        new IconLayer({
          id: 'icon-layer',
          data: animatedMarkerData,
          pickable: false,
          getIcon: d => ({
            url: iconUrls[d.iconType] || iconUrls['marker'],
            width: 512,
            height: 512,
            anchorY: 512, // Bottom anchor for markers like MapMarker
            mask: true  // Mask enables transparency
          }),
          getPosition: d => d.coordinates,
          getSize: d => 80 * (d.scale || 1), 
          getColor: d => d.color,
          sizeScale: 1,
          billboard: false, // Align with map instead of viewport
          // Disable transitions for frame-by-frame deterministic rendering
          transitions: {
            getPosition: 0,
            getSize: 0, 
            getColor: 0
          }
        })
      );
    }
    
    return layers;
  }, [animatedMarkerData]);

  // Don't render until map is loaded and we have a valid view state
  if (!isMapLoaded || !viewState || layers.length === 0) {
    return null;
  }

  return (
    <DeckGL
      viewState={viewState}
      layers={layers}
      controller={false} // Let Mapbox handle the map controls
      style={{
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Don't catch pointer events, pass them through to the map
      }}
    />
  );
};

export default DeckMarkerOverlay; 
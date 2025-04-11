import React, { useEffect, useRef, useState } from 'react';
import { AbsoluteFill } from 'remotion';
import { useCurrentFrame } from 'remotion';
import { useMapContext } from '../contexts/MapContext';
import { useConfigContext } from '../contexts/ConfigContext';
import { CountryLayer } from './CountryLayer';
import { ICON_SVGS } from '../core/iconData';

// Use the skull icon from our centralized icon data
const SKULL_SVG = ICON_SVGS['skull'];

// Function to create an image with the desired opacity
const createImageWithOpacity = (svgString: string, opacity: number): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    // Create SVG data URL
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    
    // Load the SVG as an image
    const img = new Image();
    img.onload = () => {
      // Create a canvas to apply opacity
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, 0);
      }
      
      // Convert canvas to image
      const resultImage = new Image();
      resultImage.onload = () => {
        resolve(resultImage);
        URL.revokeObjectURL(resultImage.src);
      };
      resultImage.src = canvas.toDataURL();
      
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
};

export const MapWithDeckOverlay: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { mapContainerRef, mapInstance, isMapLoaded } = useMapContext();
  const { countryData, settings } = useConfigContext();
  const frame = useCurrentFrame();
  
  // Keep track of initialization state
  const [initialized, setInitialized] = useState(false);
  const spritesCreatedRef = useRef(false);
  const layerAddedRef = useRef(false);
  const animationStartedRef = useRef(false);
  const opacityStepRef = useRef(0);
  
  // Strict initialization phase - only run once when map is truly ready
  useEffect(() => {
    // Map must be fully loaded and we must have coordinates
    if (!mapInstance || !isMapLoaded || !countryData?.coordinates || initialized) return;
    
    // Use a timeout to ensure map is really ready
    const initTimer = setTimeout(() => {
      setInitialized(true);
    }, 1000); // 1 second wait to ensure full stability
    
    return () => clearTimeout(initTimer);
  }, [mapInstance, isMapLoaded, countryData, initialized]);
  
  // Phase 1: Create all sprite images
  useEffect(() => {
    if (!initialized || !mapInstance || spritesCreatedRef.current) return;
    
    const createSprites = async () => {
      try {
        // Create 21 opacity variants (0 to 1 in 0.05 increments)
        for (let i = 0; i <= 20; i++) {
          const opacity = i / 20;
          const iconImage = await createImageWithOpacity(SKULL_SVG, opacity);
          
          // First check if the map is still valid before adding image
          if (!mapInstance || !mapInstance.loaded()) {
            console.log('Map destroyed during sprite creation');
            return;
          }
          
          // Add the image safely
          if (!mapInstance.hasImage(`skull-opacity-${i}`)) {
            mapInstance.addImage(`skull-opacity-${i}`, iconImage);
          }
        }
        
        spritesCreatedRef.current = true;
        console.log('All sprite images created successfully');
      } catch (error) {
        console.error('Error creating sprite images:', error);
      }
    };
    
    // Start the sprite creation process
    createSprites();
    
    // Clean up if component unmounts
    return () => {
      spritesCreatedRef.current = false;
    };
  }, [initialized, mapInstance]);
  
  // Phase 2: Add the source and layer once sprites are ready
  useEffect(() => {
    if (!initialized || !mapInstance || !spritesCreatedRef.current || layerAddedRef.current || !countryData?.coordinates) return;
    
    try {
      // Create a GeoJSON source for our marker
      mapInstance.addSource('icon-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: Array.isArray(countryData.coordinates) 
                ? countryData.coordinates 
                : [countryData.coordinates.lng, countryData.coordinates.lat]
            }
          }]
        }
      });
      
      // Add the icon layer using our sprites
      mapInstance.addLayer({
        id: 'icon-layer',
        type: 'symbol',
        source: 'icon-source',
        layout: {
          'icon-image': 'skull-opacity-0', // Start with fully transparent sprite
          'icon-size': 0.15,               // Scale to appropriate size
          'icon-allow-overlap': true,      // Always show regardless of other labels
          'icon-anchor': 'bottom'          // Anchor at bottom of icon
        }
      });
      
      layerAddedRef.current = true;
      console.log('Icon layer added successfully');
    } catch (error) {
      console.error('Error setting up icon layer:', error);
    }
    
    // Clean up the layer and source if component unmounts
    return () => {
      try {
        if (mapInstance && mapInstance.loaded()) {
          if (mapInstance.getLayer('icon-layer')) {
            mapInstance.removeLayer('icon-layer');
          }
          if (mapInstance.getSource('icon-source')) {
            mapInstance.removeSource('icon-source');
          }
        }
      } catch (e) {
        console.log('Cleanup error (expected during unmount):', e);
      }
      layerAddedRef.current = false;
    };
  }, [initialized, mapInstance, spritesCreatedRef.current, countryData]);
  
  // Phase 3: Animate the icon sprite based on current frame
  useEffect(() => {
    // Only start animation once layer is added
    if (!initialized || !mapInstance || !layerAddedRef.current) return;
    
    // Animation parameters from settings
    const labelDelayFrames = settings?.general?.labelDelayFrames || 30;
    const labelFadeDuration = settings?.general?.labelFadeDuration || 15;
    const animationStartFrame = settings?.general?.animationStartFrame || 0;
    
    // Wait until we're past the delay to start animation
    if (frame < animationStartFrame + labelDelayFrames) {
      if (animationStartedRef.current) {
        animationStartedRef.current = false;
      }
      return;
    }
    
    // Calculate opacity step (0-20)
    const progress = (frame - (animationStartFrame + labelDelayFrames)) / labelFadeDuration;
    const newOpacityStep = Math.min(20, Math.floor(progress * 20));
    
    // Only update the layer if the opacity step has changed
    if (newOpacityStep !== opacityStepRef.current) {
      try {
        // Check if map and layer still exist
        if (mapInstance && mapInstance.loaded() && mapInstance.getLayer('icon-layer')) {
          mapInstance.setLayoutProperty(
            'icon-layer',
            'icon-image',
            `skull-opacity-${newOpacityStep}`
          );
          opacityStepRef.current = newOpacityStep;
          if (!animationStartedRef.current) {
            animationStartedRef.current = true;
            console.log('Icon animation started');
          }
        }
      } catch (error) {
        console.error('Error updating icon image:', error);
      }
    }
  }, [frame, mapInstance, initialized, settings]);
  
  // Final cleanup when component unmounts
  useEffect(() => {
    return () => {
      try {
        if (mapInstance && mapInstance.loaded()) {
          // Remove all sprite images
          for (let i = 0; i <= 20; i++) {
            if (mapInstance.hasImage && mapInstance.hasImage(`skull-opacity-${i}`)) {
              mapInstance.removeImage(`skull-opacity-${i}`);
            }
          }
          
          // Remove the layer and source
          if (mapInstance.getLayer('icon-layer')) {
            mapInstance.removeLayer('icon-layer');
          }
          if (mapInstance.getSource('icon-source')) {
            mapInstance.removeSource('icon-source');
          }
        }
      } catch (e) {
        console.log('Final cleanup error:', e);
      }
    };
  }, [mapInstance]);
  
  return (
    <AbsoluteFill>
      {/* Map container, rendered by Mapbox GL */}
      <div
        ref={mapContainerRef}
        id="map-container"
        style={{ width: '100%', height: '100%', position: 'relative' }}
      />
      <CountryLayer />
      {children}
    </AbsoluteFill>
  );
};

export default MapWithDeckOverlay; 
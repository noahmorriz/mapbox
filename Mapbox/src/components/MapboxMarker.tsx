import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../contexts/MapContext';
import { useConfigContext } from '../contexts/ConfigContext';
import { useCurrentFrame } from 'remotion';
import { useAnimationContext } from '../contexts/AnimationContext';
import { getCountryVisualCenter } from '../utils/iconSizeCalculator';
import { ICON_URLS, ICON_SVGS } from '../core/iconData';

interface MapboxMarkerProps {
  // Any additional props can be defined here
}

export const MapboxMarker: React.FC<MapboxMarkerProps> = () => {
  const frame = useCurrentFrame();
  const { mapInstance, isMapLoaded } = useMapContext();
  const { 
    countryCode, 
    iconType, 
    iconCoverage = 50,
    iconScaleFactor = 1.0,
    enableIconDropShadow 
  } = useConfigContext();
  const { timing } = useAnimationContext();

  // State to track marker instance and visibility
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const [markerCreated, setMarkerCreated] = useState(false);
  
  // Animation timing constants
  const animationStartFrame = timing?.animationStartFrame || 10;
  const labelDelayFrames = timing?.labelDelay || 30;
  const labelFadeDuration = timing?.labelFadeDuration || 15;
  
  // Calculate opacity value based on animation progress
  const opacityValue = useMemo(() => {
    // Calculate when the fade-in animation should start and end
    const fadeStartFrame = animationStartFrame + labelDelayFrames;
    const fadeEndFrame = fadeStartFrame + labelFadeDuration;
    
    // If we're before the fade-in starts, return 0 opacity
    if (frame < fadeStartFrame) {
      return 0;
    }
    
    // If we're after fade-in is complete, return full opacity
    if (frame >= fadeEndFrame) {
      return 1;
    }
    
    // During fade-in, calculate the opacity value (0-1)
    const progress = (frame - fadeStartFrame) / (fadeEndFrame - fadeStartFrame);
    return Math.min(1, Math.max(0, progress));
  }, [frame, animationStartFrame, labelDelayFrames, labelFadeDuration]);

  // Create SVG with adjusted opacity
  const getSvgWithOpacity = (iconType: string, opacity: number): string => {
    if (opacity === 0) return '';
    
    // Get the SVG string
    const svgString = ICON_SVGS[iconType] || ICON_SVGS['marker'];
    
    // Insert opacity attribute into the SVG path element
    const opacitySvg = svgString.replace('<path fill="#FFFFFF"', `<path opacity="${opacity.toFixed(2)}" fill="#FFFFFF"`);
    
    // Convert to data URL
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(opacitySvg)}`;
  };

  // Create and manage the marker - only runs once per country/icon change
  useEffect(() => {
    if (!isMapLoaded || !mapInstance || iconType === 'none') return;

    // Get center coordinates for the country
    const visualCenter = getCountryVisualCenter(countryCode);
    if (!visualCenter) {
      console.warn(`Could not determine visual center for ${countryCode}`);
      return;
    }

    // Clean up any existing marker first
    if (markerRef.current) {
      console.log('Removing existing marker before creating a new one');
      markerRef.current.remove();
      markerRef.current = null;
      elRef.current = null;
    }

    // Create marker element
    const container = document.createElement('div');
    container.style.position = 'relative';
    
    const el = document.createElement('div');
    el.className = 'mapbox-marker';
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
    el.style.width = '100%';
    el.style.height = '100%';
    // Initially set to invisible
    el.style.display = 'none';
    
    if (enableIconDropShadow) {
      el.style.filter = 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.5))';
    }
    
    container.appendChild(el);
    elRef.current = container;

    // Create the marker with all options to prevent flicker
    markerRef.current = new mapboxgl.Marker({
      element: container,
      anchor: 'center',
      rotationAlignment: 'map',
      pitchAlignment: 'map',
      offset: [0, 0],
      // Completely disable fade animations
      fadeDuration: 0
    })
    .setLngLat(visualCenter)
    .addTo(mapInstance);
    
    setMarkerCreated(true);
    
    console.log(`Marker created for ${countryCode} with icon ${iconType}`);

    // Clean up function
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
        setMarkerCreated(false);
      }
    };
  }, [isMapLoaded, mapInstance, countryCode, iconType, enableIconDropShadow]);

  // Adjust marker size - run when window or map changes size
  useEffect(() => {
    if (!isMapLoaded || !mapInstance || !markerRef.current || !elRef.current || !markerCreated) return;

    // Function to update marker size
    const updateMarkerSize = () => {
      if (!mapInstance || !elRef.current) return;
      
      try {
        const mapCanvas = mapInstance.getCanvas();
        const mapWidth = mapCanvas.clientWidth;
        const mapHeight = mapCanvas.clientHeight;
        
        // Use smaller dimension for sizing
        const smallerDimension = Math.min(mapWidth, mapHeight);
        
        // Calculate size based on coverage percentage
        const size = Math.max(20, Math.round(smallerDimension * (iconCoverage / 100) * iconScaleFactor));
        
        // Apply the size directly to container
        elRef.current.style.width = `${size}px`;
        elRef.current.style.height = `${size}px`;
      } catch (err) {
        console.error("Error updating marker size:", err);
      }
    };

    // Update size initially
    updateMarkerSize();

    // Listen for zoom changes and resize events
    mapInstance.on('zoom', updateMarkerSize);
    window.addEventListener('resize', updateMarkerSize);

    return () => {
      mapInstance.off('zoom', updateMarkerSize);
      window.removeEventListener('resize', updateMarkerSize);
    };
  }, [isMapLoaded, mapInstance, iconCoverage, iconScaleFactor, markerCreated]);

  // Update image opacity based on current frame
  useEffect(() => {
    if (!elRef.current || !markerCreated) return;
    
    try {
      const iconEl = elRef.current.firstChild as HTMLElement;
      if (!iconEl) return;
      
      // If opacity is effectively 0, hide the element completely
      if (opacityValue <= 0.01) {
        iconEl.style.display = 'none';
        return;
      }
      
      // Show the element
      iconEl.style.display = 'block';
      
      // Create SVG with embedded opacity
      const iconSvgWithOpacity = getSvgWithOpacity(iconType, opacityValue);
      
      // Apply background image with SVG data URL
      iconEl.style.backgroundImage = `url('${iconSvgWithOpacity}')`;
      
    } catch (err) {
      console.error("Error updating icon opacity:", err);
    }
  }, [opacityValue, iconType, markerCreated]);

  // Ensure map has fade duration set to zero
  useEffect(() => {
    if (!mapInstance || !isMapLoaded) return;
    
    // Set all paint properties related to transitions to have duration 0
    try {
      if (mapInstance.getStyle()) {
        const style = mapInstance.getStyle();
        if (style && style.layers) {
          style.layers.forEach(layer => {
            if (mapInstance.getLayer(layer.id)) {
              // Disable all opacity transitions for all layer types
              const paintProps = [
                'icon-opacity-transition',
                'text-opacity-transition',
                'fill-opacity-transition',
                'line-opacity-transition',
                'circle-opacity-transition'
              ];
              
              paintProps.forEach(prop => {
                try {
                  mapInstance.setPaintProperty(layer.id, prop, { duration: 0, delay: 0 });
                } catch (e) {
                  // Ignore errors for properties that don't exist on this layer
                }
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Could not disable map fade animations:', e);
    }
  }, [mapInstance, isMapLoaded]);

  return null; // No DOM output from this component
};

export default MapboxMarker; 
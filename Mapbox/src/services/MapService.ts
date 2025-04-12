import mapboxgl from 'mapbox-gl';
import { Coordinates, ProjectionType } from '../core/mapboxTypes';
import { AnimationSettings } from '../core/animationModel';
import { countries } from '../countryData';

// Constants
const DEFAULT_MAP_CONTAINER = 'map';
const COUNTRY_BOUNDARIES_SOURCE_ID = 'country-boundaries';
const COUNTRY_HIGHLIGHT_FILL_LAYER_ID = 'country-highlight-fill';
const COUNTRY_HIGHLIGHT_LINE_LAYER_ID = 'country-highlight-line';

// Large countries that benefit from bounds-based positioning
const LARGE_COUNTRIES = ['RUS', 'CAN', 'USA', 'CHN', 'BRA', 'AUS', 'IND', 'ARG', 'KAZ', 'DZA', 'COD', 'SAU', 'MEX', 'IDN', 'GRL', 'NOR', 'SWE', 'FIN'];

// Northern countries that need special handling to be fully visible on the map
const NORTHERN_COUNTRIES = ['RUS', 'CAN', 'GRL', 'ISL', 'NOR', 'SWE', 'FIN'];

// Ensure Mapbox token is set
if (!mapboxgl.accessToken) {
  mapboxgl.accessToken = 'pk.eyJ1Ijoibm9haG1vcnJpeiIsImEiOiJjbThoZnZvbTAwMWoyMnNxMGQ1MGRyZ3VqIn0.HtrVBbWJzrviJZJn7vr66g';
}

/**
 * Service that handles Mapbox map initialization and management
 */
export class MapService {
  private map: mapboxgl.Map | null = null;
  private mapContainerId: string;
  private isInitialized: boolean = false;
  private areLayersAdded: boolean = false; // Track if highlight layers are added
  private activeCountry: string | null = null; // Track the active country

  /**
   * Create a new MapService
   * @param containerId The HTML element ID for the map container
   */
  constructor(containerId: string = DEFAULT_MAP_CONTAINER) {
    this.mapContainerId = containerId;
  }
  
  /**
   * Get the container DOM element
   * @returns The HTML element to use as the map container
   */
  private get containerSelector(): HTMLElement | null {
    return document.getElementById(this.mapContainerId);
  }
  
  /**
   * Adds the highlight layers to the map
   * Creates a promise-based wrapper around addHighlightLayersOnce
   * @returns A promise that resolves when the layers are added
   */
  private async addHighlightLayers(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.map || !this.isInitialized) {
        console.error('Cannot add highlight layers: Map not initialized');
        reject(new Error('Map not initialized'));
        return;
      }
      
      try {
        // Get the current theme settings
        // const { THEMES } = require('../core/themes');
        
        // Default settings for highlight layers
        const defaultSettings: AnimationSettings = {
          highlight: {
            fillColor: '#3182CE',
            lineColor: '#2B6CB0',
            lineWidth: 2,
            fillOpacityTarget: 0.6,
            lineOpacityTarget: 1.0,
            labelOpacityTarget: 1.0,
            fillAnimationDamping: 30,
            fillAnimationStiffness: 50,
            fillAnimationMass: 1,
            lineAnimationDamping: 30,
            lineAnimationStiffness: 50,
            lineAnimationMass: 1,
            labelAnimationDamping: 30,
            labelAnimationStiffness: 50,
            labelAnimationMass: 1
          },
          // Add missing required properties to match AnimationSettings interface
          camera: {
            initialRotation: 0,
            finalRotation: 0,
            initialPitch: 0,
            finalPitch: 0,
            rotationDamping: 30,
            rotationStiffness: 50,
            rotationMass: 1,
            pitchDamping: 30,
            pitchStiffness: 50,
            pitchMass: 1
          },
          general: {
            backgroundColor: '#ffffff',
            mapStyle: 'mapbox://styles/mapbox/light-v11'
          },
          ui: {
            iconSize: 50,
            iconColor: '#000000',
            iconScale: 1,
            iconDropShadow: true,
            textFontSize: '16px',
            textColor: '#000000',
            textFontWeight: 'normal',
            infoMaxWidth: '300px',
            infoFontSize: '14px',
            infoBackgroundColor: '#ffffff',
            infoTextColor: '#000000',
            infoBorderRadius: '4px',
            infoPadding: '8px'
          }
        };
        
        // Get active country or use a default
        const activeCountry = this.activeCountry || 'USA';
        
        // Add the layers
        this.addHighlightLayersOnce(defaultSettings, activeCountry);
        resolve();
      } catch (error) {
        console.error('Error adding highlight layers:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Initialize the map with settings and add highlight layers once.
   * @param settings Animation settings with map configuration
   * @param initialCountryCode The initial country code to highlight.
   * @returns A promise that resolves when the map is loaded and layers are added
   */
  public async initializeMap(
    mapStyle: string, 
    initialCountryCode: string,
    projection: string = 'mercator'
  ): Promise<mapboxgl.Map> {
    if (this.isInitialized && this.map) {
      // Reset the map style if it's already initialized
      await this.updateMapStyle(mapStyle, initialCountryCode, projection);
      return this.map;
    }
    
    // Flag to track initialization state
    this.isInitialized = false; 
    
    return new Promise((resolve, reject) => {
      try {
        console.log(`Initializing map with style ${mapStyle} and country ${initialCountryCode}`);
        const container = this.containerSelector;
        if (!container) {
          reject(new Error('No container selector provided'));
          return;
        }
        
        // Get country data
        const countryData = countries[initialCountryCode];
        
        // Default zoom and center in case country data is missing
        let initialZoom = 3.0;
        let initialCenter: [number, number] = [0, 0];
        
        // Set default zoom and padding based on the country data
        if (countryData) {
          initialZoom = countryData.zoomLevel || 3;
        }

        if (countryData) {
          // Set center based on country coordinates
          try {
            const coords = countryData.coordinates;
            if (Array.isArray(coords)) {
              initialCenter = coords as [number, number];
            } else {
              // @ts-ignore - Handle object format if needed
              initialCenter = [coords.lng, coords.lat];
            }
          } catch (e) {
            console.warn('Error setting initial center from country data', e);
          }
        }

        // Add debug option to help diagnose rendering issues
        this.map = new mapboxgl.Map({
          container,
          style: mapStyle || 'mapbox://styles/mapbox/light-v11',
          center: initialCenter,
          zoom: initialZoom,
          projection: projection || 'mercator',
          interactive: false,
          attributionControl: false,
          preserveDrawingBuffer: true,
          // Always enable renderWorldCopies to handle edge countries properly
          renderWorldCopies: true,
          fadeDuration: 0,
          antialias: true,
          localIdeographFontFamily: "'Noto Sans', 'Noto Sans CJK SC', sans-serif"
        });
        
        // Add more detailed error handling for style loading
        this.map.on('error', (error) => {
          console.error('Mapbox error:', error);
          if (error.error && typeof error.error === 'object' && 'status' in error.error && error.error.status === 401) {
            console.error('Authentication error - check your Mapbox access token');
          } else if (error.error && typeof error.error === 'object' && 'status' in error.error && error.error.status === 404) {
            console.error('Style not found - check your style URL', mapStyle);
          } else if (error.error && error.error.toString().includes('Style is not done loading')) {
            console.error('Style loading error - operations attempted before style was fully loaded');
          }
          // Don't reject as this would stop the app
        });
        
        // Listen for styledata event (partial style data loaded)
        this.map.on('styledata', () => {
          // Style data loaded, but not necessarily all layers and sources
          console.log('Map style data loaded.');
          
          // Check if style loaded completely
          const style = this.map?.getStyle();
          console.log('Style loaded:', style ? 'Yes' : 'No');
          console.log('Layers count:', style?.layers?.length || 0);
        });
        
        // Listen for the complete style loaded event
        this.map.on('styleloaded', () => {
          console.log('Map style fully loaded!');
        });
        
        // Wait for both style load and map idle state
        this.map.on('load', () => {
          console.log('Map loaded!');
          console.time('map-initialization');
          
          // Check if the style is fully loaded
          if (!this.isStyleLoaded()) {
            console.warn('Style not fully loaded yet when map load event fired');
            // We still continue as the map.load event should be reliable
          }
          
          // Mark as initialized once the initial style and map are loaded
          this.isInitialized = true;
          
          // Set the active country
          this.activeCountry = initialCountryCode;
          
          // Add layers and filters for the initial country
          this.addHighlightLayers()
            .then(() => {
              // Once layers are ready, set the country filter
              this.updateHighlightFilter(initialCountryCode);
              
              console.log(`Finished map initialization for country ${initialCountryCode}`);
              console.timeEnd('map-initialization');
              resolve(this.map!);
            })
            .catch(error => {
              console.error('Error initializing map layers:', error);
              // Still resolve - we can work without highlight layers
              resolve(this.map!);
            });
        });
      } catch (error) {
        console.error('Error initializing map:', error);
        reject(error);
      }
    });
  }

  /**
   * Position the map optimally for a given country
   * Uses a general approach that works for all countries
   * @param countryCode The country code (alpha3)
   * @returns True if successful, false otherwise
   */
  public positionMapForCountry(countryCode: string): boolean {
    if (!this.map || !this.isInitialized) {
      console.warn('positionMapForCountry called before map is ready.');
      return false;
    }
    
    try {
      const countryData = countries[countryCode];
      if (!countryData) {
        console.warn(`Country data not found for: ${countryCode}`);
        return false;
      }
      
      // Always enable renderWorldCopies for better handling of edge countries
      // This might be necessary if the default view shows multiple world copies
      this.map.setRenderWorldCopies(true); 

      // Always use jumpTo with the specified coordinates and zoom level
      const center = countryData.visualCenter || countryData.coordinates;
      const zoom = countryData.zoomLevel;
      
      console.log(`Positioning map for ${countryCode}: Center=${center}, Zoom=${zoom}`);
      
      this.map.jumpTo({
        center: center,
        zoom: zoom
      });
      
      return true;
      
    } catch (error) {
      console.error('Error positioning map for country:', error);
      return false;
    }
  }

  /**
   * Adds the country boundaries source and the highlight layers if they don't exist.
   * This should only be called once after the map 'load' event.
   * @param settings Animation settings with highlight configuration
   * @param countryCode The country code to use for the initial filter.
   */
  private addHighlightLayersOnce(settings: AnimationSettings, countryCode: string): void {
    if (!this.map || !this.isInitialized || this.areLayersAdded) {
       if (this.areLayersAdded) console.log('Highlight layers already added.');
       else console.error('Cannot add layers: Map not ready or already added.');
       return;
    }
    
    // Explicitly reference the highlight settings from the typed settings object
    const highlight = settings.highlight; 
    
    console.log('Attempting to add source and highlight layers...');
    
    try {
      // --- Determine the ID of the first symbol layer --- 
      let firstSymbolId: string | undefined;
      const style = this.map.getStyle();
      if (style && style.layers) {
          for (const layer of style.layers) {
              if (layer.type === 'symbol') {
                  firstSymbolId = layer.id;
                  break;
              }
          }
      }
      console.log(`Found first symbol layer ID for insertion: ${firstSymbolId}`);
      // -----------------------------------------------------

      // Add country boundaries source if it doesn't exist
      if (!this.map.getSource(COUNTRY_BOUNDARIES_SOURCE_ID)) {
        console.log('Adding country boundaries source');
        this.map.addSource(COUNTRY_BOUNDARIES_SOURCE_ID, {
          type: 'vector',
          url: 'mapbox://mapbox.country-boundaries-v1',
        });
      } else {
         console.log('Country boundaries source already exists.');
      }
      
      // Add fill layer if it doesn't exist
      if (!this.map.getLayer(COUNTRY_HIGHLIGHT_FILL_LAYER_ID)) {
         console.log(`Adding highlight fill layer: ${COUNTRY_HIGHLIGHT_FILL_LAYER_ID}`);
         this.map.addLayer({
           id: COUNTRY_HIGHLIGHT_FILL_LAYER_ID,
           type: 'fill',
           source: COUNTRY_BOUNDARIES_SOURCE_ID,
           'source-layer': 'country_boundaries',
           paint: {
             'fill-color': highlight.fillColor || '#3182CE',
             'fill-opacity': highlight.fillOpacityTarget || 0.6, // Use target opacity instead of starting at 0
           },
           // Use the provided countryCode for the initial filter
           filter: ['==', 'iso_3166_1_alpha_3', countryCode || ''], 
         },
         firstSymbolId // Pass ID of layer to insert before, if found
         );
      } else {
         console.log(`Highlight fill layer ${COUNTRY_HIGHLIGHT_FILL_LAYER_ID} already exists.`);
      }
      
      // Add outline layer if it doesn't exist
      if (!this.map.getLayer(COUNTRY_HIGHLIGHT_LINE_LAYER_ID)) {
         console.log(`Adding highlight line layer: ${COUNTRY_HIGHLIGHT_LINE_LAYER_ID}`);
         this.map.addLayer({
           id: COUNTRY_HIGHLIGHT_LINE_LAYER_ID,
           type: 'line',
           source: COUNTRY_BOUNDARIES_SOURCE_ID,
           'source-layer': 'country_boundaries',
           paint: {
             'line-color': highlight.lineColor || '#2B6CB0',
             // Access lineWidth safely, providing default if undefined
             'line-width': highlight.lineWidth ?? 2, 
             'line-opacity': highlight.lineOpacityTarget || 1.0, // Use target opacity instead of starting at 0
           },
           // Use the provided countryCode for the initial filter
           filter: ['==', 'iso_3166_1_alpha_3', countryCode || ''],
         },
         firstSymbolId // Pass ID of layer to insert before, if found
         );
      } else {
         console.log(`Highlight line layer ${COUNTRY_HIGHLIGHT_LINE_LAYER_ID} already exists.`);
      }

      this.areLayersAdded = true; // Mark layers as added
      console.log('Highlight layers added successfully.');

    } catch (error) {
      console.error('Error adding highlight layers:', error);
      this.areLayersAdded = false; // Ensure flag is false if error occurs
      throw error; // Re-throw error to be caught by the caller
    }
  }

  /**
   * Updates the filter on the highlight layers to show the specified country.
   * @param countryCode The 3-letter ISO country code (e.g., 'USA', 'NLD')
   */
  public updateHighlightFilter(countryCode: string): void {
    if (!this.map || !this.isInitialized || !this.areLayersAdded) {
      console.error('Cannot update filter: Map not ready or layers not added.');
      return;
    }

    const filter = ['==', 'iso_3166_1_alpha_3', countryCode];
    console.log(`Updating highlight filter for country: ${countryCode}`);

    try {
      if (this.map.getLayer(COUNTRY_HIGHLIGHT_FILL_LAYER_ID)) {
         this.map.setFilter(COUNTRY_HIGHLIGHT_FILL_LAYER_ID, filter);
      } else {
         console.warn(`Layer ${COUNTRY_HIGHLIGHT_FILL_LAYER_ID} not found for filtering.`);
      }

      if (this.map.getLayer(COUNTRY_HIGHLIGHT_LINE_LAYER_ID)) {
         this.map.setFilter(COUNTRY_HIGHLIGHT_LINE_LAYER_ID, filter);
      } else {
         console.warn(`Layer ${COUNTRY_HIGHLIGHT_LINE_LAYER_ID} not found for filtering.`);
      }
      
      // Remove the redundant call to positionMapForCountry during initialization/filter update
      // The initial position is set by the map constructor.
      // Subsequent positioning happens via updateCamera or explicit calls when country changes.
      // this.positionMapForCountry(countryCode);
      
      console.log(`Filter updated successfully for ${countryCode}`);
    } catch (error) {
      console.error(`Error setting filter for ${countryCode}:`, error);
    }
  }

  /**
   * Update the map camera position
   * @param center The map center coordinates
   * @param zoom The zoom level
   * @param bearing The bearing (rotation)
   * @param pitch The pitch (tilt)
   * @param countryCode Optional country code to use for auto bounds fitting
   */
  public updateCamera(
    center: Coordinates,
    zoom: number,
    bearing: number,
    pitch: number,
    countryCode?: string
  ): void {
    if (!this.map || !this.isInitialized) {
      // console.warn('UpdateCamera called before map is ready.'); // Too noisy
      return;
    }
    
    try {
      // For large countries, northern countries or countries at the edge, use special positioning
      if (countryCode) {
        const countryData = countries[countryCode];
        if (countryData) {
          const [lng] = countryData.coordinates;
          const isEdgeCountry = lng > 160 || lng < -160;
          const isLargeCountry = LARGE_COUNTRIES.includes(countryCode);
          const isNorthernCountry = NORTHERN_COUNTRIES.includes(countryCode);
          
          if (isEdgeCountry || isLargeCountry || isNorthernCountry) {
            // Enable renderWorldCopies for all edge countries
            this.map.setRenderWorldCopies(true);
            
            // Check if we've already positioned this country correctly
            const currentCenter = this.map.getCenter();
            const currentZoom = this.map.getZoom();
            
            // Only reposition if we haven't done so already
            // This prevents constant resizing during animation
            const hasCorrectPosition = Math.abs(currentCenter.lng - lng) < 20 && 
                                       Math.abs(currentZoom - countryData.zoomLevel) < 1;
            
            if (!hasCorrectPosition && this.positionMapForCountry(countryCode)) {
              // Apply just rotation and pitch, not center/zoom
              this.map.jumpTo({
                bearing,
                pitch,
              });
              return;
            }
          }
        }
      }
      
      // Standard positioning using direct center/zoom values
      this.map.jumpTo({
        center,
        zoom,
        bearing,
        pitch,
      });
    } catch (error) {
      console.error('Error updating camera:', error);
    }
  }
  
  /**
   * Update the layer opacities (used for animation)
   * @param fillOpacity Fill opacity value (0-1)
   * @param lineOpacity Line opacity value (0-1)
   */
  public updateLayerOpacity(fillOpacity: number, lineOpacity: number): void {
    if (!this.map || !this.isInitialized || !this.areLayersAdded) {
       // console.warn('UpdateLayerOpacity called before map/layers are ready.'); // Too noisy
       return;
    }
    
    try {
      // Use the constant layer IDs now
      if (this.map.getLayer(COUNTRY_HIGHLIGHT_FILL_LAYER_ID)) {
        this.map.setPaintProperty(
          COUNTRY_HIGHLIGHT_FILL_LAYER_ID,
          'fill-opacity',
          fillOpacity
        );
      }
      
      if (this.map.getLayer(COUNTRY_HIGHLIGHT_LINE_LAYER_ID)) {
        this.map.setPaintProperty(
          COUNTRY_HIGHLIGHT_LINE_LAYER_ID,
          'line-opacity',
          lineOpacity
        );
      }
    } catch (error) {
      console.error('Error updating layer opacity:', error);
    }
  }
  
  /**
   * Update the highlight colors
   * @param fillColor Fill color value (hex or rgba)
   * @param lineColor Line color value (hex or rgba)
   */
  public updateHighlightColors(fillColor: string, lineColor: string): void {
    if (!this.map || !this.isInitialized || !this.areLayersAdded) {
      console.warn('UpdateHighlightColors called before map/layers are ready.');
      return;
    }
    
    try {
      if (this.map.getLayer(COUNTRY_HIGHLIGHT_FILL_LAYER_ID)) {
        this.map.setPaintProperty(
          COUNTRY_HIGHLIGHT_FILL_LAYER_ID,
          'fill-color',
          fillColor
        );
        // Get current fill opacity for better logging
        const currentFillOpacity = this.map.getPaintProperty(
          COUNTRY_HIGHLIGHT_FILL_LAYER_ID,
          'fill-opacity'
        );
        console.log(`Current fill-opacity: ${currentFillOpacity}`);
      }
      
      if (this.map.getLayer(COUNTRY_HIGHLIGHT_LINE_LAYER_ID)) {
        this.map.setPaintProperty(
          COUNTRY_HIGHLIGHT_LINE_LAYER_ID,
          'line-color',
          lineColor
        );
        // Get current line opacity for better logging
        const currentLineOpacity = this.map.getPaintProperty(
          COUNTRY_HIGHLIGHT_LINE_LAYER_ID,
          'line-opacity'
        );
        console.log(`Current line-opacity: ${currentLineOpacity}`);
      }
      
      console.log(`Updated highlight colors: fill=${fillColor}, line=${lineColor}`);
      
      // Force a render to ensure changes take effect
      this.map.triggerRepaint();
    } catch (error) {
      console.error('Error updating highlight colors:', error);
    }
  }
  
  /**
   * Clean up and remove the map instance
   */
  public destroy(): void {
    try {
      if (this.map) {
        this.map.remove();
        this.map = null;
        this.isInitialized = false;
        this.areLayersAdded = false; // Reset layer flag on destroy
        console.log('Map instance destroyed');
      }
    } catch (error) {
      console.error('Error destroying map:', error);
    }
  }
  
  /**
   * Get the map instance
   * @returns The mapboxgl.Map instance or null if not initialized
   */
  public getMap(): mapboxgl.Map | null {
    return this.map;
  }
  
  // Removed getLayerInfo as layer IDs are now constant and managed internally

  /**
   * Updates the map's base style and re-adds necessary layers/filters.
   * @param newStyleUrl The URL of the new Mapbox style.
   * @param countryCode Optional country code for re-applying filter (if not provided, uses activeCountry)
   * @param projection Optional projection to apply (defaults to 'mercator')
   */
  public async updateMapStyle(
    newStyleUrl: string, 
    countryCode?: string,
    projection: string = 'mercator'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.map || !this.isInitialized) {
        console.error('Cannot update map style: Map not initialized');
        reject(new Error('Map not initialized'));
        return;
      }
      
      try {
        console.log(`Updating map style to: ${newStyleUrl}`);
        console.time('style-update');
        
        // Store current view state before changing style
        const currentCenter = this.map.getCenter();
        const currentZoom = this.map.getZoom();
        const currentBearing = this.map.getBearing();
        const currentPitch = this.map.getPitch();
        
        // Set timeout for style loading
        const styleLoadTimeout = setTimeout(() => {
          console.warn('Style load timeout, resolving anyway');
          this.setupAfterStyleUpdate(currentCenter, currentZoom, currentBearing, currentPitch, countryCode);
          resolve();
        }, 5000); // 5 second timeout
        
        // Reset internal layer tracking
        this.areLayersAdded = false;
        
        // Listen for style load
        this.map.once('styleloaded', () => {
          clearTimeout(styleLoadTimeout);
          console.log('Map style fully loaded, applying view state');
          this.setupAfterStyleUpdate(currentCenter, currentZoom, currentBearing, currentPitch, countryCode);
          resolve();
        });
        
        // Fallback on styledata if styleloaded doesn't fire
        this.map.once('styledata', () => {
          console.log('Style data received, scheduling final check');
          // Give a little time for style to complete loading
          setTimeout(() => {
            if (this.isStyleLoaded()) {
              console.log('Style confirmed to be loaded via isStyleLoaded');
              clearTimeout(styleLoadTimeout);
              this.setupAfterStyleUpdate(currentCenter, currentZoom, currentBearing, currentPitch, countryCode);
              resolve();
            } else {
              console.log('Style not fully loaded after styledata, waiting for styleloaded event or timeout');
            }
          }, 500);
        });
        
        // Set the new style
        this.map.setStyle(newStyleUrl);
      } catch (error) {
        console.error('Error updating map style:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Setup map after style update completes
   * @param center Map center
   * @param zoom Map zoom
   * @param bearing Map bearing
   * @param pitch Map pitch
   * @param countryCode Country code
   */
  private setupAfterStyleUpdate(
    center: mapboxgl.LngLat,
    zoom: number,
    bearing: number,
    pitch: number,
    countryCode?: string
  ): void {
    if (!this.map) return;
    
    // Restore view state
    this.map.jumpTo({
      center,
      zoom,
      bearing,
      pitch
    });
    
    console.log('Map style updated, recreating layers...');
    
    // Use provided countryCode or fall back to activeCountry
    const effectiveCountryCode = countryCode || this.activeCountry || 'USA';
    
    // Re-create the highlight layers for the new style
    this.addHighlightLayers()
      .then(() => {
        // Update the country highlight for the current country
        this.updateHighlightFilter(effectiveCountryCode);
        console.log('Style update complete');
        console.timeEnd('style-update');
      })
      .catch(error => {
        console.error('Error creating highlight layers:', error);
        // Still continue since we can work without highlight
        console.timeEnd('style-update');
      });
  }

  /**
   * Check if the map style is fully loaded
   * @returns true if the style is loaded, false otherwise
   */
  public isStyleLoaded(): boolean {
    if (!this.map) {
      return false;
    }
    
    try {
      return this.map.isStyleLoaded();
    } catch (error) {
      console.error('Error checking if style is loaded:', error);
      return false;
    }
  }

  /**
   * Updates the map's projection.
   * @param projectionName The name of the projection ('mercator' or 'globe')
   */
  public setProjection(projectionName: ProjectionType): void {
    if (!this.map || !this.isInitialized) {
      console.error('Cannot set projection: Map not initialized.');
      return;
    }

    // Basic check to avoid unnecessary calls if projection is already set
    const currentProjection = this.map.getProjection();
    if (currentProjection && currentProjection.name === projectionName) {
        console.log(`Projection is already set to ${projectionName}.`);
        return;
    }

    console.log(`Setting map projection to: ${projectionName}`);
    try {
      this.map.setProjection(projectionName);
    } catch (error) {
      console.error(`Error setting projection to ${projectionName}:`, error);
    }
  }
} 
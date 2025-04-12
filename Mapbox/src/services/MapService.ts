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
        // Default settings for highlight layers
        const defaultSettings = {
          highlight: {
            fillColor: '#3182CE',
            lineColor: '#2B6CB0',
            lineWidth: 2,
            fillOpacity: 0.4,
            lineOpacity: 0.8
          }
        } as AnimationSettings;
        
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

        this.map = new mapboxgl.Map({
          container,
          style: mapStyle || 'mapbox://styles/noahmorriz/cm97zlzie00gf01qlaitpaodq',
          center: initialCenter,
          zoom: initialZoom,
          projection: projection || 'mercator',
          interactive: false,
          attributionControl: false,
          preserveDrawingBuffer: true,
          // Always enable renderWorldCopies to handle edge countries properly
          renderWorldCopies: true,
          fadeDuration: 0,
          antialias: true
        });
        
        this.map.on('error', (error) => {
          console.error('Mapbox error:', error);
          // We might want to reject the promise here if the error is critical
          // For now, just log it. Rejection might stop the app.
          // reject(new Error(`Map initialization error: ${error.error?.message || 'Unknown map error'}`));
        });
        
        this.map.on('styledata', () => {
          // Style data loaded, but not necessarily all layers and sources
          console.log('Map style data loaded.');
        });
        
        // Wait for both style load and map idle state
        this.map.on('load', () => {
          console.log('Map loaded!');
          console.time('map-initialization');
          
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
             'fill-opacity': 0, // Start with zero opacity
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
             'line-opacity': 0, // Start with zero opacity
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
   * @param settings Current animation settings (needed for re-adding layers).
   * @param currentCountryCode The country currently highlighted (needed for re-applying filter).
   */
  public async updateMapStyle(
    newStyleUrl: string, 
    countryCode: string,
    projection: string = 'mercator'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.map || !this.isInitialized) {
        console.error('Cannot update style: Map not initialized');
        reject(new Error('Map not initialized'));
        return;
      }
      
      try {
        console.log(`Updating map style to: ${newStyleUrl}`);
        
        // Store the current view state
        const currentCenter = this.map.getCenter();
        const currentZoom = this.map.getZoom();
        const currentBearing = this.map.getBearing();
        const currentPitch = this.map.getPitch();
        
        // Reset areLayersAdded flag since we're changing style
        this.areLayersAdded = false;
          
        // Set the new projection first
        this.map.setProjection(projection as any);
        
        // Set the new style
        this.map.setStyle(newStyleUrl);
        
        // Listen for style load
        this.map.once('styledata', () => {
          // Restore view state after style is loaded
          this.map!.jumpTo({
            center: currentCenter,
            zoom: currentZoom,
            bearing: currentBearing,
            pitch: currentPitch
          });
          
          console.log('Map style updated, recreating layers...');
          
          // Re-create the highlight layers for the new style
          this.addHighlightLayers()
            .then(() => {
              // Update the country highlight for the current country
              this.updateHighlightFilter(countryCode);
              console.log('Style update complete');
              resolve();
            })
            .catch(error => {
              console.error('Error creating highlight layers:', error);
              // Still resolve since we can work without highlight
              resolve();
            });
        });
      } catch (error) {
        console.error('Error updating map style:', error);
        reject(error);
      }
    });
  }

  /**
   * Applies a simplified map style by hiding unnecessary labels and POIs
   * @param styleUrl The URL of the style to apply and simplify
   * @param settings Current animation settings
   * @param currentCountryCode The country currently highlighted
   * @param simplificationMode The level of simplification to apply ('minimal' or 'labelsOnly')
   */
  private async applySimplifiedStyle(
    styleUrl: string, 
    settings: AnimationSettings, 
    currentCountryCode: string,
    simplificationMode: 'minimal' | 'labelsOnly' = 'minimal'
  ): Promise<void> {
    if (!this.map) return Promise.reject('Map not initialized');
    
    console.log(`Applying simplified style using post-load removal for ${styleUrl}...`);
    this.areLayersAdded = false; // Reset flag
    
    const map = this.map; // Store reference
    
    return new Promise((resolve, reject) => {
      const onError = (error: any) => {
        console.error('Error loading style before simplification:', error);
        map.off('error', onError);
        reject(error);
      };
      
      map.once('error', onError);
      
      map.once('style.load', () => {
        map.off('error', onError); // Remove error listener on successful load
        console.log(`Base style loaded (${styleUrl}), now simplifying by hiding layers...`);
        
        try {
          // Get the current style *after* it has loaded
          const style = map.getStyle();
          
          // Debug: Log available layers to help identify persistent labels
          this.debugLogAvailableLayers(style);
          
          if (style && style.layers) {
            // Identify layers to remove: Symbol layers with text-field OR layers with common label IDs
            const layersToRemove = style.layers.filter((layer: any) => {
              const layerId = layer.id || '';
              // Check 1: Is it a symbol layer rendering text?
              const isSymbolWithText = layer.type === 'symbol' && 
                                     layer.layout && 
                                     layer.layout['text-field'];
              
              // Check 2: Does the ID match common label patterns?
              const idIncludesLabel = 
                layerId.includes('-label') || // General suffix
                layerId.includes('country') || // Country names
                layerId.includes('state') ||   // State names
                layerId.includes('settlement') || // Cities, towns
                layerId.includes('place') || // Place names
                layerId.includes('poi') || // Points of interest
                layerId.includes('natural') || // Natural features (mountains, etc.)
                layerId.includes('water') || // Water bodies (lakes, rivers)
                layerId.includes('marine') || // Marine features (seas, oceans)
                layerId.includes('ocean') || // Explicitly ocean
                layerId.includes('road'); // Road names/numbers
                
              // Remove if either check is true, but *preserve* our highlight layers
              const shouldRemove = (isSymbolWithText || idIncludesLabel) && 
                                 layerId !== COUNTRY_HIGHLIGHT_FILL_LAYER_ID && 
                                 layerId !== COUNTRY_HIGHLIGHT_LINE_LAYER_ID;

              if (shouldRemove) {
                 // console.log(`Flagging layer for removal: ${layerId}`); // Optional detailed log
              } else if (layerId === COUNTRY_HIGHLIGHT_FILL_LAYER_ID || layerId === COUNTRY_HIGHLIGHT_LINE_LAYER_ID) {
                 console.log(`Explicitly preserving highlight layer: ${layerId}`);
              }
              
              return shouldRemove;
            });

            console.log(`Identified ${layersToRemove.length} layers to remove based on type/text-field or ID patterns.`);

            layersToRemove.forEach((layer: any) => {
              const layerId = layer.id;
              try {
                 // Check if the layer still exists before attempting removal
                 if (map.getLayer(layerId)) { 
                    console.log(`Removing layer: ${layerId} (Type: ${layer.type})`);
                    map.removeLayer(layerId);
                 } else {
                     // console.log(`Layer ${layerId} already removed or not found.`);
                 }
              } catch (e) {
                // Ignore removal errors (might happen if removing one layer implicitly removes another)
                console.warn(`Failed to remove layer ${layerId}. This might be expected if it was already removed implicitly.`, e);
              }
            });
            
            console.log('Finished attempting to remove text label layers.');
          } else {
             console.warn('Style or style.layers not found after load.');
          }
          
          // Re-add our highlight layers AFTER removing others
          this.addHighlightLayersOnce(settings, currentCountryCode);
          
          if (this.areLayersAdded) {
            console.log('Simplified style applied (post-load removal) and highlight layers re-added.');
            
            // Position the map for the current country
            this.positionMapForCountry(currentCountryCode);
            
            resolve();
          } else {
             // Check if layers are present anyway, maybe addHighlightLayersOnce detected them
             if (map.getLayer(COUNTRY_HIGHLIGHT_FILL_LAYER_ID) && map.getLayer(COUNTRY_HIGHLIGHT_LINE_LAYER_ID)) {
                console.log('Highlight layers confirmed present after simplification.');
                this.areLayersAdded = true; // Correct the flag
                resolve();
             } else {
                console.error('Failed to re-add layers after simplifying style (post-load removal).');
                reject('Failed to re-add layers after simplifying style (post-load removal).');
             }
          }
        } catch (error) {
          console.error('Error simplifying style (post-load removal):', error);
          reject(error);
        }
      });
      
      // Set the base style URL - simplification happens in 'style.load'
      console.log(`Setting style URL: ${styleUrl}`);
      map.setStyle(styleUrl);
    });
  }

  /**
   * Helper method to log all available layers in a style
   * Useful for debugging and understanding which layers to remove/hide
   */
  private debugLogAvailableLayers(style: any): void {
    if (style && style.layers) {
      console.log('Available layers in map style:');
      
      // Group layers by type for better analysis
      const layersByType: Record<string, string[]> = {};
      
      style.layers.forEach((layer: any) => {
        const type = layer.type || 'unknown';
        if (!layersByType[type]) {
          layersByType[type] = [];
        }
        layersByType[type].push(layer.id);
        
        console.log(`- ${layer.id} (${layer.type})`);
      });
      
      // Log summary of layer types
      console.log('\nLayer type summary:');
      for (const [type, layers] of Object.entries(layersByType)) {
        console.log(`${type}: ${layers.length} layers`);
      }
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
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

  /**
   * Create a new MapService
   * @param containerId The HTML element ID for the map container
   */
  constructor(containerId: string = DEFAULT_MAP_CONTAINER) {
    this.mapContainerId = containerId;
  }
  
  /**
   * Initialize the map with settings and add highlight layers once.
   * @param settings Animation settings with map configuration
   * @param initialCountryCode The initial country code to highlight.
   * @returns A promise that resolves when the map is loaded and layers are added
   */
  public async initializeMap(settings: AnimationSettings, initialCountryCode: string): Promise<mapboxgl.Map> {
    if (this.isInitialized && this.map) {
      console.log('Map already initialized.');
      // If layers are already added, just return the map
      if (this.areLayersAdded) {
         return this.map;
      }
      // Otherwise, proceed to add layers (e.g., if init was called before but layers failed)
    }
    
    const { general } = settings;
    
    return new Promise((resolve, reject) => {
      try {
        // If map instance doesn't exist, create it
        if (!this.map) {
          console.log('Creating Mapbox map instance...');
          // Force Mapbox token to be set again just in case
          if (!mapboxgl.accessToken) {
            console.warn('Mapbox token not set, setting now');
            mapboxgl.accessToken = 'pk.eyJ1Ijoibm9haG1vcnJpeiIsImEiOiJjbThoZnZvbTAwMWoyMnNxMGQ1MGRyZ3VqIn0.HtrVBbWJzrviJZJn7vr66g';
          }
          
          let container = document.getElementById(this.mapContainerId);
          if (!container) {
            container = document.querySelector(`#${this.mapContainerId}`) as HTMLElement;
          }
          if (!container) {
            throw new Error(`Map container with ID ${this.mapContainerId} not found`);
          }
          
          const rect = container.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            console.warn('Container has zero dimensions, setting explicit size');
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.minHeight = '400px';
          }

          // Find country data before creating map
          const countryData = countries[initialCountryCode];
          const initialZoom = countryData ? countryData.zoomLevel : 1;
          
          // Use a simple default center if country data is not available
          let initialCenter: [number, number] = [0, 0];
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
            style: general.mapStyle || 'mapbox://styles/noahmorriz/cm97zlzie00gf01qlaitpaodq',
            center: initialCenter,
            zoom: initialZoom,
            projection: general.projection || 'mercator',
            interactive: false,
            attributionControl: false,
            preserveDrawingBuffer: true,
            // Always enable renderWorldCopies to handle edge countries properly
            renderWorldCopies: true,
            fadeDuration: general.fadeDuration || 0,
            antialias: true
          });
          
          this.map.on('error', (error) => {
             console.error('Mapbox error:', error);
             // We might want to reject the promise here if the error is critical
             // For now, just log it. Rejection might stop the app.
             // reject(new Error(`Map initialization error: ${error.error?.message || 'Unknown map error'}`));
          });
        }

        // Use 'load' event for initial setup, 'idle' might be better for subsequent operations
        this.map.once('load', () => {
          console.log('Map loaded. Initializing source and layers.');
          this.isInitialized = true; 
          
          // Add source and layers
          try {
            // Pass initial country code to set the filter immediately
            this.addHighlightLayersOnce(settings, initialCountryCode); 
            console.log('Map initialized and layers added successfully.');
            
            // Map is already positioned correctly during initialization, 
            // no need to reposition it here
            
            resolve(this.map!); 
          } catch (layerError) {
            console.error('Error adding highlight layers:', layerError);
            reject(layerError); // Reject if layers fail to add
          }
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
      this.map.setRenderWorldCopies(true);
      
      // For large countries, northern countries, or countries with precise bounds, compute a bounding box
      if (LARGE_COUNTRIES.includes(countryCode) || NORTHERN_COUNTRIES.includes(countryCode)) {
        // Create a generous bounding box around the center point
        const [lng, lat] = countryData.coordinates;
        
        // Larger offset for northern countries to ensure they're fully visible
        const isNorthern = NORTHERN_COUNTRIES.includes(countryCode);
        const baseOffset = countryData.zoomLevel < 5 ? 30 : 15; // Larger offset for larger countries
        const offset = isNorthern ? Math.max(baseOffset, 40) : baseOffset; // Even larger for northern countries
        
        // For extreme northern countries, add extra padding to ensure visibility
        const northPadding = isNorthern ? 150 : 50;
        const otherPadding = 50;
        
        // Calculate bounds with offset adjusted based on longitude
        // This helps countries near the date line by shifting the bounding box
        const westOffset = lng > 160 || lng < -160 ? 40 : offset;
        const eastOffset = lng > 160 || lng < -160 ? 40 : offset;
        
        // For northern countries, extend the bounding box more to the south
        const northOffset = isNorthern ? offset * 0.5 : offset;
        const southOffset = isNorthern ? offset * 1.5 : offset;
        
        const bounds = new mapboxgl.LngLatBounds(
          [lng - westOffset, lat - southOffset],
          [lng + eastOffset, lat + northOffset]
        );
        
        // Fit bounds with appropriate padding
        this.map.fitBounds(bounds, {
          padding: {
            top: northPadding,    // More padding at the top for northern countries
            bottom: otherPadding,
            left: otherPadding,
            right: otherPadding
          },
          duration: 0,
          maxZoom: isNorthern ? 3 : 6 // Lower max zoom for northern countries
        });
        
        // For countries very close to the date line, ensure proper centering
        if (lng > 160 || lng < -160) {
          // Allow a brief moment for the fitBounds to take effect
          setTimeout(() => {
            // For countries very close to the edge, adjust center to ensure visibility
            const center = this.map!.getCenter();
            
            // Adjust longitude based on where the country is
            let adjustedLng = center.lng;
            if (lng > 160) adjustedLng -= 10; // Shift west for far east countries
            if (lng < -160) adjustedLng += 10; // Shift east for far west countries
            
            this.map!.setCenter([adjustedLng, center.lat]);
          }, 50);
        }
        
        return true;
      } else {
        // For normal countries, just center and zoom
        this.map.jumpTo({
          center: countryData.coordinates,
          zoom: countryData.zoomLevel
        });
        return true;
      }
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
      
      // Position the map for the current country
      this.positionMapForCountry(countryCode);
      
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
  public async updateMapStyle(newStyleUrl: string, settings: AnimationSettings, currentCountryCode: string): Promise<void> {
    if (!this.map || !this.isInitialized) {
      console.error('Cannot update style: Map not initialized.');
      return Promise.reject('Map not initialized');
    }
    if (this.map?.getStyle()?.sprite === newStyleUrl) { 
        console.log(`Style ${newStyleUrl} is already set.`);
        return Promise.resolve();
    }

    console.log(`Updating map style to: ${newStyleUrl}`);

    // Get simplification mode from settings
    const simplificationMode = settings.general.mapSimplificationMode || 'minimal';
    
    // Skip simplification only if mode is explicitly set to 'none'
    if (simplificationMode === 'none') {
      console.log('Map simplification disabled, using original style');
      // Proceed with standard style update
    } else {
      // Apply simplification for all styles by default
      return this.applySimplifiedStyle(newStyleUrl, settings, currentCountryCode, simplificationMode);
    }

    // Reset the layer added flag as setStyle removes them
    // We set it to false temporarily; addHighlightLayersOnce will set it back to true.
    this.areLayersAdded = false; 

    return new Promise((resolve, reject) => {
      // Handle potential errors during style loading itself
      const onError = (error: any) => {
         console.error('Error loading new map style:', error);
         this.map?.off('error', onError); // Clean up listener
         reject(error);
      };
      this.map?.once('error', onError);

      // Listen for the style.load event *once*
      this.map?.once('style.load', () => {
        this.map?.off('error', onError); // Clean up error listener on success
        console.log('New map style loaded.');
        try {
          // Re-add the source and layers using the existing private method,
          // passing the current country code to set the filter correctly.
          this.addHighlightLayersOnce(settings, currentCountryCode); 

          // No longer need a separate updateHighlightFilter call here.
          if (this.areLayersAdded) {
             console.log(`Source, layers re-added with filter for ${currentCountryCode} after style change.`);
             
             // Position the map for the current country
             this.positionMapForCountry(currentCountryCode);
             
             resolve(); // Resolve the promise successfully
          } else {
             console.error('Failed to re-add layers after style change.');
             reject('Failed to re-add layers after style change.');
          }

        } catch (error) {
          console.error('Error re-adding layers/filter after style change:', error);
          reject(error); // Reject the promise if re-adding fails
        }
      });

      // Initiate the style change
      this.map?.setStyle(newStyleUrl);
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
import mapboxgl from 'mapbox-gl';

/**
 * Global service to manage Mapbox GL JS map instances.
 * Prevents duplicate instances, ensures proper cleanup, and handles instance tracking.
 */
export class MapInstanceManager {
  // Map of container IDs to map instances
  private static instances: Map<string, mapboxgl.Map> = new Map();
  
  // Map of container IDs to pending initialization promises
  private static pendingInitializations: Map<string, Promise<mapboxgl.Map>> = new Map();
  
  /**
   * Register a new map instance for the given container ID.
   * Cleans up any existing instance first.
   * 
   * @param containerId The container ID
   * @param map The map instance
   */
  static registerInstance(containerId: string, map: mapboxgl.Map): void {
    // Clean up existing instance if any
    this.cleanupInstance(containerId);
    
    // Register the new instance
    this.instances.set(containerId, map);
    console.log(`MapInstanceManager: Registered map instance for container "${containerId}"`);
  }
  
  /**
   * Clean up an existing map instance for the given container ID.
   * 
   * @param containerId The container ID
   */
  static cleanupInstance(containerId: string): void {
    // Check if we have an instance for this container
    const existing = this.instances.get(containerId);
    if (existing) {
      console.log(`MapInstanceManager: Cleaning up existing map instance for "${containerId}"`);
      
      try {
        // Remove event listeners and cleanup resources
        existing.remove();
      } catch (error) {
        console.error(`MapInstanceManager: Error removing map instance for "${containerId}":`, error);
      }
      
      // Remove from our instances map
      this.instances.delete(containerId);
    }
    
    // Also clean up any pending initializations
    if (this.pendingInitializations.has(containerId)) {
      console.log(`MapInstanceManager: Removing pending initialization for "${containerId}"`);
      this.pendingInitializations.delete(containerId);
    }
  }
  
  /**
   * Check if we have an instance for the given container ID.
   * 
   * @param containerId The container ID
   * @returns True if we have an instance, false otherwise
   */
  static hasInstance(containerId: string): boolean {
    return this.instances.has(containerId);
  }
  
  /**
   * Get the map instance for the given container ID.
   * 
   * @param containerId The container ID
   * @returns The map instance or null if not found
   */
  static getInstance(containerId: string): mapboxgl.Map | null {
    return this.instances.get(containerId) || null;
  }
  
  /**
   * Register a pending initialization for the given container ID.
   * 
   * @param containerId The container ID
   * @param initPromise The initialization promise
   */
  static registerPendingInitialization(containerId: string, initPromise: Promise<mapboxgl.Map>): void {
    this.pendingInitializations.set(containerId, initPromise);
    console.log(`MapInstanceManager: Registered pending initialization for "${containerId}"`);
    
    // Auto-cleanup the pending initialization when it completes or fails
    initPromise
      .then((map) => {
        // Only remove if this is still the current pending initialization
        if (this.pendingInitializations.get(containerId) === initPromise) {
          this.pendingInitializations.delete(containerId);
          console.log(`MapInstanceManager: Pending initialization for "${containerId}" completed successfully`);
        }
        return map;
      })
      .catch((error) => {
        // Only remove if this is still the current pending initialization
        if (this.pendingInitializations.get(containerId) === initPromise) {
          this.pendingInitializations.delete(containerId);
          console.log(`MapInstanceManager: Pending initialization for "${containerId}" failed:`, error);
        }
        throw error;
      });
  }
  
  /**
   * Check if we have a pending initialization for the given container ID.
   * 
   * @param containerId The container ID
   * @returns True if we have a pending initialization, false otherwise
   */
  static hasPendingInitialization(containerId: string): boolean {
    return this.pendingInitializations.has(containerId);
  }
  
  /**
   * Get the pending initialization for the given container ID.
   * 
   * @param containerId The container ID
   * @returns The pending initialization promise or null if not found
   */
  static getPendingInitialization(containerId: string): Promise<mapboxgl.Map> | null {
    return this.pendingInitializations.get(containerId) || null;
  }
  
  /**
   * Clean up all map instances.
   * Useful for global cleanup on app shutdown.
   */
  static cleanupAllInstances(): void {
    console.log(`MapInstanceManager: Cleaning up all map instances (${this.instances.size} total)`);
    
    // Clean up each instance
    for (const containerId of this.instances.keys()) {
      this.cleanupInstance(containerId);
    }
    
    // Clear both maps to be sure
    this.instances.clear();
    this.pendingInitializations.clear();
  }
} 
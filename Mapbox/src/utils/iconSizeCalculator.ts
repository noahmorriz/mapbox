/**
 * Icon Size Calculator
 * 
 * Provides utilities to calculate the appropriate icon size based on
 * the country's bounding box and the desired icon coverage percentage.
 */

import countryBoundingBoxes from '../boundingbox.json';

interface CountryBoundingBox {
  country: string;
  iso_code: string;
  bbox: {
    minx: number;
    miny: number;
    maxx: number;
    maxy: number;
    width: number;
    height: number;
  };
  visual_center: {
    longitude: number;
    latitude: number;
  };
}

// Special case overrides for countries with distant territories
// These are manually tuned alternative bounding boxes for the mainland/core territory
const SPECIAL_COUNTRY_OVERRIDES: Record<string, {
  bbox: { minx: number; miny: number; maxx: number; maxy: number; width: number; height: number; },
  visual_center?: { longitude: number; latitude: number; }
}> = {
  // USA - Mainland only (excluding Alaska, Hawaii)
  "USA": {
    bbox: {
      minx: -124.7,  // West coast
      miny: 24.5,    // Southern Florida
      maxx: -66.9,   // East coast
      maxy: 49.0,    // Northern border
      width: 57.8,
      height: 24.5
    },
    visual_center: {
      longitude: -96.8,
      latitude: 39.5
    }
  },
  // Russia - Main territory in Europe/Asia (excluding eastern islands)
  "RUS": {
    bbox: {
      minx: 27.3,
      miny: 41.2,
      maxx: 147.0,  // Reduce eastern extent
      maxy: 77.7,
      width: 119.7,
      height: 36.5
    }
  },
  // Other examples: France (exclude territories), Indonesia, Philippines could be added here
};

/**
 * Gets the visual center coordinates for a country from the bounding box data
 * 
 * @param countryCode The ISO code of the country
 * @returns Coordinates [longitude, latitude] of the visual center, or null if not found
 */
export const getCountryVisualCenter = (
  countryCode: string
): [number, number] | null => {
  // Check for special case countries first
  if (SPECIAL_COUNTRY_OVERRIDES[countryCode]?.visual_center) {
    const override = SPECIAL_COUNTRY_OVERRIDES[countryCode];
    return [override.visual_center!.longitude, override.visual_center!.latitude];
  }
  
  const country = (countryBoundingBoxes as CountryBoundingBox[]).find(
    c => c.iso_code.toLowerCase() === countryCode.toLowerCase()
  );
  
  if (country && country.visual_center) {
    return [country.visual_center.longitude, country.visual_center.latitude];
  }
  
  return null;
};

/**
 * Determines if a country is "wide" (has a large aspect ratio or unusually large size)
 * These countries might need special handling for icon sizing
 */
const isWideCountry = (
  countryCode: string,
  bbox: { width: number; height: number; } | null
): boolean => {
  if (!bbox) return false;
  
  // Countries we know have disconnected territories that create an artificially large bbox
  const knownWideCountries = ["USA", "RUS", "FRA", "IDN", "PHL", "CAN"];
  
  if (knownWideCountries.includes(countryCode)) {
    return true;
  }
  
  // Also check if the aspect ratio is extreme
  const aspectRatio = bbox.width / bbox.height;
  return aspectRatio > 2.5 || aspectRatio < 0.4 || (bbox.width > 40 && bbox.height > 30);
};

/**
 * Calculates the icon size based on the country's bounding box and the desired coverage
 * 
 * This is meant to be used within MapboxAnimation after the map is rendered and
 * we can convert the geographic bounds to pixel dimensions.
 * 
 * @param mapInstance The Mapbox GL map instance
 * @param countryBounds The country's geographic bounds
 * @param iconCoverage The desired coverage percentage (1-95)
 * @param countryCode The ISO code of the country (for special cases)
 * @param iconScaleFactor Additional scaling factor (default: 1.0)
 * @returns The icon size in pixels or a scale factor
 */
export const calculateIconSize = (
  mapInstance: any,
  countryBounds: { minx: number; miny: number; maxx: number; maxy: number; width?: number; height?: number; } | null,
  iconCoverage: number = 75,
  countryCode: string = "",
  iconScaleFactor: number = 1.0
): number => {
  // Default size if we can't calculate
  if (!mapInstance || !countryBounds || !iconCoverage) {
    console.log('Early return from calculateIconSize: missing required parameters', {
      hasMapInstance: !!mapInstance,
      hasCountryBounds: !!countryBounds,
      iconCoverage
    });
    return 50;
  }
  
  try {
    // Log input parameters for debugging
    console.log('calculateIconSize inputs:', {
      countryCode,
      iconCoverage,
      iconScaleFactor,
      boundsWidth: countryBounds.width,
      boundsHeight: countryBounds.height
    });
    
    // First, handle special cases for countries with non-contiguous territories
    const specialOverride = countryCode && SPECIAL_COUNTRY_OVERRIDES[countryCode];
    const boundsToUse = specialOverride ? specialOverride.bbox : countryBounds;
    
    // For wide countries or countries with distant territories, we might want to:
    // 1. Use a different calculation method
    // 2. Apply an adjustment factor to the result
    const isWide = isWideCountry(countryCode, boundsToUse);
    
    // Convert the geographic bounds to pixel coordinates
    const northeast = mapInstance.project([boundsToUse.maxx, boundsToUse.maxy]);
    const southwest = mapInstance.project([boundsToUse.minx, boundsToUse.miny]);
    
    // Calculate the rendered width and height in pixels
    const renderedWidth = Math.abs(northeast.x - southwest.x);
    const renderedHeight = Math.abs(northeast.y - southwest.y);
    
    console.log('Rendered dimensions:', {
      renderedWidth,
      renderedHeight,
      isWide,
      usingSpecialOverride: !!specialOverride
    });
    
    // For wide countries, we can use special logic:
    // - For USA-type countries: use a scaling based on visual center radius
    // - For countries with extreme aspect ratios: adjust the calculation
    let smallerDimension = Math.min(renderedWidth, renderedHeight);
    let adjustmentFactor = 1.0;
    
    if (isWide) {
      // For very wide countries, the smaller dimension may not be representative
      // Use a more balanced approach
      if (renderedWidth > renderedHeight * 2) {
        // If width is more than twice the height, use a weighted average
        smallerDimension = (renderedHeight * 0.8) + (renderedWidth * 0.2);
        adjustmentFactor = 0.8; // Further reduce the result
      } else if (renderedHeight > renderedWidth * 2) {
        // If height is more than twice the width, use a weighted average
        smallerDimension = (renderedWidth * 0.8) + (renderedHeight * 0.2);
        adjustmentFactor = 0.8; // Further reduce the result
      }
      
      // Special case for USA
      if (countryCode === "USA") {
        adjustmentFactor = 0.65; // Reduce size specifically for USA
      }
      
      // Special case for Russia
      if (countryCode === "RUS") {
        adjustmentFactor = 0.6; // Reduce size specifically for Russia
      }
    }
    
    console.log('Size calculation factors:', {
      smallerDimension,
      adjustmentFactor,
      iconCoveragePercent: iconCoverage / 100,
      iconScaleFactor
    });
    
    // Apply the coverage percentage, adjustment factor, and any additional scale factor
    const targetSize = smallerDimension * (iconCoverage / 100) * adjustmentFactor * iconScaleFactor;
    
    console.log(`Final icon size calculation for ${countryCode}:`, {
      smallerDimension,
      coverageFactor: iconCoverage / 100,
      adjustmentFactor,
      iconScaleFactor,
      targetSize,
      finalSize: Math.max(targetSize, 20)
    });
    
    // Return the target size, with a minimum size to ensure visibility
    return Math.max(targetSize, 20);
  } catch (error) {
    console.error('Error calculating icon size:', error);
    return 50; // Fallback size
  }
};

/**
 * Finds the country's bounding box from the data file or overrides
 * 
 * @param countryCode The ISO code of the country
 * @returns The bounding box object or null if not found
 */
export const getCountryBounds = (
  countryCode: string
): { minx: number; miny: number; maxx: number; maxy: number; width: number; height: number } | null => {
  // Check for special case overrides first
  if (SPECIAL_COUNTRY_OVERRIDES[countryCode]) {
    return SPECIAL_COUNTRY_OVERRIDES[countryCode].bbox;
  }
  
  const country = (countryBoundingBoxes as CountryBoundingBox[]).find(
    c => c.iso_code.toLowerCase() === countryCode.toLowerCase()
  );
  
  return country ? country.bbox : null;
}; 
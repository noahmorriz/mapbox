/**
 * Icon Size Calculator
 * 
 * Provides utilities to calculate the appropriate icon size based on
 * the country's bounding box and the desired icon coverage percentage.
 */

// Change JSON import to use require() since TypeScript is not configured with resolveJsonModule
// @ts-ignore
const countryBoundingBoxes = require('../boundingbox.json');

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
    },
    visual_center: {
      longitude: 94.3,
      latitude: 61.5
    }
  },
  // France - Mainland only (excluding overseas territories)
  "FRA": {
    bbox: {
      minx: -4.8,
      miny: 42.3,
      maxx: 8.2,
      maxy: 51.1,
      width: 13.0,
      height: 8.8
    },
    visual_center: {
      longitude: 2.2,
      latitude: 46.6
    }
  },
  // Indonesia - Main islands only
  "IDN": {
    bbox: {
      minx: 95.0,
      miny: -11.0,
      maxx: 141.0,
      maxy: 6.0,
      width: 46.0,
      height: 17.0
    },
    visual_center: {
      longitude: 117.0,
      latitude: -2.0
    }
  },
  // Philippines - Main archipelago
  "PHL": {
    bbox: {
      minx: 117.0,
      miny: 5.0,
      maxx: 126.5,
      maxy: 19.0,
      width: 9.5,
      height: 14.0
    },
    visual_center: {
      longitude: 122.5,
      latitude: 12.0
    }
  },
  // United Kingdom - Main island only
  "GBR": {
    bbox: {
      minx: -8.0,
      miny: 49.9,
      maxx: 1.8,
      maxy: 58.7,
      width: 9.8,
      height: 8.8
    },
    visual_center: {
      longitude: -2.5,
      latitude: 54.0
    }
  },
  // Canada - Main territory (excluding northern islands)
  "CAN": {
    bbox: {
      minx: -141.0,
      miny: 42.0,
      maxx: -52.6,
      maxy: 70.0,
      width: 88.4,
      height: 28.0
    },
    visual_center: {
      longitude: -96.0,
      latitude: 56.0
    }
  },
  // Japan - Main islands
  "JPN": {
    bbox: {
      minx: 129.5,
      miny: 31.0,
      maxx: 145.8,
      maxy: 45.5,
      width: 16.3,
      height: 14.5
    },
    visual_center: {
      longitude: 138.0,
      latitude: 36.0
    }
  },
  // Australia - Mainland only
  "AUS": {
    bbox: {
      minx: 113.0,
      miny: -43.6,
      maxx: 153.6,
      maxy: -10.5,
      width: 40.6,
      height: 33.1
    },
    visual_center: {
      longitude: 134.0,
      latitude: -25.0
    }
  },
  // New Zealand - Both main islands
  "NZL": {
    bbox: {
      minx: 166.3,
      miny: -47.3,
      maxx: 178.6,
      maxy: -34.0,
      width: 12.3,
      height: 13.3
    },
    visual_center: {
      longitude: 172.5,
      latitude: -41.0
    }
  },
  // Spain - Mainland only (excluding Canary Islands)
  "ESP": {
    bbox: {
      minx: -9.3,
      miny: 36.0,
      maxx: 3.3,
      maxy: 43.8,
      width: 12.6,
      height: 7.8
    },
    visual_center: {
      longitude: -3.7,
      latitude: 40.0
    }
  },
  // Portugal - Mainland only
  "PRT": {
    bbox: {
      minx: -9.5,
      miny: 37.0,
      maxx: -6.2,
      maxy: 42.1,
      width: 3.3,
      height: 5.1
    }
  },
  // Greece - Mainland and close islands
  "GRC": {
    bbox: {
      minx: 19.4,
      miny: 35.0,
      maxx: 28.3,
      maxy: 41.8,
      width: 8.9,
      height: 6.8
    }
  },
  // Norway - Mainland only
  "NOR": {
    bbox: {
      minx: 4.5,
      miny: 58.0,
      maxx: 31.0,
      maxy: 71.2,
      width: 26.5,
      height: 13.2
    }
  },
  // Denmark - Mainland only (excluding Greenland)
  "DNK": {
    bbox: {
      minx: 8.0,
      miny: 54.5,
      maxx: 15.2,
      maxy: 57.8,
      width: 7.2,
      height: 3.3
    }
  },
  // Chile - Mainland only (excluding Easter Island)
  "CHL": {
    bbox: {
      minx: -75.0,
      miny: -55.0,
      maxx: -66.0,
      maxy: -17.5,
      width: 9.0,
      height: 37.5
    },
    visual_center: {
      longitude: -70.5,
      latitude: -35.0
    }
  },
  // Italy - Including Sicily and Sardinia
  "ITA": {
    bbox: {
      minx: 6.6,
      miny: 36.6,
      maxx: 18.5,
      maxy: 47.1,
      width: 11.9,
      height: 10.5
    },
    visual_center: {
      longitude: 12.5,
      latitude: 42.5
    }
  },
  // Malaysia - Peninsular and East Malaysia
  "MYS": {
    bbox: {
      minx: 100.0,
      miny: 0.8,
      maxx: 119.3,
      maxy: 7.4,
      width: 19.3,
      height: 6.6
    }
  },
  // Brazil - Large country with distinct shape
  "BRA": {
    bbox: {
      minx: -73.9,
      miny: -33.8,
      maxx: -34.8,
      maxy: 5.3,
      width: 39.1,
      height: 39.1
    },
    visual_center: {
      longitude: -53.0,
      latitude: -14.0
    }
  },
  // China - Large country with distinct shape
  "CHN": {
    bbox: {
      minx: 73.5,
      miny: 18.1,
      maxx: 134.8,
      maxy: 53.6,
      width: 61.3,
      height: 35.5
    },
    visual_center: {
      longitude: 104.0,
      latitude: 35.0
    }
  },
  // India - Large country with distinct shape
  "IND": {
    bbox: {
      minx: 68.1,
      miny: 6.7,
      maxx: 97.4,
      maxy: 35.5,
      width: 29.3,
      height: 28.8
    },
    visual_center: {
      longitude: 82.0,
      latitude: 22.0
    }
  }
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
    const isWide = isWideCountry(countryCode, boundsToUse as { width: number; height: number });
    
    // Convert the geographic bounds to pixel coordinates
    const northeast = mapInstance.project([boundsToUse.maxx, boundsToUse.maxy]);
    const southwest = mapInstance.project([boundsToUse.minx, boundsToUse.miny]);
    
    // Calculate the rendered width and height in pixels
    const renderedWidth = Math.abs(northeast.x - southwest.x);
    const renderedHeight = Math.abs(northeast.y - southwest.y);
    
    // Ensure boundsToUse has width and height properties if they're undefined
    if (boundsToUse.width === undefined) {
      boundsToUse.width = boundsToUse.maxx - boundsToUse.minx;
    }
    if (boundsToUse.height === undefined) {
      boundsToUse.height = boundsToUse.maxy - boundsToUse.miny;
    }
    
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
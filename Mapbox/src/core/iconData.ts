/**
 * Icon SVG data for map markers and overlays
 * This file centralizes all SVG icon definitions for use throughout the application
 */

// SVG definitions for marker icons
export const ICON_SVGS: Record<string, string> = {
  'marker': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="384" height="512"><path fill="#FFFFFF" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/></svg>`,
  'pin': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 288 512" width="288" height="512"><path fill="#FFFFFF" d="M112 316.94v156.69l22.02 33.02c4.75 7.12 15.22 7.12 19.97 0L176 473.63V316.94c-10.39 1.92-21.06 3.06-32 3.06s-21.61-1.14-32-3.06zM144 0C64.47 0 0 64.47 0 144s64.47 144 144 144 144-64.47 144-144S223.53 0 144 0zm0 76c-37.5 0-68 30.5-68 68 0 6.62-5.38 12-12 12s-12-5.38-12-12c0-50.73 41.28-92 92-92 6.62 0 12 5.38 12 12s-5.38 12-12 12z"/></svg>`,
  'flag': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><path fill="#FFFFFF" d="M336.174 80c-49.132 0-93.305-32-161.913-32-31.301 0-58.303 6.482-80.721 15.168a48.04 48.04 0 0 0 2.142-20.727C93.067 19.575 74.167 1.594 51.201.104 23.242-1.71 0 20.431 0 48c0 17.764 9.657 33.262 24 41.562V496c0 8.837 7.163 16 16 16h16c8.837 0 16-7.163 16-16v-83.443C109.869 395.28 143.259 384 199.826 384c49.132 0 93.305 32 161.913 32 58.479 0 101.972-22.617 128.548-39.981C503.846 367.161 512 352.051 512 335.855V95.937c0-34.459-35.264-57.768-66.904-44.117C409.193 67.309 371.641 80 336.174 80z"/></svg>`,
  'skull': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><path fill="#FFFFFF" d="M256 0C114.6 0 0 100.3 0 224c0 70.1 36.9 132.6 94.5 173.7 9.6 6.9 15.2 18.1 13.5 29.9l-9.4 66.2c-1.4 9.6 6 18.2 15.7 18.2H192v-56c0-4.4 3.6-8 8-8h16c4.4 0 8 3.6 8 8v56h64v-56c0-4.4 3.6-8 8-8h16c4.4 0 8 3.6 8 8v56h77.7c9.7 0 17.1-8.6 15.7-18.2l-9.4-66.2c-1.7-11.7 3.8-23 13.5-29.9C475.1 356.6 512 294.1 512 224 512 100.3 397.4 0 256 0zm-96 320c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64zm192 0c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z"/></svg>`,
  'star': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="576" height="512"><path fill="#FFFFFF" d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"/></svg>`,
  'info': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><path fill="#FFFFFF" d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z"/></svg>`
};

/**
 * Map of standard icon colors by type
 */
export const ICON_COLORS: Record<string, [number, number, number]> = {
  'marker': [255, 0, 0],      // Red
  'pin': [0, 0, 255],         // Blue
  'flag': [0, 128, 0],        // Green
  'skull': [255, 255, 255],   // White
  'star': [255, 215, 0],      // Gold
  'info': [0, 191, 255]       // Deep Sky Blue
};

/**
 * Converts SVG to a data URL for use in image sources
 * @param svg SVG string to convert
 * @returns Data URL string
 */
export const svgToDataUrl = (svg: string): string => {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * Helper to get the color for a specific icon type
 * @param type Icon type identifier
 * @returns RGB color tuple
 */
export const getIconColor = (type: string = 'marker'): [number, number, number] => {
  // Use the theme color instead of hardcoded colors
  // This will be replaced in DeckMarkerOverlay with the current theme's color
  return ICON_COLORS[type] || ICON_COLORS['marker'];
};

/**
 * Precomputed data URLs for all icons
 */
export const ICON_URLS: Record<string, string> = Object.keys(ICON_SVGS).reduce(
  (urls, key) => ({
    ...urls,
    [key]: svgToDataUrl(ICON_SVGS[key])
  }), 
  {}
); 
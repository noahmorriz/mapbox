import React from 'react';
import { IconType } from '../core/mapboxTypes';
// Added react-icons imports
import { FaFlag, FaMapMarkerAlt, FaSkull, FaMapPin, FaLocationArrow, FaCompass, FaArrowUp, FaMapMarked, FaInfoCircle, FaExclamationTriangle, FaTimes, FaStar, FaCrosshairs } from 'react-icons/fa'; // Using Font Awesome

interface IconProps {
  type: IconType;
  size?: number | string; // Changed size to number | string for react-icons
  color?: string;
  // Removed dropShadow prop
  className?: string; // Keep className for potential custom styling
}

/**
 * Renders an icon based on the specified type using react-icons.
 */
export const Icon: React.FC<IconProps> = ({ type, size = 24, color, className }) => {
  const commonProps = { size, color, className }; // Props passed to react-icons component

  // Determine which icon component to render based on the type prop
  switch (type) {
    case 'flag':
      return <FaFlag {...commonProps} aria-label="flag" />;
    case 'marker':
      return <FaMapMarkerAlt {...commonProps} aria-label="marker" />;
    case 'pin':
      return <FaMapPin {...commonProps} aria-label="pin" />;
    case 'marker-alt': // Assuming marker-alt is similar to marker
      return <FaMapMarkerAlt {...commonProps} aria-label="marker-alt" />;
    case 'location':
      return <FaLocationArrow {...commonProps} aria-label="location" />;
    case 'location-fill': // Assuming location-fill is similar to location
      return <FaLocationArrow {...commonProps} aria-label="location-fill" />;
    case 'compass':
      return <FaCompass {...commonProps} aria-label="compass" />;
    case 'arrow':
      return <FaArrowUp {...commonProps} aria-label="arrow" />;
    case 'gps':
      // FaGpsFixed might be a suitable replacement, adjust if needed
      return <FaMapMarked {...commonProps} aria-label="gps" />; 
    case 'info':
      return <FaInfoCircle {...commonProps} aria-label="info" />;
    case 'warning':
      return <FaExclamationTriangle {...commonProps} aria-label="warning" />;
    case 'cross':
      return <FaTimes {...commonProps} aria-label="cross" />;
    case 'star':
      return <FaStar {...commonProps} aria-label="star" />;
    case 'skull':
    case 'death-skull': // Map both to FaSkull
      return <FaSkull {...commonProps} aria-label="skull" />;
    case 'target':
      return <FaCrosshairs {...commonProps} aria-label="target" />;
    case 'none':
      return null; // Render nothing for 'none' type
    default:
      // Optionally handle unknown types or render a default icon
      console.warn(`Unknown icon type: ${type}`);
      return <FaMapMarkerAlt {...commonProps} aria-label="default marker" />; // Default to marker
  }
}; 
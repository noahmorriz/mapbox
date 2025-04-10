import React from 'react';
import { FaFlag, FaMapMarkerAlt, FaSkull, FaMapPin, FaLocationArrow, FaCompass, FaArrowUp, FaMapMarked, FaInfoCircle, FaExclamationTriangle, FaTimes, FaStar, FaCrosshairs } from 'react-icons/fa'; // Using Font Awesome icons

interface IconProps {
  type: string;
  color?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({ 
  type, 
  color = 'currentColor',
  size = 24,
  className = '',
  style = {}
}) => {
  const iconStyle = { 
    color,
    fontSize: size,
    ...style
  };

  // Map icon type to corresponding component
  const getIcon = () => {
    switch (type) {
      case 'marker':
      case 'marker-alt':
        return <FaMapMarkerAlt style={iconStyle} className={className} />;
      case 'pin':
        return <FaMapPin style={iconStyle} className={className} />;
      case 'location':
      case 'location-fill':
        return <FaLocationArrow style={iconStyle} className={className} />;
      case 'compass':
        return <FaCompass style={iconStyle} className={className} />;
      case 'arrow':
        return <FaArrowUp style={iconStyle} className={className} />;
      case 'gps':
        return <FaMapMarked style={iconStyle} className={className} />;
      case 'info':
        return <FaInfoCircle style={iconStyle} className={className} />;
      case 'warning':
        return <FaExclamationTriangle style={iconStyle} className={className} />;
      case 'cross':
        return <FaTimes style={iconStyle} className={className} />;
      case 'star':
        return <FaStar style={iconStyle} className={className} />;
      case 'flag':
        return <FaFlag style={iconStyle} className={className} />;
      case 'skull':
      case 'death-skull':
        return <FaSkull style={iconStyle} className={className} />;
      case 'target':
        return <FaCrosshairs style={iconStyle} className={className} />;
      case 'none':
      default:
        return null;
    }
  };

  return getIcon();
};

export default Icon; 
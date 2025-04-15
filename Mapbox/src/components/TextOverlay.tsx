import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { useConfigContext } from '../contexts/ConfigContext';
import { useTextAnimation } from '../core/textAnimations';
import { getTheme } from '../core/themes';

interface TextOverlayProps {
  customText?: string;
  isVisible?: boolean;
  textPosition?: string;
  textBackgroundColor?: string;
  textBackgroundPadding?: string;
}

// Constants for text box sizing
const TEXT_CONFIG = {
  MIN_WIDTH: 60,
  MAX_WIDTH: 600,
  CHAR_WIDTH_FACTOR: 0.6,
  PADDING_X: 15,
  PADDING_Y: 12,
};

export const TextOverlay: React.FC<TextOverlayProps> = ({ 
  customText, 
  isVisible = true,
  textPosition = 'lower-third',
  textBackgroundColor,
  textBackgroundPadding
}) => {
  const frame = useCurrentFrame();
  const { 
    textDisplay, 
    textSettings, 
    countryData,
    textAnimationType,
    themeType
  } = useConfigContext();
  
  const [fullText, setFullText] = useState<string>('');
  const textRef = useRef<HTMLDivElement>(null);

  // Get current theme
  const theme = getTheme(themeType);
  
  // Determine display text based on props and context
  useEffect(() => {
    let newText = '';
    if (isVisible) { // Only calculate if meant to be visible
      if (textDisplay === 'country' && countryData) {
        newText = countryData.name;
      } else if (textDisplay === 'custom' && customText) {
        newText = customText;
      }
    }
    // Update only if text actually changes
    if (newText !== fullText) {
      setFullText(newText);
    }
  }, [textDisplay, countryData, customText, isVisible, fullText]);

  // Apply text animation
  const { text: displayText, opacity } = useTextAnimation(
    fullText,
    textAnimationType || 'none',
    30, // Start animation frame
    90  // Duration
  );

  // If not visible, no full text, or no currently displayed text (empty during animation), render nothing
  if (!isVisible || !fullText || !displayText) {
    return null;
  }

  // Get text style from context or use defaults
  const textColor = textSettings?.color || theme.text.color;
  const fontSize = textSettings?.fontSize || theme.text.fontSize;
  const fontWeight = textSettings?.fontWeight || theme.text.fontWeight;
  const fontFamily = textSettings?.fontFamily || theme.text.fontFamily || 'Arial, sans-serif';
  
  // Define position styles based on textPosition prop
  let positionStyle: React.CSSProperties = {};
  
  switch (textPosition) {
    case 'center':
      positionStyle = {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
      break;
    case 'top':
      positionStyle = {
        top: '5%',
        left: '50%',
        transform: 'translateX(-50%)'
      };
      break;
    case 'bottom-left':
      positionStyle = {
        bottom: '5%',
        left: '5%',
        transform: 'translateX(0)'
      };
      break;
    case 'lower-third':
    default:
      positionStyle = {
        bottom: '15%',
        left: '50%',
        transform: 'translateX(-50%)'
      };
      break;
  }

  // Calculate the base width for the container based on the current text
  const calculateTextBoxWidth = () => {
    // Use font size in pixels for calculation
    const fontSizeInPx = parseInt(fontSize.toString(), 10) || 44;
    // Each character takes up approximately fontSizeInPx × CHAR_WIDTH_FACTOR pixels
    const baseWidth = Math.max(
      TEXT_CONFIG.MIN_WIDTH,
      (displayText.length * fontSizeInPx * TEXT_CONFIG.CHAR_WIDTH_FACTOR) + (TEXT_CONFIG.PADDING_X * 2)
    );
    return Math.min(baseWidth, TEXT_CONFIG.MAX_WIDTH);
  };

  // Dynamically calculated width
  const boxWidth = calculateTextBoxWidth();
  
  // Get theme-based overlay styles (or fallback to props)
  const backgroundColor = textBackgroundColor || theme.textOverlay?.backgroundColor || 'rgba(0, 0, 0, 0.7)';
  const padding = textBackgroundPadding || theme.textOverlay?.padding || '10px 20px';
  const borderRadius = theme.textOverlay?.borderRadius || '4px';
  const textShadow = theme.textOverlay?.textShadow || 'none';

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyle,
        backgroundColor,
        padding,
        borderRadius,
        color: textColor,
        fontSize,
        fontWeight,
        fontFamily,
        textAlign: 'left',
        zIndex: 1000,
        width: 'auto',
        boxSizing: 'border-box',
        opacity: opacity,
        display: 'inline-block',
        lineHeight: '1.2',
        letterSpacing: '0.5px',
        textShadow
      }}
    >
      <div ref={textRef}>{displayText}</div>
    </div>
  );
}; 
// This is a placeholder script for generating an icon atlas
// In a real implementation, you would use a tool like Canvas or a library to combine
// individual icon images into a single atlas texture for deck.gl

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Configuration for icon atlas generation
const config = {
  iconSize: 128, // Size of each icon (square)
  iconsPerRow: 6,
  iconPadding: 0, // Padding between icons
  iconTypes: [
    'marker',
    'pin',
    'flag',
    'skull',
    'star',
    'info'
  ],
  inputDir: path.join(__dirname, '../public/icons/individual'),
  outputFile: path.join(__dirname, '../public/icons/icon-atlas.png'),
  mappingFile: path.join(__dirname, '../public/icons/icon-mapping.json')
};

async function generateIconAtlas() {
  const rows = Math.ceil(config.iconTypes.length / config.iconsPerRow);
  const atlasWidth = config.iconsPerRow * (config.iconSize + config.iconPadding) - config.iconPadding;
  const atlasHeight = rows * (config.iconSize + config.iconPadding) - config.iconPadding;
  
  const canvas = createCanvas(atlasWidth, atlasHeight);
  const ctx = canvas.getContext('2d');
  
  // Fill with transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, atlasWidth, atlasHeight);
  
  // Create mapping for deck.gl
  const iconMapping = {};
  
  // Load and draw each icon
  for (let i = 0; i < config.iconTypes.length; i++) {
    const iconType = config.iconTypes[i];
    const row = Math.floor(i / config.iconsPerRow);
    const col = i % config.iconsPerRow;
    
    const x = col * (config.iconSize + config.iconPadding);
    const y = row * (config.iconSize + config.iconPadding);
    
    try {
      // Load icon image
      const iconPath = path.join(config.inputDir, `${iconType}.png`);
      const image = await loadImage(iconPath);
      
      // Draw on canvas
      ctx.drawImage(image, x, y, config.iconSize, config.iconSize);
      
      // Add to mapping
      iconMapping[iconType] = {
        x,
        y,
        width: config.iconSize,
        height: config.iconSize,
        anchorY: config.iconSize // Anchor at bottom center
      };
      
      console.log(`Added ${iconType} to atlas at (${x}, ${y})`);
    } catch (err) {
      console.error(`Error processing icon ${iconType}:`, err);
    }
  }
  
  // Save atlas image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(config.outputFile, buffer);
  console.log(`Saved icon atlas to ${config.outputFile}`);
  
  // Save mapping JSON
  fs.writeFileSync(config.mappingFile, JSON.stringify(iconMapping, null, 2));
  console.log(`Saved icon mapping to ${config.mappingFile}`);
}

// Run the generator
generateIconAtlas().catch(err => {
  console.error('Error generating icon atlas:', err);
  process.exit(1);
}); 
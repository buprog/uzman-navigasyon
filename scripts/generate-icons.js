// Script to generate PWA icons from SVG
const fs = require('fs');
const path = require('path');

// Simple PNG generator using data URLs and Canvas
// For production, you would use a proper SVG to PNG converter

const sizes = [192, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Create simple placeholder PNGs with brand color
function createPlaceholderIcon(size, filename) {
  // This is a base64 encoded simple PNG with teal background and white "U" letter
  // In production, you'd convert the actual SVG
  const createCanvas = () => {
    try {
      const { createCanvas } = require('canvas');
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // Background
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(0, 0, size, size);
      
      // Border radius effect (simplified)
      ctx.globalCompositeOperation = 'destination-out';
      const radius = size / 5;
      ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(corner => {
        ctx.beginPath();
        const [x, y] = corner.includes('left') 
          ? [0, corner.includes('top') ? 0 : size] 
          : [size, corner.includes('top') ? 0 : size];
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.globalCompositeOperation = 'source-over';
      
      // Draw "U" for Uzman
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${size * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('U', size / 2, size / 2);
      
      // Save
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(path.join(iconsDir, filename), buffer);
      console.log(`Created ${filename}`);
      return true;
    } catch (err) {
      return false;
    }
  };
  
  return createCanvas();
}

console.log('Generating PWA icons...');

let success = true;
sizes.forEach(size => {
  const regular = `icon-${size}.png`;
  const maskable = `icon-${size}-maskable.png`;
  
  if (!createPlaceholderIcon(size, regular)) {
    success = false;
  }
  if (!createPlaceholderIcon(size, maskable)) {
    success = false;
  }
});

if (!success) {
  console.log('\nCanvas module not available. Creating minimal placeholders...');
  console.log('For production, replace these with proper icon files.\n');
  
  // Create minimal valid PNG files as fallback
  const minimalPNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  
  sizes.forEach(size => {
    fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), minimalPNG);
    fs.writeFileSync(path.join(iconsDir, `icon-${size}-maskable.png`), minimalPNG);
  });
  
  console.log('Minimal placeholder icons created.');
  console.log('Replace public/icons/*.png with proper 192x192 and 512x512 icons before production.');
}

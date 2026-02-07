// Generate PWA icons using node-canvas (or sharp if available)
// Fallback: create simple colored PNGs with the brain emoji

const fs = require('fs');
const path = require('path');

function createMinimalPNG(size) {
  // Create a minimal valid PNG with the right dimensions
  // Using a simple approach: generate SVG then use sharp or just write a placeholder
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a0f0c" rx="${size * 0.15}"/>
  <text x="50%" y="54%" dominant-baseline="central" text-anchor="middle" font-size="${size * 0.55}" fill="#fade29" font-family="Arial, sans-serif">🧠</text>
</svg>`;
  
  return svg;
}

async function generate() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Try sharp first (most likely available in Next.js projects)
  try {
    const sharp = require('sharp');
    
    for (const size of [192, 512]) {
      const svg = Buffer.from(createMinimalPNG(size));
      await sharp(svg)
        .resize(size, size)
        .png()
        .toFile(path.join(publicDir, `icon-${size}.png`));
      console.log(`✅ Generated icon-${size}.png`);
    }
    return;
  } catch (e) {
    console.log('sharp not available, trying resvg-js...');
  }

  // Try resvg
  try {
    const { Resvg } = require('@aspect-run/resvg');
    for (const size of [192, 512]) {
      const svg = createMinimalPNG(size);
      const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
      const pngData = resvg.render().asPng();
      fs.writeFileSync(path.join(publicDir, `icon-${size}.png`), pngData);
      console.log(`✅ Generated icon-${size}.png`);
    }
    return;
  } catch (e) {
    console.log('resvg not available, saving SVGs and converting...');
  }

  // Fallback: save SVGs and use ImageMagick/rsvg-convert if available
  for (const size of [192, 512]) {
    const svgPath = path.join(publicDir, `icon-${size}.svg`);
    const pngPath = path.join(publicDir, `icon-${size}.png`);
    fs.writeFileSync(svgPath, createMinimalPNG(size));
    console.log(`📝 Saved icon-${size}.svg (needs conversion)`);
  }
}

generate().catch(console.error);

# Icon Requirements

The extension requires the following icon files in this directory:

| File | Size | Usage |
|------|------|-------|
| `icon16.png` | 16x16 | Toolbar icon |
| `icon32.png` | 32x32 | Toolbar (retina) |
| `icon48.png` | 48x48 | Extensions page |
| `icon128.png` | 128x128 | Chrome Web Store |

## Generating Icons

### Option 1: Use the provided SVG

Convert the `icon.svg` file to PNG at different sizes:

```bash
# Using ImageMagick
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 32x32 icon32.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

### Option 2: Use an online converter

1. Go to a site like https://convertio.co/svg-png/
2. Upload `icon.svg`
3. Download PNG versions at the required sizes

### Option 3: Design custom icons

Use tools like Figma, Sketch, or Illustrator to create custom icons that match the Nexus brand.

## Icon Design Guidelines

- Use the gradient from indigo (#4f46e5) to purple (#7c3aed)
- Keep the star/sparkle motif for brand recognition
- Ensure icons are readable at 16x16 size
- Use transparent backgrounds for all icons

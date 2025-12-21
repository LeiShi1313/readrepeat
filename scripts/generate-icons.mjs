import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Color themes
const COLORS = {
  prod: { primary: '#3b82f6', secondary: '#1d4ed8' },
  dev: { primary: '#f97316', secondary: '#ea580c' },
};

// Minimalist logo: headphones with sound waveform inside
const createLogoSvg = (size, isMaskable = false, transparent = false, theme = 'prod') => {
  const padding = isMaskable ? size * 0.15 : size * 0.1;
  const innerSize = size - padding * 2;
  const scale = innerSize / 100;
  const colors = COLORS[theme];

  const background = transparent
    ? ''
    : `<rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>`;

  const strokeColor = transparent ? colors.primary : 'white';
  const fillColor = transparent ? colors.primary : 'white';

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}"/>
      <stop offset="100%" style="stop-color:${colors.secondary}"/>
    </linearGradient>
  </defs>

  ${background}

  <g transform="translate(${padding}, ${padding}) scale(${scale})">
    <!-- Headphone band - thick rounded arc (larger) -->
    <path d="M10 60
             Q10 15, 50 15
             Q90 15, 90 60"
          fill="none" stroke="${strokeColor}" stroke-width="6" stroke-linecap="round"/>

    <!-- Left ear cup - rounded rectangle (larger) -->
    <rect x="4" y="52" width="18" height="30" rx="6" fill="${fillColor}"/>

    <!-- Right ear cup - rounded rectangle (larger) -->
    <rect x="78" y="52" width="18" height="30" rx="6" fill="${fillColor}"/>

    <!-- Sound waveform in center (7 bars, irregular sizes) -->
    <g transform="translate(50, 58)">
      <rect x="-2.5" y="-15" width="5" height="30" rx="2.5" fill="${fillColor}"/>
      <rect x="-10" y="-9" width="4" height="18" rx="2" fill="${fillColor}"/>
      <rect x="-17" y="-5" width="4" height="10" rx="2" fill="${fillColor}"/>
      <rect x="-23" y="-7" width="3.5" height="14" rx="1.75" fill="${fillColor}"/>
      <rect x="6" y="-11" width="4" height="22" rx="2" fill="${fillColor}"/>
      <rect x="13" y="-6" width="4" height="12" rx="2" fill="${fillColor}"/>
      <rect x="20" y="-8" width="3.5" height="16" rx="1.75" fill="${fillColor}"/>
    </g>
  </g>
</svg>`;
};

// Icon with wordmark
const createLogoWithWordmark = (width, height) => {
  const iconSize = height * 0.8;
  const iconPadding = height * 0.1;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Icon -->
  <g transform="translate(${iconPadding}, ${iconPadding}) scale(${iconSize / 100})">
    <!-- Headphone band -->
    <path d="M10 60 Q10 15, 50 15 Q90 15, 90 60"
          fill="none" stroke="#3b82f6" stroke-width="6" stroke-linecap="round"/>
    <!-- Ear cups -->
    <rect x="4" y="52" width="18" height="30" rx="6" fill="#3b82f6"/>
    <rect x="78" y="52" width="18" height="30" rx="6" fill="#3b82f6"/>
    <!-- Waveform (7 bars, irregular) -->
    <g transform="translate(50, 58)">
      <rect x="-2.5" y="-15" width="5" height="30" rx="2.5" fill="#3b82f6"/>
      <rect x="-10" y="-9" width="4" height="18" rx="2" fill="#3b82f6"/>
      <rect x="-17" y="-5" width="4" height="10" rx="2" fill="#3b82f6"/>
      <rect x="-23" y="-7" width="3.5" height="14" rx="1.75" fill="#3b82f6"/>
      <rect x="6" y="-11" width="4" height="22" rx="2" fill="#3b82f6"/>
      <rect x="13" y="-6" width="4" height="12" rx="2" fill="#3b82f6"/>
      <rect x="20" y="-8" width="3.5" height="16" rx="1.75" fill="#3b82f6"/>
    </g>
  </g>

  <!-- Wordmark -->
  <text x="${iconSize + iconPadding * 2}" y="${height * 0.62}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${height * 0.35}"
        font-weight="600"
        fill="#1e293b">Read<tspan fill="#3b82f6">Repeat</tspan></text>
</svg>`;
};

// Monochrome version
const createMonochromeSvg = (size, color = '#000000') => {
  const padding = size * 0.1;
  const innerSize = size - padding * 2;
  const scale = innerSize / 100;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(${padding}, ${padding}) scale(${scale})">
    <!-- Headphone band -->
    <path d="M10 60 Q10 15, 50 15 Q90 15, 90 60"
          fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
    <!-- Ear cups -->
    <rect x="4" y="52" width="18" height="30" rx="6" fill="${color}"/>
    <rect x="78" y="52" width="18" height="30" rx="6" fill="${color}"/>
    <!-- Waveform (7 bars, irregular) -->
    <g transform="translate(50, 58)">
      <rect x="-2.5" y="-15" width="5" height="30" rx="2.5" fill="${color}"/>
      <rect x="-10" y="-9" width="4" height="18" rx="2" fill="${color}"/>
      <rect x="-17" y="-5" width="4" height="10" rx="2" fill="${color}"/>
      <rect x="-23" y="-7" width="3.5" height="14" rx="1.75" fill="${color}"/>
      <rect x="6" y="-11" width="4" height="22" rx="2" fill="${color}"/>
      <rect x="13" y="-6" width="4" height="12" rx="2" fill="${color}"/>
      <rect x="20" y="-8" width="3.5" height="16" rx="1.75" fill="${color}"/>
    </g>
  </g>
</svg>`;
};

async function generateIcons() {
  const sizes = [192, 512];
  const themes = ['prod', 'dev'];

  for (const theme of themes) {
    const suffix = theme === 'dev' ? '-dev' : '';

    for (const size of sizes) {
      // Regular icon with background
      const regularSvg = createLogoSvg(size, false, false, theme);
      await sharp(Buffer.from(regularSvg))
        .png()
        .toFile(join(publicDir, `icon${suffix}-${size}.png`));
      console.log(`Generated icon${suffix}-${size}.png`);

      // Maskable icon (more padding for safe zone) - prod only
      if (theme === 'prod') {
        const maskableSvg = createLogoSvg(size, true, false, theme);
        await sharp(Buffer.from(maskableSvg))
          .png()
          .toFile(join(publicDir, `icon-maskable-${size}.png`));
        console.log(`Generated icon-maskable-${size}.png`);

        // Transparent background version - prod only
        const transparentSvg = createLogoSvg(size, false, true, theme);
        await sharp(Buffer.from(transparentSvg))
          .png()
          .toFile(join(publicDir, `icon-transparent-${size}.png`));
        console.log(`Generated icon-transparent-${size}.png`);
      }
    }

    // Small sizes for scalability test (24px, 32px, 48px)
    for (const size of [24, 32, 48]) {
      const smallSvg = createLogoSvg(size, false, false, theme);
      await sharp(Buffer.from(smallSvg))
        .png()
        .toFile(join(publicDir, `icon${suffix}-${size}.png`));
      console.log(`Generated icon${suffix}-${size}.png`);
    }

    // Generate apple-touch-icon
    const appleSvg = createLogoSvg(180, false, false, theme);
    await sharp(Buffer.from(appleSvg))
      .png()
      .toFile(join(publicDir, `apple-touch-icon${suffix}.png`));
    console.log(`Generated apple-touch-icon${suffix}.png`);

    // Generate SVG versions
    const iconSvg = createLogoSvg(512, false, true, theme);
    writeFileSync(join(publicDir, `logo${suffix}.svg`), iconSvg);
    console.log(`Generated logo${suffix}.svg (icon only, transparent)`);
  }

  // Favicon (use 32px) - both versions
  const { copyFileSync } = await import('fs');
  copyFileSync(join(publicDir, 'icon-32.png'), join(publicDir, 'favicon.png'));
  console.log('Generated favicon.png (same as icon-32.png)');
  copyFileSync(join(publicDir, 'icon-dev-32.png'), join(publicDir, 'favicon-dev.png'));
  console.log('Generated favicon-dev.png (same as icon-dev-32.png)');

  // Icon with wordmark - prod only
  const wordmarkSvg = createLogoWithWordmark(400, 100);
  writeFileSync(join(publicDir, 'logo-wordmark.svg'), wordmarkSvg);
  console.log('Generated logo-wordmark.svg (icon + wordmark)');

  // Monochrome versions - prod only
  const monoblackSvg = createMonochromeSvg(512, '#000000');
  writeFileSync(join(publicDir, 'logo-mono-black.svg'), monoblackSvg);
  console.log('Generated logo-mono-black.svg');

  const monowhiteSvg = createMonochromeSvg(512, '#ffffff');
  writeFileSync(join(publicDir, 'logo-mono-white.svg'), monowhiteSvg);
  console.log('Generated logo-mono-white.svg');
}

generateIcons().catch(console.error);

const path = require('path');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error(
      'Missing dependency: sharp. Install it with `npm i sharp` from the frontend folder, then re-run this script.'
    );
    process.exit(1);
  }

  const input = path.join(__dirname, '..', 'assets', 'mb_1.png');
  const output = path.join(__dirname, '..', 'assets', 'mb_1_padded.png');

  const img = sharp(input);
  const meta = await img.metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (!w || !h) {
    throw new Error(`Could not read image dimensions for ${input}`);
  }

  // Add 13% padding on each side so the launcher icon renders slightly smaller.
  const padX = Math.round(w * 0.13);
  const padY = Math.round(h * 0.13);

  await img
    .extend({
      top: padY,
      bottom: padY,
      left: padX,
      right: padX,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(output);

  console.log(`Wrote ${output} (${w}x${h} -> ${w + padX * 2}x${h + padY * 2})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

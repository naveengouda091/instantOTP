import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  // Create uncompressed RGBA pixel buffer
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const color = drawFn(x, y, width, height);
      rawData[pxOffset] = color.r;     // R
      rawData[pxOffset + 1] = color.g; // G
      rawData[pxOffset + 2] = color.b; // B
      rawData[pxOffset + 3] = color.a; // A
    }
  }

  // Compress IDAT payload using zlib
  const compressedData = zlib.deflateSync(rawData);

  // Helper chunk writer
  function writeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic header
  const ihdrChunk = writeChunk('IHDR', ihdr);
  const idatChunk = writeChunk('IDAT', compressedData);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 calculation table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Icon Drawer: Gradient Gmail Red + OTP Shield key icon
function renderIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  const cx = 0.5;
  const cy = 0.5;
  const dist = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2);

  // Rounded rectangle background
  const rx = Math.abs(nx - 0.5);
  const ry = Math.abs(ny - 0.5);

  if (rx > 0.45 || ry > 0.45) {
    // Corner rounding check
    if (rx > 0.35 && ry > 0.35) {
      const crx = rx - 0.35;
      const cry = ry - 0.35;
      if (Math.sqrt(crx * crx + cry * cry) > 0.1) {
        return { r: 0, g: 0, b: 0, a: 0 };
      }
    }
  }

  // Modern vibrant gradient: Red (#EA4335) to Violet (#7C3AED)
  const t = (nx + ny) / 2;
  const r = Math.round(234 * (1 - t) + 124 * t);
  const g = Math.round(67 * (1 - t) + 58 * t);
  const b = Math.round(53 * (1 - t) + 237 * t);

  // Key / Shield overlay in white
  // Center shield icon
  if (dist < 0.28) {
    if (ny < 0.55) {
      return { r: 255, g: 255, b: 255, a: 240 };
    }
  }

  // Key notch
  if (nx > 0.44 && nx < 0.56 && ny >= 0.52 && ny < 0.78) {
    return { r: 255, g: 255, b: 255, a: 240 };
  }

  return { r, g, b, a: 255 };
}

const iconsDir = path.join(process.cwd(), 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngBuffer = createPNG(size, size, renderIcon);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), pngBuffer);
  console.log(`Generated icon${size}.png (${pngBuffer.length} bytes)`);
});

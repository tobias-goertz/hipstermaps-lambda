import sharp from 'sharp';
import abaculus from '@mapbox/abaculus';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const apiBaseUrl = 'https://api.mapbox.com';

const apiKey = process.env.MAPBOX_API_KEY;
const awsBucket = process.env.AWS_BUCKET;

const formatSizes = {
  '2:3': {
    image: { w: 5400, h: 6900 },
    poster: {
      w: 5906, h: 8858, offset: 253,
      fontSize1: 350, fontSize2: 250, fontSize3: 190,
      stroke: 30, letterSpacing: 75
    }
  },
  '3:4': {
    image: { w: 3243, h: 3580 },
    poster: {
      w: 3543, h: 4724, offset: 150,
      fontSize1: 250, fontSize2: 150, fontSize3: 120,
      stroke: 20, letterSpacing: 50
    }
  }
};

const s3 = new S3Client();

export const handler = async (event) => {
  if (!apiKey) throw new Error('No MAPBOX_API_KEY configured');
  if (!awsBucket) throw new Error('No AWS_BUCKET configured');
  if (!event.mapStyle) throw new Error('No Mapbox Map Style');
  if (!event.formatSize) throw new Error('No Format Size');
  if (!event.title) throw new Error('No Title');
  if (!event.zoom) throw new Error('No Zoom');

  const formatSize = formatSizes[event.formatSize];
  if (!formatSize) throw new Error('Invalid Format Size');

  console.time('buildMap');
  const image = await buildMap(event, formatSize);
  console.timeEnd('buildMap');

  console.time('buildPoster');
  const posterBuffer = await buildPoster(formatSize, image, event.title, event.subtitle, event.coords);
  console.timeEnd('buildPoster');

  console.time('upload');
  await s3.send(new PutObjectCommand({
    Bucket: awsBucket,
    Key: event.bucketFile,
    Body: posterBuffer,
    ContentType: 'image/png'
  }));
  console.timeEnd('upload');

  return { statusCode: 200, body: 'OK' };
};

function buildMap(event, formatSize) {
  return new Promise((resolve, reject) => {
    const params = {
      zoom: event.zoom,
      scale: 1,
      center: {
        x: parseFloat(event.lon),
        y: parseFloat(event.lat),
        w: formatSize.image.w,
        h: formatSize.image.h
      },
      format: 'png',
      quality: 255,
      tileSize: 1024,
      getTile(z, x, y, cb) {
        const tileUrl = `${apiBaseUrl}/styles/v1/${event.mapStyle}/tiles/512/${z}/${x}/${y}@2x?access_token=${apiKey}`;
        fetch(tileUrl)
          .then(res => {
            if (!res.ok) throw new Error(`Tile fetch failed: ${res.status}`);
            return res.arrayBuffer();
          })
          .then(buf => cb(null, Buffer.from(buf)))
          .catch(err => cb(err));
      }
    };

    abaculus(params, (err, image) => {
      if (err) reject(err);
      else resolve(image);
    });
  });
}

async function buildPoster(formatSize, rawMap, title, subtitle, coords) {
  const { poster } = formatSize;

  const frame = Buffer.from(`
    <svg viewBox="0 0 ${poster.w} ${poster.h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#fff" />
    <text
      x="${poster.w / 2}"
      y="${poster.h * 0.865}"
      font-size="${poster.fontSize1}"
      fill="#2d6886"
      font-weight="bold"
      text-anchor="middle"
      font-family="sans-serif"
      letter-spacing="${poster.letterSpacing}">
      ${title || ''}
    </text>
    <line
      x1="${(poster.w / 2) * 0.66}"
      y1="${poster.h * 0.88}"
      x2="${(poster.w / 2) * 1.33}"
      y2="${poster.h * 0.88}"
      style="stroke:rgb(0,0,0);stroke-width:${poster.stroke}" />
    <text
      x="${poster.w / 2}"
      y="${poster.h * 0.92}"
      font-size="${poster.fontSize2}"
      fill="#2d6886"
      text-anchor="middle"
      font-family="sans-serif"
      letter-spacing="${poster.letterSpacing}">
      ${subtitle || ''}
    </text>
    <text
      x="${poster.w / 2}"
      y="${poster.h * 0.96}"
      font-size="${poster.fontSize3}"
      font-style="italic"
      fill="#2d6886"
      text-anchor="middle"
      font-family="sans-serif">
      ${coords || ''}
    </text>
  </svg>`);

  return sharp(frame)
    .png()
    .composite([{ input: rawMap, top: poster.offset, left: poster.offset }])
    .toBuffer();
}

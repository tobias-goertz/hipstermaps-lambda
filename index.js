var conf = require('dotenv').config();
process.env.FONTCONFIG_PATH='/var/task/fonts';

const apiBaseUrl = 'https://api.mapbox.com';
const sharp = require('sharp');

const axios = require('axios');
const abaculus = require('@mapbox/abaculus');
const aws = require('aws-sdk');

const apiKey = process.env['MAPBOX_API_KEY'];
const awsKey = process.env['AWS_KEY'];
const awsSecret = process.env['AWS_SECRET'];
const awsBucket = process.env['AWS_BUCKET'];

const formatSizes = {
  '2:3': {
    image: {
      w: 5400,
      h: 6900
    },
    poster: {
      w: 5906,
      h: 8858,
      offset: 253,
      fontSize1: 350,
      fontSize2: 250,
      fontSize3: 190,
      stroke: 30,
      letterSpacing: 75,
      frame: 'frame_din.jpg'
    }
  },
  '3:4': {
    image: {
      w: 3243,
      h: 3580,
    },
    poster: {
      w: 3543,
      h: 4724,
      offset: 150,
      fontSize1: 250,
      fontSize2: 150,
      fontSize3: 120,
      stroke: 20,
      letterSpacing: 50,
      frame: 'frame_3_2.jpg'
    }
  }
}

exports.handler = (event, context, callback) => {
  if (!apiKey) returnWithError('No API Key', callback);
  if (!awsKey) returnWithError('No AWS Key', callback);
  if (!awsSecret) returnWithError('No AWS Secret', callback);
  if (!awsBucket) returnWithError('No AWS Bucket', callback);
  if (!event.mapStyle) returnWithError('No Mapbox Map Id', callback);
  if (!event.formatSize) returnWithError('No Format Size', callback);
  if (!event.title) returnWithError('No Title', callback);
  if (!event.zoom) returnWithError('No Zoom', callback);

  var formatSize = formatSizes[event.formatSize];
  if (!formatSize) returnWithError('Invalid Format Size', callback);

  var s3Bucket = new aws.S3({
    accessKeyId: awsKey,
    secretAccessKey: awsSecret,
    Bucket: awsBucket,
  });

  var params = {
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
    getTile: function(z, x, y, cb) {
      var tileUrl = apiBaseUrl + '/styles/v1/' + event.mapStyle +'/tiles/512/' + z + '/' + x + '/' + y + '@2x?access_token=' + apiKey;
      axios.get(tileUrl, { responseType: 'arraybuffer' }).then(function(response) {
        return cb(null, response.data, response.header);
      })
    },
  };

  console.time('buildMap');
  abaculus(params, async function(err, image, headers){
    if (err) throw err;
    console.timeEnd('buildMap');

    var posterBuffer = await buildPoster(formatSize, image, event.title, event.subtitle, event.coords);
    console.time('upload');
    s3Bucket.upload({
      Bucket: awsBucket,
      Key: event.bucketFile,
      Body: posterBuffer
    }, function (err, data) {
      if (err) callback(err);
      console.timeEnd('upload');
      callback(null);
    })
  });
};

async function buildPoster(formatSize, rawMap, title, subtitle, coords) {
  console.time('buildPoster');
  var frame = Buffer.from(`
    <svg viewBox="0 0 ${formatSize.poster.w} ${formatSize.poster.h}" xmlns="http://www.w3.org/2000/svg">
    <style>
    </style>
    <rect width="100%" height="100%" fill="#f4f4f4"/>
    <rect x="0" y="0" width="${formatSize.poster.w}" height="${formatSize.poster.h}" fill="#fff" />
    <text
      x="${formatSize.poster.w / 2}"
      y="${formatSize.poster.h * 0.865}"
      font-size="${formatSize.poster.fontSize1}"
      fill="#2d6886"
      font-weight="bold"
      text-anchor="middle"
      font-family="OpenSans"
      letter-spacing="${formatSize.poster.letterSpacing}">
      ${title}
    </text>
    <line x1="${(formatSize.poster.w /2) * 0.66}" y1="${formatSize.poster.h * 0.88}" x2="${(formatSize.poster.w /2) * 1.33}" y2="${formatSize.poster.h * 0.88}" style="stroke:rgb(0,0,0);stroke-width:${formatSize.poster.stroke}"></line>
    <text
      x="${formatSize.poster.w / 2}"
      y="${formatSize.poster.h * 0.92}"
      font-size="${formatSize.poster.fontSize2}"
      fill="#2d6886"
      text-anchor="middle"
      font-family="OpenSans"
      letter-spacing="${formatSize.poster.letterSpacing}">
      ${subtitle}
    </text>
    <text
      x="${formatSize.poster.w / 2}"
      y="${formatSize.poster.h * 0.96}"
      font-size="${formatSize.poster.fontSize3}"
      font-style="italic"
      fill="#2d6886"
      text-anchor="middle"
      font-family="OpenSans">
      ${coords}
    </text>
  </svg>`);

  //
  // return await sharp(frame)
  // var final = await sharp({
  //   create: {
  //     width: formatSize.poster.w,
  //     height: formatSize.poster.h,
  //     channels: 4,
  //     background: { r: 255, g: 255, b: 255, alpha: 255 }
  //   }
  // })
  var final =
  await sharp(frame)
  .png()
  .composite([{ input: rawMap, top: formatSize.poster.offset, left: formatSize.poster.offset }])
  .toBuffer();

  // var final =
  //   await sharp(`templates/${formatSize.poster.frame}`)
  //   .png()
  //   .composite([{ input: rawMap, top: formatSize.poster.offset, left: formatSize.poster.offset }])
  //   .toBuffer();

  console.timeEnd('buildPoster');
  return final;
}

function returnWithError(message, callback) {
  var error = new Error(message);
  callback(error);
  throw(error);
}

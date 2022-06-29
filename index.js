var conf = require('dotenv').config();

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
  'DIN': {
    image: {
      w: 6500,
      h: 8400
    },
    poster: {
      w: 7016,
      h: 9933,
      offset: 258,
      frame: 'frame_din.jpg'
    }
  },
  '3:2': {
    image: {
      w: 6500,
      h: 9750
    },
    poster: {
      w: 7016,
      h: 10524,
      offset: 258,
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

  var formatSize = formatSizes[event.formatSize];
  if (!formatSize) returnWithError('Invalid Format Size', callback);

  var s3Bucket = new aws.S3({
    accessKeyId: awsKey,
    secretAccessKey: awsSecret,
    Bucket: awsBucket,
  });

  var params = {
    zoom: 14,
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
      var tileUrl = apiBaseUrl + '/styles/v1/shigawire/' + event.mapStyle +'/tiles/512/' + z + '/' + x + '/' + y + '@2x?access_token=' + apiKey;
      axios.get(tileUrl, { responseType: 'arraybuffer' }).then(function(response) {
        return cb(null, response.data, response.header);
      })
    },
  };

  console.time('buildMap');
  abaculus(params, async function(err, image, headers){
    if (err) throw err;
    console.timeEnd('buildMap');

    var posterBuffer = await buildPoster(formatSize, image, event.title);
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

async function buildPoster(formatSize, rawMap, text) {
  console.time('buildPoster');
  var frame = new Buffer(`
  <svg viewBox="0 0 ${formatSize.poster.w} ${formatSize.poster.h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${formatSize.poster.w}" height="${formatSize.poster.h}" fill="#fff" />
    <text
      x="${formatSize.poster.w / 2}"
      y="${formatSize.poster.h - 700}"
      font-size="300"
      fill="#000"
      text-anchor="middle"
      font-family="Arial">
      ${text}
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

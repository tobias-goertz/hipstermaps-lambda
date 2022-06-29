const sharp = require('sharp');

const formatSize = {
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
}

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
  .toFile("new-file.png");

  // var final =
  //   await sharp(`templates/${formatSize.poster.frame}`)
  //   .png()
  //   .composite([{ input: rawMap, top: formatSize.poster.offset, left: formatSize.poster.offset }])
  //   .toBuffer();

  console.timeEnd('buildPoster');
  return final;
}

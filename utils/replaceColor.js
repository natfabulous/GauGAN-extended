const { PNG } = require('pngjs');
const fs = require('fs');
const { ColorTranslator } = require('colortranslator');
const log = require('./logger');
// const colorMap = require('./colorMap');

const hexStringsToRGB = (colorArr) => {
  const rgbArr = colorArr.map((e) => {
    const rgb = new ColorTranslator(e).RGBObject;
    return [rgb.r, rgb.g, rgb.b];
  });
  return rgbArr;
};

const fastBuffer = (u8RGBAbuffer, rgbSrc, rgbDest) => {
  let matchNum = 0;
  for (let i = 0; i < u8RGBAbuffer.length; i += 4) {
    const slice = u8RGBAbuffer.slice(i, i + 4);
    for (let j = 0; j < rgbSrc.length; j++) {
      if (
        slice[0] === rgbSrc[j][0] &&
        slice[1] === rgbSrc[j][1] &&
        slice[2] === rgbSrc[j][2]
      ) {
        matchNum++;
        slice[0] = rgbDest[j][0];
        slice[1] = rgbDest[j][1];
        slice[2] = rgbDest[j][2];
      }
    }
  }
  log.log(`match percentage: ${((matchNum * 4) / u8RGBAbuffer.length) * 100}%`);
  return u8RGBAbuffer;
};

const fastFile = (infile, outfile, rgbSrc, rgbDest) => {
  const png = PNG.sync.read(fs.readFileSync(infile));
  fastBuffer(png.data, rgbSrc, rgbDest);
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(outfile, buffer);
};

module.exports = { fastFile, fastBuffer, hexStringsToRGB };

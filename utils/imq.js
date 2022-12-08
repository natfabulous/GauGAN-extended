const { PNG } = require('pngjs');
const {
  applyPaletteSync,
  buildPaletteSync,
  utils: iqutils
} = require('image-q');
const fs = require('fs');
const { ColorTranslator } = require('colortranslator');
// const replaceColor = require('replace-color-multicolor');
const { fastBuffer, hexStringsToRGB } = require('./replaceColor');
const log = require('./logger');

// const colorsToPoints = (colorArr) => {
//   const pointsArr = colorArr.map((e) => {
//     const rgb = new ColorTranslator(e).RGBObject;
//     const point = iqutils.Point.createByRGBA(rgb.r, rgb.g, rgb.b, 255);
//     return point;
//   });
//   return pointsArr;
// };

const pointsToHEXColors = (pointsArr) => {
  const colorArr = pointsArr.map((e) => {
    const colorString = `rgb(${e.r},${e.g},${e.b})`;
    return new ColorTranslator(colorString).HEX;
  });
  return colorArr;
};

// read file
const process = (infile, interfile, outfile, targetColors) => {
  log.log(`\n${infile}\n ${interfile}\n ${outfile}`);
  const numColors = Object.keys(targetColors).length;
  let t0 = Date.now();
  const png = PNG.sync.read(fs.readFileSync(infile));
  const inPointContainer = iqutils.PointContainer.fromUint8Array(
    png.data,
    png.width,
    png.height
  );

  // convert
  const palette = buildPaletteSync([inPointContainer], { colors: numColors });
  const outColors = pointsToHEXColors(palette._pointArray);
  const outPointContainer = applyPaletteSync(inPointContainer, palette);
  const u8Buf = Buffer.from(outPointContainer.toUint8Array());
  png.data = u8Buf;
  let buffer = PNG.sync.write(png);
  fs.writeFileSync(interfile, buffer);
  log.log(`imq dt (millis): ${Date.now() - t0}`);
  //
  // fast replace
  // TODO: skip PNG write, maybe do both buffer and file writes at end instead
  //
  t0 = Date.now();
  fastBuffer(u8Buf, hexStringsToRGB(outColors), hexStringsToRGB(targetColors));
  png.data = u8Buf;
  buffer = PNG.sync.write(png);
  fs.writeFileSync(outfile, buffer);
  log.log(`fastReplace dt (millis): ${Date.now() - t0}`);
};

module.exports = { process };

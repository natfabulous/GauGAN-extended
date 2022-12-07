// const fs = require('fs');
// const { calcNumberOfFrames } = require('./ffmpegUtils');
const path = require('path');

const dateString = () =>
  new Date().toISOString().slice(0, -5).replaceAll(':', '_');
const repoName = 'GauGAN';
const filePathNoExt = (fp) => path.parse(fp).dir + path.parse(fp).name;
module.exports = { dateString, repoName, filePathNoExt };

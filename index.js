// Imports
const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const progressBar = require('progress-bar-cli');
const log = require('./utils/logger');
const InferenceSession = require('./fetch');
const { mkdir } = require('./utils/filenameplus');
const { videoToFrames, framesToVideo } = require('./utils/ffmpegUtils');
const { dateString, repoName, filePathNoExt } = require('./utils/utils');

// Command line args
program
  .option('-v, --debug', 'output extra debugging')
  .option('-i, --video [string]', 'input file for use with video')
  .option(
    '-w, --working [string]',
    'working directory where intermediary info is saved'
  )
  .option('-o, --output [string]', 'output directory');
program.parse(process.argv);

// indir may not be set yet
const options = program.opts();
if (options.debug) log.level = 'debug';

// Actual program
(async () => {
  const uniqueDate = dateString();
  const workDir = `${filePathNoExt(options.video)}_${repoName}`;
  const framesDir = path.join(workDir, `ffmpeg_images_${uniqueDate}`);
  const ggImageDir = path.join(workDir, `GauGAN_images_${uniqueDate}`);
  const videoOutDir = path.join(workDir, `video_out_${uniqueDate}`);
  mkdir(framesDir);
  await videoToFrames(options.video, framesDir);
  // wrangle input images
  const files = [];
  fs.readdirSync(framesDir).forEach((e) => {
    files.push(`${framesDir}\\${e}`);
  });
  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  log.log('Creating InferenceSession');
  const inferenceSession = new InferenceSession(uniqueDate);

  const t0 = new Date();
  mkdir(ggImageDir);
  for (let i = 0; i < files.length; i++) {
    progressBar.progressBar(i, files.length, t0);
    inferenceSession.segmap = fs.readFileSync(files[i]);
    const res = await inferenceSession.infer();
    const blob = await res.blob();
    const abuff = await blob.arrayBuffer();
    const uarr = new Uint8Array(abuff);
    const buff = Buffer.from(uarr);
    fs.writeFileSync(`${ggImageDir}/${i + 1}.jpg`, buff);
  }

  log.log('Stitching video back together (FFmpeg)');
  mkdir(videoOutDir);
  await framesToVideo(ggImageDir, videoOutDir, {
    sourceVideo: options.video
  });
})();

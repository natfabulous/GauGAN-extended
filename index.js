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
const imq = require('./utils/imq');
const colorMap = require('./utils/colorMap');

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
  const workDir = path.join(
    `${filePathNoExt(options.video)}_${repoName}`,
    uniqueDate
  );
  const framesDir = path.join(workDir, 'ffmpeg_images');
  const framsQuanted = path.join(workDir, 'ffmpeg_images', 'quantized');
  const framesImq = path.join(workDir, 'ffmpeg_images', 'imq');
  const ggImageDir = path.join(workDir, 'GauGAN_images');
  const videoOutDir = path.join(workDir, 'video_out');
  mkdir(framesDir);
  mkdir(framsQuanted);
  mkdir(framesImq);
  await videoToFrames(options.video, framesDir);
  // wrangle input images
  const files = [];
  fs.readdirSync(framesDir).forEach((e) => {
    const filePath = path.join(framesDir, e);
    if (!fs.lstatSync(filePath).isDirectory()) files.push(filePath);
  });
  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  // files = files.slice(0, 2)
  // Input cleanup and reseg/quant
  log.log('Running quantizations...');
  let t0 = new Date();
  for (let i = 0; i < files.length; i++) {
    progressBar.progressBar(i, files.length, t0);
    const fileName = path.parse(files[i]).base;
    const input = path.join(framesDir, fileName);
    const inter = path.join(framsQuanted, fileName);
    const out = path.join(framesImq, fileName);
    imq.process(input, inter, out, [
      colorMap.water,
      colorMap.mountain,
      colorMap.clouds
    ]);
  }

  const cleanedImages = [];
  fs.readdirSync(framesImq).forEach((e) => {
    const filePath = path.join(framesImq, e);
    if (!fs.lstatSync(filePath).isDirectory()) cleanedImages.push(filePath);
  });
  cleanedImages.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  log.log('Creating InferenceSession');
  const inferenceSession = new InferenceSession(uniqueDate);

  t0 = new Date();
  mkdir(ggImageDir);
  for (let i = 0; i < cleanedImages.length; i++) {
    progressBar.progressBar(i, cleanedImages.length, t0);
    inferenceSession.segmap = fs.readFileSync(cleanedImages[i]);
    const res = await inferenceSession.infer();
    const blob = res ? await res.blob() : log.error(`Invalid Response: ${res}`);
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

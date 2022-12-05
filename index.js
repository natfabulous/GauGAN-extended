// Imports
const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const progressBar = require('progress-bar-cli');
const log = require('./utils/logger');
const InferenceSession = require('./fetch');
const { mkdir } = require('./utils/filenameplus');
const { videoToFrames, framesToVideo } = require('./utils/ffmpegUtils');

// Command line args
program
  .option('-v, --debug', 'output extra debugging')
  .option('-i, --video [string]', 'input file for use with video')
  .option(
    '-w, --working [string]',
    'working directory where intermediary info is saved'
  )
  .option('-d, --directory [string]', 'input directory for image sequences')
  .option('-o, --output [string]', 'output directory')
  .option('-x, --skipToMux', 'skip straight to muxing')
  .option('-m, --targetVideoFile [string]', 'target for muxed video file');
program.parse(process.argv);

// indir may not be set yet
const options = program.opts();
if (options.debug) log.level = 'debug';

// Actual program
(async () => {
  if (!options.skipToMux) {
    if (options.working) mkdir(options.working);
    if (options.video) {
      await videoToFrames(options.video, options.working);
    }
    // wrangle input images
    const imagedir = options.working ? options.working : options.directory;
    const outdir = options.output;
    const files = [];
    fs.readdirSync(imagedir).forEach((e) => {
      files.push(`${imagedir}\\${e.name}`);
    });
    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    log.log('Creating InferenceSession');
    const is = new InferenceSession(
      new Date().toISOString().slice(0, -5).replaceAll(':', '_')
    );

    const t0 = new Date();
    for (let i = 0; i < files.length; i++) {
      progressBar.progressBar(i, files.length, t0);
      is.segmap = fs.readFileSync(files[i]);
      const res = await is.infer();
      const blob = await res.blob();
      const abuff = await blob.arrayBuffer();
      const uarr = new Uint8Array(abuff);
      const buff = Buffer.from(uarr);
      mkdir(outdir);
      fs.writeFileSync(`${outdir}/${i + 1}.jpg`, buff);
    }
  } else {
    mkdir(path.parse(options.targetVideoFile).dir);
    await framesToVideo(options.working, options.targetVideoFile, {
      sourceVideo: options.video
    });
  }
})();

// Imports
const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const log = require('./logger');
const InferenceSession = require('./fetch');
const { mkdir } = require('./utils/filenameplus');
const { videoToFrames, framesToVideo } = require('./utils/ffmpegUtils');
const progressBar = require('progress-bar-cli');

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
    let imagedir = options.working ? options.working : options.directory;
    let outdir = options.output;
    const dir = fs.opendirSync(imagedir);
    let files = [],
      e;
    while ((e = dir.readSync()) !== null) {
      files.push(imagedir + '\\' + e.name);
    }
    dir.closeSync();
    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    log.log(files);
    log.log('Creating InferenceSession');
    let is = new InferenceSession(
      new Date().toISOString().slice(0, -5).replaceAll(':', '_')
    );

    let t0 = new Date();
    for (const [i, e] of files.entries()) {
      progressBar.progressBar(i, files.length, t0);
      is.segmap = fs.readFileSync(e);
      let res = await is.infer();
      let blob = await res.blob();
      let abuff = await blob.arrayBuffer();
      let uarr = new Uint8Array(abuff);
      let buff = Buffer.from(uarr);
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

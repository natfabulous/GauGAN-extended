// https://www.gyan.dev/ffmpeg/builds/
const execa = require('execa');
const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static').path;
const path = require('path');
const { extendName, extendPath } = require('./filenameplus');
const log = require('./logger');

const tryExeca = async (BIN, command) => {
  try {
    let cmd = command;
    // cmd = ['-v','quiet'].concat(cmd) //no stderr
    cmd = ['-hide_banner'].concat(cmd);
    if (BIN === ffmpeg) {
      cmd = cmd.concat(['-y']);
    }
    log.log(`ffmpegUtils.exe tryExeca cmd: ${cmd}`);
    const proc = execa(BIN, cmd);
    proc.stderr.pipe(process.stdout);
    return await proc;
  } catch (err) {
    log.error(err);
    return null;
  }
};

const getVideoInfo = async (infile) => {
  const x = await tryExeca(ffprobe, [
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    infile
  ]);
  log.debug(x.stdout);
  return JSON.parse(x.stdout);
};

const calcNumberOfFrames = async (video) => {
  const vinfo = await getVideoInfo(video);
  const frameRate = parseFloat(vinfo.streams[0].r_frame_rate);
  const duration = parseFloat(vinfo.streams[0].duration);
  return Math.round(frameRate * duration);
};

// TODO crop and turn to images in same step
const cropVideoSquare = async (infile, ofile, vinfo) => {
  const { width } = vinfo;
  const { height } = vinfo;
  const cmd = [
    '-i',
    infile,
    '-vf',
    width < height ? 'crop=iw:iw' : 'crop=ih:ih',
    ofile
  ];
  return tryExeca(ffmpeg, cmd);
};
const evalDivString = (divString) => {
  const arr = divString.split('/');
  return arr[0] / arr[1];
};
const videoToFrames = async (infile, outdir) => {
  log.log(infile);
  log.log(outdir);
  const vinfo = await getVideoInfo(infile);
  const croppedPath = extendPath(
    extendName(infile, '-cropped'),
    'intermediary'
  );
  await cropVideoSquare(infile, croppedPath, vinfo);
  const cmd = ['-i', croppedPath, `${outdir}/%d.png`];
  return tryExeca(ffmpeg, cmd);
};
const framesToVideo = async (indir, outfile, options) => {
  let fps = 30; // reasonable default
  const source = options.sourceVideo;
  if (options.fps) {
    fps = options.fps;
  } else {
    const vinfo = await getVideoInfo(source);
    fps = evalDivString(vinfo.streams[0].r_frame_rate).toFixed(2);
  }

  const cmd = [
    '-r',
    fps,
    '-f',
    'image2',
    '-s',
    '1024x1024',
    '-i',
    `${indir}/%d.jpg`,
    source ? '-i' : '', // mux audio from source in if passed in
    source || '',
    source ? '-map' : '',
    source ? '0:v' : '',
    source ? '-map' : '',
    source ? '1:a' : '',
    source ? '-c:a' : '',
    source ? 'copy' : '',
    source ? '-shortest' : '',
    '-vcodec',
    'libx264',
    '-crf',
    '17',
    '-pix_fmt',
    'yuv420p',
    path.join(outfile, 'out.mp4')
  ];
  return tryExeca(ffmpeg, cmd);
};
module.exports = { calcNumberOfFrames, videoToFrames, framesToVideo };

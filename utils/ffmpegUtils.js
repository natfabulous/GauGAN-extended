//https://www.gyan.dev/ffmpeg/builds/
const execa = require("execa")
const log = require('../logger')
const path = require('path');
const {mkdir, extendPath, extendName} = require('./filenameplus')
const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static').path;

const tryExeca = async (BIN, cmd) => {
  try {
    // cmd = ['-v','quiet'].concat(cmd) //no stderr
    cmd = ['-hide_banner'].concat(cmd)
    if(BIN==ffmpeg) cmd=cmd.concat(['-y']) 
    log.log(`ffmpegUtils.exe tryExeca cmd: ${cmd}`)
    let proc = execa(BIN,cmd)
    proc.stderr.pipe(process.stdout)
    return await proc
  } catch (err) {
    log.error(err)
  }
}

const getVideoInfo = async(infile)=>{
  let x = await tryExeca (ffprobe,
  [
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    infile
  ])
  log.debug(x.stdout)
  return JSON.parse(x.stdout)
}

// TODO crop and turn to images in same step
const cropVideoSquare = async (infile,ofile,vinfo)=>{
  let width = vinfo.width
  let height = vinfo.height
  let cmd = [
    '-i',
    infile,
    '-vf',
    width<height ? 'crop=iw:iw' : 'crop=ih:ih',
    ofile
  ]
  await tryExeca(ffmpeg,cmd)
}
const videoToFrames = async (infile,outdir)=>{
  let vinfo = await getVideoInfo(infile)
  let croppedPath = extendPath(extendName(infile,'-cropped'),'intermediary')
  await cropVideoSquare(infile,croppedPath,vinfo)
  cmd = [
    '-i',
    croppedPath,
    outdir+'/%d.png'
  ]
  await tryExeca(ffmpeg,cmd)
}
const framesToVideo = async (indir,outfile,options)=>{
  let fps = 30 //reasonable default
  let source = options.sourceVideo
  if (options.fps){
    fps = options.fps
  }else{
    let vinfo = await getVideoInfo(source)
    fps = eval(vinfo.streams[0].r_frame_rate).toFixed(2)
  }

  cmd = [
    '-r',
    fps,
    '-f',
    'image2',
    '-s',
    '1024x1024',
    '-i',
    `${indir}%d.jpg`,
    source ? '-i' : '', // mux audio from source in if passed in
    source ? source : '',
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
    outfile
  ]
  tryExeca(ffmpeg,cmd)
}

module.exports = {videoToFrames, framesToVideo}
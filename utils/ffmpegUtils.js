//https://www.gyan.dev/ffmpeg/builds/
const execa = require("execa")
const log = require('../logger')
const path = require('path');
const {mkdir, extendPath, extendName} = require('./filenameplus')
const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static').path;

const tryExeca = async (BIN, cmd) => {
  try {
    cmd = ['-v','quiet'].concat(cmd) //no stderr
    if(BIN==ffmpeg) cmd=cmd.concat(['-y']) 
    log.log(`ffmpegUtils.exe tryExeca cmd: ${cmd}`)
    return await execa(BIN,cmd)
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

module.exports = videoToFrames
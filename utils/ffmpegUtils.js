//https://www.gyan.dev/ffmpeg/builds/
const execa = require("execa")
const log = require('../logger')

const BIN = require('ffmpeg-static');
const tryExeca = async (cmd) => {
  try {
    log.debug(`ffmpegUtils.exe tryExeca cmd: ${cmd}`)
    await execa(BIN,cmd)
  } catch (err) {
    log.error(err)
  }
}


(async () => {
  await tryExeca([
        '-i',
        '../src/test.jpg',
        '../out/test.png',
      ])
})()
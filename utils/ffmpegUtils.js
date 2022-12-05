//https://www.gyan.dev/ffmpeg/builds/
const execa = require('execa');
const log = require('../logger');
const path = require('path');
const { mkdir, extendPath, extendName } = require('./filenameplus');
const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static').path;

const tryExeca = async (BIN, cmd) => {
  try {
    // cmd = ['-v','quiet'].concat(cmd) //no stderr
    cmd = ['-hide_banner'].concat(cmd);
    if (BIN == ffmpeg) cmd = cmd.concat(['-y']);
    log.log(`ffmpegUtils.exe tryExeca cmd: ${cmd}`);
    let proc = execa(BIN, cmd);
    proc.stderr.pipe(process.stdout);
    return await proc;
  } catch (err) {
    log.error(err);
  }
};

const getVideoInfo = async (infile) => {
  let x = await tryExeca(ffprobe, [
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
  let vinfo = await getVideoInfo(infile);
  let frameRate = parseFloat(vinfo.streams[0].r_frame_rate);
  let duration = parseFloat(vinfo.streams[0].duration);
  return Math.round(frameRate * duration);
};

// TODO crop and turn to images in same step
const cropVideoSquare = async (infile, ofile, vinfo) => {
  let width = vinfo.width;
  let height = vinfo.height;
  let cmd = [
    '-i',
    infile,
    '-vf',
    width < height ? 'crop=iw:iw' : 'crop=ih:ih',
    ofile
  ];
  await tryExeca(ffmpeg, cmd);
};
const videoToFrames = async (infile, outdir) => {
  let vinfo = await getVideoInfo(infile);
  let croppedPath = extendPath(extendName(infile, '-cropped'), 'intermediary');
  await cropVideoSquare(infile, croppedPath, vinfo);
  cmd = ['-i', croppedPath, outdir + '/%d.png'];
  await tryExeca(ffmpeg, cmd);
};
const framesToVideo = async (indir, outfile, options) => {
  let fps = 30; //reasonable default
  let source = options.sourceVideo;
  if (options.fps) {
    fps = options.fps;
  } else {
    let vinfo = await getVideoInfo(source);
    fps = eval(vinfo.streams[0].r_frame_rate).toFixed(2);
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
  ];
  tryExeca(ffmpeg, cmd);
};
module.exports = { calcNumberOfFrames, videoToFrames, framesToVideo };

/*
{
  "streams": [
      {
          "index": 0,
          "codec_name": "h264",
          "codec_long_name": "H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10",
          "profile": "Main",
          "codec_type": "video",
          "codec_tag_string": "avc1",
          "codec_tag": "0x31637661",
          "width": 1920,
          "height": 1080,
          "coded_width": 1920,
          "coded_height": 1080,
          "closed_captions": 0,
          "has_b_frames": 1,
          "sample_aspect_ratio": "1:1",
          "display_aspect_ratio": "16:9",
          "pix_fmt": "yuv420p",
          "level": 41,
          "chroma_location": "left",
          "refs": 1,
          "is_avc": "true",
          "nal_length_size": "4",
          "r_frame_rate": "30000/1001",
          "avg_frame_rate": "30000/1001",
          "time_base": "1/30000",
          "start_pts": 0,
          "start_time": "0.000000",
          "duration_ts": 707707,
          "duration": "23.590233",
          "bit_rate": "19450752",
          "bits_per_raw_sample": "8",
          "nb_frames": "707",
          "disposition": {
              "default": 1,
              "dub": 0,
              "original": 0,
              "comment": 0,
              "lyrics": 0,
              "karaoke": 0,
              "forced": 0,
              "hearing_impaired": 0,
              "visual_impaired": 0,
              "clean_effects": 0,
              "attached_pic": 0,
              "timed_thumbnails": 0
          },
          "tags": {
              "creation_time": "2022-12-03T23:37:30.000000Z",
              "language": "eng",
              "handler_name": "\u001fMainconcept Video Media Handler",
              "vendor_id": "[0][0][0][0]",
              "encoder": "AVC Coding"
          }
      },
      {
          "index": 1,
          "codec_name": "aac",
          "codec_long_name": "AAC (Advanced Audio Coding)",
          "profile": "LC",
          "codec_type": "audio",
          "codec_tag_string": "mp4a",
          "codec_tag": "0x6134706d",
          "sample_fmt": "fltp",
          "sample_rate": "48000",
          "channels": 2,
          "channel_layout": "stereo",
          "bits_per_sample": 0,
          "r_frame_rate": "0/0",
          "avg_frame_rate": "0/0",
          "time_base": "1/48000",
          "start_pts": 0,
          "start_time": "0.000000",
          "duration_ts": 1132331,
          "duration": "23.590229",
          "bit_rate": "317333",
          "nb_frames": "1107",
          "disposition": {
              "default": 1,
              "dub": 0,
              "original": 0,
              "comment": 0,
              "lyrics": 0,
              "karaoke": 0,
              "forced": 0,
              "hearing_impaired": 0,
              "visual_impaired": 0,
              "clean_effects": 0,
              "attached_pic": 0,
              "timed_thumbnails": 0
          },
          "tags": {
              "creation_time": "2022-12-03T23:37:30.000000Z",
              "language": "eng",
              "handler_name": "#Mainconcept MP4 Sound Media Handler",
              "vendor_id": "[0][0][0][0]"
          }
      }
  ]
}
*/

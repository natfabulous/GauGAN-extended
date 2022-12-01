// Imports
const fs = require('fs')
const { program } = require('commander');
const log = require('./logger')
const InferenceSession = require('./fetch')

// Command line args
program
  .option('-d, --debug', 'output extra debugging')
program.parse(process.argv);

const options = program.opts();
if (options.debug) log.level = 'debug';

// Actual program

// get Files
let dirname = 'X:\\Scratch\\invoke animation\\ipod\\frames'
const dir = fs.opendirSync(dirname)
let files = [], e
while ((e = dir.readSync()) !== null) { files.push(dirname+'\\'+e.name)}
dir.closeSync()
files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
log.log(files)
/////////
;(async () => {
  let is = new InferenceSession(new Date().toISOString().slice(0, -5).replaceAll(':', '_'))

  for (const [i,e] of files.entries()) {
    is.segmap=fs.readFileSync(e)
    let res = await is.infer()
    let blob = await res.blob()
    let abuff = await blob.arrayBuffer();
    let uarr = new Uint8Array(abuff)
    let buff = Buffer.from(uarr)
    fs.writeFileSync(`out/iphone/1/${i+1}.jpg`, buff)
  }
})()
const path = require('path')
const fs = require('fs')

const mkdir = (dir) => {try{fs.mkdirSync(dir, {recursive:true})}catch{}}
const extendPath = (filepath,mod)=>{
  let dir = path.join(path.parse(filepath).dir,mod)
  mkdir(dir)
  return path.join(dir,path.parse(filepath).base)
}
const extendName = (filepath,mod)=>{
  return path.join(
    path.parse(filepath).dir,
    path.parse(filepath).name+mod+
    path.parse(filepath).ext)
}



module.exports = {mkdir,extendPath, extendName}
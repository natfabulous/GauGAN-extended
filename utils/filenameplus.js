const path = require('path');
const fs = require('fs');
const log = require('./logger');

const mkdir = (dir) => {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    log.error(e);
  }
};
const extendPath = (filepath, mod) => {
  const dir = path.join(path.parse(filepath).dir, mod);
  mkdir(dir);
  return path.join(dir, path.parse(filepath).base);
};
const extendName = (filepath, mod) => {
  const extended = path.join(
    path.parse(filepath).dir,
    path.parse(filepath).name + mod + path.parse(filepath).ext
  );
  return extended;
};

module.exports = { mkdir, extendPath, extendName };

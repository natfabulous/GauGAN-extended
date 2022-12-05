const fetch = require('node-fetch');
const b64Defaults = require('./b64Defaults');
const logger = require('./utils/logger');

const infer = async (body) => {
  logger.debug('infer fetch sent');
  return fetch(
    'http://ec2-54-184-13-84.us-west-2.compute.amazonaws.com:443/gaugan2_infer',
    {
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        pragma: 'no-cache',
        Referer: 'http://gaugan.org/',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      body,
      method: 'POST'
    }
  );
};

const receive = async (body) => {
  logger.debug('receive fetch sent');
  return fetch(
    'http://ec2-54-184-13-84.us-west-2.compute.amazonaws.com:443/gaugan2_receive_output',
    {
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        'content-type':
          'multipart/form-data; boundary=----WebKitFormBoundaryjq68f6wHEgmrzYgL',
        pragma: 'no-cache',
        Referer: 'http://gaugan.org/',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      body,
      method: 'POST'
    }
  );
};

class InferenceSession {
  constructor(sessionId = '11/29/2022,1669731158519-190985090') {
    this.sessionId = sessionId;
    this.masked_segmap_b64 = b64Defaults.sky;
    this.masked_edgemap_b64 = b64Defaults.blank;
    this.masked_image_b64 = b64Defaults.blank;
    this.image_data_prefix = 'data:image/png;base64,';
    this.enable_seg = true;
    this.enable_edge = false;
    this.enable_caption = false;
    this.enable_image = false;
    this.calculateBodies();
  }

  calculateBodies() {
    this.infer_body =
      `name=${encodeURIComponent(this.sessionId)}` +
      `&masked_segmap=${encodeURIComponent(this.image_data_prefix)}` +
      `${encodeURIComponent(this.masked_segmap_b64)}` +
      `&masked_edgemap=${encodeURIComponent(this.image_data_prefix)}` +
      `${encodeURIComponent(this.masked_edgemap_b64)}` +
      `&masked_image=${encodeURIComponent(this.image_data_prefix)}` +
      `${encodeURIComponent(this.masked_image_b64)}` +
      '&style_name=random' +
      '&caption=' +
      `&enable_seg=${this.enable_seg}` +
      `&enable_edge=${this.enable_edge}` +
      `&enable_caption=${this.enable_caption}` +
      `&enable_image=${this.enable_image}` +
      '&use_model2=false';
    this.receive_body =
      '------WebKitFormBoundaryjq68f6wHEgmrzYgL\r\n' +
      'Content-Disposition: form-data; name="name"\r\n' +
      '\r\n' +
      `${this.sessionId}\r\n` +
      '------WebKitFormBoundaryjq68f6wHEgmrzYgL--\r\n';
  }

  async infer() {
    let res = await infer(this.infer_body);
    if (res.status !== 200) {
      logger.error(`Inference POST request: ${res.status}`);
      return false;
    }
    res = await receive(this.receive_body);
    if (res.status !== 200) {
      logger.error(`Receive POST request: ${res.status}`);
      return false;
    }
    return res;
  }

  set segmap(buf) {
    this.masked_segmap_b64 = buf.toString('base64');
    this.enable_seg = true;
    this.calculateBodies();
  }
}

module.exports = InferenceSession;

import { URLScheme } from 'url-resolver-fs';
const Client = require('ssh2-sftp-client');
const { URL } = require('url');

function invalidURLError(url) {
  Promise.reject(new Error(`Invalid sftp url: ${url}`));
}

/**
 * URLScheme for sftp access
 */
export default class SFTPScheme extends URLScheme {
  /**
   * Scheme name if 'sftp'
   * @return {string} 'sftp'
   */
  static get name() {
    return 'sftp';
  }

  /**
   * @return {number} 22 the https default port
   */
  static get defaultPort() {
    return 22;
  }

  /**
   * @return {boolean} true
   */
  static get isSecure() {
    return true;
  }

  /**
   * Creates a readable stream for the content of th file associated to a given file URL
   * @param {string} url of the a file
   * @param {object|string} [options] passed as options to fs.createReadStream()
   * @returns {Promise}
   * @fulfil {ReadableStream} - of the file content
   */
  async get(url, options) {
    const m = url.match(/^sftp:\/\/(.*)/);

    if (m) {
      url = new URL(url);
      const sftp = new Client();

      const co = {
        host: url.hostname,
        port: url.port || this.constructor.defaultPort
      };

      if (url.username !== undefined) {
        co.username = url.username;
      }
      if (url.password !== undefined) {
        co.password = url.password;
      }

      const conn = await sftp.connect(co);

      return conn.get(url.pathname);
    }

    return invalidURLError(url);
  }
}

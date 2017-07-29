import { URLScheme } from 'url-resolver-fs';
const Client = require('ssh2-sftp-client');
const { URL } = require('url');

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

  constructor(options = {}) {
    super();

    if (options.privateKey !== undefined) {
      Object.defineProperty(this, 'privateKey', { value: options.privateKey });
    }
  }

  /**
   * Creates a readable stream for the content of th file associated to a given file URL
   * @param url {URL} of the a file
   * @param [options] {object|string} passed as options to fs.createReadStream()
   * @returns {Promise}
   * @fulfil {ReadableStream} - of the file content
   */
  async get(url, options) {
    const sftp = new Client();

    const co = {
      privateKey: this.privateKey,
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
}

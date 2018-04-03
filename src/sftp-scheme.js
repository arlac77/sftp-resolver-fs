import { URLScheme } from 'url-resolver-fs';
const Client = require('ssh2-sftp-client');
const { URL } = require('url');

function invalidURLError(url) {
  Promise.reject(new Error(`Invalid sftp url: ${url}`));
}

/**
 * URLScheme for sftp access
 * @param {Object} options
 * @param {UInt8Array|Buffer} options.privateKey
 */
export class SFTPScheme extends URLScheme {
  /**
   * Scheme name is 'sftp'
   * @return {string} 'sftp'
   */
  static get name() {
    return 'sftp';
  }

  /**
   * @return {number} 22 the sftp default port
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
   * @param {Context} context
   * @param {URL} url of the a file
   * @param {Object|string} [options] passed as options to fs.createReadStream()
   * @returns {Promise<ReadableStream>} of the file content
   */
  async get(context, url, options) {
    if (url.protocol === 'sftp:') {
      const sftp = new Client();

      const co = {
        privateKey: this.privateKey,
        host: url.hostname,
        port: url.port || this.constructor.defaultPort
      };

      ['username', 'password'].forEach(p => {
        if (url[p] !== undefined) {
          co[p] = url[p];
        }
      });

      const conn = await sftp.connect(co);

      //console.log(conn);
      console.log(`1 get: ${url.pathname}`);

      const r = conn.get(url.pathname);

      console.log(`2 get: ${r}`);
      return r;
    }

    return invalidURLError(url);
  }
}

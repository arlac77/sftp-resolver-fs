import test from 'ava';
import SFTPScheme from '../src/sftp-scheme';

const { URL } = require('url');
const path = require('path');
const fs = require('fs');
const ssh2 = require('ssh2');
const streamEqual = require('stream-equal');
const OPEN_MODE = ssh2.SFTP_OPEN_MODE;
const STATUS_CODE = ssh2.SFTP_STATUS_CODE;

const PORT = 12345;
const USER = 'abc';
const PASSWORD = 'secret';
const FILE = path.join(__dirname, '..', 'tests', 'sftp-test.js');

test('has name', t => {
  const scheme = new SFTPScheme();
  t.is(scheme.name, 'sftp');
});

test('is secure', t => {
  const scheme = new SFTPScheme();
  t.is(scheme.isSecure, true);
});

test('default port', t => {
  const scheme = new SFTPScheme();
  t.is(scheme.defaultPort, 22);
});

test.before('start SFTP server', async t => {
  return createSFTPServer();
});

test.cb('get', t => {
  t.plan(1);

  const context = undefined;
  const scheme = new SFTPScheme({
    privateKey: fs.readFileSync(
      path.join(__dirname, '..', 'tests', 'fixtures', 'identity.key')
    )
  });
  scheme
    .get(
      context,
      new URL(`sftp://${USER}:${PASSWORD}@localhost:${PORT}${FILE}`)
    )
    .then(content => {
      streamEqual(fs.createReadStream(FILE), content, (err, equal) => {
        t.truthy(equal);
        t.end();
      });
    });
});

/*
test('stat', async t => {
  const context = undefined;
  const scheme = new SFTPScheme({
    privateKey: fs.readFileSync(
      path.join(__dirname, '..', 'tests', 'fixtures', 'identity.key')
    )
  });
  info = await scheme.stat(
    context,
    new URL(`sftp://${USER}:${PASSWORD}@localhost:${PORT}${FILE}`)
  );

  t.is(info, 7);
});
*/

function createSFTPServer() {
  return new Promise((resolve, reject) =>
    new ssh2.Server(
      {
        hostKeys: [
          fs.readFileSync(
            path.join(__dirname, '..', 'tests', 'fixtures', 'host.key')
          )
        ]
      },
      function(client) {
        //console.log('Client connected!');

        client
          .on('authentication', ctx => {
            if (
              ctx.method === 'password' &&
              ctx.username === USER &&
              ctx.password === PASSWORD
            ) {
              ctx.accept();
            } else {
              ctx.reject();
            }
          })
          .on('ready', () => {
            client.on('session', (accept, reject) => {
              const session = accept();
              session.on('sftp', (accept, reject) => {
                //console.log('Client SFTP session');
                const openFiles = {};
                let handleCount = 0;
                let fd;

                const sftpStream = accept();
                sftpStream
                  .on('OPEN', (reqid, filename, flags, attrs) => {
                    console.log(`Opening ${filename}`);

                    if (filename !== FILE || !(flags & OPEN_MODE.READ)) {
                      return sftpStream.status(reqid, STATUS_CODE.FAILURE);
                    }
                    const handle = new Buffer(4);
                    openFiles[handleCount] = true;
                    handle.writeUInt32BE(handleCount++, 0, true);
                    sftpStream.handle(reqid, handle);
                    fd = fs.openSync(filename, 'r');
                  })
                  .on('STAT', (reqid, handle) => {
                    console.log('STAT');

                    sftpStream.attrs(reqid, {
                      mode: 0,
                      uid: 0,
                      gid: 0,
                      size: 5119,
                      atime: 0,
                      mtime: 0
                    });
                  })
                  .on('FSTAT', (reqid, handle) => {
                    console.log('FSTAT');

                    sftpStream.attrs(reqid, {
                      mode: 0,
                      uid: 0,
                      gid: 0,
                      size: 5119,
                      atime: 0,
                      mtime: 0
                    });
                  })
                  .on('READ', (reqid, handle, offset, length) => {
                    console.log(
                      'READ from file at offset %d length %d',
                      offset,
                      length
                    );

                    if (offset >= 5119) {
                      return sftpStream.status(reqid, STATUS_CODE.EOF);
                    }

                    const buffer = Buffer.alloc(length);
                    fs.read(
                      fd,
                      buffer,
                      0,
                      length,
                      0,
                      (err, bytesRead, buffer) => {
                        console.log(`read done ${bytesRead}`);
                        sftpStream.data(reqid, buffer.slice(0, bytesRead));
                      }
                    );
                  })
                  .on('WRITE', (reqid, handle, offset, data) => {
                    if (
                      handle.length !== 4 ||
                      !openFiles[handle.readUInt32BE(0, true)]
                    ) {
                      return sftpStream.status(reqid, STATUS_CODE.FAILURE);
                    }
                    sftpStream.status(reqid, STATUS_CODE.OK);
                    const inspected = require('util').inspect(data);
                    console.log(
                      'Write to file at offset %d: %s',
                      offset,
                      inspected
                    );
                  })
                  .on('CLOSE', (reqid, handle) => {
                    let fnum;
                    if (
                      handle.length !== 4 ||
                      !openFiles[(fnum = handle.readUInt32BE(0, true))]
                    ) {
                      return sftpStream.status(reqid, STATUS_CODE.FAILURE);
                    }
                    delete openFiles[fnum];
                    sftpStream.status(reqid, STATUS_CODE.OK);
                  });
              });
            });
          })
          .on('end', () => console.log('Client disconnected'));
      }
    ).listen(PORT, function() {
      console.log('Listening on port ' + this.address().port);
      resolve(this);
    })
  );
}

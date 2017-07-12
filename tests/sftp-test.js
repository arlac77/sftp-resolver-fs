import test from 'ava';
import SFTPScheme from '../src/sftp-scheme';

const url = require('url');
const path = require('path');
const fs = require('fs');
const ssh2 = require('ssh2');
const OPEN_MODE = ssh2.SFTP_OPEN_MODE;
const STATUS_CODE = ssh2.SFTP_STATUS_CODE;

const PORT = 12345;
const USER = 'abc';
const PASSWORD = 'secret';

new ssh2.Server(
  {
    hostKeys: [
      fs.readFileSync(
        path.join(__dirname, '..', 'tests', 'fixtures', 'host.key')
      )
    ]
  },
  function(client) {
    console.log('Client connected!');

    client
      .on('authentication', function(ctx) {
        if (
          ctx.method === 'password' &&
          ctx.username === USER &&
          ctx.password === PASSWORD
        )
          ctx.accept();
        else ctx.reject();
      })
      .on('ready', function() {
        console.log('Client authenticated!');

        client.on('session', function(accept, reject) {
          var session = accept();
          session.on('sftp', function(accept, reject) {
            console.log('Client SFTP session');
            var openFiles = {};
            var handleCount = 0;
            var sftpStream = accept();
            sftpStream
              .on('OPEN', function(reqid, filename, flags, attrs) {
                if (filename !== '/tmp/foo.txt' || !(flags & OPEN_MODE.WRITE))
                  return sftpStream.status(reqid, STATUS_CODE.FAILURE);
                var handle = new Buffer(4);
                openFiles[handleCount] = true;
                handle.writeUInt32BE(handleCount++, 0, true);
                sftpStream.handle(reqid, handle);
                console.log('Opening file for write');
              })
              .on('READ', function(reqid, handle, offset, data) {
                console.log(
                  'Write to file at offset %d: %s',
                  offset,
                  inspected
                );
              })
              .on('WRITE', function(reqid, handle, offset, data) {
                if (
                  handle.length !== 4 ||
                  !openFiles[handle.readUInt32BE(0, true)]
                )
                  return sftpStream.status(reqid, STATUS_CODE.FAILURE);
                sftpStream.status(reqid, STATUS_CODE.OK);
                var inspected = require('util').inspect(data);
                console.log(
                  'Write to file at offset %d: %s',
                  offset,
                  inspected
                );
              })
              .on('CLOSE', function(reqid, handle) {
                var fnum;
                if (
                  handle.length !== 4 ||
                  !openFiles[(fnum = handle.readUInt32BE(0, true))]
                )
                  return sftpStream.status(reqid, STATUS_CODE.FAILURE);
                delete openFiles[fnum];
                sftpStream.status(reqid, STATUS_CODE.OK);
                console.log('Closing file');
              });
          });
        });
      })
      .on('end', function() {
        console.log('Client disconnected');
      });
  }
).listen(
  PORT,
  /*'127.0.0.1',*/ function() {
    console.log('Listening on port ' + this.address().port);
  }
);

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

test('get', async t => {
  const scheme = new SFTPScheme();
  const content = await scheme.get(
    `sftp://${USER}:${PASSWORD}@localhost:${PORT}/` +
      path.join(__dirname, '..', 'tests', 'sftp-test.js')
  );

  t.is(content, 'XXX');
});

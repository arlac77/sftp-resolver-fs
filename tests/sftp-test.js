import test from "ava";
import { SFTPScheme } from "../src/sftp-scheme";
import { join } from "path";
import { readFileSync, createReadStream, openSync, read } from "fs";
import { Server, SFTP_OPEN_MODE, SFTP_STATUS_CODE } from "ssh2";
import streamEqual from "stream-equal";

const PORT = 12345;
const USER = "abc";
const PASSWORD = "secret";
const FILE = join(__dirname, "..", "tests", "sftp-test.js");

test("has name", t => {
  const scheme = new SFTPScheme();
  t.is(scheme.name, "sftp");
});

test("is secure", t => {
  const scheme = new SFTPScheme();
  t.is(scheme.isSecure, true);
});

test("default port", t => {
  const scheme = new SFTPScheme();
  t.is(scheme.defaultPort, 22);
});

test.before("start SFTP server", async t => createSFTPServer());

test.cb.skip("get", t => {
  t.plan(1);

  const context = undefined;
  const scheme = new SFTPScheme({
    privateKey: readFileSync(
      join(__dirname, "..", "tests", "fixtures", "identity.key")
    )
  });

  scheme
    .get(
      context,
      new URL(`sftp://${USER}:${PASSWORD}@localhost:${PORT}${FILE}`)
    )
    .then(content => {
      console.log(`get ${content}`);
      streamEqual(createReadStream(FILE), content, (err, equal) => {
        t.truthy(equal);
        t.end();
      });
    });
});

/*
test('stat', async t => {
  const context = undefined;
  const scheme = new SFTPScheme({
    privateKey: readFileSync(
      join(__dirname, '..', 'tests', 'fixtures', 'identity.key')
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
    new Server(
      {
        hostKeys: [
          readFileSync(join(__dirname, "..", "tests", "fixtures", "host.key"))
        ]
      },
      client => {
        console.log("Client connected");

        client
          .on("authentication", ctx => {
            console.log(
              `authentication ${ctx.method} ${ctx.username} ${ctx.password}`
            );

            if (
              ctx.method === "password" &&
              ctx.username === USER &&
              ctx.password === PASSWORD
            ) {
              console.log("accept");
              ctx.accept();
            } else if (
              ctx.method === "publickey" &&
              0 // &&
              //ctx.key.algo === pubKey.fulltype // &&
              //buffersEqual(ctx.key.data, pubKey.public)
            ) {
              if (ctx.signature) {
                const verifier = crypto.createVerify(ctx.sigAlgo);
                verifier.update(ctx.blob);
                if (verifier.verify(pubKey.publicOrig, ctx.signature))
                  ctx.accept();
                else ctx.reject();
              } else {
                // if no signature present, that means the client is just checking
                // the validity of the given public key
                ctx.accept();
              }
            } else {
              ctx.reject();
            }
          })
          .on("ready", () => {
            console.log("ready");

            client.on("session", (accept, reject) => {
              const session = accept();
              session.on("sftp", (accept, reject) => {
                console.log("Client SFTP session");
                const openFiles = {};
                let handleCount = 0;
                let fd;

                const sftpStream = accept();
                sftpStream
                  .on("error", () => console.log("error"))
                  .on("ready", () => console.log("ready"))

                  .on("OPENDIR", () => console.log("OPENDIR"))
                  .on("READDIR", () => console.log("READDIR"))
                  .on("LSTAT", () => console.log("LSTAT"))
                  .on("STAT", () => console.log("STAT"))
                  .on("REMOVE", () => console.log("REMOVE"))
                  .on("RMDIR", () => console.log("RMDIR"))
                  .on("REALPATH", a => console.log(`REALPATH ${a}`))
                  .on("READLINK", () => console.log("READLINK"))
                  .on("SETSTAT", () => console.log("SETSTAT"))
                  .on("MKDIR", () => console.log("MKDIR"))
                  .on("RENAME", () => console.log("RENAME"))
                  .on("SYMLINK", () => console.log("SYMLINK"))
                  .on("RENAME", () => console.log("RENAME"))

                  .on("open", (reqid, filename, flags, attrs) => {
                    console.log(`Opening ${filename}`);

                    if (filename !== FILE || !(flags & SFTP_OPEN_MODE.READ)) {
                      return sftpStream.status(reqid, SFTP_STATUS_CODE.FAILURE);
                    }
                    const handle = new Buffer(4);
                    openFiles[handleCount] = true;
                    handle.writeUInt32BE(handleCount++, 0, true);
                    sftpStream.handle(reqid, handle);
                    fd = openSync(filename, "r");
                  })
                  .on("STAT", (reqid, handle) => {
                    console.log("STAT");

                    sftpStream.attrs(reqid, {
                      mode: 0,
                      uid: 0,
                      gid: 0,
                      size: 5119,
                      atime: 0,
                      mtime: 0
                    });
                  })
                  .on("FSTAT", (reqid, handle) => {
                    console.log("FSTAT");

                    sftpStream.attrs(reqid, {
                      mode: 0,
                      uid: 0,
                      gid: 0,
                      size: 5119,
                      atime: 0,
                      mtime: 0
                    });
                  })
                  .on("READ", (reqid, handle, offset, length) => {
                    console.log(
                      "READ from file at offset %d length %d",
                      offset,
                      length
                    );

                    if (offset >= 5119) {
                      return sftpStream.status(reqid, SFTP_STATUS_CODE.EOF);
                    }

                    const buffer = Buffer.alloc(length);
                    read(fd, buffer, 0, length, 0, (err, bytesRead, buffer) => {
                      console.log(`read done ${bytesRead}`);
                      sftpStream.data(reqid, buffer.slice(0, bytesRead));
                    });
                  })
                  .on("WRITE", (reqid, handle, offset, data) => {
                    if (
                      handle.length !== 4 ||
                      !openFiles[handle.readUInt32BE(0, true)]
                    ) {
                      return sftpStream.status(reqid, SFTP_STATUS_CODE.FAILURE);
                    }
                    sftpStream.status(reqid, SFTP_STATUS_CODE.OK);
                    const inspected = require("util").inspect(data);
                    console.log(
                      "Write to file at offset %d: %s",
                      offset,
                      inspected
                    );
                  })
                  .on("CLOSE", (reqid, handle) => {
                    console.log("CLOSE");

                    let fnum;
                    if (
                      handle.length !== 4 ||
                      !openFiles[(fnum = handle.readUInt32BE(0, true))]
                    ) {
                      return sftpStream.status(reqid, SFTP_STATUS_CODE.FAILURE);
                    }
                    delete openFiles[fnum];
                    sftpStream.status(reqid, SFTP_STATUS_CODE.OK);
                  });

                //console.log(sftpStream);
              });
            });
          })
          .on("end", () => console.log("Client disconnected"));
      }
    ).listen(PORT, function() {
      console.log("Listening on port " + this.address().port);
      resolve(this);
    })
  );
}

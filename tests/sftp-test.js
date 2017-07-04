import test from 'ava';
import SFTPScheme from '../src/sftp-scheme';

const url = require('url');
const path = require('path');

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
    'sftp://localhost/' + path.join(__dirname, '..', 'tests', 'sftp-test.js')
  );

  t.is(content, 'XXX');
});

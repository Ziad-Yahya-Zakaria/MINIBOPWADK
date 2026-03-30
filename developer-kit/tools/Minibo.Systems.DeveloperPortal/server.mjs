import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAccountPackage, DEMO_PUBLIC_KEY_BASE64 } from '../shared/account-package.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = resolve(__dirname, 'public');
const downloadsDir = resolve(__dirname, 'downloads');
mkdirSync(downloadsDir, { recursive: true });

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/api/meta') {
    respondJson(res, 200, {
      publicKey: process.env.MINIBO_BOOTSTRAP_PUBLIC_KEY || DEMO_PUBLIC_KEY_BASE64
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/generate-account') {
    try {
      const body = await readJsonBody(req);
      const packageKind = body.packageKind === 'user' ? 'user' : 'bootstrap';
      const permissions = Array.isArray(body.permissions) ? body.permissions : ['*'];
      const roles = Array.isArray(body.roles) ? body.roles : packageKind === 'bootstrap' ? ['SuperAdmin'] : ['User'];

      const accountPackage = createAccountPackage({
        packageKind,
        username: body.username,
        displayName: body.displayName,
        password: body.password,
        targetInstance: body.targetInstance,
        operator: body.operator || 'Developer Portal',
        expiresDays: Number(body.expiresDays || 7),
        roles,
        permissions,
        signatureSvg: body.signatureSvg || null
      });

      const fileName =
        packageKind === 'bootstrap'
          ? 'bootstrap-account.json'
          : `${String(body.username || 'user').replace(/[^\w.-]+/g, '_')}-user-account.json`;

      writeFileSync(resolve(downloadsDir, fileName), JSON.stringify(accountPackage, null, 2), 'utf8');
      respondJson(res, 200, {
        fileName,
        package: accountPackage
      });
      return;
    } catch (error) {
      respondJson(res, 400, {
        message: error instanceof Error ? error.message : 'failed'
      });
      return;
    }
  }

  const filePath = resolve(publicDir, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
  try {
    const content = readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream'
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const port = Number(process.env.DEV_PORTAL_PORT || 4010);
server.listen(port, () => {
  console.log(`Developer Portal running at http://localhost:${port}`);
});

function respondJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

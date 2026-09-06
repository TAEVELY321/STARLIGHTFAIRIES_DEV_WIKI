import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.png':'image/png'};
const server = http.createServer((req,res) => {
  try {
    const requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (requestPath.endsWith('/') ? requestPath+'index.html' : requestPath));
    const relative = path.relative(root, file);
    if(relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(p=>p.startsWith('.')) || relative.split(path.sep).includes('node_modules')) {res.writeHead(403);res.end('Forbidden');return;}
    if(!fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  } catch {res.writeHead(400);res.end('Bad request');}
});
server.listen(Number(process.env.PORT || 4317), '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${server.address().port}/`));

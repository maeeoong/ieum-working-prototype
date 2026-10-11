import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.m4a':'audio/mp4' };
const server = http.createServer(async (req,res)=>{
  try {
    const url = new URL(req.url,'http://localhost');
    const path = resolve(root,'.'+decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(root+sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(path);
    res.setHeader('Content-Type',types[extname(path)] || 'application/octet-stream');
    res.setHeader('Accept-Ranges','bytes');
    res.setHeader('Cache-Control','no-cache');
    if (req.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if (!match) { res.writeHead(416).end(); return; }
      const start = +match[1], end = match[2] ? Math.min(+match[2],data.length-1) : data.length-1;
      if (start > end || start >= data.length) { res.writeHead(416,{'Content-Range':`bytes */${data.length}`}).end(); return; }
      res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});
      res.end(req.method === 'HEAD' ? undefined : data.subarray(start,end+1)); return;
    }
    res.writeHead(200,{'Content-Length':data.length});res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(Number(process.env.PORT || 4173),'0.0.0.0',()=>console.log(`Local: http://localhost:${server.address().port}`));

const http=require('http'),fs=require('fs'),path=require('path');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.ico':'image/x-icon','.png':'image/png','.pdf':'application/pdf','.txt':'text/plain'};
const s=http.createServer((req,res)=>{
  const url=req.url.split('?')[0];
  const f=path.join('C:/dev/micron',url==='/'?'index.html':url);
  try{
    const c=fs.readFileSync(f);
    const ct=mime[path.extname(f)]||'text/plain';
    res.writeHead(200,{'Content-Type':ct,'Cache-Control':'no-cache','Access-Control-Allow-Origin':'*'});
    res.end(c);
  }catch(e){res.writeHead(404);res.end('not found');}
});
s.listen(7700,()=>console.log('micron-dev ready on http://localhost:7700'));

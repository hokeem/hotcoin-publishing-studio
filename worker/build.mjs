import fs from 'node:fs/promises';
import path from 'node:path';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.json':'application/json'};
const files={};
for(const dir of ['dist','dist/assets']){
 for(const name of await fs.readdir(dir)){
  const full=path.join(dir,name);
  if(!types[path.extname(name)])continue;
  files['/'+path.relative('dist',full)]=[types[path.extname(name)],(await fs.readFile(full)).toString('base64')];
 }
}
const counter=await fs.readFile('dist/twitter-text.js','utf8');
const runtime=(await fs.readFile('dist/publishing-policy.js','utf8')).replace(/export /g,'')+'\n'+(await fs.readFile('dist/hotcoin-links.js','utf8')).replace(/export /g,'')+'\n'+'const verifiedCmcLogos='+await fs.readFile('worker/cmc-verified.json','utf8')+';\n'+(await fs.readFile('worker/lark-source.js','utf8'))+'\n'+(await fs.readFile('worker/daily.js','utf8'))+'\n'+(await fs.readFile('worker/studio-audit.js','utf8'))+'\n'+(await fs.readFile('worker/studio-jobs.js','utf8'))+'\n'+(await fs.readFile('worker/regional-policy.js','utf8'))+'\n'+(await fs.readFile('worker/history.js','utf8'))+'\n'+(await fs.readFile('worker/listing-resolver.js','utf8'))+'\n'+(await fs.readFile('worker/runtime.js','utf8'));
await fs.mkdir('dist/server',{recursive:true});
await fs.writeFile('dist/server/index.js',counter+'\n'+runtime+'\nconst files='+JSON.stringify(files)+';\n'+
'export default {fetch(request,env){configureRuntime(env);const p=new URL(request.url).pathname;if(p==="/mcp")return regionalMcp(request,env);if(p.startsWith("/api/"))return api(request,env);const item=files[p==="/"?"/index.html":p];return item?new Response(Uint8Array.from(atob(item[1]),c=>c.charCodeAt(0)),{headers:{"Content-Type":item[0]}}):new Response("Not found",{status:404});}};');

await fs.mkdir('dist/.openai',{recursive:true});
const hosting=await fs.readFile('.openai/hosting.json').catch(()=>fs.readFile('.openai/hosting.example.json'));
await fs.writeFile('dist/.openai/hosting.json',hosting);

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Proofline,AppError} from './engine.mjs';
const home=path.dirname(fileURLToPath(import.meta.url));
const db = new Proofline(process.env.PROOFLINE_DATA || path.join(home,'data','workspace.json'));
const pin = process.env.PROOFLINE_MANAGER_PIN || String(crypto.randomInt(100000,999999));
const port = Number(process.env.PORT || 4173);
const host = '127.0.0.1';
const staticTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
const sendFile=(res,file)=>{const filepath=path.join(home,'public',file); const data=fs.readFileSync(filepath);res.writeHead(200,{'Content-Type':staticTypes[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);};
async function body(req) {
  let result='';
  for await(const chunk of req) { result+=chunk; if(result.length>20_000) throw new AppError('Request too large.',413); }
  if(!result) return {};
  try {return JSON.parse(result);} catch {throw new AppError('Invalid JSON.');}
}
const authorized = req => {
  const supplied=req.headers['x-manager-pin'];
  if(typeof supplied!=='string' || supplied!==pin) throw new AppError('Manager PIN required or incorrect.',403);
};
const actor = (req)=>String(req.headers['x-actor']||'workspace').slice(0,50);
export function makeHandler(){
  return async (req,res)=>{
    try {
      const url=new URL(req.url,`http://${host}:${port}`), p=url.pathname, method=req.method;
      if(method==='GET' && p==='/') return sendFile(res,'index.html');
      if(method==='GET' && p==='/live') return sendFile(res,'live.html');
      if(method==='GET' && p==='/styles.css') return sendFile(res,'styles.css');
      if(method==='GET' && p==='/app.js') return sendFile(res,'app.js');
      if(method==='GET' && p==='/live.js') return sendFile(res,'live.js');
      if(method==='GET' && p==='/api/health') return json(res,200,{ok:true,service:'Proofline',runtime:'local',apiCharges:0});
      if(method==='GET' && p==='/api/state') return json(res,200,db.getState());
      if(method==='GET' && p==='/api/public') return json(res,200,db.getPublic());
      if(method==='GET' && p==='/api/cases') return json(res,200,db.getState().cases);
      if(method==='POST' && p==='/api/cases') return json(res,201,db.create(await body(req),actor(req)));
      let m;
      if((m=p.match(/^\/api\/cases\/(PL-\d+)$/)) && method==='GET') return json(res,200,db.getCase(m[1]));
      if((m=p.match(/^\/api\/cases\/(PL-\d+)\/claims$/)) && method==='POST') return json(res,201,db.addClaim(m[1],await body(req),actor(req)));
      if((m=p.match(/^\/api\/cases\/(PL-\d+)\/claims\/(C\d+)$/)) && method==='PATCH') return json(res,200,db.replaceClaim(m[1],m[2],await body(req),actor(req)));
      if((m=p.match(/^\/api\/cases\/(PL-\d+)\/claims\/(C\d+)$/)) && method==='DELETE') return json(res,200,db.removeClaim(m[1],m[2],actor(req)));
      if((m=p.match(/^\/api\/cases\/(PL-\d+)\/submit$/)) && method==='POST') return json(res,200,db.submit(m[1],actor(req)));
      if((m=p.match(/^\/api\/cases\/(PL-\d+)\/approve$/)) && method==='POST') {authorized(req);return json(res,200,db.approve(m[1],'manager'));}
      if((m=p.match(/^\/api\/receipts\/(PL-\d+)$/)) && method==='GET') return json(res,200,db.receipt(m[1]));
      if(method==='POST' && p==='/api/facts') {authorized(req);return json(res,200,db.changeFacts(await body(req),'manager'));}
      if(method==='POST' && p==='/api/reset') {authorized(req);return json(res,200,db.reset());}
      json(res,404,{error:'Route not found.'});
    } catch(e) {
      if(e.status) return json(res,e.status,{error:e.message});
      console.error('Internal error:',e);return json(res,500,{error:'Internal server error.'});
    }
  };
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  http.createServer(makeHandler()).listen(port,host,()=>{
    console.log(`\nPROOFLINE is running at http://${host}:${port}`);
    console.log(`Public announcement: http://${host}:${port}/live`);
    console.log(`MANAGER PIN (keep private): ${pin}`);
    console.log('This is a local demonstration. No cloud APIs or external payments.\n');
  });
}

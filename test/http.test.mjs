import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'proofline-http-'));
process.env.PROOFLINE_DATA=path.join(dir,'state.json');
process.env.PROOFLINE_MANAGER_PIN='648219';
const {makeHandler}=await import('../server.mjs');
let server,url;
test.before(async()=>{server=http.createServer(makeHandler());await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${server.address().port}`;});
test.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});});
async function request(method,route,payload,pin){let r=await fetch(url+route,{method,headers:{'content-type':'application/json',...(pin?{'x-manager-pin':pin}:{})},body:payload?JSON.stringify(payload):undefined});return {status:r.status,data:await r.json()};}
test('full HTTP workflow including actual human PIN gate',async()=>{
 const opened=await request('POST','/api/cases',{title:'Berlin launch',rawText:'We can ship to Berlin within two days'});
 assert.equal(opened.status,201);
 const id=opened.data.id;
 const added=await request('POST',`/api/cases/${id}/claims`,{type:'delivery',key:'Berlin',value:2});assert.equal(added.status,201);
 const proposed=await request('POST',`/api/cases/${id}/submit`,{});assert.equal(proposed.status,200);
 const agentCannotPublish=await request('POST',`/api/cases/${id}/approve`,{});assert.equal(agentCannotPublish.status,403);
 const wrongPin=await request('POST',`/api/cases/${id}/approve`,{},'111111');assert.equal(wrongPin.status,403);
 const manager=await request('POST',`/api/cases/${id}/approve`,{},'648219');assert.equal(manager.status,200);assert.equal(manager.data.status,'LIVE');
 const publicResult=await request('GET','/api/public');assert.equal(publicResult.data.status,'LIVE');
 const receipt=await request('GET',`/api/receipts/${id}`);assert.equal(receipt.data.sha256.length,64);
});

#!/usr/bin/env node
/* Restricted operator tool. Never stores or reads the manager PIN. */
const base=process.env.PROOFLINE_URL||'http://127.0.0.1:4173';
const [command,...args]=process.argv.slice(2);
const routes={};
async function call(method,route,payload) {
  let response;
  try {response=await fetch(base+route,{method,headers:{'content-type':'application/json','x-actor':'proofline-agent'},body:payload===undefined?undefined:JSON.stringify(payload)});}
  catch {throw Error('Could not connect. Start the server first: node server.mjs');}
  const data=await response.json();
  if(!response.ok) throw Error(`BLOCKED (${response.status}): ${data.error}`);
  return data;
}
function help() {console.log(`\nPROOFLINE AGENT TOOL — never handles manager approval\n\nnode tool.mjs inbox\nnode tool.mjs facts\nnode tool.mjs case PL-1000\nnode tool.mjs create "Title" "Raw marketing message"\nnode tool.mjs add PL-1000 delivery Berlin 1\nnode tool.mjs add PL-1000 stock ATLAS 10\nnode tool.mjs add PL-1000 returns policy 30\nnode tool.mjs revise PL-1000 C1 2\nnode tool.mjs remove PL-1000 C1\nnode tool.mjs submit PL-1000\nnode tool.mjs live\nnode tool.mjs audit\n\nRules: commands add structured business claims; the server checks real operational data. Only a human manager can publish.\n`);}
try {
 let result;
 if(!command||command==='help') help();
 else if(command==='inbox') result=(await call('GET','/api/cases')).map(x=>({id:x.id,title:x.title,rawText:x.rawText,status:x.status,claims:x.claims}));
 else if(command==='facts') result=(await call('GET','/api/state')).facts;
 else if(command==='case') {if(!args[0]) throw Error('Provide case ID.');result=await call('GET',`/api/cases/${encodeURIComponent(args[0])}`);}
 else if(command==='create') {if(!args[0]||!args[1]) throw Error('Usage: create "Title" "Draft message"');result=await call('POST','/api/cases',{title:args[0],rawText:args[1]});}
 else if(command==='add') {if(args.length!==4) throw Error('Usage: add CASE type key number');result=await call('POST',`/api/cases/${args[0]}/claims`,{type:args[1],key:args[2],value:Number(args[3])});}
 else if(command==='revise') {if(args.length!==3) throw Error('Usage: revise CASE CLAIM_ID new_number');result=await call('PATCH',`/api/cases/${args[0]}/claims/${args[1]}`,{value:Number(args[2])});}
 else if(command==='remove') {if(args.length!==2) throw Error('Usage: remove CASE CLAIM_ID');result=await call('DELETE',`/api/cases/${args[0]}/claims/${args[1]}`);}
 else if(command==='submit') {if(args.length!==1) throw Error('Usage: submit CASE');result=await call('POST',`/api/cases/${args[0]}/submit`);}
 else if(command==='live') result=await call('GET','/api/public');
 else if(command==='audit') result=(await call('GET','/api/state')).events;
 else throw Error('Unknown command. Try: node tool.mjs help');
 if(result!==undefined) console.log(JSON.stringify(result,null,2));
} catch(err) {console.error(err.message);process.exitCode=1;}

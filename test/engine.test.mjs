import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Proofline, AppError} from '../engine.mjs';
const setup=()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'proofline-'));const db=new Proofline(path.join(dir,'state.json'));return {db,dir};};
test('rejects unsupported business promises and allows evidence-backed revisions',()=>{
 const {db}=setup(); const id='PL-1000';
 let result=db.addClaim(id,{type:'delivery',key:'Berlin',value:1});
 assert.equal(result.checks[0].passed,false);
 assert.throws(()=>db.submit(id),e=>e.status===422);
 const claimId=result.claims[0].id;
 result=db.replaceClaim(id,claimId,{value:2});
 assert.equal(result.checks[0].passed,true);
 db.addClaim(id,{type:'returns',key:'policy',value:30});
 const p=db.submit(id);assert.equal(p.status,'AWAITING_APPROVAL');
 assert.ok(p.receipt.hash.length===64);
 assert.throws(()=>db.addClaim(id,{type:'stock',key:'ATLAS',value:1}),e=>e.status===409);
 const live=db.approve(id);assert.equal(live.status,'LIVE');assert.equal(live.lines.length,2);
});
test('cannot publish out-of-stock claim; no false marketing copy reaches live site',()=>{
 const {db}=setup();db.addClaim('PL-1000',{type:'stock',key:'AURORA',value:1});
 assert.equal(db.getCase('PL-1000').checks[0].actual,0);
 assert.throws(()=>db.submit('PL-1000'),e=>e.status===422);
 assert.equal(db.getPublic().status,'EMPTY');
});
test('evidence revisions invalidate manager approval',()=>{
 const {db}=setup(); db.addClaim('PL-1000',{type:'stock',key:'ATLAS',value:15});db.submit('PL-1000');
 db.changeFacts({kind:'stock',key:'ATLAS',value:5});
 assert.throws(()=>db.approve('PL-1000'),e=>e.status===409);
 assert.equal(db.getCase('PL-1000').status,'DRAFT');
 assert.equal(db.getPublic().status,'EMPTY');
});
test('published claims are automatically withdrawn when underlying facts fail',()=>{
 const {db}=setup();db.addClaim('PL-1000',{type:'stock',key:'ATLAS',value:12});db.submit('PL-1000');db.approve('PL-1000');
 assert.equal(db.getPublic().status,'LIVE');
 db.changeFacts({kind:'stock',key:'ATLAS',value:2});
 assert.equal(db.getPublic().status,'WITHHELD');
 assert.ok(!('lines' in db.getPublic()));
});
test('claims cannot be duplicated or invented, persists across restarts',()=>{
 const {db,dir}=setup();db.addClaim('PL-1000',{type:'delivery',key:'Tallinn',value:1});
 assert.throws(()=>db.addClaim('PL-1000',{type:'delivery',key:'Tallinn',value:2}),e=>e.status===409);
 assert.throws(()=>db.addClaim('PL-1000',{type:'fantasy',key:'unicorn',value:3}),e=>e.status===400);
 const again=new Proofline(path.join(dir,'state.json'));
 assert.equal(again.getCase('PL-1000').claims.length,1);
});

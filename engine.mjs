import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const now = () => new Date().toISOString();
const copy = (x) => structuredClone(x);
function digest(x) { return crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex'); }
const deliveryZones = ['Berlin','Paris','Tallinn'];
const skuNames = { AURORA:'Aurora headphones', ATLAS:'Atlas notebook', HALO:'Halo desk lamp' };
export function starterData() {
  const t=now();
  return {
    facts:{ revision:1, deliveryDays:{Berlin:2,Paris:4,Tallinn:1}, stock:{AURORA:0,ATLAS:34,HALO:12}, returnsDays:30 },
    nextCase:1001, nextClaim:1, nextEvent:1,
    cases:[{id:'PL-1000',title:'The launch-day promise',rawText:'Announce: Same-day delivery in Berlin, Aurora headphones are in stock, and customers get 30-day returns.',status:'DRAFT',claims:[],version:1,createdAt:t,updatedAt:t,receipt:null,publishedAt:null}],
    publishedCaseId:null,
    events:[{id:0,time:t,caseId:null,actor:'system',action:'workspace.started',detail:'Sample operations loaded. All business data is fictional.'}]
  };
}
function validateText(value, name, max=600) {
  if(typeof value !== 'string' || !value.trim() || value.trim().length>max) throw new AppError(`${name} must be 1–${max} characters.`);
  return value.trim();
}
function naturalInt(n, name, maximum=10000) {
  if(!Number.isInteger(n) || n<1 || n>maximum) throw new AppError(`${name} must be a whole number from 1 to ${maximum}.`);
  return n;
}
export function evaluateClaim(facts, claim) {
  const {type, key, value} = claim;
  if(type === 'delivery') {
    const actual=facts.deliveryDays[key];
    if(!deliveryZones.includes(key)) throw new AppError('Unknown delivery city. Valid: Berlin, Paris, Tallinn.');
    naturalInt(value,'Promised delivery days',30);
    return {passed:value>=actual,actual,requested:value,unit:'business days',proof:`Operations ETA for ${key}: ${actual} business day${actual===1?'':'s'}.`,sentence:`Estimated delivery to ${key}: within ${value} business day${value===1?'':'s'}.`};
  }
  if(type === 'stock') {
    if(!(key in skuNames)) throw new AppError('Unknown SKU. Valid: AURORA, ATLAS, HALO.');
    naturalInt(value,'Promised available quantity',10000);
    const actual=facts.stock[key];
    return {passed:value<=actual,actual,requested:value,unit:'units',proof:`${skuNames[key]} (${key}): ${actual} available units.`,sentence:`${skuNames[key]}: at least ${value} units currently available.`};
  }
  if(type === 'returns') {
    if(key!=='policy') throw new AppError('Return claim key must be policy.');
    naturalInt(value,'Promised return days',365);
    const actual=facts.returnsDays;
    return {passed:value<=actual,actual,requested:value,unit:'calendar days',proof:`Published returns policy: ${actual} calendar days.`,sentence:`Returns accepted within ${value} calendar days.`};
  }
  throw new AppError('Unsupported claim type. Use delivery, stock, or returns.');
}
export class Proofline {
  constructor(file) {
    this.file=file;
    fs.mkdirSync(path.dirname(file),{recursive:true});
    if(!fs.existsSync(file)) { this.data=starterData(); this.save(); }
    else { this.data=JSON.parse(fs.readFileSync(file,'utf8')); }
  }
  save() {
    const tmp=this.file+'.tmp';
    fs.writeFileSync(tmp,JSON.stringify(this.data,null,2),'utf8');
    fs.renameSync(tmp,this.file);
  }
  event(actor,action,detail,caseId=null) {
    this.data.events.unshift({id:this.data.nextEvent++,time:now(),caseId,actor:String(actor||'operator').slice(0,50),action,detail});
    if(this.data.events.length>500) this.data.events.length=500;
  }
  find(id) {
    const c=this.data.cases.find(c=>c.id===id);
    if(!c) throw new AppError('Case not found.',404);
    return c;
  }
  getCase(id) {
    const c=this.find(id);
    return {...copy(c),checks:c.claims.map(claim=>({claim:copy(claim),...evaluateClaim(this.data.facts,claim)})),copyPreview:this.renderCopy(c.claims)};
  }
  renderCopy(claims) { return claims.map(c=>evaluateClaim(this.data.facts,c).sentence).join('\n'); }
  getPublic() {
    if(!this.data.publishedCaseId) return {status:'EMPTY',message:'No announcements published yet.'};
    const c=this.find(this.data.publishedCaseId);
    const checks=c.claims.map(claim=>evaluateClaim(this.data.facts,claim));
    const verified=checks.every(x=>x.passed);
    return verified?{status:'LIVE',id:c.id,title:c.title,lines:checks.map(x=>x.sentence),publishedAt:c.publishedAt,receiptHash:c.receipt.hash.slice(0,14)}
      :{status:'WITHHELD',id:c.id,title:c.title,message:'This announcement is temporarily hidden because operational evidence changed after approval.'};
  }
  getState() {
    return {facts:copy(this.data.facts),skuNames,deliveryZones,cases:this.data.cases.map(c=>this.getCase(c.id)),events:copy(this.data.events.slice(0,40)),public:this.getPublic()};
  }
  create({title,rawText}, actor='marketing') {
    title=validateText(title,'Headline',80); rawText=validateText(rawText,'Original announcement',1000);
    const id=`PL-${this.data.nextCase++}`;
    const c={id,title,rawText,status:'DRAFT',claims:[],version:1,createdAt:now(),updatedAt:now(),receipt:null,publishedAt:null};
    this.data.cases.unshift(c); this.event(actor,'case.created','Submitted draft for evidence review.',id); this.save();
    return this.getCase(id);
  }
  assertDraft(c) { if(c.status!=='DRAFT') throw new AppError('Case is locked. Create a fresh draft to change a published announcement.',409); }
  addClaim(id, input, actor='proofline-agent') {
    const c=this.find(id); this.assertDraft(c);
    if(!input || typeof input!=='object') throw new AppError('Claim data required.');
    const claim={id:`C${this.data.nextClaim++}`,type:String(input.type||''),key:String(input.key||''),value:Number(input.value)};
    evaluateClaim(this.data.facts,claim);
    if(c.claims.some(x=>x.type===claim.type&&x.key===claim.key)) throw new AppError('There is already a claim for that fact. Replace it instead.',409);
    if(c.claims.length>=10) throw new AppError('Maximum ten claims per case.');
    c.claims.push(claim); c.version++; c.updatedAt=now();
    this.event(actor,'claim.added',`${claim.type}/${claim.key}: ${claim.value}`,id); this.save();
    return this.getCase(id);
  }
  replaceClaim(id, claimId, input, actor='proofline-agent') {
    const c=this.find(id); this.assertDraft(c);
    const old=c.claims.find(x=>x.id===claimId);
    if(!old) throw new AppError('Claim not found.',404);
    if(!Number.isInteger(Number(input.value))) throw new AppError('Value must be a whole number.');
    const changed={...old,value:Number(input.value)}; evaluateClaim(this.data.facts,changed);
    old.value=changed.value; c.version++; c.updatedAt=now();
    this.event(actor,'claim.revised',`${claimId} revised to ${changed.value}`,id); this.save();
    return this.getCase(id);
  }
  removeClaim(id, claimId, actor='proofline-agent') {
    const c=this.find(id); this.assertDraft(c);
    const idx=c.claims.findIndex(x=>x.id===claimId);
    if(idx<0) throw new AppError('Claim not found.',404);
    c.claims.splice(idx,1); c.version++; c.updatedAt=now();
    this.event(actor,'claim.removed',`${claimId} removed`,id); this.save();
    return this.getCase(id);
  }
  submit(id,actor='proofline-agent') {
    const c=this.find(id); this.assertDraft(c);
    if(!c.claims.length) throw new AppError('Nothing to verify: add at least one structured claim.',422);
    const checks=c.claims.map(claim=>evaluateClaim(this.data.facts,claim));
    const failed=checks.filter(x=>!x.passed);
    if(failed.length) throw new AppError(`Publication blocked. ${failed.map(x=>x.proof).join(' ')}`,422);
    c.receipt={hash:digest({facts:this.data.facts,claims:c.claims,copy:checks.map(x=>x.sentence)}),factsRevision:this.data.facts.revision,checks:copy(checks),proposedAt:now()};
    c.status='AWAITING_APPROVAL'; c.updatedAt=now(); c.version++;
    this.event(actor,'case.proposed',`All ${checks.length} claims verified. Waiting for human approval.`,id); this.save();
    return this.getCase(id);
  }
  approve(id,actor='manager') {
    const c=this.find(id);
    if(c.status!=='AWAITING_APPROVAL') throw new AppError('Only a pending evidence-backed proposal can be approved.',409);
    const checks=c.claims.map(x=>evaluateClaim(this.data.facts,x));
    if(c.receipt.factsRevision!==this.data.facts.revision || checks.some(x=>!x.passed) ||
      digest({facts:this.data.facts,claims:c.claims,copy:checks.map(x=>x.sentence)})!==c.receipt.hash) {
      c.status='DRAFT'; c.receipt=null; c.version++; c.updatedAt=now();
      this.event('system','case.stale','Evidence changed after submission. Review again.',id); this.save();
      throw new AppError('Evidence changed. Proposal reopened; investigate and submit again.',409);
    }
    c.status='PUBLISHED'; c.publishedAt=now(); c.updatedAt=now(); this.data.publishedCaseId=id;
    this.event(actor,'case.published',`Human approved ${c.claims.length} verified claims.`,id); this.save();
    return this.getPublic();
  }
  changeFacts(input,actor='manager') {
    const {kind,key,value}=input||{}; const n=Number(value);
    if(!Number.isInteger(n)) throw new AppError('Fact value must be a whole number.');
    if(kind==='stock') {
      if(!(key in skuNames)) throw new AppError('Unknown SKU.');
      if(n<0 || n>10000) throw new AppError('Stock must be between 0 and 10000.');
      this.data.facts.stock[key]=n;
    } else if(kind==='delivery') {
      if(!deliveryZones.includes(key)) throw new AppError('Unknown city.');
      naturalInt(n,'Delivery days',30); this.data.facts.deliveryDays[key]=n;
    } else if(kind==='returns') {
      if(key!=='policy') throw new AppError('Unknown returns key.');
      naturalInt(n,'Returns days',365); this.data.facts.returnsDays=n;
    } else throw new AppError('Fact kind must be delivery, stock or returns.');
    this.data.facts.revision++;
    this.event(actor,'facts.updated',`${kind}/${key} changed to ${n}; fact revision ${this.data.facts.revision}.`); this.save();
    return copy(this.data.facts);
  }
  reset() {this.data=starterData();this.event('manager','workspace.reset','Restored fictional operational data.');this.save();return this.getState();}
  receipt(id) {
    const c=this.find(id);
    if(!c.receipt) throw new AppError('This case has no evidence receipt.',404);
    return {project:'Proofline',caseId:id,original:c.rawText,approvedCopy:c.receipt.checks.map(x=>x.sentence),status:c.status,evidence:c.receipt.checks,sha256:c.receipt.hash,factsRevision:c.receipt.factsRevision,proposedAt:c.receipt.proposedAt,publishedAt:c.publishedAt};
  }
}

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const UPLOADS = path.join(ROOT, 'uploads');
const DATA = path.join(ROOT, 'data');
fs.mkdirSync(UPLOADS, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });

const db = new DatabaseSync(path.join(DATA, 'medisync.db'));
db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  abha_masked TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS hospitals (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  distance TEXT,
  rating TEXT,
  reviews TEXT,
  fees TEXT,
  specialties TEXT NOT NULL,
  availability TEXT,
  address TEXT,
  tag TEXT
);
CREATE TABLE IF NOT EXISTS doctors (
  id INTEGER PRIMARY KEY,
  hospital_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  experience TEXT,
  fee TEXT,
  next_slot TEXT,
  FOREIGN KEY(hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  source TEXT,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  file_path TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  title TEXT,
  concern TEXT,
  pathway TEXT,
  step INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  hospital_id INTEGER NOT NULL,
  doctor_id INTEGER,
  case_id INTEGER,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY(doctor_id) REFERENCES doctors(id),
  FOREIGN KEY(case_id) REFERENCES cases(id)
);
`);

function nowIso(){ return new Date().toISOString(); }
function hashPassword(password, salt=crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(String(password), salt, 64).toString('hex')}`;
}
function verifyPassword(password, stored){
  const [salt, key] = String(stored || '').split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(String(password || ''), salt, 64);
  const expected = Buffer.from(key, 'hex');
  return expected.length === derived.length && crypto.timingSafeEqual(derived, expected);
}
function seed(){
  let user = db.prepare('SELECT id FROM users WHERE email=?').get('demo@medisync.local');
  if (!user) {
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO users(id,name,email,password_hash,abha_masked,created_at) VALUES(?,?,?,?,?,?)')
      .run(id,'Aarav Sharma','demo@medisync.local',hashPassword('MediSync@123'),'ABHA •••• 4621',nowIso());
    user={id};
  }
  if (db.prepare('SELECT COUNT(*) c FROM hospitals').get().c === 0) {
    const hs=[
      [1,'CityCare Multispeciality','Private Hospital','2.8 km','4.5','1.8k','₹700–₹1,200',JSON.stringify(['Dermatology','General Medicine','ENT']),'Today · 4:00 PM','Sector 62, Noida','Strong match'],
      [2,'District Government Hospital','Government Hospital','4.1 km','4.1','2.4k','Low / subsidised',JSON.stringify(['Dermatology','Medicine','Diagnostics']),'Tomorrow · 9:30 AM','Sector 30, Noida','Government option'],
      [3,'AyurWellness Centre','AYUSH Clinic','5.6 km','4.7','780','₹450–₹800',JSON.stringify(['Ayurveda','Lifestyle Care']),'Today · 6:00 PM','Sector 50, Noida','AYUSH pathway']
    ];
    const s=db.prepare('INSERT INTO hospitals VALUES(?,?,?,?,?,?,?,?,?,?,?)'); for(const h of hs)s.run(...h);
    const ds=[
      [1,1,'Dr. Nisha Kapoor','Dermatology','12 years','₹900','Today · 4:00 PM'],
      [2,1,'Dr. Rohan Mehta','General Medicine','9 years','₹700','Today · 5:30 PM'],
      [3,2,'Dr. Ananya Singh','Dermatology','15 years','Government OPD','Tomorrow · 9:30 AM'],
      [4,3,'Dr. Meera Iyer','Ayurveda','11 years','₹600','Today · 6:00 PM']
    ];
    const d=db.prepare('INSERT INTO doctors VALUES(?,?,?,?,?,?,?)'); for(const x of ds)d.run(...x);
  }
  if(db.prepare('SELECT COUNT(*) c FROM records WHERE user_id=?').get(user.id).c===0){
    const r=db.prepare('INSERT INTO records(user_id,title,type,source,date,status,file_path,created_at) VALUES(?,?,?,?,?,?,?,?)');
    r.run(user.id,'CBC + Lipid Profile','Lab Report','City Diagnostics','18 Sep 2026','Verified',null,nowIso());
    r.run(user.id,'Prescription — Dermatology','Prescription','CityCare Multispeciality','12 Sep 2026','Documented',null,nowIso());
    r.run(user.id,'Discharge Summary','Discharge','District Government Hospital','03 Jun 2026','Documented',null,nowIso());
    r.run(user.id,'Skin Allergy Test','Investigation','City Diagnostics','22 Apr 2026','Unverified',null,nowIso());
  }
}
seed();

function send(res,status,data,contentType='application/json'){res.writeHead(status,{'Content-Type':contentType,'Cache-Control':'no-store'});res.end(contentType==='application/json'?JSON.stringify(data):data);}
function safePath(urlPath){
  const cleaned=decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const full=path.resolve(PUBLIC, cleaned);
  return full.startsWith(path.resolve(PUBLIC)) ? full : null;
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
async function serveStatic(req,res){
  const filePath=safePath(new URL(req.url,`http://${req.headers.host||'localhost'}`).pathname);
  let target=filePath;
  try { if(target && fs.statSync(target).isDirectory()) target=path.join(target,'index.html'); if(target && fs.existsSync(target)){const ext=path.extname(target).toLowerCase(); send(res,200,await fsp.readFile(target),MIME[ext]||'application/octet-stream');return;} } catch{}
  const index=path.join(PUBLIC,'index.html'); send(res,200,await fsp.readFile(index),'text/html; charset=utf-8');
}
async function bodyBuffer(req,max=12*1024*1024){
  return await new Promise((resolve,reject)=>{const chunks=[];let total=0;req.on('data',c=>{total+=c.length;if(total>max){req.destroy();reject(new Error('Payload too large'));return;}chunks.push(c);});req.on('end',()=>resolve(Buffer.concat(chunks)));req.on('error',reject);});}
async function jsonBody(req){const b=await bodyBuffer(req,2*1024*1024); if(!b.length)return {}; return JSON.parse(b.toString('utf8'));}
function auth(req){
  const h=req.headers.authorization||''; if(!h.startsWith('Bearer ')) return null;
  const token=h.slice(7); const s=db.prepare('SELECT user_id,expires_at FROM sessions WHERE token=?').get(token);
  if(!s || s.expires_at<Date.now()) return null;
  const user=db.prepare('SELECT id,name,email,abha_masked FROM users WHERE id=?').get(s.user_id); return user?{user,token}:null;
}
function requireAuth(req,res){const a=auth(req); if(!a){send(res,401,{error:'Authentication required'});return null;} return a;}
function parseMultipart(body,contentType){
  const match=contentType.match(/boundary=([^;]+)/i); if(!match) throw new Error('Missing multipart boundary');
  const boundary=Buffer.from(`--${match[1].replace(/^"|"$/g,'')}`);
  const parts=[]; let start=0;
  while(true){const idx=body.indexOf(boundary,start); if(idx===-1)break; if(start!==0){const chunk=body.subarray(start,idx); const cleaned=chunk.subarray(0,chunk.length-2); parts.push(cleaned);} start=idx+boundary.length+2;}
  const out={fields:{},file:null};
  for(const part of parts){
    const sep=Buffer.from('\r\n\r\n'); const p=part.indexOf(sep); if(p===-1)continue;
    const headers=part.subarray(0,p).toString('utf8'); const content=part.subarray(p+4);
    const nm=headers.match(/name="([^"]+)"/i); if(!nm)continue; const name=nm[1]; const fm=headers.match(/filename="([^"]*)"/i);
    if(fm){out.file={name:fm[1],content}; const mm=headers.match(/Content-Type:\s*([^\r\n]+)/i); out.file.type=(mm&&mm[1].trim())||'application/octet-stream';}
    else out.fields[name]=content.toString('utf8');
  }
  return out;
}

async function handleApi(req,res,url){
  const sendJson=(s,d)=>send(res,s,d);
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS'});res.end();return true;}
  if(url.pathname==='/api/health'&&req.method==='GET'){sendJson(200,{ok:true,service:'MediSync API',time:nowIso()});return true;}
  if(url.pathname==='/api/auth/login'&&req.method==='POST'){
    try{const {email,password}=await jsonBody(req);const u=db.prepare('SELECT * FROM users WHERE email=?').get(String(email||'').trim().toLowerCase());if(!u||!verifyPassword(password,u.password_hash))return sendJson(401,{error:'Invalid email or password'});const token=crypto.randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)').run(token,u.id,Date.now()+7*86400000);return sendJson(200,{token,user:{id:u.id,name:u.name,email:u.email,abha_masked:u.abha_masked}});}catch(e){return sendJson(400,{error:e.message});}
  }
  if(url.pathname==='/api/auth/register'&&req.method==='POST'){
    try{const {name,email,password}=await jsonBody(req);if(!name||!email||!password||String(password).length<8)return sendJson(400,{error:'Name, email and an 8+ character password are required'});const id=crypto.randomUUID();db.prepare('INSERT INTO users(id,name,email,password_hash,abha_masked,created_at) VALUES(?,?,?,?,?,?)').run(id,String(name).trim(),String(email).trim().toLowerCase(),hashPassword(password),'ABHA •••• 0000',nowIso());const token=crypto.randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)').run(token,id,Date.now()+7*86400000);return sendJson(201,{token,user:{id,name,email:String(email).trim().toLowerCase(),abha_masked:'ABHA •••• 0000'}});}catch(e){return sendJson(409,{error:'An account with that email already exists'});}
  }
  if(url.pathname==='/api/auth/logout'&&req.method==='POST'){const a=requireAuth(req,res);if(!a)return true;db.prepare('DELETE FROM sessions WHERE token=?').run(a.token);return sendJson(200,{ok:true});}
  if(url.pathname==='/api/me'&&req.method==='GET'){const a=requireAuth(req,res);if(!a)return true;return sendJson(200,a.user);}

  const a=requireAuth(req,res); if(!a)return true; const uid=a.user.id;
  if(url.pathname==='/api/dashboard'&&req.method==='GET'){
    const records=db.prepare('SELECT id,title,type,source,date,status,file_path,created_at FROM records WHERE user_id=? ORDER BY id DESC').all(uid);
    const appointments=db.prepare(`SELECT a.*,h.name hospital_name,h.address,d.name doctor_name,d.specialty FROM appointments a JOIN hospitals h ON h.id=a.hospital_id LEFT JOIN doctors d ON d.id=a.doctor_id WHERE a.user_id=? ORDER BY a.id DESC LIMIT 10`).all(uid);
    const latestCase=db.prepare('SELECT id,step,status,concern,pathway,updated_at FROM cases WHERE user_id=? ORDER BY updated_at DESC LIMIT 1').get(uid)||null;
    return sendJson(200,{user:a.user,records,appointments,latestCase});
  }
  if(url.pathname==='/api/hospitals'&&req.method==='GET'){
    const q=String(url.searchParams.get('search')||'').trim().toLowerCase();let rows=db.prepare('SELECT * FROM hospitals ORDER BY id').all().map(h=>({...h,specialties:JSON.parse(h.specialties)}));if(q)rows=rows.filter(h=>[h.name,h.type,h.address,...h.specialties].join(' ').toLowerCase().includes(q));return sendJson(200,rows);
  }
  const hm=url.pathname.match(/^\/api\/hospitals\/(\d+)\/doctors$/); if(hm&&req.method==='GET')return sendJson(200,db.prepare('SELECT id,name,specialty,experience,fee,next_slot FROM doctors WHERE hospital_id=?').all(Number(hm[1])));
  if(url.pathname==='/api/records'&&req.method==='GET')return sendJson(200,db.prepare('SELECT id,title,type,source,date,status,file_path,created_at FROM records WHERE user_id=? ORDER BY id DESC').all(uid));
  if(url.pathname==='/api/records'&&req.method==='POST'){
    try{
      const raw=await bodyBuffer(req,12*1024*1024); const parsed=req.headers['content-type']?.startsWith('multipart/form-data')?parseMultipart(raw,req.headers['content-type']):{fields:JSON.parse(raw.toString()),file:null};
      let filePath=null; if(parsed.file&&parsed.file.name){const allowed=new Set(['application/pdf','image/jpeg','image/png','image/webp']);if(!allowed.has(parsed.file.type))return sendJson(400,{error:'Only PDF, JPG, PNG and WEBP files are allowed'});const ext=path.extname(parsed.file.name).toLowerCase()||'.bin';const filename=`${crypto.randomUUID()}${ext}`;await fsp.writeFile(path.join(UPLOADS,filename),parsed.file.content);filePath=`/uploads/${filename}`;}
      const f=parsed.fields;const title=f.title||parsed.file?.name||'Uploaded medical document';const type=f.type||'Medical Document';const source=f.source||'Patient upload';const date=f.date||new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});const info=db.prepare('INSERT INTO records(user_id,title,type,source,date,status,file_path,created_at) VALUES(?,?,?,?,?,?,?,?)').run(uid,title,type,source,date,'Unverified',filePath,nowIso());return sendJson(201,{id:Number(info.lastInsertRowid),title,type,source,date,status:'Unverified',file_path:filePath});
    }catch(e){return sendJson(400,{error:e.message||'Upload failed'});}
  }
  if(url.pathname==='/api/cases'&&req.method==='GET'){
    const rows=db.prepare('SELECT * FROM cases WHERE user_id=? ORDER BY updated_at DESC').all(uid);
    return sendJson(200,rows.map(r=>({...r,payload:JSON.parse(r.payload)})));
  }
  if(url.pathname==='/api/cases/latest'&&req.method==='GET'){
    const row=db.prepare('SELECT * FROM cases WHERE user_id=? ORDER BY updated_at DESC LIMIT 1').get(uid);
    if(!row)return sendJson(200,null);
    return sendJson(200,{...row,payload:JSON.parse(row.payload)});
  }
  const cgm=url.pathname.match(/^\/api\/cases\/(\d+)$/);
  if(cgm&&req.method==='GET'){
    const row=db.prepare('SELECT * FROM cases WHERE id=? AND user_id=?').get(Number(cgm[1]),uid);
    if(!row)return sendJson(404,{error:'Case not found'});
    return sendJson(200,{...row,payload:JSON.parse(row.payload)});
  }
  if(url.pathname==='/api/cases'&&req.method==='POST'){
    try{
      const {id=null,force_new=false,title='Untitled case',concern='',pathway='General',step=1,payload={}}=await jsonBody(req);
      let rowId;
      if(id){
        const owned=db.prepare('SELECT id FROM cases WHERE id=? AND user_id=?').get(Number(id),uid);
        if(!owned)return sendJson(404,{error:'Case not found'});
        rowId=Number(id);
        db.prepare('UPDATE cases SET title=?,concern=?,pathway=?,step=?,payload=?,updated_at=? WHERE id=? AND user_id=?').run(title,concern,pathway,step,JSON.stringify(payload),nowIso(),rowId,uid);
      } else if(!force_new){
        const existing=db.prepare('SELECT id FROM cases WHERE user_id=? AND status=? ORDER BY updated_at DESC LIMIT 1').get(uid,'draft');
        if(existing){
          rowId=existing.id;
          db.prepare('UPDATE cases SET title=?,concern=?,pathway=?,step=?,payload=?,updated_at=? WHERE id=?').run(title,concern,pathway,step,JSON.stringify(payload),nowIso(),rowId);
        }
      }
      if(!rowId){
        rowId=Number(db.prepare('INSERT INTO cases(user_id,title,concern,pathway,step,payload,status,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(uid,title,concern,pathway,step,JSON.stringify(payload),'draft',nowIso()).lastInsertRowid);
      }
      const saved=db.prepare('SELECT * FROM cases WHERE id=? AND user_id=?').get(rowId,uid);
      return sendJson(201,{...saved,payload:JSON.parse(saved.payload)});
    }catch(e){return sendJson(400,{error:e.message});}
  }
  const cdel=url.pathname.match(/^\/api\/cases\/(\d+)$/);if(cdel&&req.method==='DELETE'){
    const id=Number(cdel[1]);const c=db.prepare('SELECT id FROM cases WHERE id=? AND user_id=?').get(id,uid);if(!c)return sendJson(404,{error:'Case not found'});
    db.prepare('DELETE FROM cases WHERE id=? AND user_id=?').run(id,uid);return sendJson(200,{ok:true});
  }
  const cm=url.pathname.match(/^\/api\/cases\/(\d+)\/complete$/);if(cm&&req.method==='POST'){
    const id=Number(cm[1]);const c=db.prepare('SELECT * FROM cases WHERE id=? AND user_id=?').get(id,uid);if(!c)return sendJson(404,{error:'Case not found'});
    const payload=JSON.parse(c.payload);
    if(!payload.answers || Object.keys(payload.answers).length<5)return sendJson(400,{error:'Please complete the clinical history before preparing the case'});
    payload.completedAt=nowIso(); payload.progress=100; db.prepare('UPDATE cases SET status=?,step=?,payload=?,updated_at=? WHERE id=?').run('ready',1,JSON.stringify(payload),nowIso(),id);
    const ready=db.prepare('SELECT * FROM cases WHERE id=?').get(id);
    return sendJson(200,{ok:true,status:'ready',case:{...ready,payload:JSON.parse(ready.payload)}});
  }
  if(url.pathname==='/api/appointments'&&req.method==='GET')return sendJson(200,db.prepare(`SELECT a.*,h.name hospital_name,h.address,d.name doctor_name,d.specialty FROM appointments a JOIN hospitals h ON h.id=a.hospital_id LEFT JOIN doctors d ON d.id=a.doctor_id WHERE a.user_id=? ORDER BY a.id DESC`).all(uid));
  if(url.pathname==='/api/appointments'&&req.method==='POST'){
    try{
      const {hospital_id,doctor_id=null,case_id=null,appointment_date='30 Sep 2026',appointment_time='4:00 PM'}=await jsonBody(req);
      const h=db.prepare('SELECT * FROM hospitals WHERE id=?').get(Number(hospital_id));if(!h)return sendJson(404,{error:'Hospital not found'});
      const d=doctor_id?db.prepare('SELECT * FROM doctors WHERE id=? AND hospital_id=?').get(Number(doctor_id),Number(hospital_id)):null;
      let c=null;
      if(case_id){c=db.prepare('SELECT id,title,concern,status FROM cases WHERE id=? AND user_id=?').get(Number(case_id),uid);if(!c)return sendJson(404,{error:'Selected case not found'});}
      const info=db.prepare('INSERT INTO appointments(user_id,hospital_id,doctor_id,case_id,appointment_date,appointment_time,status,created_at) VALUES(?,?,?,?,?,?,?,?)').run(uid,Number(hospital_id),d?Number(doctor_id):null,c?Number(case_id):null,appointment_date,appointment_time,'confirmed',nowIso());
      return sendJson(201,{id:Number(info.lastInsertRowid),hospital_name:h.name,address:h.address,doctor_name:d?.name||null,specialty:d?.specialty||null,case_id:c?.id||null,case_title:c?.title||null,case_concern:c?.concern||null,appointment_date,appointment_time,status:'confirmed'});
    }catch(e){return sendJson(400,{error:e.message});}
  }
  return false;
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(url.pathname.startsWith('/api/')){const handled=await handleApi(req,res,url);if(handled || res.headersSent)return;return send(res,404,{error:'Not found'});}
    if(url.pathname.startsWith('/uploads/')){
      if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed'});
      const name=path.basename(url.pathname);
      const full=path.resolve(UPLOADS,name);
      if(!full.startsWith(path.resolve(UPLOADS)) || !fs.existsSync(full))return send(res,404,{error:'File not found'});
      if(req.method==='HEAD'){res.writeHead(200);res.end();return;}
      const ext=path.extname(full).toLowerCase();
      send(res,200,await fsp.readFile(full),MIME[ext]||'application/octet-stream');
      return;
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed'});
    if(req.method==='HEAD'){res.writeHead(200);res.end();return;}
    await serveStatic(req,res);
  }catch(e){console.error(e);if(!res.headersSent)send(res,500,{error:'Server error',detail:e.message});}
});
server.listen(PORT,()=>console.log(`MediSync full-stack server running on http://localhost:${PORT}`));

import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, all, one, run, audit, transaction } from './shared/database.js';
import { AppError, assert, requireRole } from './shared/validation.js';
import { login, authenticate, digest, hashPassword, createUser, updateUser, listUsers } from './shared/auth.js';
import { createRequest, decide } from './modules/Sri_Charan_240660/requests.js';
import { checkTime, createMailer, dispatchMail } from './modules/Sri_Charan_240660/notifications.js';
import { registerDirect, enterRequest, exitVisit, extendVisit } from './modules/Dheeraj_Bommakanti_240439/gate.js';
import { createCode, listCodes, verifyCode, revokeCode, enterCode } from './modules/Harshit_Yadav_240471/codes.js';
import { importGroup, getGroup, correctGroup, approveGroup, listGroups, columns } from './modules/Harshit_Yadav_240471/imports.js';
import { records, detail, report, dashboard, csv } from './modules/Sri_Surya_240495/records.js';

export function createApp(options={}) {
  const ctx={db:options.db??openDatabase(process.env.DATABASE_PATH),now:options.now??(()=>new Date().toISOString()),timezone:options.timezone??process.env.CAMPUS_TIMEZONE??'Asia/Kolkata',sessionHours:Number(process.env.SESSION_HOURS??8),dummyHash:hashPassword('invalid-password-placeholder'),mailer:options.mailer??createMailer()};
  const app=express(); app.disable('x-powered-by');
  app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'"],imgSrc:["'self'",'data:'],connectSrc:["'self'"],upgradeInsecureRequests:null}}}));
  app.use(express.json({limit:'1mb'}));
  // Same-origin writes plus per-session CSRF tokens. Never trust a client-supplied role.
  app.use('/api',(req,res,next)=>{
    res.set('Cache-Control','no-store');
    if(req.body===undefined)req.body={};
    if(!req.body||typeof req.body!=='object'||Array.isArray(req.body))return next(new AppError('Request body must be a JSON object'));
    if(!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin) {
      try {assert(new URL(req.headers.origin).host===req.headers.host,'Cross-origin requests are not allowed',403);}catch(e){return next(e);}
    }
    next();
  });
  const route=fn=>(req,res,next)=>Promise.resolve().then(()=>fn(req,res)).catch(next);
  const admin=(req,res,next)=>{try{requireRole(req.user,'admin');next();}catch(e){next(e);}};
  const getId=req=>{const id=Number(req.params.id);assert(Number.isSafeInteger(id)&&id>0,'Invalid record ID');return id;};
  app.get('/api/health',(req,res)=>res.json({status:'ok'}));
  app.post('/api/auth/login',route((req,res)=>{
    const result=login(ctx,req.body.email,req.body.password,req.ip);
    res.cookie('lobby_session',result.token,{httpOnly:true,sameSite:'strict',secure:process.env.SECURE_COOKIES==='true',maxAge:ctx.sessionHours*3600000,path:'/'});
    res.json({user:result.user,csrf:result.csrf,timezone:ctx.timezone});
  }));
  app.use('/api',(req,res,next)=>{
    try {
      const cookies=Object.fromEntries((req.headers.cookie??'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),v.slice(i+1)];}));
      req.sessionToken=cookies.lobby_session;
      const session=authenticate(ctx,req.sessionToken);req.user=session.user;req.csrf=session.csrf;
      if(!['GET','HEAD','OPTIONS'].includes(req.method)) assert(req.headers['x-csrf-token']===session.csrf,'Invalid CSRF token. Refresh the page and try again.',403);
      next();
    }catch(error){next(error);}
  });
  app.get('/api/auth/me',(req,res)=>res.json({user:req.user,csrf:req.csrf,timezone:ctx.timezone}));
  app.post('/api/auth/logout',route((req,res)=>{run(ctx.db,'DELETE FROM sessions WHERE token_hash=?',digest(req.sessionToken));res.clearCookie('lobby_session',{path:'/'});res.json({message:'Signed out'});}));
  app.post('/api/auth/password',route((req,res)=>{
    // Reauthentication is required even when the session is valid.
    const hash=hashPassword(req.body.password);
    const confirmed=login(ctx,req.user.email,req.body.current_password,req.ip);
    transaction(ctx.db,()=>{run(ctx.db,'UPDATE users SET password_hash=? WHERE id=?',hash,req.user.id);run(ctx.db,'DELETE FROM sessions WHERE user_id=?',req.user.id);audit(ctx,req.user,'user.password_changed','user',req.user.id);});
    res.clearCookie('lobby_session',{path:'/'});res.json({message:'Password changed. Please sign in again.'});
  }));
  app.get('/api/hosts',route((req,res)=>res.json(all(ctx.db,"SELECT id,name,department FROM users WHERE active=1 AND role IN ('faculty','student') ORDER BY name"))));
  app.get('/api/dashboard',route((req,res)=>{checkTime(ctx);res.json({...dashboard(ctx,req.user),server_time:ctx.now(),timezone:ctx.timezone});}));
  app.get('/api/records',route((req,res)=>{checkTime(ctx);res.json(records(ctx,req.user,req.query));}));
  app.get('/api/records/:id',route((req,res)=>res.json(detail(ctx,req.user,getId(req)))));
  app.post('/api/requests',route((req,res)=>res.status(201).json(createRequest(ctx,req.user,req.body))));
  app.post('/api/requests/:id/decision',route((req,res)=>res.json(decide(ctx,req.user,getId(req),req.body))));
  app.post('/api/gate/direct',route((req,res)=>res.status(201).json(registerDirect(ctx,req.user,req.body))));
  app.post('/api/gate/requests/:id/entry',route((req,res)=>res.status(201).json(enterRequest(ctx,req.user,getId(req),req.body.verified))));
  app.post('/api/gate/visits/:id/exit',route((req,res)=>res.json(exitVisit(ctx,req.user,getId(req)))));
  app.post('/api/gate/visits/:id/extend',route((req,res)=>res.json(extendVisit(ctx,req.user,getId(req),req.body))));
  app.get('/api/codes',route((req,res)=>res.json(listCodes(ctx,req.user))));
  app.post('/api/codes',route((req,res)=>res.status(201).json(createCode(ctx,req.user,req.body))));
  app.post('/api/codes/:id/revoke',route((req,res)=>res.json(revokeCode(ctx,req.user,getId(req)))));
  app.post('/api/gate/codes/verify',route((req,res)=>res.json(verifyCode(ctx,req.user,req.body.code))));
  app.post('/api/gate/codes/entry',route((req,res)=>res.status(201).json(enterCode(ctx,req.user,req.body))));
  const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:1,fields:2}});
  app.get('/api/groups/template',admin,(req,res)=>{res.type('text/csv').attachment('lobby-group-template.csv').send(columns.join(',')+'\r\n');});
  app.get('/api/groups',admin,route((req,res)=>res.json(listGroups(ctx))));
  app.post('/api/groups',admin,upload.single('file'),route(async(req,res)=>res.status(201).json(await importGroup(ctx,req.user,req.file,req.body.name))));
  app.get('/api/groups/:id',admin,route((req,res)=>res.json(getGroup(ctx,req.user,getId(req)))));
  app.put('/api/groups/:id',admin,route((req,res)=>res.json(correctGroup(ctx,req.user,getId(req),req.body))));
  app.post('/api/groups/:id/approve',admin,route((req,res)=>res.json(approveGroup(ctx,req.user,getId(req)))));
  app.get('/api/reports',admin,route((req,res)=>{checkTime(ctx);res.json(report(ctx,req.user,req.query));}));
  app.get('/api/reports/export',admin,route((req,res)=>{
    let page=1,rows=[],result;
    do {result=records(ctx,req.user,{...req.query,page,limit:1000});rows.push(...result.rows);page++;}while(rows.length<result.total);
    audit(ctx,req.user,'report.exported','report',null,{count:rows.length});
    res.type('text/csv').attachment('lobby-visitor-report.csv').send(csv(rows));
  }));
  app.get('/api/users',admin,route((req,res)=>res.json(listUsers(ctx))));
  app.post('/api/users',admin,route((req,res)=>res.status(201).json(createUser(ctx,req.user,req.body))));
  app.patch('/api/users/:id',admin,route((req,res)=>res.json(updateUser(ctx,req.user,getId(req),req.body))));
  app.get('/api/notifications',route((req,res)=>res.json(all(ctx.db,'SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 200',req.user.id))));
  app.post('/api/notifications/read',route((req,res)=>{run(ctx.db,'UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL',ctx.now(),req.user.id);res.json({message:'Notifications marked as read'});}));
  app.get('/api/admin/audit',admin,route((req,res)=>res.json(all(ctx.db,'SELECT a.*,u.name AS actor FROM audit a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 500'))));
  app.get('/api/admin/outbox',admin,route((req,res)=>res.json({mode:ctx.mailer.mode,items:all(ctx.db,'SELECT * FROM outbox ORDER BY id DESC LIMIT 200')})));
  app.post('/api/admin/outbox/:id/retry',admin,route(async(req,res)=>{
    const id=getId(req),item=one(ctx.db,'SELECT * FROM outbox WHERE id=?',id);assert(item,'Message not found',404);
    assert(item.status==='failed','Only failed messages can be retried');
    const visit=one(ctx.db,'SELECT exit_at FROM visits WHERE id=?',item.visit_id);assert(!visit?.exit_at,'Visitor has exited; this alert is no longer relevant');
    run(ctx.db,"UPDATE outbox SET status='pending',attempts=0 WHERE id=?",id);await dispatchMail(ctx);res.json({message:'Retry processed'});
  }));
  app.use('/api',(req,res)=>res.status(404).json({error:'API route not found'}));
  const publicPath=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
  app.use(express.static(publicPath,{etag:true}));
  app.use((error,req,res,next)=>{
    let status=error.status??500,message=error.message;
    if(error instanceof multer.MulterError) {status=400;message=error.code==='LIMIT_FILE_SIZE'?'File must be no larger than 2 MB':'Invalid upload';}
    if(error.type==='entity.too.large'){status=413;message='Request is too large';}
    if(status>=500){console.error('Request failed:',error);message='An unexpected error occurred. Please try again.';}
    res.status(status).json({error:message});
  });
  return {app,ctx};
}

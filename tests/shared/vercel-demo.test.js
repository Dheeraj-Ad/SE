import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createDemoApp, DEMO_ROLES, DEMO_PASSWORD } from '../../server/demo.js';
import { authenticate } from '../../server/shared/auth.js';
import { fixture } from '../helpers.js';

const secret='a-test-deployment-key-that-is-at-least-32-characters';
function demo(t){const result=createDemoApp({secret,secureCookies:false});t.after(()=>result.ctx.db.close());return result;}

test('all four hardcoded demo accounts log in with the correct role',async t=>{
  const {app}=demo(t);
  for(const role of DEMO_ROLES){
    const agent=request.agent(app);
    const login=await agent.post('/api/auth/login').send({email:`${role}@lobby.local`,password:DEMO_PASSWORD}).expect(200);
    assert.equal(login.body.user.role,role);
    await agent.get('/api/dashboard').expect(200);
    const me=await agent.get('/api/auth/me').expect(200);
    assert.equal(me.body.user.role,role);
  }
  await request(app).post('/api/auth/login').send({email:'admin@lobby.local',password:'wrong'}).expect(401);
  await request(app).get('/api/health').expect(200,{status:'ok',demo:true});
});

test('demo sessions work on a fresh instance and preserve CSRF and role restrictions',async t=>{
  const first=demo(t),second=demo(t);
  const login=await request(first.app).post('/api/auth/login').send({email:'student@lobby.local',password:DEMO_PASSWORD}).expect(200);
  const cookie=login.headers['set-cookie'][0].split(';')[0];
  const me=await request(second.app).get('/api/auth/me').set('Cookie',cookie).expect(200);
  assert.equal(me.body.user.role,'student');
  assert.equal(me.body.csrf,login.body.csrf);
  await request(second.app).get('/api/users').set('Cookie',cookie).expect(403);
  await request(second.app).post('/api/notifications/read').set('Cookie',cookie).expect(403);
  await request(second.app).post('/api/notifications/read').set('Cookie',cookie).set('X-CSRF-Token',login.body.csrf).expect(200);
  const logout=await request(second.app).post('/api/auth/logout').set('Cookie',cookie).set('X-CSRF-Token',login.body.csrf).expect(200);
  assert.match(logout.headers['set-cookie'][0],/lobby_session=;/);
  second.ctx.now=()=> '2099-01-01T00:00:00.000Z';
  await request(second.app).get('/api/auth/me').set('Cookie',cookie).expect(401);
});

test('demo tokens cannot be changed, used after redeploy, or used with the local database',async t=>{
  const {app}=demo(t),other=createDemoApp({secret:secret+'-different',secureCookies:false});
  t.after(()=>other.ctx.db.close());
  const login=await request(app).post('/api/auth/login').send({email:'faculty@lobby.local',password:DEMO_PASSWORD}).expect(200);
  const cookie=login.headers['set-cookie'][0].split(';')[0];
  await request(app).get('/api/auth/me').set('Cookie',cookie+'tampered').expect(401);
  await request(other.app).get('/api/auth/me').set('Cookie',cookie).expect(401);
  const local=fixture(t);
  assert.throws(()=>authenticate(local.ctx,decodeURIComponent(cookie.split('=')[1])),/expired/);
});

test('demo credentials remain fixed and deployed cookies are secure',async t=>{
  const {app}=demo(t),agent=request.agent(app);
  const login=await agent.post('/api/auth/login').send({email:'admin@lobby.local',password:DEMO_PASSWORD}).expect(200);
  await agent.post('/api/auth/password').set('X-CSRF-Token',login.body.csrf).send({current_password:DEMO_PASSWORD,password:'ChangedPassword'}).expect(403);
  await agent.patch('/api/users/2').set('X-CSRF-Token',login.body.csrf).send({active:false}).expect(403);
  const deployed=createDemoApp({secret});t.after(()=>deployed.ctx.db.close());
  const response=await request(deployed.app).post('/api/auth/login').send({email:'security@lobby.local',password:DEMO_PASSWORD}).expect(200);
  assert.match(response.headers['set-cookie'][0],/; Secure/);
  assert.match(response.headers['set-cookie'][0],/; HttpOnly/);
});

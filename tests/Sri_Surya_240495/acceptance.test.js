import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,valid,inside,approved} from '../helpers.js';
import {records,report} from '../../server/modules/Sri_Surya_240495/records.js';
import {createRequest} from '../../server/modules/Sri_Charan_240660/requests.js';
import {exitVisit} from '../../server/modules/Dheeraj_Bommakanti_240439/gate.js';

test('R7-TC01 search by visitor name returns match',t=>{const f=fixture(t);approved(f);assert.equal(records(f.ctx,f.users.admin,{q:'asha'}).total,1);});
test('R7-TC02 search by phone returns match',t=>{const f=fixture(t);approved(f);assert.equal(records(f.ctx,f.users.security,{q:'9876543210'}).total,1);});
test('R7-TC03 search date and time range returns only matching visits',t=>{const f=fixture(t);approved(f);approved(f,{starts_at:'2026-10-28T04:00:00Z',ends_at:'2026-10-28T06:00:00Z'});const result=records(f.ctx,f.users.admin,{from:'2026-10-27T03:59:00Z',to:'2026-10-27T04:01:00Z'});assert.equal(result.total,1);});
test('R7-TC04 unmatched search returns no records',t=>{const f=fixture(t);approved(f);assert.deepEqual(records(f.ctx,f.users.admin,{q:'nonexistent'}).rows,[]);});
test('R17-TC01 available data yields correct report counts',t=>{const f=fixture(t);const v=inside(f);exitVisit(f.ctx,f.users.security,v.id);createRequest(f.ctx,f.users.student,valid({name:'Pending Visitor'}));const s=report(f.ctx,f.users.admin).summary;assert.equal(s.visitors,2);assert.equal(s.entries,1);assert.equal(s.exits,1);assert.equal(s.approvals,1);assert.equal(s.pending,1);});
test('R17-TC02 period with no data has zero counts',t=>{const f=fixture(t);approved(f);const s=report(f.ctx,f.users.admin,{from:'2026-11-01T00:00:00Z',to:'2026-11-02T00:00:00Z'}).summary;assert.ok(Object.values(s).every(n=>n===0));});
test('R17-TC03 inverted report date range is rejected',t=>{const f=fixture(t);assert.throws(()=>report(f.ctx,f.users.admin,{from:'2026-11-02T00:00:00Z',to:'2026-11-01T00:00:00Z'}),/From date/);});
test('R17-TC04 report totals equal stored records',t=>{const f=fixture(t);inside(f);approved(f);createRequest(f.ctx,f.users.student,valid());const rows=records(f.ctx,f.users.admin).rows,s=report(f.ctx,f.users.admin).summary;assert.equal(s.visitors,rows.length);assert.equal(s.entries,rows.filter(r=>r.entry_at).length);assert.equal(s.exits,rows.filter(r=>r.exit_at).length);assert.equal(s.approvals,rows.filter(r=>r.status==='Approved').length);});

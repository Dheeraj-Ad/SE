import ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';
import { all, one, run, transaction, audit } from '../../shared/database.js';
import { assert, text, requestFields, requireRole, AppError } from '../../shared/validation.js';
import { insertRequest, notify, roleIds } from '../Sri_Charan_240660/requests.js';

export const columns=['name','phone','email','affiliation','relation','id_proof','host','purpose','starts_at','ends_at'];
const required=['name','phone','host','purpose','starts_at','ends_at'];
function checkWorkbookArchive(buffer){
  // Bound ZIP expansion before ExcelJS allocates the workbook (XLSX is a ZIP).
  let end=-1;
  for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===0x06054b50){end=i;break;}
  assert(end>=0,'Invalid Excel archive');
  const entries=buffer.readUInt16LE(end+10),offset=buffer.readUInt32LE(end+16);
  assert(entries<=5000&&offset<buffer.length,'Excel archive is too complex');
  let cursor=offset,total=0;
  for(let n=0;n<entries;n++){
    assert(cursor+46<=buffer.length&&buffer.readUInt32LE(cursor)===0x02014b50,'Invalid Excel archive');
    total+=buffer.readUInt32LE(cursor+24);
    assert(total<=20*1024*1024,'Expanded Excel workbook exceeds 20 MB');
    cursor+=46+buffer.readUInt16LE(cursor+28)+buffer.readUInt16LE(cursor+30)+buffer.readUInt16LE(cursor+32);
  }
}
function reviewRows(ctx,rows) {
  assert(Array.isArray(rows) && rows.length>0 && rows.length<=1000,'Import must contain between 1 and 1000 visitors');
  const seen=new Set();
  return rows.map((row,index)=>{
    const errors=[];
    try { requestFields(row,ctx); } catch(error) { errors.push(error.message); }
    const key=`${row.phone}:${row.starts_at}`;
    if(seen.has(key)) errors.push('Duplicate phone and visit time in this group');
    seen.add(key);
    return {row:index+2,data:Object.fromEntries(columns.map(k=>[k,String(row[k]??'').trim()])),errors};
  });
}
export async function importGroup(ctx,user,file,name) {
  requireRole(user,'admin'); assert(file,'Select a CSV or Excel file');
  assert(/\.(csv|xlsx)$/i.test(file.originalname),'Unsupported format. Upload .csv or .xlsx');
  assert(file.buffer.length<=2*1024*1024,'File must be no larger than 2 MB');
  let matrix;
  try {
    if(/\.csv$/i.test(file.originalname)) matrix=parse(file.buffer,{bom:true,skip_empty_lines:true,relax_column_count:false,max_record_size:20000});
    else {
      checkWorkbookArchive(file.buffer);
      const workbook=new ExcelJS.Workbook(); await workbook.xlsx.load(file.buffer);
      const sheet=workbook.worksheets[0]; assert(sheet,'Excel workbook is empty');
      matrix=[]; sheet.eachRow(row=>{assert(matrix.length<=1000,'Import must contain at most 1000 visitors'); matrix.push(row.values.slice(1).map(value=>value instanceof Date?value.toISOString():typeof value==='object'&&value!==null?value.text??'':String(value??'')));});
    }
  } catch(error) { throw new AppError(error instanceof AppError?error.message:'The file could not be read. Check its format and column structure.'); }
  assert(matrix.length>1,'Import must contain a header and at least one visitor');
  const header=matrix.shift().map(h=>String(h).trim().toLowerCase());
  assert(new Set(header).size===header.length,'Duplicate column names are not allowed');
  const missing=required.filter(k=>!header.includes(k)); assert(!missing.length,`Missing required columns: ${missing.join(', ')}`);
  const rows=reviewRows(ctx,matrix.map(values=>Object.fromEntries(header.map((key,i)=>[key,values[i]??'']))));
  const title=text(name||file.originalname,'Group name',150);
  return transaction(ctx.db,()=>{
    const id=Number(run(ctx.db,"INSERT INTO groups(name,filename,created_by,status,rows_json,created_at) VALUES(?,?,?,'Review',?,?)",title,file.originalname.slice(0,200),user.id,JSON.stringify(rows),ctx.now()).lastInsertRowid);
    audit(ctx,user,'group.imported','group',id,{count:rows.length});
    return {id,name:title,status:'Review',rows};
  });
}
export function getGroup(ctx,user,id) {
  requireRole(user,'admin'); const group=one(ctx.db,'SELECT * FROM groups WHERE id=?',id); assert(group,'Group not found',404);
  return {...group,rows:JSON.parse(group.rows_json),rows_json:undefined};
}
export function correctGroup(ctx,user,id,data) {
  const group=getGroup(ctx,user,id); assert(group.status==='Review','Approved group cannot be changed',409);
  const rows=reviewRows(ctx,data.rows);
  transaction(ctx.db,()=>{run(ctx.db,'UPDATE groups SET rows_json=? WHERE id=?',JSON.stringify(rows),id); audit(ctx,user,'group.corrected','group',id);});
  return {...group,rows};
}
export function approveGroup(ctx,user,id) {
  requireRole(user,'admin');
  return transaction(ctx.db,()=>{
    const group=getGroup(ctx,user,id); assert(group.status==='Review','Group is already approved',409);
    const rows=reviewRows(ctx,group.rows.map(r=>r.data));
    assert(rows.every(r=>!r.errors.length),'Correct all row errors before approval');
    for(const row of rows) insertRequest(ctx,user,requestFields(row.data,ctx),{source:'group',status:'Approved',groupId:id});
    run(ctx.db,"UPDATE groups SET status='Approved' WHERE id=?",id);
    notify(ctx,roleIds(ctx,'security'),`group:${id}`,'Group approved',`${group.name}: ${rows.length} visitors ready for gate verification.`);
    audit(ctx,user,'group.approved','group',id,{count:rows.length});
    return {id,status:'Approved',count:rows.length};
  });
}
export const listGroups=ctx=>all(ctx.db,'SELECT id,name,filename,status,created_at,json_array_length(rows_json) AS count FROM groups ORDER BY id DESC');

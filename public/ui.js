export const $=(s,root=document)=>root.querySelector(s);
export const $$=(s,root=document)=>[...root.querySelectorAll(s)];
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const initials=name=>String(name).split(' ').map(s=>s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
export const badge=value=>`<span class="badge ${esc(String(value).toLowerCase().replaceAll(' ','-'))}">${esc(value)}</span>`;
export const empty=(title='No records found',message='Try adjusting your search or date range.')=>`<div class="empty"><div class="empty-symbol">▤</div><h3>${esc(title)}</h3><p>${esc(message)}</p></div>`;
let toastTimer;
export function toast(message){$('#toast').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').textContent='',4500);}
export function modal(title,html){$('#modal').innerHTML=`<div class="modal-head"><h2 id="modal-title">${esc(title)}</h2><button class="icon-button" data-action="close" aria-label="Close dialog">×</button></div><div class="modal-body">${html}</div>`;if(!$('#modal').open)$('#modal').showModal();}
export function closeModal(){$('#modal').close();}
export const localInput=(date=new Date())=>{const d=new Date(date);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
export const iso=value=>new Date(value).toISOString();
export function fields(data={}){
  return `<div class="section-title">Visitor details</div><div class="form-grid">
  <label>Visitor name<input name="name" required maxlength="100" value="${esc(data.name)}" placeholder="Full name" autocomplete="off"></label>
  <label>Phone number<input name="phone" type="tel" required maxlength="20" value="${esc(data.phone)}" placeholder="10 to 15 digits"></label>
  <label>Email <span class="muted">(for visit alerts)</span><input name="email" type="email" maxlength="200" value="${esc(data.email)}" placeholder="visitor@example.com"></label>
  <label>Institution / affiliation <span class="muted">(optional)</span><input name="affiliation" maxlength="150" value="${esc(data.affiliation)}" placeholder="Company, college, or family"></label>
  <label>Relationship <span class="muted">(optional)</span><input name="relation" maxlength="100" value="${esc(data.relation)}" placeholder="e.g. Parent, colleague, guest"></label>
  <label>ID proof reference <span class="muted">(optional)</span><input name="id_proof" maxlength="100" value="${esc(data.id_proof)}" placeholder="e.g. College ID ending 1234"></label>
  <label class="full">Host / department<input name="host" list="host-options" required maxlength="150" value="${esc(data.host)}" placeholder="Select a host or enter a department"></label>
  <label class="full">Purpose of visit<textarea name="purpose" required maxlength="500" placeholder="What brings this visitor to campus?">${esc(data.purpose)}</textarea></label></div>
  <div class="section-title">Permitted visiting window</div><div class="form-grid">
  <label>Start date & time<input name="starts_at" type="datetime-local" required value="${localInput(data.starts_at??Date.now())}"></label>
  <label>End date & time<input name="ends_at" type="datetime-local" required value="${localInput(data.ends_at??Date.now()+2*3600000)}"></label></div>
  <p class="form-note">Enter times in your device timezone (${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}). Email alerts require a visitor email address.</p>`;
}
export function formData(form){return Object.fromEntries(new FormData(form).entries());}
export async function submit(form,work){const button=$('[type="submit"]',form);if(button)button.disabled=true;const error=$('.form-error',form);if(error)error.textContent='';try{await work();}catch(e){if(error)error.textContent=e.message;else toast(e.message);}finally{if(button)button.disabled=false;}}

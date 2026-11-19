import {readJson,writeJson} from "../core/storage.js";
const key=formId=>"_cache/form_"+formId+"/"+new Date().toISOString().slice(0,7)+"-daily.json";
export async function getAggregate(formId){try{const c=await readJson(key(formId));const age=Date.now()-Date.parse(c.computed_at);return {...c,stale:age>300000};}catch{return null;}}
export async function putAggregate(formId,data){data.computed_at=new Date().toISOString();data.dirty=false;await writeJson(key(formId),data);return data;}
export async function markDirty(formId){const p="_cache/manifest.json";let m={forms:{}};try{m=await readJson(p);}catch{}m.forms[formId]={...(m.forms[formId]||{}),dirty:true,changed_at:new Date().toISOString()};await writeJson(p,m);}
(async()=>{
"use strict";
const $=s=>document.querySelector(s),E=OPEX.esc,note=OPEX.toast,now=()=>new Date().toISOString(),localInput=d=>{const x=new Date(d);return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,16)},dt=v=>v?new Date(v).getTime():null,fmt=v=>v?new Date(v).toLocaleString():"—",hours=n=>n==null?"—":(n/3600000).toFixed(2)+" h",dur=n=>{if(n==null)return"—";let m=Math.max(0,Math.round(n/60000));return Math.floor(m/60)+"h "+(m%60)+"m"},id=p=>p+"-"+crypto.randomUUID().slice(0,8).toUpperCase();
const TASKS="Received|Not Started|In Progress|Query Raised|Awaiting Response|Response Received|Resumed|Completed|Cancelled".split("|");
let S,actor,users=[],teams=[],tasks=[],queries=[],editTask=null,activeQuery=null;
const role=()=>String(actor?.role||"submitter").toLowerCase();
const isSupervisor=()=>["supervisor","admin","builder"].includes(role());
const isAdmin=()=>["admin","builder"].includes(role());
const norm=v=>String(v??"").trim().toLowerCase().replace(/\s+/g," ");
const teamName=t=>t?.name||t?.team_name||t?.team_id||"";
function actorOwnsTask(t){
  if(!actor)return false;
  if(t.processor_user_id&&t.processor_user_id===actor.user_id)return true;
  return norm(t.processor)===norm(actor.full_name)||norm(t.processor)===norm(actor.employee_id);
}
function teamTokens(){
  const raw=[actor?.team_id,...(Array.isArray(actor?.supervises_teams)?actor.supervises_teams:[])].filter(Boolean).map(String);
  const names=teams.filter(t=>raw.includes(String(t.team_id))).map(teamName);
  return new Set(raw.concat(names).map(norm));
}
function canSeeTask(t){
  if(isAdmin())return true;
  if(role()==="supervisor"){
    const scope=teamTokens();
    if(!scope.size)return true;
    return [t.team_id,t.team].filter(Boolean).some(v=>scope.has(norm(v)));
  }
  return actorOwnsTask(t);
}
function visibleTasks(){return tasks.filter(canSeeTask)}
function visibleQueries(list=visibleTasks()){
  const ids=new Set(list.map(t=>t.task_id));
  return queries.filter(q=>ids.has(q.task_id));
}
function canEditTask(t){return !!t&&(isSupervisor()||actorOwnsTask(t))}
function canRespondQuery(q){
  if(!q)return false;
  if(isSupervisor())return true;
  return (q.owner_user_id&&q.owner_user_id===actor?.user_id)||norm(q.owner)===norm(actor?.full_name);
}
function scopeMessage(){
  if(isAdmin())return "Admin workspace · Full task and question-log visibility.";
  if(role()==="supervisor"){
    return teamTokens().size
      ? "Supervisor workspace · Showing tasks for your configured team scope. You can assign work, manage queries and record responses."
      : "Supervisor workspace · No team scope is configured on this profile, so all tasks are shown. Configure supervises_teams or team_id to narrow this view.";
  }
  return "Associate workspace · Only tasks assigned to your profile are shown. You can update your task status and work timestamps, and raise questions. Assignment and task ownership are supervisor-managed.";
}

async function load(){
  const [tf,qf]=await Promise.all([
    S.listFiles("_operations/tasks").catch(()=>[]),
    S.listFiles("_operations/queries").catch(()=>[])
  ]);
  const tm={},qm={};
  for(const file of tf)for(const r of await S.lines("_operations/tasks/"+file)){
    if(!tm[r.task_id]||Number(r.version||0)>Number(tm[r.task_id].version||0))tm[r.task_id]=r;
  }
  for(const file of qf)for(const r of await S.lines("_operations/queries/"+file)){
    if(!qm[r.query_id]||Number(r.version||0)>Number(qm[r.query_id].version||0))qm[r.query_id]=r;
  }
  tasks=Object.values(tm);queries=Object.values(qm);
}

async function saveTaskRecord(r,action){await S.append("_operations/tasks/"+now().slice(0,7)+".ndjson",r);await OPEX.audit(S,action,r.task_id,{version:r.version,status:r.status});}
async function saveQueryRecord(r,action){await S.append("_operations/queries/"+now().slice(0,7)+".ndjson",r);await OPEX.audit(S,action,r.query_id,{task_id:r.task_id,type:r.type,status:r.status});}
function openQueries(tid){return queries.filter(q=>q.task_id===tid&&q.type==="External"&&q.status==="Open")}
function externalWait(t){const intervals=queries.filter(q=>q.task_id===t.task_id&&q.type==="External").map(q=>[dt(q.raised_at),dt(q.responded_at)||((q.status==="Open")?Date.now():null)]).filter(x=>x[0]&&x[1]&&x[1]>x[0]).sort((a,b)=>a[0]-b[0]);let total=0,end=0;for(const [a,b] of intervals){if(b<=end)continue;total+=b-Math.max(a,end);end=Math.max(end,b)}return total}
function metrics(t){const start=dt(t.received_at),end=dt(t.processed_at)||((t.status==="Completed")?Date.now():Date.now());if(!start)return{gross:null,wait:0,net:null,met:"—"};const gross=Math.max(0,end-start),wait=externalWait(t),net=Math.max(0,gross-wait),target=Number(t.tat_target_hours||24)*3600000;return{gross,wait,net,met:t.status==="Completed"?(net<=target?"Met":"Breached"):(net>target?"Breached":"In progress")}}
function aht(t){const s=dt(t.start_at),e=dt(t.end_at)||((t.status==="Completed")?dt(t.processed_at):null);return s&&e?Math.max(0,e-s):null}
function options(el,arr,first){el.innerHTML=(first?'<option value="">'+first+'</option>':'')+arr.map(v=>'<option value="'+E(v)+'">'+E(v)+'</option>').join("")}
function show(id){$("#"+id).classList.add("open")}function hide(id){$("#"+id).classList.remove("open")}
function view(v){document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===v));["overview","tasks","queries"].forEach(x=>$("#"+x+"View").classList.toggle("pm-hide",x!==v));}
function initFilters(){
  const work=visibleTasks(),qs=visibleQueries(work);
  const set=(el,values,first)=>{
    const previous=el.value;
    el.innerHTML=(first?'<option value="">'+first+'</option>':'')+values.map(v=>'<option value="'+E(v)+'">'+E(v)+'</option>').join("");
    if([...el.options].some(o=>o.value===previous))el.value=previous;
  };
  set($("#taskStatusFilter"),TASKS,"All statuses");
  set($("#processorFilter"),[...new Set(work.map(t=>t.processor).filter(Boolean))].sort(),"All processors");
  set($("#teamFilter"),[...new Set(work.map(t=>t.team).filter(Boolean))].sort(),"All teams");
  set($("#queryCategoryFilter"),[...new Set(qs.map(q=>q.category).filter(Boolean))].sort(),"All categories");
}

function render(){
  initFilters();
  const work=visibleTasks(),qs=visibleQueries(work);
  const open=work.filter(t=>!["Completed","Cancelled"].includes(t.status));
  const completed=work.filter(t=>t.status==="Completed");
  const openQ=qs.filter(q=>q.status==="Open");
  const overdue=openQ.filter(q=>q.due_date&&q.due_date<new Date().toISOString().slice(0,10));
  const breached=work.filter(t=>metrics(t).met==="Breached");
  $("#roleScope").textContent=scopeMessage();
  $("#addTask").hidden=!isSupervisor();
  $("#addTask").disabled=!isSupervisor();
  $("#addQuery").disabled=!work.some(t=>canEditTask(t)&&!["Completed","Cancelled"].includes(t.status));
  $("#kpis").innerHTML=[["Tasks received",work.length],["Open tasks",open.length],["Completed",completed.length],["Open queries",openQ.length],["Overdue queries",overdue.length],["TAT breaches",breached.length]]
    .map(x=>'<div class="pm-kpi"><label>'+x[0]+'</label><b>'+x[1]+'</b></div>').join("");
  $("#statusSummary").innerHTML=TASKS.map(st=>{
    const n=work.filter(t=>t.status===st).length;
    return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e2e8f0"><span>'+E(st)+'</span><b>'+n+'</b></div>';
  }).join("");
  $("#querySummary").innerHTML=["Internal","External"].map(st=>{
    const n=openQ.filter(q=>q.type===st).length;
    return '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0"><span><span class="pm-pill '+st.toLowerCase()+'">'+st+'</span> Awaiting response</span><b>'+n+'</b></div>';
  }).join("")+'<p class="pm-mini">External query waiting time is excluded from Net TAT. Internal query waiting time remains included.</p>';
  const met=completed.map(metrics),metCount=met.filter(m=>m.met==="Met").length;
  $("#tatSummary").innerHTML='<div style="font-size:28px;font-weight:800">'+(met.length?Math.round(metCount/met.length*100):0)+'%</div><div class="pm-mini">Meet TAT · completed tasks</div><div style="margin-top:12px">Average net TAT: <b>'+dur(met.length?met.reduce((a,m)=>a+m.net,0)/met.length:null)+'</b></div><div>Average AHT: <b>'+dur(work.filter(t=>aht(t)!=null).reduce((a,t)=>a+aht(t),0)/(work.filter(t=>aht(t)!=null).length||1))+'</b></div>';
  const names=[...new Set(work.map(t=>t.processor).filter(Boolean))].sort();
  $("#processorSummary").innerHTML=names.map(n=>{
    const a=work.filter(t=>t.processor===n),done=a.filter(t=>t.status==="Completed"),av=done.map(aht).filter(x=>x!=null),oq=openQ.filter(q=>q.processor===n).length;
    return '<tr><td>'+E(n)+'</td><td>'+a.filter(t=>!["Completed","Cancelled"].includes(t.status)).length+'</td><td>'+done.length+'</td><td>'+dur(av.length?av.reduce((x,y)=>x+y,0)/av.length:null)+'</td><td>'+oq+'</td></tr>';
  }).join("")||'<tr><td colspan="5">No tasks yet</td></tr>';
  $("#actionQueries").innerHTML=openQ.slice().sort((a,b)=>(a.due_date||"9999").localeCompare(b.due_date||"9999")).slice(0,12).map(q=>{
    const action=canRespondQuery(q)?'<button class="pm-btn" data-respond="'+E(q.query_id)+'">Respond</button>':'<span class="pm-mini">Assigned to '+E(q.owner||"Unassigned")+'</span>';
    return '<tr><td>'+E(q.query_id)+'</td><td>'+E(q.task_id)+'</td><td><span class="pm-pill '+String(q.type||"").toLowerCase()+'">'+E(q.type)+'</span></td><td>'+E(q.question)+'</td><td>'+E(q.owner||"Unassigned")+'</td><td>'+dur(Date.now()-dt(q.raised_at))+'</td><td>'+action+'</td></tr>';
  }).join("")||'<tr><td colspan="7" class="pm-empty">No open queries</td></tr>';
  renderTasks();renderQueries();
}

function filteredTasks(){
  const search=$("#taskSearch").value.toLowerCase();
  return visibleTasks().filter(t=>
    (!search||[t.task_id,t.processor,t.insured,t.proposal,t.series,t.status,t.delayed_reason].join(" ").toLowerCase().includes(search))&&
    (!$("#taskStatusFilter").value||t.status===$("#taskStatusFilter").value)&&
    (!$("#processorFilter").value||t.processor===$("#processorFilter").value)&&
    (!$("#teamFilter").value||t.team===$("#teamFilter").value)&&
    (!$("#receivedFrom").value||(t.received_at||"").slice(0,10)>=$("#receivedFrom").value)&&
    (!$("#tatFilter").value||
      ($("#tatFilter").value==="Met"&&metrics(t).met==="Met")||
      ($("#tatFilter").value==="Breached"&&metrics(t).met==="Breached")||
      ($("#tatFilter").value==="In progress"&&metrics(t).met==="In progress"))
  );
}
function renderTasks(){
  const a=filteredTasks().sort((x,y)=>(y.received_at||"").localeCompare(x.received_at||""));
  $("#taskRows").innerHTML=a.map((t,i)=>{
    const m=metrics(t),h=aht(t),actions=[];
    if(canEditTask(t))actions.push('<button class="pm-btn" data-edit-task="'+E(t.task_id)+'">Edit</button>');
    if(canEditTask(t)&&!["Completed","Cancelled"].includes(t.status))actions.push('<button class="pm-btn" data-task-query="'+E(t.task_id)+'">+ Question</button>');
    return '<tr><td>'+(i+1)+'</td><td><b>'+E(t.task_id)+'</b></td><td>'+E(t.processor)+'</td><td>'+E(t.insured)+'</td><td>'+E(t.series)+'</td><td><span class="pm-pill">'+E(t.status)+'</span></td><td>'+E(t.proposal||"—")+'</td><td>'+E(fmt(t.received_at))+'</td><td>'+E(fmt(t.processed_at))+'</td><td>'+hours(m.gross)+'</td><td>'+hours(m.wait)+'</td><td>'+hours(m.net)+'</td><td>'+E(m.met)+'</td><td>'+E(t.delayed_reason||"—")+'</td><td>'+E(fmt(t.start_at))+'</td><td>'+E(fmt(t.end_at))+'</td><td>'+hours(h)+'</td><td>'+actions.join(" ")+'</td></tr>';
  }).join("")||'<tr><td colspan="18" class="pm-empty">No tasks match your access scope or filters</td></tr>';
  $("#taskCount").textContent=a.length+" tasks displayed · Gross TAT, External Wait, Net TAT, Meet TAT and AHT are calculated.";
}

function filteredQueries(){
  const search=$("#querySearch").value.toLowerCase();
  return visibleQueries().filter(q=>
    (!search||[q.query_id,q.task_id,q.insured,q.processor,q.question,q.response,q.owner,q.comments,q.responded_by].join(" ").toLowerCase().includes(search))&&
    (!$("#queryStatusFilter").value||q.status===$("#queryStatusFilter").value)&&
    (!$("#queryTypeFilter").value||q.type===$("#queryTypeFilter").value)&&
    (!$("#queryCategoryFilter").value||q.category===$("#queryCategoryFilter").value)&&
    (!$("#queryValidityFilter").value||q.validity===$("#queryValidityFilter").value)&&
    (!$("#queryDueFilter").value||q.due_date===$("#queryDueFilter").value)
  );
}
function renderQueries(){
  const a=filteredQueries().sort((x,y)=>(y.raised_at||"").localeCompare(x.raised_at||""));
  $("#queryRows").innerHTML=a.map((q,i)=>{
    const action=q.status==="Open"&&canRespondQuery(q)?'<button class="pm-btn" data-respond="'+E(q.query_id)+'">Respond</button>':(q.status==="Open"?'<span class="pm-mini">Waiting on '+E(q.owner||"owner")+'</span>':'<span class="pm-mini">—</span>');
    return '<tr><td>'+(i+1)+'</td><td><b>'+E(q.query_id)+'</b></td><td>'+E(fmt(q.raised_at))+'</td><td>'+E(q.task_id)+'</td><td>'+E(q.series)+'</td><td>'+E(q.processor)+'</td><td>'+E(q.insured)+'</td><td>'+E(q.team||"—")+'</td><td>'+E(q.question)+'</td><td>'+E(q.response||"—")+'</td><td>'+E(q.responded_by||"—")+'</td><td>'+E(fmt(q.responded_at))+'</td><td>'+E(q.category||"—")+'</td><td>'+E(q.sop_update||"No")+'</td><td><span class="pm-pill '+String(q.type||"").toLowerCase()+'">'+E(q.type)+'</span></td><td>'+E(q.validity||"Not assessed")+'</td><td>'+E(q.comments||"—")+'</td><td>'+E(q.owner||"Unassigned")+'</td><td>'+E(q.due_date||"—")+'</td><td><span class="pm-pill '+(q.status==="Open"?"open":"done")+'">'+E(q.status)+'</span></td><td>'+action+'</td></tr>';
  }).join("")||'<tr><td colspan="21" class="pm-empty">No questions match your access scope or filters</td></tr>';
  $("#queryCount").textContent=a.length+" questions displayed · Each question is linked to one Task ID.";
}

function taskForm(t){
  if(t&&!canEditTask(t))return note("You can only update tasks assigned to your profile.");
  if(!t&&!isSupervisor())return note("Only a supervisor can assign a new task.");
  editTask=t||null;
  $("#taskModalTitle").textContent=t?"Update task":"Assign processing task";
  const activeUsers=users.filter(u=>u.is_active!==false);
  $("#tProcessor").innerHTML='<option value="">Select processor</option>'+activeUsers.map(u=>'<option value="'+E(u.user_id)+'">'+E(u.full_name)+'</option>').join("");
  $("#tTeam").innerHTML='<option value="">Select team</option>'+teams.map(x=>'<option value="'+E(x.team_id)+'">'+E(teamName(x))+'</option>').join("");
  const assigned=users.find(u=>u.user_id===t?.processor_user_id)||activeUsers.find(u=>norm(u.full_name)===norm(t?.processor));
  const team=teams.find(x=>String(x.team_id)===String(t?.team_id))||teams.find(x=>norm(teamName(x))===norm(t?.team));
  const values={
    tProcessor:assigned?.user_id||(isSupervisor()?(actor?.user_id||""):""),
    tTeam:team?.team_id||t?.team_id||actor?.team_id||"",
    tInsured:t?.insured||"",tSeries:t?.series||"",tProposal:t?.proposal||"",
    tReceived:localInput(t?.received_at||now()),tStatus:t?.status||"Received",
    tTarget:t?.tat_target_hours??24,tPriority:t?.priority||"Medium",
    tStart:t?.start_at?localInput(t.start_at):"",tEnd:t?.end_at?localInput(t.end_at):"",
    tDelay:t?.delayed_reason||""
  };
  for(const [key,value] of Object.entries(values))$("#"+key).value=value;
  const associateLocks=["tProcessor","tTeam","tInsured","tSeries","tProposal","tReceived","tTarget","tPriority"];
  for(const key of associateLocks)$("#"+key).disabled=!!t&&!isSupervisor();
  const statusOptions=isSupervisor()?TASKS:["Received","Not Started","In Progress","Query Raised","Awaiting Response","Response Received","Resumed","Completed"];
  $("#tStatus").innerHTML=statusOptions.map(st=>'<option>'+E(st)+'</option>').join("");
  $("#tStatus").value=t?.status||"Received";
  show("taskModal");
}

async function saveTask(){
  const getv=key=>$("#"+key).value;
  if(!editTask&&!isSupervisor())return note("Only a supervisor can create and assign tasks.");
  if(editTask&&!canEditTask(editTask))return note("You do not have permission to update this task.");
  const status=getv("tStatus"),receivedRaw=getv("tReceived");
  let base;
  if(isSupervisor()){
    const processorUser=users.find(u=>u.user_id===getv("tProcessor"));
    const team=teams.find(x=>String(x.team_id)===String(getv("tTeam")));
    const processor=processorUser?.full_name||getv("tProcessor").trim();
    const insured=getv("tInsured").trim(),series=getv("tSeries").trim();
    if(!processor||!insured||!series||!receivedRaw)return note("Processor, insured name, task/series and received date/time are required.");
    const target=Number(getv("tTarget"));
    if(!Number.isFinite(target)||target<=0)return note("TAT target must be greater than zero hours.");
    base={
      ...(editTask||{}),task_id:editTask?.task_id||id("TSK"),
      processor,processor_user_id:processorUser?.user_id||editTask?.processor_user_id||"",
      team:team?teamName(team):getv("tTeam"),team_id:team?.team_id||getv("tTeam")||"",
      insured,series,proposal:getv("tProposal").trim(),
      received_at:new Date(receivedRaw).toISOString(),status,tat_target_hours:target,
      priority:getv("tPriority"),start_at:getv("tStart")?new Date(getv("tStart")).toISOString():null,
      end_at:getv("tEnd")?new Date(getv("tEnd")).toISOString():null,
      delayed_reason:getv("tDelay").trim()
    };
  }else{
    base={
      ...editTask,status,
      start_at:getv("tStart")?new Date(getv("tStart")).toISOString():editTask.start_at||null,
      end_at:getv("tEnd")?new Date(getv("tEnd")).toISOString():editTask.end_at||null,
      delayed_reason:getv("tDelay").trim()
    };
  }
  const openForTask=queries.filter(q=>q.task_id===base.task_id&&q.status==="Open");
  if(status==="Completed"&&openForTask.length)return note("Resolve or reassign all open questions before completing this task.");
  if(status==="In Progress"&&!base.start_at)base.start_at=now();
  if(status==="Completed"){
    if(!base.start_at)return note("Start Time is required before completing the task.");
    if(!base.end_at)base.end_at=now();
    if(dt(base.end_at)<dt(base.start_at))return note("End Time cannot be earlier than Start Time.");
    base.processed_at=base.end_at;
  }else{
    base.processed_at=null;
    if(base.end_at&&base.start_at&&dt(base.end_at)<dt(base.start_at))return note("End Time cannot be earlier than Start Time.");
  }
  base.version=Number(editTask?.version||0)+1;
  base.created_at=editTask?.created_at||now();
  base.created_by=editTask?.created_by||actor?.user_id||"LOCAL";
  base.updated_at=now();base.updated_by=actor?.user_id||"LOCAL";
  const measure=metrics(base);
  if(status==="Completed"&&measure.met==="Breached"&&!base.delayed_reason)return note("Delayed Reason is mandatory when Net TAT breaches the target.");
  await saveTaskRecord(base,editTask?"task.update":"task.create");
  hide("taskModal");await reload();note(editTask?"Task updated.":"Task assigned.");
}

function queryForm(taskId){
  const eligible=visibleTasks().filter(t=>canEditTask(t)&&!["Completed","Cancelled"].includes(t.status));
  const t=eligible.find(x=>x.task_id===taskId)||eligible[0];
  if(!t)return note("No active task is available for a question. Create or assign a task first.");
  $("#qTask").innerHTML=eligible.map(x=>'<option value="'+E(x.task_id)+'">'+E(x.task_id+" · "+x.insured+" · "+x.processor)+'</option>').join("");
  $("#qTask").value=t.task_id;
  $("#qRaisedAt").value=fmt(now());
  $("#qRaisedBy").value=actor?.full_name||"Local user";
  $("#qOwner").value="";
  $("#qDue").value="";
  $("#qQuestion").value="";
  $("#qComments").value="";
  $("#qValidity").value="";
  $("#qSop").value="No";
  $("#qType").value="Internal";
  show("queryModal");
}

async function saveQuery(){
  const task=visibleTasks().find(x=>x.task_id===$("#qTask").value);
  const question=$("#qQuestion").value.trim(),owner=$("#qOwner").value.trim(),due=$("#qDue").value;
  if(!task||!canEditTask(task))return note("Select one of your available tasks.");
  if(!question)return note("Question is required.");
  if(!owner)return note("Owner / Respondent is required so the query has a clear action owner.");
  if(!due)return note("Follow-up Due Date is required for query tracking.");
  const at=now(),type=$("#qType").value,ownerUser=users.find(u=>norm(u.full_name)===norm(owner));
  const q={
    query_id:id("QRY"),version:1,task_id:task.task_id,raised_at:at,type,
    category:$("#qCategory").value,owner,owner_user_id:ownerUser?.user_id||"",
    due_date:due,question,processor:task.processor,processor_user_id:task.processor_user_id||"",
    insured:task.insured,team:task.team,team_id:task.team_id||"",series:task.series,
    validity:$("#qValidity").value,sop_update:$("#qSop").value,comments:$("#qComments").value.trim(),
    status:"Open",response:"",responded_by:"",responded_at:null,
    raised_by:actor?.user_id||"LOCAL",raised_by_name:actor?.full_name||"Local user",
    history:[{action:"raised",at,by:actor?.user_id||"LOCAL"}]
  };
  await saveQueryRecord(q,"query.raised");
  if(!["Completed","Cancelled"].includes(task.status)){
    const next={...task,version:Number(task.version||0)+1,status:"Awaiting Response",updated_at:at,updated_by:actor?.user_id||"LOCAL"};
    await saveTaskRecord(next,"task.query_wait");
  }
  hide("queryModal");await reload();note("Question logged and linked to "+task.task_id+".");
}

function responseForm(qid){
  activeQuery=visibleQueries().find(q=>q.query_id===qid);
  if(!activeQuery)return note("Question is outside your access scope.");
  if(!canRespondQuery(activeQuery))return note("Only the assigned owner or a supervisor can record this response.");
  $("#responseInfo").textContent=activeQuery.query_id+" · "+activeQuery.task_id+" · "+activeQuery.type+" · "+activeQuery.question;
  $("#qResponse").value="";
  $("#rValidity").value=activeQuery.validity||"";
  $("#qResponseStatus").value="Responded";
  $("#rComments").value="";
  show("responseModal");
}

async function saveResponse(){
  const response=$("#qResponse").value.trim();
  if(!response)return note("Response is required.");
  const q=activeQuery;
  if(!q||!canRespondQuery(q))return note("You are not the assigned response owner.");
  const at=now(),status=$("#qResponseStatus").value;
  const next={
    ...q,version:Number(q.version||0)+1,response,responded_by:actor?.full_name||"Local user",
    responded_at:at,validity:$("#rValidity").value||q.validity,
    comments:[q.comments,$("#rComments").value.trim()].filter(Boolean).join(" | "),
    status,history:(q.history||[]).concat([{action:status.toLowerCase(),at,by:actor?.user_id||"LOCAL"}])
  };
  await saveQueryRecord(next,"query."+status.toLowerCase());
  const task=tasks.find(x=>x.task_id===q.task_id);
  if(task&&!["Completed","Cancelled"].includes(task.status)){
    const otherOpen=queries.some(x=>x.task_id===task.task_id&&x.query_id!==q.query_id&&x.status==="Open");
    const taskStatus=otherOpen?"Awaiting Response":"Response Received";
    await saveTaskRecord({...task,version:Number(task.version||0)+1,status:taskStatus,updated_at:at,updated_by:actor?.user_id||"LOCAL"},"task.query_response");
  }
  hide("responseModal");await reload();note("Question response saved.");
}

async function reload(){await load();render()}
function csv(rows,filename){
  const data=rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob(["\ufeff"+data],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=filename||("opex-export-"+Date.now()+".csv");a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function downloadTasks(){
  const rows=visibleTasks().map((t,i)=>{
    const m=metrics(t),h=aht(t);
    return [i+1,t.task_id,t.processor,t.insured,t.series,t.status,t.proposal,t.received_at,t.processed_at,
      m.gross==null?"":(m.gross/3600000).toFixed(2),(m.wait/3600000).toFixed(2),
      m.net==null?"":(m.net/3600000).toFixed(2),m.met,t.delayed_reason,t.start_at,t.end_at,
      h==null?"":(h/3600000).toFixed(2)];
  });
  csv([["Sl No","Task ID","Processor Name","Insured Name","Task","Task Status","Proposal Number","Received Date Time","Processed Date Time","Gross TAT Hours","External Wait Hours","Net TAT Hours","Meet TAT","Delayed Reason","Start Time","End Time","AHT Hours"],...rows],"opex-task-tracker.csv");
}
function downloadQueries(){
  const rows=visibleQueries().map((q,i)=>[i+1,q.query_id,q.raised_at,q.task_id,q.series,q.processor,q.insured,q.team,q.question,q.response,q.responded_by,q.responded_at,q.category,q.sop_update,q.type,q.validity,q.comments,q.owner,q.due_date,q.status]);
  csv([["Sl No","Query ID","Date","Task ID","Series","Processor","Insured Name","Team","Question","Response","Responded By","Responded Date","Category","SOP Update","Internal/External","Valid/Invalid","Comments","Owner","Due Date","Status"],...rows],"opex-question-log.csv");
}

function bind(){
  document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>view(b.dataset.view));
  $("#addTask").onclick=()=>taskForm();
  $("#addQuery").onclick=()=>queryForm();
  $("#saveTask").onclick=()=>saveTask().catch(e=>note(e.message));
  $("#saveQuery").onclick=()=>saveQuery().catch(e=>note(e.message));
  $("#saveResponse").onclick=()=>saveResponse().catch(e=>note(e.message));
  $("#exportTasks").onclick=downloadTasks;$("#exportQueries").onclick=downloadQueries;
  ["taskSearch","taskStatusFilter","processorFilter","teamFilter","tatFilter","receivedFrom"].forEach(x=>$("#"+x).addEventListener("input",renderTasks));
  ["querySearch","queryStatusFilter","queryTypeFilter","queryCategoryFilter","queryValidityFilter","queryDueFilter"].forEach(x=>$("#"+x).addEventListener("input",renderQueries));
  document.body.addEventListener("click",e=>{
    const edit=e.target.closest("[data-edit-task]");if(edit)taskForm(visibleTasks().find(t=>t.task_id===edit.dataset.editTask));
    const question=e.target.closest("[data-task-query]");if(question)queryForm(question.dataset.taskQuery);
    const respond=e.target.closest("[data-respond]");if(respond)responseForm(respond.dataset.respond);
    const close=e.target.closest("[data-close]");if(close)hide(close.dataset.close);
  });
  ["taskModal","queryModal","responseModal"].forEach(x=>$("#"+x).onclick=e=>{if(e.target.id===x)hide(x)});
}

try{const x=await OPEX.init();S=x.store;actor=x.actor;if(!x.connected){$("#connect").hidden=false;$("#connect").onclick=async()=>{await S.connect();location.reload()};return}$("#connect").hidden=true;users=await OPEX.users(S);teams=await OPEX.teams(S);await S.dir("_operations/tasks",true);await S.dir("_operations/queries",true);bind();await reload();setInterval(()=>reload().catch(e=>note(e.message)),7000)}catch(e){note(e.message)}
})();
/* Plain classic-script storage layer. No modules, packages, or build step. */
(function(){
 function Store(){this.root=null;this.name=""}
 Store.prototype.connect=async function(){
  if(!window.showDirectoryPicker)throw new Error("Folder access is unavailable in this browser context. Open the app in current Edge/Chrome from a secure context, then connect the shared folder.");
  this.root=await window.showDirectoryPicker({id:"opex-shared",mode:"readwrite"});this.name=this.root.name;await this.bootstrap();return this.name
 };
 Store.prototype.dir=async function(path,create){if(!this.root)throw new Error("Connect the shared workspace first.");var h=this.root;var bits=path.split("/").filter(Boolean);for(var i=0;i<bits.length;i++)h=await h.getDirectoryHandle(bits[i],{create:create!==false});return h};
 Store.prototype.file=async function(path,create){var bits=path.split("/");var name=bits.pop();var d=bits.length?await this.dir(bits.join("/"),create):this.root;return d.getFileHandle(name,{create:create!==false})};
 Store.prototype.read=async function(path,fallback){try{var h=await this.file(path,false);return JSON.parse(await(await h.getFile()).text())}catch(e){if(e.name==="NotFoundError")return fallback;throw e}};
 Store.prototype.write=async function(path,value){var h=await this.file(path,true);var w=await h.createWritable();await w.write(JSON.stringify(value,null,2));await w.close()};
 Store.prototype.lines=async function(path){try{var h=await this.file(path,false);var s=await(await h.getFile()).text();return s.split(/\r?\n/).filter(Boolean).map(function(x){return JSON.parse(x)})}catch(e){if(e.name==="NotFoundError")return[];throw e}};
 Store.prototype.append=async function(path,record){var h=await this.file(path,true);var file=await h.getFile();var w=await h.createWritable({keepExistingData:true});await w.seek(file.size);await w.write(JSON.stringify(record)+"\n");await w.close()};
 Store.prototype.listDirs=async function(path){var d=await this.dir(path,false),out=[];for await(var e of d.values())if(e.kind==="directory")out.push(e.name);return out};
 Store.prototype.listFiles=async function(path){var d=await this.dir(path,false),out=[];for await(var e of d.values())if(e.kind==="file")out.push(e.name);return out};
 Store.prototype.bootstrap=async function(){var dirs=["_system","data","_audit","_auth","_outbox","_notifications","_email_outbox","_exports","templates"];for(var i=0;i<dirs.length;i++)await this.dir(dirs[i],true);var defaults={"_system/workspace.json":{product:"OPEX",schema_version:2,created_at:new Date().toISOString()},"_system/forms.json":{forms:[]},"_system/users.json":{users:[{user_id:"USR-ADMIN",employee_id:"ADMIN",full_name:"System Admin",email:"",role:"admin",team_id:"",is_active:true}]},"_system/teams.json":{teams:[]},"_system/settings.json":{refresh_seconds:5}};for(var p in defaults)if(!await this.read(p,null))await this.write(p,defaults[p])};
 window.OPEXStore=Store
})();
async function queueRegional(body,env){
 if(!env.DB||!env.BUCKET)throw Error('待审队列存储未连接，未提交发布');
 if(body.locale!=='pt'||body.category!=='tradfi_news')throw Error('待审内容类型无效');
 if(!Array.isArray(body.images)||body.images.length<1||body.images.length>4||body.images.some(x=>typeof x!=='string'||x.length>6990600||!/^data:image\/(png|jpeg|webp);base64,/.test(x)))throw Error('待审图片无效');
 if(typeof body.text!=='string'||!body.text.trim()||body.text.length>25000)throw Error('待审文案无效');
 const id=crypto.randomUUID(),key='regional-review/'+id,now=new Date().toISOString();
 await env.BUCKET.put(key,JSON.stringify({...body,regionalReview:true}),{httpMetadata:{contentType:'application/json'}});
 await env.DB.prepare('INSERT INTO regional_review_queue (id,locale,content_type,category,due_at,state,caption,asset_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,body.locale,body.type,body.category,body.scheduledAt??now,'needs_review',body.text,key,now,now).run();
 return {state:'needs_review',queueId:id,scheduledAt:body.scheduledAt,message:'已存待审队列，尚未交给 Publer。临近发布时更新图文并确认后放行。'};
}
async function regionalScan(env){const now=new Date().toISOString();const r=await env.DB.prepare("UPDATE regional_review_queue SET state='review_due',updated_at=? WHERE state='needs_review' AND due_at<=?").bind(now,new Date(Date.now()+1800000).toISOString()).run();return {marked:r.meta?.changes??0,checkedAt:now,message:'临近或已过发布时间的稿件已标记待更新；未发布任何内容'};}
async function regionalApi(request,env,u){
 if(!env.DB||!env.BUCKET)throw Error('待审存储未连接');
 if(u.pathname==='/api/regional/check'&&request.method==='POST'){if(request.headers.get('Origin')&&request.headers.get('Origin')!==u.origin)return Response.json({error:'来源无效'},{status:403});return Response.json(await regionalScan(env))}
 if(request.method==='GET'){const rows=(await env.DB.prepare('SELECT id,locale,content_type,category,due_at,state,caption,created_at,updated_at,result_json FROM regional_review_queue ORDER BY created_at DESC LIMIT 100').all()).results;return Response.json({rows},{headers:{'Cache-Control':'no-store'}})}
 if(request.headers.get('Origin')!==u.origin)return Response.json({error:'请从工作台操作'},{status:403});
 const b=await request.json();const row=await env.DB.prepare('SELECT * FROM regional_review_queue WHERE id=?').bind(String(b.id??'')).first();if(!row)throw Error('待审稿件不存在');
 if(u.pathname==='/api/regional/cancel'){if(!['needs_review','review_due'].includes(row.state))throw Error('稿件已处理');await env.DB.prepare("UPDATE regional_review_queue SET state='cancelled',updated_at=? WHERE id=?").bind(new Date().toISOString(),row.id).run();return Response.json({state:'cancelled'})}
 if(u.pathname==='/api/regional/load'){if(!['needs_review','review_due'].includes(row.state))throw Error('稿件已处理');const object=await env.BUCKET.get(row.asset_key);if(!object)throw Error('稿件素材缺失');return Response.json({id:row.id,dueAt:row.due_at,...await object.json()})}
 throw Error('队列操作无效');
}
async function regionalMcp(request,env){
 const b=await request.json();let result;
 if(b.method==='server/discover')result={supportedVersions:['2026-07-28'],capabilities:{tools:{}}};
 else if(b.method==='initialize')result={protocolVersion:'2026-07-28',serverInfo:{name:'Hotcoin Cloud Studio',version:'2.0'},capabilities:{tools:{}}};
 else if(b.method==='tools/list')result={tools:[
 {name:'check_regional_review_queue',description:'Mark approaching or overdue Brazil TradFi drafts as requiring review. Never publishes.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'run_studio_production',description:'Run ONE due cloud source, generation or autonomous audit job. Images and captions MUST pass TWO independent audits before HUMAN REVIEW; failed content is automatically repaired with bounded retries. No publishing. Repeat up to 12 calls per scheduled run until idle; retries and errors are persisted. Reads saved editorial rules.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'read_studio_production',description:'Read cloud task states, generation errors and ready draft IDs. No generation or publishing.',inputSchema:{type:'object',properties:{},additionalProperties:false}}
 ]};
 else if(b.method==='tools/call'){
  let value;if(b.params?.name==='check_regional_review_queue')value=await regionalScan(env);
  else if(b.params?.name==='run_studio_production')value=await studioTick(env);
  else if(b.params?.name==='read_studio_production'){await studioInit(env);value={jobs:(await env.DB.prepare('SELECT id,day,type,locale,state,attempts,error,next_at,updated_at,audit_version,audit_json,phase FROM studio_jobs ORDER BY created_at DESC LIMIT 80').all()).results};}
  else return Response.json({jsonrpc:'2.0',id:b.id,error:{code:-32601,message:'Unknown tool'}});
  result={content:[{type:'text',text:JSON.stringify(value)}]};
 }else if(b.method?.startsWith('notifications/'))return new Response(null,{status:202});
 else return Response.json({jsonrpc:'2.0',id:b.id,error:{code:-32601,message:'Method not found'}});
 return Response.json({jsonrpc:'2.0',id:b.id,result});
}

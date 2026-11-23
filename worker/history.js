async function historyStart(env,body){
 if(!env.DB)throw Error('发布记录数据库未连接，未提交发布');
 const id=crypto.randomUUID(),now=new Date().toISOString();
 await env.DB.prepare('INSERT INTO studio_publications (id,locale,content_type,caption,state,scheduled_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,body.locale,body.type,body.text,'submitting',body.scheduledAt??null,now,now).run();return id;
}
async function historyState(env,id,result){
 await env.DB.prepare('UPDATE studio_publications SET state=?,job_id=COALESCE(?,job_id),post_id=COALESCE(?,post_id),post_url=COALESCE(?,post_url),updated_at=? WHERE id=?').bind(result.state,result.jobId??null,result.postId??null,result.url??null,new Date().toISOString(),id).run();
}
async function historyRefresh(env,locale,page=0){
 const rows=(await env.DB.prepare("SELECT * FROM studio_publications WHERE locale=? ORDER BY created_at DESC LIMIT 25 OFFSET ?").bind(locale,page*25).all()).results;
 const errors=[];
 for(const row of rows){try{
  let post;
  if(row.post_id)post=await publerRequest(env,'/posts/'+row.post_id);
  else if(row.job_id){const j=await publerRequest(env,'/job_status/'+row.job_id);post=publerJobPosts(j).find(p=>String(p.account_id)===accounts[locale]);if(!post&&row.scheduled_at&&['complete','completed'].includes(j.status))post=await confirmedScheduledPost(env,row);if(!post&&j.status==='failed')await historyState(env,row.id,{state:'failed'})}
  if(!post)continue;
  if(post.account_id!==accounts[locale])throw Error('账号不匹配');
  const state=post.state==='published_deleted'?'withdrawn':post.state;
  await env.DB.prepare('UPDATE studio_publications SET state=?,post_id=?,post_url=?,published_at=?,scheduled_at=?,thumbnail=?,updated_at=? WHERE id=?').bind(state,String(post.id),post.post_link??null,state==='published'?post.scheduled_at:row.published_at,post.scheduled_at??row.scheduled_at,post.media?.[0]?.thumbnail??null,new Date().toISOString(),row.id).run();
 }catch(e){errors.push(e.message)}}return errors;
}
function metricValues(raw){const value=k=>{const v=raw?.[k]?.value??(typeof raw?.[k]==='number'?raw[k]:null);return typeof v==='number'&&Number.isFinite(v)?v:null};const m={};for(const k of ['reach','likes','comments','shares','post_clicks','link_clicks','engagement','engagement_rate','video_views'])m[k]=value(k);if(m.engagement===null&&['likes','comments','shares','post_clicks'].every(k=>m[k]!==null))m.engagement=m.likes+m.comments+m.shares+m.post_clicks;return m}
async function historyMetrics(env,locale,page=0){
 const cutoff=Date.now()-86400000;
 const rows=(await env.DB.prepare("SELECT * FROM studio_publications WHERE locale=? ORDER BY created_at DESC LIMIT 25 OFFSET ?").bind(locale,page*25).all()).results.filter(r=>r.state==='published'&&Date.parse(r.published_at)<=cutoff);
 if(!rows.length)return {updated:0};
 const dates=rows.map(r=>new Date(Date.parse(r.published_at)+28800000).toISOString().slice(0,10)).sort();const found=new Map();let complete=false;
 for(let page=0;page<20;page++){
  const q=new URLSearchParams({from:dates[0],to:dates.at(-1),page:String(page)});
  const d=await publerRequest(env,'/analytics/'+accounts[locale]+'/post_insights?'+q);const posts=d.posts??[];
  for(const p of posts){for(const key of [p.id,p.old_id,p.post_link])if(key)found.set(String(key),p)}
  if(!posts.length||typeof d.total==='number'&&(page+1)*10>=d.total){complete=true;break}
 }
 let updated=0;const collectedAt=new Date().toISOString();
 for(const r of rows){const p=found.get(r.post_id)||found.get(r.post_url);if(!p?.analytics){await env.DB.prepare('UPDATE studio_publications SET metrics_error=? WHERE id=?').bind(complete?'Publer 暂未返回此帖统计':'本次达到分页上限，尚未匹配到此帖',r.id).run();continue}
  await env.DB.prepare('UPDATE studio_publications SET metrics_json=?,collected_at=?,metrics_error=NULL WHERE id=?').bind(JSON.stringify(metricValues(p.analytics)),collectedAt,r.id).run();updated++;
 }return {updated,collectedAt,complete};
}
async function historyImport(env,body){
 if(!Array.isArray(body.items)||body.items.length>50)throw Error('每次最多迁移 50 条');let imported=0;
 for(const x of body.items){if(!accounts[x.locale]||!x.postId)continue;const p=await publerRequest(env,'/posts/'+encodeURIComponent(x.postId));if(p.account_id!==accounts[x.locale])continue;const now=new Date().toISOString();const r=await env.DB.prepare('INSERT OR IGNORE INTO studio_publications (id,locale,content_type,caption,state,post_id,post_url,published_at,scheduled_at,thumbnail,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),x.locale,'legacy',p.text??'',p.state==='published_deleted'?'withdrawn':p.state,String(p.id),p.post_link??null,p.state==='published'?p.scheduled_at:null,p.scheduled_at??null,p.media?.[0]?.thumbnail??null,now,now).run();imported+=r.meta?.changes??0}return {imported};
}
async function historyApi(request,env,u){
 if(!env.DB)throw Error('发布记录数据库未连接');
 const locale=u.searchParams.get('locale')??'zh';if(!accounts[locale])throw Error('账号无效');
 if(request.method==='POST'&&request.headers.get('Origin')!==u.origin)return Response.json({error:'请从工作台操作'},{status:403});
 if(u.pathname==='/api/history/import'&&request.method==='POST')return Response.json(await historyImport(env,await request.json()));
 if(u.pathname==='/api/history/refresh'&&request.method==='POST'){const selectedPage=Math.max(0,Math.min(1000,Number(u.searchParams.get('page'))||0));const errors=await historyRefresh(env,locale,selectedPage);let metrics;try{metrics=await historyMetrics(env,locale,selectedPage)}catch(e){errors.push('统计读取失败：'+e.message)}return Response.json({errors,metrics})}
 if(request.method!=='GET')throw Error('请求方式无效');
 const page=Math.max(0,Math.min(1000,Number(u.searchParams.get('page'))||0));
 const rows=(await env.DB.prepare('SELECT * FROM studio_publications WHERE locale=? ORDER BY created_at DESC LIMIT 25 OFFSET ?').bind(locale,page*25).all()).results;
 const total=(await env.DB.prepare('SELECT COUNT(*) AS n FROM studio_publications WHERE locale=?').bind(locale).first()).n;
 return Response.json({rows:rows.map(r=>({...r,metrics:r.metrics_json?JSON.parse(r.metrics_json):null,metrics_json:undefined})),total,page},{headers:{'Cache-Control':'no-store'}});
}

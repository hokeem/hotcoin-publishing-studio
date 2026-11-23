export const brZone='America/Sao_Paulo';
export function brSlot(slot,now=Date.now()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:brZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const v=Object.fromEntries(parts.map(x=>[x.type,x.value]));let at=Date.parse(`${v.year}-${v.month}-${v.day}T${slot}:00-03:00`);if(at<now+60000)at+=86400000;return new Date(at).toISOString();
}
export function eligiblePT(type,category){return ['spot','perp'].includes(type)||['tradfi_news','tradfi_evergreen'].includes(category)}
export function accountPlan({type,category,locale,mode,customAt,rows=[],date,freshnessConfirmed=false,now=Date.now()}){
 if(locale==='pt'&&!eligiblePT(type,category))return {allowed:false,reason:'葡语仅发布 TradFi 和上新；混合内容需先制作 TradFi 专版'};
 let scheduledAt=null;
 if(['spot','perp'].includes(type)&&mode==='policy'){
  const times=[...new Set(rows.map(r=>r.time).filter(x=>/^\d{2}:\d{2}$/.test(x)))];
  if(times.length!==1)return {allowed:false,reason:'上新须有明确且统一的上线时间；请确认批次或单独设定时间'};
  const release=Date.parse(date+'T'+times[0]+':00+08:00');
  if(!Number.isFinite(release)||release<now+60000)return {allowed:false,reason:'上线时点已过或不完整，请改为指定账号立即发布并检查“已上线”措辞'};
  scheduledAt=new Date(release).toISOString();
 }else if(mode==='custom'){
  const at=Date.parse(customAt);if(!Number.isFinite(at)||at<now+60000)return {allowed:false,reason:'请选择至少 1 分钟后的发布时间'};scheduledAt=new Date(at).toISOString();
 }else if(locale==='pt'&&['policy','br19','br2130'].includes(mode))scheduledAt=brSlot(mode==='br2130'?'21:30':'19:00',now);
 const news=category==='tradfi_news';const delay=scheduledAt?Date.parse(scheduledAt)-now:0;
 const needsReview=locale==='pt'&&news&&(delay>1800000||!freshnessConfirmed);
 return {allowed:true,scheduledAt,needsReview,category,zone:locale==='pt'?brZone:'Asia/Shanghai'};
}
export function dualTime(iso){if(!iso)return '立即发布';return '巴西 '+new Date(iso).toLocaleString('zh-CN',{timeZone:brZone})+' · 北京 '+new Date(iso).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}

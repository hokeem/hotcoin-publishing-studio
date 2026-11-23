import {accountPlan,eligiblePT,dualTime} from './publishing-policy.js';
import {perpetualCaption} from './perp-caption.js';
import {renderMorningTop,morningTopCaption} from './morning-top.js?v=3';
import {localizeHotcoinLinks} from './hotcoin-links.js';
import {renderDailyReport} from './daily-renderer.js';
import { drawLogo, prepareLogo, fourSlots, fiveSlots, singleSlot } from "./listing-logos.js?v=3";
const $=id=>document.getElementById(id);
const labels={en:'English',zh:'简体中文',tc:'繁體中文',pt:'Português (BR)',vi:'Tiếng Việt'};
const handles={en:'@HotcoinGlobal',zh:'@hotcoinzh',tc:'@HotcoinTC',pt:'@Hotcoin_PT',vi:'仅制作 · 暂不发布'};
const menu={
 daily:['每日资讯日报','每日早上 10:30 发布 · 建议提前制作 · 北京时间（UTC+8）'],
 spot:['现货上新','Lark 表格更新或手动粘贴上新资料后可制作 · 无固定时刻'],
 perp:['永续合约上新','Lark 表格更新或手动粘贴合约资料后可制作 · 无固定时刻'],
 stock:['美股图文','上传英文原图和文案后随时制作'],
 watch:['今日关注','英文账号通常 12:01 发布；原帖出现后可制作 · 北京时间（UTC+8）'],
 top:['每日 Top 5','北京时间版 · 每日 13:00 左右点击制作 · 显示实际截取时间（UTC+8）']
};
const menuTiming={daily:'10:30 发布 · 提前制作',spot:'表格更新 / 资料粘贴后',perp:'表格更新 / 资料粘贴后',stock:'英文图文上传后 · 随时',watch:'英文约 12:01 发布后',top:'北京时间 13:00 · 实时榜单'};
const packs={
 watch:{
  zh:['今日关注','周四跌破 $70K，8 月以来首次','跌破 $2,000，8 月 19 日以来首次','下调 2026 年展望，周四收跌 16.8%','第三季度业绩超预期，盘后涨超 14%','美国 10 月 PPI 将于北京时间 21:30 公布','11 月 13 日 11:42（UTC+8），24 小时涨跌幅','你关注哪一个？'],
  tc:['今日關注','週四跌破 $70K，8 月以來首次','跌破 $2,000，8 月 19 日以來首次','下修 2026 年展望，週四收跌 16.8%','第三季業績優於預期，盤後漲逾 14%','美國 10 月 PPI 將於 UTC+8 21:30 公布','11 月 13 日 11:42（UTC+8），24 小時漲跌幅','你關注哪一個？'],
  pt:['De olho no mercado','Caiu abaixo de $70K na quinta, pela primeira vez desde agosto','Caiu abaixo de $2,000 pela primeira vez desde 19 de agosto','Fechou em queda de 16.8% na quinta após reduzir a projeção para 2026','Subiu mais de 14% no pós-mercado após superar as estimativas do 3º tri','PPI dos EUA de outubro sai às 21:30 (UTC+8)','13 nov, 11:42 (UTC+8), variação em 24h','Qual está no seu radar?']
 },
 top:{
  zh:['每日涨幅榜 TOP 5','截至 11 月 12 日 22:04（UTC+8）的 24 小时','你最看好哪一个？'],
  tc:['每日漲幅榜 TOP 5','截至 11 月 12 日 22:04（UTC+8）的 24 小時','你最看好哪一個？'],
  pt:['Top 5 altas do dia','24h até 12 nov, 22:04 (UTC+8)','Qual está no seu radar?']
 },
 stock:{zh:'Hotcoin 盘前行情快照：NVDA/USDT 永续合约最新价 153.54，24 小时跌幅 12.10%。',tc:'Hotcoin 盤前行情快照：NVDA/USDT 永續合約最新價 153.54，24 小時跌幅 12.10%。',pt:'Pré-mercado na Hotcoin: o perpétuo NVDA/USDT está em 153.54, com queda de 12.10% em 24 horas.'}
};
const sampleDates={watch:'2026-11-13',top:'2026-11-12',spot:'2026-11-02',perp:'2026-11-12',stock:'2026-11-12'};
const pairs=['ECHO','TWDELTA','NANYA','NEE','FRHC'];
const sampleListings={
 spot:{url:'https://x.com/HotcoinGlobal/status/2117141435611009033',rows:[{symbol:'AXON',pair:'AXON/USDT',logo:'/assets/listing-AXON-sample.png',time:'预告'}]},
 perp:{url:'https://example.larksuite.com/sheets/example',rows:pairs.map((symbol,i)=>({symbol,pair:symbol+'/USDT',leverage:20,time:'21:00',row:49+i,logo:'/assets/listing-'+symbol+'-sample.png'}))}
};
let activePublication=null;
let connectionState=null;
let selected='watch', current=null, variants=[], rev=0;
const node=(tag,value)=>{const e=document.createElement(tag);if(value)e.textContent=value;return e;};
const dateNow=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
const status=t=>$('source-status').textContent=t;
const generationStatus=t=>$('generation-status').textContent=t;
const publishStatus=t=>$('publish-status').textContent=t;
$('date').value=dateNow();
for(const key of Object.keys(menu)){
 const b=node('button');b.append(node('span',menu[key][0]));
 const timing=node('small',menuTiming[key]);timing.id='timing-'+key;b.append(timing);
 b.setAttribute('aria-label',menu[key][0]);b.setAttribute('aria-describedby',timing.id);
 b.dataset.type=key;b.onclick=()=>activate(key);
 $(key==='daily'?'morning':['watch','top'].includes(key)?'source-dependent':'ready').append(b);
}
function reset(){
 rev++;current=null;variants=[];activePublication=null;$('publish-links').replaceChildren();$('publish-warning').textContent='';
 $('source').replaceChildren();$('results').replaceChildren();
 $('generate').disabled=selected!=='daily';$('publish').disabled=true;$('publish-all').disabled=true;$('account-options').textContent='生成图文后选择账号';$('lookup').disabled=false;status('');generationStatus('');publishStatus('');
 $('daily-sources').replaceChildren();$('daily-checked').checked=false;$('daily-approval').hidden=true;$('daily-validation').textContent='';
}
function activate(key){
 selected=key;reset();$('content-category').value=['spot','perp'].includes(key)?'listing':key==='stock'?'tradfi_news':key==='watch'?'mixed':'crypto';$('pt-freshness').checked=false;document.querySelector('.panel').classList.toggle('daily-panel',key==='daily');
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.type===key));
 $('title').textContent=menu[key][0];$('hint').textContent=menu[key][1];
 $('upload').hidden=key!=='stock';
 $('top-mode-field').hidden=key!=='top';$('source-step').hidden=key==='daily';$('daily-guide').hidden=key!=='daily';$('sample').hidden=key==='daily';
 $('generation-title').textContent=key==='daily'?'1. 制作日报':'2. 生成图文';
 $('publication-title').textContent=key==='daily'?'2. 发布到 X':'3. 发布到 X';
 $('generate').textContent=key==='daily'?'制作四语日报':'生成图文';
 const listingTab=['spot','perp'].includes(key);
 $('show-paste').hidden=!listingTab;
 $('manual-listings').hidden=true;
 $('listing-text').value='';
 $('lookup').textContent=listingTab?'从 Lark 获取':key==='top'&&$('top-mode').value==='morning'?'获取实时 Top 5':'获取来源';
 renderConnections();
}
$('date').onchange=reset;
$('inputText').oninput=reset;
$('inputImage').onchange=reset;
async function call(path,body){
 const r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);
 const d=await r.json().catch(()=>null);
 if(!r.ok||!d)throw Error(r.status===401||r.status===403?'请用有权限的 Sites 账号打开工作台。':(d?.error||'工作台暂时无法连接，请重试（HTTP '+r.status+'）。'));
 return d;
}
function listingBlocked(data){return Boolean(data.rows&&(!data.rows.length||data.rows.some(r=>!r.art||r.tentative||(selected==='perp'&&!r.leverage))))}
function showSource(data){
 current=data;$('source').replaceChildren();
 const image=node('img');
 image.alt=data.imageOrigin??'英文原图';
 if(data.image){image.src=data.image;$('source').append(image)}
 const content=node('div');
 if(data.manual)content.append(node('strong','手动粘贴的表格记录'));
 if(data.sheetName)content.append(node('strong',data.provider+' · '+data.sheetName+' · 版本 '+data.revision),node('p','读取时间：'+new Date(data.checkedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+' UTC+8'));
 if(data.warnings?.length)content.append(node('p','需要补充或确认：\n'+data.warnings.join('\n')));
 if(data.url){const a=node('a',data.postId?'查看 X 原帖 · '+data.postId:'查看来源');a.href=data.url;a.target='_blank';a.rel='noreferrer';content.append(a)}
 if(data.liveTop){content.append(node('p',data.provider+' · 实际截取 '+data.time+' UTC+8'),node('p','五个官方 Logo 已按交易币种匹配并通过图片检查'));for(const row of data.gainers){const a=node('a',row.symbol+(row.assetName?' · '+row.assetName:'')+' · 查看官方 Logo');a.href=row.logoUrl;a.target='_blank';a.rel='noreferrer';content.append(a,node('br'));}}
 if(data.datetime){
  content.append(node('p',data.provider+' · '+(data.imageOrigin??'原图暂不可用')));
  if(!data.image){
   content.append(node('p',data.imageError??'正在等待原图服务恢复'));
   const retry=node('button','重新获取原图');retry.onclick=()=>$('lookup').click();content.append(retry);
  }
 }
 content.append(node('p',data.text??data.rows?.map(r=>[r.row&&'第 '+r.row+' 行',r.time,r.pair,r.leverage&&r.leverage+'x'].filter(Boolean).join(' · ')).join('\n')));
 for(const row of data.rows??[]){
  const card=node('div');card.className='listing-logo';
  const preview=node('canvas');preview.width=preview.height=58;
  preview.setAttribute('aria-label',row.pair+' 币面预览');
  const details=node('div');
  const info=node('div');
  const control=node('label','替换 Logo');
  control.className='logo-upload';
  const input=node('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.setAttribute('aria-label',row.pair+' Logo');
  control.append(input);
  details.append(node('strong',row.pair),info,control);
  card.append(preview,details);content.append(card);

  function updatePreview(){
   preview.hidden=!row.art;
   const c=preview.getContext('2d');c.clearRect(0,0,58,58);
   if(row.art)drawLogo(c,row.art,{x:29,y:29,width:55,height:55,angle:0});
   info.replaceChildren(node('span',row.logoOrigin?.label??(row.art?'设计样本':'未找到可用 Logo')));
   const url=row.logoOrigin?.url;
   if(url){
    const link=node('a','查看来源');link.href=url;link.target='_blank';link.rel='noopener noreferrer';info.append(link);
   }
   control.firstChild.textContent=row.art?'替换 Logo':'上传 Logo';
  }
  updatePreview();
  input.onchange=async()=>{
   const file=input.files[0];if(!file)return;
   input.disabled=true;$('generate').disabled=true;$('publish').disabled=true;
   try{
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('请上传不超过 5 MB 的 PNG、JPG 或 WebP。');
    const artwork=await prepareLogo(await fileData(file));
    if(current!==data)return;
    rev++;row.art=artwork;row.logoOrigin={label:'手动上传'};
    variants=[];activePublication=null;$('results').replaceChildren();
    $('publish').disabled=true;$('publish-links').replaceChildren();
    $('publish-warning').textContent='';publishStatus('');generationStatus('');
    updatePreview();
    status(data.rows.every(r=>r.art)?'Logo 已更换，请重新生成图文。':'Logo 已更换，请继续补齐剩余素材。');
   }catch(e){if(current===data)status(row.pair+' · '+e.message)}
   finally{
    input.disabled=false;input.value='';
    if(current===data){
     const uploading=Boolean($('source').querySelector('input:disabled'));
     $('generate').disabled=listingBlocked(data)||uploading;
     if(!uploading&&activePublication)renderPublication(activePublication);
    }
   }
  };
 }
 $('source').append(content);$('generate').disabled=Boolean(listingBlocked(data)||(data.datetime&&(!data.image||data.previewOnly)));
 status(data.sheetName?(data.rows.length?'已实时读取 Lark：'+data.rows.length+' 条记录'+(data.warnings?.length?' · 请先补齐或确认数据':''):'Lark 已连接，所选日期暂无匹配记录'):data.sample?'历史验收样本 · '+sampleDates[selected]:data.datetime?'已找到原帖 · '+data.datetime.slice(0,16).replace('T',' ')+' UTC+8'+(data.previewOnly?' · 正在等待完整原图':data.image?' · 原图已加载':' · 原图自动获取暂未成功，请重试'):data.rows?.some(r=>!r.art)?'已自动查找官方 Logo，部分标志暂未取得，可补充官网链接或上传素材。':'来源已读取');
}
function fileData(f){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(f)})}
async function browserOriginal(data){
 if(data.image||!/^\d{15,23}$/.test(data.postId??''))return;
 const candidates=[...(data.imageCandidates??[])];
 try{const r=await fetch('https://api.fxtwitter.com/HotcoinGlobal/status/'+data.postId,{signal:AbortSignal.timeout(10000)});if(r.ok){const post=(await r.json()).tweet;if(String(post?.id)===data.postId&&post.author?.screen_name?.toLowerCase()==='hotcoinglobal')for(const photo of (post.media?.photos??[]).slice(0,1))if(/^https:\/\/pbs\.twimg\.com\/media\//.test(photo.url??''))candidates.unshift(photo.url)}}catch{}

 try{const r=await fetch('https://cdn.syndication.twimg.com/tweet-result?'+new URLSearchParams({id:data.postId,lang:'en',token:'1'}),{signal:AbortSignal.timeout(10000)});if(r.ok){const post=await r.json();if(post.user?.screen_name?.toLowerCase()==='hotcoinglobal'&&post.id_str===data.postId){for(const url of [post.photos?.[0]?.url,post.mediaDetails?.find(x=>x.type==='photo')?.media_url_https])if(/^https:\/\/pbs\.twimg\.com\/media\//.test(url??''))candidates.unshift(url+(url.includes('?')?'&':'?')+'name=orig')}}}catch{}
 for(const url of [...new Set(candidates)]){try{const r=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!r.ok)continue;const blob=await r.blob();if(!['image/jpeg','image/png','image/webp'].includes(blob.type)||blob.size>5*1024*1024)continue;const image=await fileData(blob);await load(image);data.image=image;data.imageOrigin='X 原帖原图（浏览器自动获取）';data.previewOnly=false;await call('/api/source-cache',{postId:data.postId,image}).catch(()=>null);return}catch{}}
}
$('lookup').onclick=async()=>{
 reset();const run=rev,key=selected,date=$('date').value;
 $('lookup').disabled=true;status('读取来源中…');
 try{
  let data;
  if(key==='stock'){
   const f=$('inputImage').files[0], text=$('inputText').value;
   if(!f||!text.trim()||f.size>5*1024*1024)throw Error('请上传不超过 5 MB 的英文图，并填写原文');
   data={text,image:await fileData(f)};
   }else data=(await call('/api/source?'+new URLSearchParams({type:key,date,mode:key==='top'?$('top-mode').value:''}))).source;
  if(data?.liveTop){data.image=(await renderMorningTop(data,'zh',prepareLogo,drawLogo,load)).image;data.text=morningTopCaption(data,'zh');}
  if(data?.rows)await loadListingLogos(data,run);
  if(run!==rev)return;
  if(data&&!data.image&&data.postId){status('已找到原帖，正在自动获取原图…');await browserOriginal(data)}
  if(run!==rev)return;
  if(data)showSource(data);else status('所选日期没有匹配的发布或上新记录。'+(key==='watch'||key==='top'?menu[key][1]:''));
 }catch(e){if(run===rev)status(e.message)}
 finally{if(run===rev)$('lookup').disabled=false}
};
function parseListingTable(input,type,date){
 const month=Number(date.slice(5,7)),day=Number(date.slice(8,10));
 if(!month||!day)throw Error('请先选择工作日期');
 const normalized=input.replace(/\r\n?/g,'\n').replace(/<br\s*\/?>/gi,' ');
 const lines=normalized.split('\n');
 const rows=[];
 for(const [index,line] of lines.entries()){
  const cells=(line.includes('\t')?line.split('\t'):line.trim().replace(/^\||\|$/g,'').split('|')).map(value=>value.trim());
  const timeIndex=cells.findIndex(cell=>/^(?:\d{4}年)?\d{1,2}月\d{1,2}日\s*\d{1,2}:\d{2}/.test(cell));
  if(timeIndex<0)continue;
  const [time,kind,rawPair,links='',extra='']=cells.slice(timeIndex);
  if(!(type==='spot'?kind?.startsWith('现货'):/^(?:永续)?合约/.test(kind??'')))continue;
  if(type==='perp'&&/重上|重新上线|恢复/.test(kind))continue;
  const m=time.match(/^(?:\d{4}年)?(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/);
  if(Number(m[1])!==month||Number(m[2])!==day)continue;
  if(+m[3]>23||+m[4]>59)throw Error('第 '+(index+1)+' 行的时间无效');
  const pair=rawPair?.replace(/[*\`\s]/g,'').toUpperCase();
  if(!/^[A-Z0-9.-]{1,25}\/[A-Z0-9.-]{1,10}$/.test(pair??''))throw Error('第 '+(index+1)+' 行缺少有效交易对');
  const leverage=extra.match(/(\d+)\s*(?:倍|x|×)/i)?.[1];
  if(type==='perp'&&!Number(leverage))throw Error('第 '+(index+1)+' 行缺少杠杆倍数');
  rows.push({kind,time:m[3].padStart(2,'0')+':'+m[4],pair,symbol:pair.split('/')[0],leverage:type==='perp'?leverage:null,official:[...new Set(links.match(/https:\/\/[^\s)\]<>]+/g)??[])]});
 }
 if(!rows.length)throw Error('没有找到与当前工作日期和栏目匹配的记录');
 if(rows.length>30)throw Error('一次最多识别 30 行上新记录');
 return {manual:true,rows};
}
async function loadListingLogos(data,run){
 status('已读到 '+data.rows.length+' 条记录，正在核对项目 Logo…');
 try{
  const result=await call('/api/listing-logos',{rows:data.rows.map(({symbol,official})=>({symbol,official}))});
  await Promise.all(data.rows.map(async(row,i)=>{
   const src=result.logos[i];
   if(!src){row.logoOrigin={label:(result.diagnostics?.[i]||['未取得已核实 Logo']).join('；')};return;}
   const origin=result.sources?.[i];
   row.art=await prepareLogo(src,origin?.kind==='designer',['official','exchange'].includes(origin?.kind)).catch(()=>null);
   row.logoOrigin={label:origin?.kind==='designer'?'设计师确认素材':row.art?((origin?.kind==='exchange'?'Bybit 交易对图标':origin?.kind==='official'?'官方发行方':'CoinMarketCap')+(origin?.assetName?' · '+origin.assetName:'')+' · '+(origin?.method||'精确资产匹配')):'来源图片不可用',url:origin?.url};
  }));
 }catch(e){if(run===rev)console.warn(e.message)}
}
$('show-paste').onclick=()=>{
 $('manual-listings').hidden=!$('manual-listings').hidden;
 if(!$('manual-listings').hidden)$('listing-text').focus();
};
$('parse-listings').onclick=async()=>{
 reset();const run=rev,button=$('parse-listings');
 button.disabled=true;
 try{
  const data=parseListingTable($('listing-text').value,selected,$('date').value);
  await loadListingLogos(data,run);
  if(!data.image&&data.postId)await browserOriginal(data);
  if(run===rev)showSource(data);
 }catch(e){if(run===rev)status(e.message)}
 finally{button.disabled=false}
};
$('sample').onclick=async()=>{
 reset();const run=rev,key=selected;$('date').value=sampleDates[key];
 status('正在载入历史样本…');
 try{
 const data=sampleListings[key]??(key==='stock'?{text:'Hotcoin pre-market snapshot: NVDA/USDT perpetual last traded at 153.54, down 12.10% over 24h.',image:'/assets/stock-en.jpg'}:(await call('/assets/source.json'))[key]);
 const sample={...structuredClone(data),sample:true};
 if(sample.rows)await Promise.all(sample.rows.map(async row=>{row.art=await prepareLogo(row.logo)}));
 if(run===rev)showSource(sample);
 }catch(e){if(run===rev)status(e.message)}
};
function caption(key,l){
 const p=packs[key][l];
 if(key==='stock')return p;
 if(key==='top')return ['🔥 Hotcoin · '+p[0],'⏱ '+p[1],'','🥇 $DJTB +14.35%','🥈 $UP @UnitasLabs +14.01%','🥉 $TPTC +12.54%','4️⃣ $CCDOG +8.06%','5️⃣ $ARX @Arcium +6.95%','',p[2]+' 👇','#Hotcoin #TopGainers'].join('\n');
 const codes=['$BTC $69,165.71 ▼6.22%','$ETH @ethereum $1,954.10 ▼4.82%','$NBISB @nebiusai $127.30 ▼15.87%','$CBRSB @cerebras $115.04 ▲15.15%','$SPYB $759.15 ▲0.18%'];
 return ['👀 Hotcoin · '+p[0],'',...codes.map((c,i)=>c+'\n→ '+p[i+1]+'\n'),'⏱ '+p[6],p[7]+' 👇','#Hotcoin #Crypto #TradFi'].join('\n');
}
function load(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error('图片加载失败'));i.src=src})}
const headline={spot:{en:'New Spot Listing',zh:'现货上新',tc:'現貨上新',pt:'Nova listagem spot'},perp:{en:'New Perpetual Futures',zh:'全新永续合约',tc:'全新永續合約',pt:'Novos futuros perpétuos'}};
const up={en:n=>'Up to '+n+'x leverage',zh:n=>'最高 '+n+'x 杠杆',tc:n=>'最高 '+n+'x 槓桿',pt:n=>'Alavancagem de até '+n+'x'};
const fourCoinTitles={
 en:[['New',158,232,64],['Perpetual Futures',158,311,64],['Now Live',158,390,64]],
 zh:[['全新上线',158,224,44],['永续合约',151,342,86]],
 tc:[['全新上線',158,224,44],['永續合約',151,342,86]],
 pt:[['Novos',158,232,64],['futuros perpétuos',158,311,64],['já disponíveis',158,390,64]]
};
async function listing(type,l,source){
 const rows=source.rows.filter(r=>type!=='perp'||!/重上|重新上线|恢复/.test(r.kind??''));
 if(!rows.length)throw Error('没有可制作的新上线合约');
 if(type==='perp'&&rows.length>5)throw Error('单张合约展台最多容纳 5 个项目，请先确认本次制作批次，系统不会自动拆图');
 if(type==='perp'&&rows.some(r=>!r.leverage))throw Error('缺少杠杆倍数');
 const groups=[];
 if(type==='perp'){
  groups.push(rows);
 }else groups.push(...rows.map(r=>[r]));
 const images=await Promise.all(groups.map(async group=>{
  const usePodium=type==='perp',useFourCoinPlate=usePodium&&group.length===4;
  const canvas=node('canvas');canvas.width=canvas.height=useFourCoinPlate?1200:1254;
  const c=canvas.getContext('2d');
  const compactTitle=l==='zh'||l==='tc';
  const plate=useFourCoinPlate?(compactTitle?'perp-four-zh.jpg':'perp-four-en.jpg'):(usePodium?'perp-base.jpg':'spot-base.jpg');
  const base=await load('/assets/'+plate);
  c.drawImage(base,0,0,canvas.width,canvas.height);
  function write(value,x,y,size,max,weight=600,color='#fff',align='left'){
   c.font=weight+' '+size+'px Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
   c.fillStyle=color;c.textAlign=align;c.fillText(value,x,y,max);
  }
  function podiumTitle(){
   for(const [title,x,y,size] of fourCoinTitles[l])write(title,x,y,size,740,500);
  }
  function leverageLabel(value,x,baseline){
   const multiplier=value+'x';
   const [prefix,suffix]=up[l](value).split(multiplier);
   c.font='400 13px Inter, "PingFang SC", sans-serif';
   const leftWidth=c.measureText(prefix).width,rightWidth=c.measureText(suffix).width;
   c.font='600 17px Inter, sans-serif';
   const multiplierWidth=c.measureText(multiplier).width;
   const start=x-(leftWidth+multiplierWidth+rightWidth)/2;
   write(prefix,start,baseline,13,130,400);
   write(multiplier,start+leftWidth,baseline,17,100,600,'#a9f76b');
   write(suffix,start+leftWidth+multiplierWidth,baseline,13,130,400);
  }
  if(useFourCoinPlate){
   podiumTitle();
   const shift=compactTitle?34:0;
   for(const [index,r] of group.entries()){
    const slot=fourSlots[index];
    drawLogo(c,r.art,{...slot,y:slot.y-shift});
    const labelBaseline=(index<2?679:935)-shift;
    write(r.pair,slot.labelX,labelBaseline,22,225,700,'#fff','center');
    leverageLabel(r.leverage,slot.labelX,labelBaseline+24);
   }
  }else if(usePodium&&group.length===5){
   podiumTitle();
   for(const [index,r] of group.entries()){
    const slot=fiveSlots[index];
    drawLogo(c,r.art,slot);
    write(r.pair,slot.x,slot.y+150,23,225,700,'#fff','center');
    leverageLabel(r.leverage,slot.x,slot.y+176);
   }
  }else if(usePodium){
   // One to three contracts keep the contract podium identity; never use spot artwork.
   c.fillStyle='#080808';c.fillRect(75,435,1100,650);
   podiumTitle();
   const count=group.length,centers=count===1?[627]:count===2?[440,814]:[350,627,904];
   const gradient=c.createLinearGradient(180,0,1074,0);
   gradient.addColorStop(0,'#111');gradient.addColorStop(.2,'#4a4a4a');gradient.addColorStop(.4,'#151515');gradient.addColorStop(.8,'#303030');gradient.addColorStop(1,'#111');
   c.fillStyle=gradient;c.beginPath();c.ellipse(627,935,470,60,0,0,Math.PI*2);c.fill();c.fillRect(157,775,940,160);
   c.beginPath();c.ellipse(627,775,470,60,0,0,Math.PI*2);c.fill();c.strokeStyle='#666';c.lineWidth=2;c.stroke();
   for(const [i,r]of group.entries()){
    const x=centers[i],y=675;
    const ring=c.createRadialGradient(x-35,y-40,8,x,y,98);ring.addColorStop(0,'#fff');ring.addColorStop(.6,'#555');ring.addColorStop(.85,'#eee');ring.addColorStop(1,'#111');
    c.fillStyle=ring;c.beginPath();c.ellipse(x,y,91,96,0,0,Math.PI*2);c.fill();
    drawLogo(c,r.art,{x,y,width:154,height:164,angle:0});
    write(r.pair,x,850,30,250,700,'#fff','center');leverageLabel(r.leverage,x,883);
   }
  }else{
   const r=group[0];write(headline[type][l],92,162,55,705);
   write(r.symbol,92,355,132,700,850);
   write(r.pair,92,462,59,630,450,'#c1c7c2');
   if(r.leverage)write(up[l](r.leverage),92,550,40,620);
   drawLogo(c,r.art,singleSlot);
  }
  return canvas.toDataURL('image/jpeg',.93);
 }));
 const text=type==='perp'?perpetualCaption(rows,l,$('date').value):'🟩 '+headline[type][l]+'\n\n'+rows.map(r=>r.pair+(r.leverage?' · '+up[l](r.leverage):'')+(r.time&&r.time!=='预告'?' · '+r.time+' (UTC+8)':'')).join('\n')+'\n\n#Hotcoin';
 return {locale:l,text,image:images[0],images};
}
function display(data){
 const cards=data.map(v=>{
  const c=node('article');c.append(node('h3',labels[v.locale]+' · '+handles[v.locale]));
  for(const [index,src] of (v.images??[v.image]).entries()){
   const i=node('img');i.src=src;i.alt=labels[v.locale]+'配图';c.append(i);
   const a=node('a','下载图片'+((v.images?.length??1)>1?' '+(index+1):''));a.href=src;a.download=selected+'-'+v.locale+'-'+(index+1);c.append(a);
  }
  const label=node('label','发布文案');
  label.className='caption-editor';
  const field=node('textarea');field.rows=6;field.value=v.text;
  field.readOnly=selected==='stock'&&v.locale==='en';
  const count=node('span');count.className='caption-count';
  function updateCount(){
   const result=HotcoinText.parseTweet(v.text);
   count.textContent=result.weightedLength+' 加权字符';
  }
  updateCount();
  field.oninput=()=>{if(v.locale==='pt')$('pt-freshness').checked=false;if(selected==='daily')$('daily-checked').checked=false;v.text=field.value;updateCount();if(activePublication)renderPublication(activePublication)};
  label.append(field,count);c.append(label);return c;
 });
 $('results').dataset.count=String(cards.length);
 $('results').replaceChildren(...cards);
}
$('generate').onclick=async()=>{
 if(selected==='daily'){await createDaily();return}
 const run=rev, key=selected, data=current;
 $('generate').disabled=true;$('publish').disabled=true;
 generationStatus(data.sample?'制作或加载本轮已生成的验收图…':'生成各语言图文中…');
 try{
  const ls=data.liveTop?['zh','tc']:key==='spot'||key==='perp'?['en','zh','tc','pt']:['zh','tc','pt'];
  const results=await Promise.all(ls.filter(l=>l!=='pt'||eligiblePT(key,$('content-category').value)).map(async l=>{
   if(data.liveTop){if(Date.now()-Date.parse(data.collectedAt)>3600000)throw Error('榜单超过一小时，请重新获取');return renderMorningTop(data,l,prepareLogo,drawLogo,load)}
   if(data.rows)return listing(key,l,data);
   if(data.sample)return {locale:l,text:caption(key,l),image:'/assets/'+key+'-'+l+'.jpg'};
   return {locale:l,...await call('/api/generate',{type:key,locale:l,text:data.text,image:data.image})};
  }));
  if(run!==rev)return;variants=(key==='stock'&&!data.sample?[{locale:'en',text:data.text,image:data.image},...results]:results).map(v=>({...v,text:localizeHotcoinLinks(v.text,v.locale)}));
  display(variants);
  await restorePublication(key,data,variants,run);
  if(run!==rev)return;
  generationStatus(variants.length>results.length?'已生成 3 个翻译版本 · 英文版使用你上传的原图和原文':'已生成 '+results.length+' 个语言版本 · 请核对预览');
 }catch(e){if(run===rev)generationStatus(e.message)}
 finally{if(run===rev)$('generate').disabled=listingBlocked(data)}
};
async function restorePublication(type,source,results,run){
 const identity=source.url&&source.datetime?source.url:source.rows
  ?JSON.stringify([$('date').value,source.rows.map(r=>[r.pair,r.time])])
  :JSON.stringify([source.text.trim(),source.image]);
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(type+'\\n'+identity));
 if(run!==rev)return;
 const key='hotcoin-publication:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
 const states=JSON.parse(localStorage.getItem(key)||'{}');
 for(const [locale,result] of Object.entries(states)){
  if(result.state==='submitting')states[locale]={state:'unknown',message:'上次提交中断，请先在 Publer 核对结果。'};
 }
 activePublication={key,type,results,states,category:$('content-category').value,source,plans:Object.fromEntries(results.map(v=>[v.locale,{mode:'policy',customAt:''}])),chosen:new Set(results.filter(v=>v.locale!=='pt'||eligiblePT(type,$('content-category').value)).map(v=>v.locale)),busy:false};
 renderPublication(activePublication);
}
function renderPublication(batch){
 if(activePublication!==batch)return;
 $('account-options').replaceChildren(...batch.results.map(({locale})=>{
  const wrap=node('div');wrap.className='account-plan';const label=node('label'),input=node('input');
  const allowed=locale!=='pt'||eligiblePT(batch.type,batch.category);input.type='checkbox';input.checked=allowed&&batch.chosen.has(locale);input.disabled=batch.busy||!allowed;
  input.onchange=()=>{input.checked?batch.chosen.add(locale):batch.chosen.delete(locale);renderPublication(batch)};label.append(input,document.createTextNode(labels[locale]+' · '+handles[locale]));wrap.append(label);
  if(!allowed){wrap.append(node('p','本内容不发布至葡语账号'));return wrap}
  const select=node('select');select.disabled=batch.busy;
  for(const [value,text] of [['policy',locale==='pt'?'按巴西策略（默认 19:00；上新跟随上线）':'按账号策略（默认立即；上新跟随上线）'],['now','立即发布'],...(locale==='pt'?[['br19','巴西 19:00'],['br2130','巴西 21:30']]:[]),['custom','自定义时间（北京时间）']]){const option=node('option',text);option.value=value;select.append(option)}
  const plan=batch.plans[locale];select.value=plan.mode;select.onchange=()=>{plan.mode=select.value;renderPublication(batch)};wrap.append(select);
  if(plan.mode==='custom'){const at=node('input');at.type='datetime-local';at.setAttribute('aria-label',labels[locale]+' · 北京时间');at.style.minWidth='240px';at.style.maxWidth='100%';at.value=plan.customAt;at.disabled=batch.busy;at.onchange=()=>{plan.customAt=at.value;renderPublication(batch)};wrap.append(at)}
  const preview=planFor(batch,locale);wrap.append(node('p',preview.allowed?dualTime(preview.scheduledAt)+(preview.needsReview?' · 先入待审队列，不会到点自动发旧稿':''):preview.reason));return wrap;
 }));
 const items=batch.results.map(({locale})=>{
  const result=batch.states[locale];
  const item=node('li');
  if(result?.url&&result.state!=='withdrawn'){
   const link=node('a',labels[locale]+' · 查看 X 帖子');link.href=result.url;link.target='_blank';link.rel='noopener noreferrer';item.append(link);
   for(const [index,url] of (result.replyLinks??[]).entries()){
    const reply=node('a',' · 评论 '+(index+1));reply.href=url;reply.target='_blank';reply.rel='noopener noreferrer';item.append(reply);
   }
   const button=node('button',result.state==='withdrawing'?'查询撤回结果':'撤回');
   button.disabled=batch.busy||Boolean(batch.withdrawal)||result.state==='pending';
   button.setAttribute('aria-label',(result.state==='withdrawing'?'查询撤回结果 ':'撤回 ')+handles[locale]);
   button.onclick=()=>handleWithdrawal(batch,locale);
   item.append(button);
   if(result.message)item.append(node('span',' '+result.message));
  }else item.textContent=labels[locale]+' · '+(result?.state==='needs_review'?'已入巴西待审队列（尚未发布）':result?.state==='withdrawn'?'已撤回':result?.message??(result?'等待 Publer 确认':'待发布'));
  if(result?.state==='scheduled')item.append(node('span',' · ✅ Publer 排期已确认 · '+handles[locale]+' · 北京时间 '+new Date(result.scheduledAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+' UTC+8 · 到时由 Publer 自动发布；发布后生成 X 链接'));
  if(result&&['pending','unknown','scheduled'].includes(result.state)){const check=node('button','核对 Publer 状态');check.disabled=batch.busy;check.onclick=async()=>{if(batch.busy)return;batch.busy=true;renderPublication(batch);publishStatus('正在核对 Publer 后台记录，不会重复提交…');try{await waitForPublication(batch,locale);publishStatus(batch.states[locale]?.state==='scheduled'?'Publer 已确认排期：'+labels[locale]+' · '+new Date(batch.states[locale].scheduledAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}):batch.states[locale]?.message||'状态已更新')}catch(e){publishStatus(e.message)}finally{batch.busy=false;renderPublication(batch)}};item.append(check)}
  if(result?.state==='withdrawn'){const again=node('button','再次发布');again.disabled=batch.busy||Boolean(batch.withdrawal);again.onclick=()=>{batch.chosen=new Set([locale]);publishBatch(false)};item.append(again)}
  return item;
 });
 $('publish-links').replaceChildren(...items);
 const outstanding=batch.results.filter(({locale})=>batch.chosen.has(locale)&&(!batch.states[locale]||['pending','unknown','failed','withdrawn'].includes(batch.states[locale].state)));
 const pending=outstanding.some(({locale})=>['pending','unknown'].includes(batch.states[locale]?.state));
 const sendable=outstanding.some(({locale})=>!['pending','unknown'].includes(batch.states[locale]?.state));
 const invalid=outstanding.filter(v=>batch.states[v.locale]?.state!=='pending'&&(!v.text.trim()||v.text.length>25000));
 $('publish').disabled=batch.busy||Boolean(batch.withdrawal)||!outstanding.length||Boolean(invalid.length&&!pending)||(batch.type==='daily'&&!$('daily-checked').checked&&sendable);
 const warning=invalid.length?'请先修改 '+invalid.map(v=>labels[v.locale]).join('、')+' 的正文，文案须在 1–25,000 字符内。':'';
 $('publish-warning').textContent=warning;
 $('publish-all').disabled=batch.busy||Boolean(batch.withdrawal)||!batch.results.some(v=>!batch.states[v.locale]||['failed','withdrawn'].includes(batch.states[v.locale].state))||(batch.type==='daily'&&!$('daily-checked').checked);
 $('publish').textContent=batch.busy?'正在处理…':pending&&!sendable?'查询发布结果':'按所选账号计划提交';
}
function savePublication(batch,locale,result){
 batch.states[locale]=result;
 localStorage.setItem(batch.key,JSON.stringify(batch.states));
 renderPublication(batch);
}
async function imageForPublication(src){
 if(src.startsWith('data:'))return src;
 const response=await fetch(src);
 if(!response.ok)throw Error('无法读取待发布图片');
 return fileData(await response.blob());
}
async function submitVariant(batch,v){
 let images;
 try{images=await Promise.all((v.images??[v.image]).map(imageForPublication));}
 catch(e){savePublication(batch,v.locale,{state:'failed',message:e.message});return}
 savePublication(batch,v.locale,{state:'submitting'});
 try{
  const result=await call('/api/publish',{type:batch.type,locale:v.locale,text:v.text,images,category:batch.category,queueId:batch.queueId??null,freshnessConfirmed:$('pt-freshness').checked,scheduledAt:batch.submissionPlans[v.locale]?.scheduledAt??null});
  savePublication(batch,v.locale,result);
 }catch(e){
  savePublication(batch,v.locale,{state:'unknown',message:'提交未确认，请在 Publer 核对。'+e.message});
 }
}
async function waitForPublication(batch,locale){
 let job=batch.states[locale];
 if(!job.jobId){
  const d=await call('/api/history?locale='+encodeURIComponent(locale)+'&_fresh='+Date.now());
  const rows=d.rows.filter(r=>r.content_type===batch.type&&r.caption===batch.results.find(v=>v.locale===locale)?.text&&r.created_at?.slice(0,10)===new Date().toISOString().slice(0,10)&&r.job_id&&r.state!=='withdrawn');
  if(rows.length!==1)throw Error(rows.length?'存在多条相同内容的记录，请到发布记录按时间核对，未重复提交。':'未找到可核对的 Publer 任务，请检查发布记录，未重复提交。');
  const row=rows[0];job={...job,jobId:row.job_id,postId:row.post_id||undefined,historyId:row.id,scheduledAt:row.scheduled_at};savePublication(batch,locale,job);
 }

 for(let attempt=0;attempt<20;attempt++){
  if(attempt)await new Promise(resolve=>setTimeout(resolve,2500));
  let result;
  try{
   const query=new URLSearchParams({job:job.jobId,locale});
   if(job.postId)query.set('post',job.postId);
   if(job.commentCount)query.set('comments',job.commentCount);
   if(job.scheduledAt)query.set('scheduledAt',job.scheduledAt);
   result=await call('/api/publish-status?'+query);
  }catch(e){savePublication(batch,locale,{...job,message:'查询暂未成功，可再次查询。'+e.message});return}
  if(result.state!=='pending'){savePublication(batch,locale,{...job,...result});return}
  job={...job,...result};
  savePublication(batch,locale,job);
 }
 savePublication(batch,locale,{...job,message:'Publer 仍在处理，可再次查询。'});
}
async function handleWithdrawal(batch,locale){
 const result=batch.states[locale];
 const alreadyRequested=result.state==='withdrawing';
 if(batch.busy||batch.withdrawal)return;
 if(!alreadyRequested&&!window.confirm('撤回 '+handles[locale]+' 的这条 X 帖子？'))return;
 batch.withdrawal=locale;renderPublication(batch);
 const target={locale,url:result.url,postId:result.postId};
 try{
  if(!alreadyRequested){
   savePublication(batch,locale,{...result,state:'withdrawing',message:'正在提交撤回…'});
   try {
    const reply=await call('/api/withdraw',target);
    savePublication(batch,locale,reply);
    if(reply.state==='withdrawn')return;
    target.postId=reply.postId;
   }catch(e){
    savePublication(batch,locale,{...result,state:'withdrawing',message:'提交未确认。'+e.message});
   }
  }
  for(let i=0;i<8;i++){
   if(i)await new Promise(resolve=>setTimeout(resolve,2500));
   const reply=await call('/api/withdraw-status',target);
   if(reply.state==='withdrawn'){savePublication(batch,locale,reply);return}
  }
  savePublication(batch,locale,{...batch.states[locale],message:'撤回尚未确认，可再次查询。'});
 }catch(e){
  savePublication(batch,locale,{...batch.states[locale],message:'撤回尚未确认。'+e.message});
 }finally{
  batch.withdrawal=null;renderPublication(batch);
 }
}
async function publishBatch(allNow=false){
 const batch=activePublication;
 if(!batch||batch.busy||batch.withdrawal)return;
 if(batch.type==='daily'&&!$('daily-checked').checked)return;
 const chosen=allNow?new Set(batch.results.filter(v=>v.locale!=='pt'||eligiblePT(batch.type,batch.category)).map(v=>v.locale)):new Set(batch.chosen);
 if(!chosen.size){publishStatus('请至少勾选一个账号');return}
 batch.submissionPlans={};
 for(const locale of chosen){if(batch.states[locale]&&!['failed','withdrawn'].includes(batch.states[locale].state))continue;const plan=planFor(batch,locale);if(!plan.allowed){publishStatus(labels[locale]+'：'+plan.reason);return}batch.submissionPlans[locale]=plan}
 const run=async()=>{
  batch.states=JSON.parse(localStorage.getItem(batch.key)||'{}');
  batch.busy=true;renderPublication(batch);
  if(activePublication===batch)publishStatus('正在处理发布请求…');
  try{
   const ready=batch.results.filter(v=>chosen.has(v.locale)&&(!batch.states[v.locale]||['failed','withdrawn'].includes(batch.states[v.locale].state)));
   if(ready.every(v=>v.text.trim()&&v.text.length<=25000)){
    for(const v of ready)await submitVariant(batch,v);
   }
   await Promise.all(batch.results.filter(v=>chosen.has(v.locale)&&['pending','unknown'].includes(batch.states[v.locale]?.state)).map(v=>waitForPublication(batch,v.locale)));
   const published=Object.values(batch.states).filter(x=>x.state==='published').length;
   if(activePublication===batch)publishStatus('已发布 '+published+' 条 · Publer 已确认排期 '+Object.values(batch.states).filter(x=>x.state==='scheduled').length+' 条 · 未确认 '+Object.values(batch.states).filter(x=>['pending','unknown','submitting'].includes(x.state)).length+' 条');
  }catch(e){if(activePublication===batch)publishStatus(e.message)}
  finally{batch.busy=false;renderPublication(batch)}
 };
 if(navigator.locks){
  await navigator.locks.request(batch.key,{ifAvailable:true},async lock=>{
   if(lock)await run();
   else publishStatus('另一个标签页正在处理这次发布');
  });
 }else await run();
}
$('publish').onclick=()=>publishBatch(false);
$('publish-all').onclick=()=>publishBatch(true);
$('publish-mode').onchange=()=>{$('schedule-field').hidden=$('publish-mode').value!=='scheduled';if(activePublication){for(const l of activePublication.chosen)activePublication.plans[l].mode=$('publish-mode').value==='scheduled'?'custom':$('publish-mode').value;renderPublication(activePublication)}};
$('schedule-at').onchange=()=>{if(activePublication){for(const l of activePublication.chosen)activePublication.plans[l].customAt=$('schedule-at').value;renderPublication(activePublication)}};
$('pt-freshness').onchange=()=>{if(activePublication)renderPublication(activePublication)};
$('content-category').onchange=()=>{if(activePublication){activePublication.category=$('content-category').value;if(!eligiblePT(activePublication.type,activePublication.category))activePublication.chosen.delete('pt');renderPublication(activePublication)}};
function planFor(batch,locale){const p=batch.plans[locale];return accountPlan({type:batch.type,locale,category:batch.category,mode:p.mode,customAt:p.customAt?p.customAt+':00+08:00':null,rows:batch.source.rows??[],date:$('date').value,freshnessConfirmed:$('pt-freshness').checked})}
window.addEventListener('regional-review',async event=>{const d=event.detail;activate(d.type);$('content-category').value='tradfi_news';current={text:d.text,image:d.images[0],url:'regional:'+d.id,datetime:new Date().toISOString()};variants=[{locale:'pt',text:d.text,image:d.images[0],images:d.images}];display(variants);const run=rev;await restorePublication(d.type,current,variants,run);activePublication.queueId=d.id;activePublication.plans.pt.mode='now';renderPublication(activePublication);const label=node('label','更新葡语配图（上传核对后的最新版本）'),input=node('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.onchange=async()=>{const f=input.files[0];if(!f)return;if(f.size>5*1024*1024)return publishStatus('图片不得超过5MB');const image=await fileData(f);variants[0].image=image;variants[0].images=[image];display(variants);$('results').append(label);$('pt-freshness').checked=false};label.append(input);$('results').append(label);publishStatus('请更新图文并确认时效。排期前30分钟内方可放行，已过期稿件须重新核对事件后立即发布。');});
$('top-mode').onchange=()=>activate('top');
activate('daily');
function renderConnections(){
 if(!connectionState)return;
 if(selected==='daily'){$('connections').textContent='日报使用公开来源与生图模型；发布沿用 Publer 账号。';return}
 if(['spot','perp'].includes(selected)){$('connections').textContent=connectionState.lark?'Lark 机器人已配置 · 点击“从 Lark 获取”实时读取所选日期；也可手动粘贴。':'云端 Lark 凭据尚未配置，可先手动粘贴上新资料。';return}
 const pending=[!connectionState.publer&&'Publer 凭据',!connectionState.generation&&'翻译与生图模型凭据'].filter(Boolean);
 $('connections').textContent=pending.length?'待配置：'+pending.join('、'):'已配置 Publer 与翻译、生图模型。';
}
call('/api/status').then(state=>{connectionState=state;renderConnections()}).catch(e=>{$('connections').textContent=e.message});
$('daily-checked').onchange=()=>{if(activePublication)renderPublication(activePublication)};
function showDailySources(snapshot){
 const wrap=$('daily-sources');wrap.replaceChildren(node('h3','本次数据快照 · '+snapshot.date));
 const table=node('dl'),signed=n=>(n>0?'+':'')+n.toFixed(2)+'%';
 for(const [label,value] of [['行情截取',new Date(snapshot.collectedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+' UTC+8'],['全球市值','$'+(snapshot.global.cap/1e12).toFixed(2)+'T · '+signed(snapshot.global.change)],['24 小时涨幅前五',snapshot.gainers.map(r=>r.symbol+' '+signed(r.change)).join(' / ')],['BTC / ETH',snapshot.prices.map(r=>r.symbol+' $'+r.price.toFixed(2)+' '+signed(r.change)).join(' / ')],['恐惧与贪婪',snapshot.fear.value+' · '+snapshot.fear.classification]])table.append(node('dt',label),node('dd',value));
 wrap.append(table);
 for(const [label,entries] of [['市场动态',snapshot.news],['平台动态',snapshot.activities]]){
  wrap.append(node('h4',label));for(const entry of entries){const p=node('p',entry.summary+(entry.publishedAt?'（公告发布 '+entry.publishedAt+'）':'')+' '),a=node('a','来源 ↗');a.href=entry.url;a.target='_blank';a.rel='noreferrer';p.append(a);wrap.append(p)}
 }
 wrap.append(node('p','市值更新 '+new Date(snapshot.global.updatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+'；指数更新 '+new Date(snapshot.fear.updatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+'（UTC+8）。'));
 for(const source of snapshot.sources??[]){const a=node('a',source.name+' ↗');a.href=source.url;a.target='_blank';a.rel='noreferrer';wrap.append(a,document.createTextNode('　'))}
}
async function createDaily(){
 const run=rev,date=$('date').value,retry=current?.snapshot?.date===date&&Date.now()-Date.parse(current.snapshot.collectedAt)<3600000&&variants.length>0&&variants.length<4;
 const retained=retry?[...variants]:[];$('generate').disabled=true;$('publish').disabled=true;$('daily-checked').checked=false;$('daily-approval').hidden=true;
 variants=retained;activePublication=null;if(!retry)$('results').replaceChildren();$('publish-links').replaceChildren();
 generationStatus('正在获取当天行情、两条快讯及最新两项活动…');
 try{
  let snapshot=retry?current.snapshot:null;
  if(!snapshot){const publicData={};
  await Promise.all([['global','https://api.coingecko.com/api/v3/global'],['fear','https://api.alternative.me/fng/?limit=1']].map(async([key,url])=>{try{const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(r.ok)publicData[key]=await r.json()}catch{}}));
  snapshot=(await call('/api/daily/source',{date,publicData})).snapshot;}if(run!==rev)return;
  showDailySources(snapshot);generationStatus('数据已获取，正在生成日报玻璃视觉底图…');
  const background=retry?current.background:(await call('/api/daily/background',{snapshot})).image;if(run!==rev)return;
  current={text:JSON.stringify(snapshot),snapshot,background};showDailySources(snapshot);
  const failures=[];let done=0;generationStatus('来源已核对，开始翻译并生图（0/4）…');
  await Promise.all(['zh','tc','pt','vi'].filter(locale=>!variants.some(v=>v.locale===locale)).map(async locale=>{
   try{const result=await finishDailyLogos(await call('/api/daily/generate',{locale,snapshot,background}));if(run!==rev)return;variants.push(result);variants.sort((a,b)=>['zh','tc','pt','vi'].indexOf(a.locale)-['zh','tc','pt','vi'].indexOf(b.locale));display(variants)}catch(e){failures.push(labels[locale]+'：'+e.message)}
   finally{done++;if(run===rev)generationStatus('图文处理 '+done+'/4'+(failures.length?' · 部分语言未成功':''))}
  }));
  if(run!==rev)return;
  const publishable=variants.filter(v=>['zh','tc','pt'].includes(v.locale));
  if(publishable.length>0){await restorePublication('daily',current,publishable,run);if(run!==rev)return;$('daily-approval').hidden=false;renderPublication(activePublication)}
  $('daily-validation').textContent=failures.length?'未成功的语言：'+failures.join('；'):'四语图文制作完成。请逐一检查图片中的数字、Logo、日期与翻译。越南语只提供下载。';
  generationStatus(variants.length+' / 4 个语言版本已完成'+(publishable.length?' · 勾选检查完成后可发布已生成的 '+publishable.length+' 个语言版本':' · 等待可发布语言生成完成'));
 }catch(e){if(run===rev)generationStatus('制作未完成：'+e.message)}
 finally{if(run===rev){$('generate').disabled=false;$('generate').textContent=variants.length>0&&variants.length<4?'重试未完成语言':'制作四语日报'}}
}

async function finishDailyLogos(result){return renderDailyReport(result,prepareLogo,drawLogo,load)}

window.addEventListener('studio-load',async event=>{
 const {job,variant,source,resolve,reject}=event.detail;
 try{
  if(job.state!=='approved')throw Error('请先审核通过，再载入发布区');
  $('tab-create').click();activate(job.type);const run=rev;$('date').value=job.day;
  // Stable cloud identity avoids serializing and hashing megabytes of inline image data.
  current={text:variant.text,image:variant.image,url:'cloud-draft:'+job.id,datetime:job.updated_at||job.created_at||job.day,...(source?.rows?{rows:source.rows}:{})};
  if(job.type==='daily'){$('daily-approval').hidden=false;$('daily-checked').checked=true;}
  variants=[{...variant}];display(variants);
  generationStatus('已载入云端稿件 · 正在准备账号与发布时间');
  $('results').scrollIntoView({block:'start'});
  if(job.locale==='vi'){generationStatus('越南语稿件已载入，可下载；暂未配置发布账号');resolve?.();return;}
  await restorePublication(job.type,current,variants,run);if(run!==rev)throw Error('栏目已切换，请重新载入稿件');
  generationStatus('已载入人工审核通过的云端稿件 · 请选择账号与发布时间');resolve?.();
 }catch(e){generationStatus('载入失败：'+e.message);reject?.(e);}
});

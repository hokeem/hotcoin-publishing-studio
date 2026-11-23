let larkAuthCache=null;
function larkCellText(value){
 if(value==null)return '';
 if(Array.isArray(value))return value.map(larkCellText).join('');
 if(typeof value==='object')return larkCellText(value.text??value.value??value.link??'');
 return String(value);
}
function larkCellLinks(value){
 const found=[];
 function walk(v){
  if(Array.isArray(v)){v.forEach(walk);return}
  if(v&&typeof v==='object'){for(const key of ['link','text','value'])if(v[key]!=null)walk(v[key]);return}
  if(typeof v==='string')found.push(...(v.match(/https:\/\/[^\s<>"'\[\]]+/g)??[]));
 }
 walk(value);return [...new Set(found.map(url=>url.replace(/[，。；,;]+$/,'')))];
}
function parseLarkListings(values,type,date){
 const [year,month,day]=date.split('-').map(Number),rows=[];
 for(const [index,r] of values.entries()){
  const rawTime=larkCellText(r[1]).trim(),kind=larkCellText(r[2]).replace(/\s+/g,''),pair=larkCellText(r[3]).replace(/\s+/g,'').toUpperCase();
  const m=rawTime.match(/^(?:(预计|计划)\s*)?(?:(\d{4})年)?(\d{1,2})月\s*(\d{1,2})日\s*(\d{1,2})[:：](\d{2})/);
  if(!m||Number(m[3])!==month||Number(m[4])!==day||(m[2]&&Number(m[2])!==year)||!(type==='spot'?kind.startsWith('现货'):/^(?:永续)?合约/.test(kind)))continue;
  if(Number(m[5])>23||Number(m[6])>59||!/^\S+\/\S+$/.test(pair))continue;
  if(type==='perp'&&/重上|重新上线|恢复/.test(kind))continue;
  const terms=larkCellText(r[5]).trim(),leverage=type==='perp'?terms.match(/(\d+(?:\.\d+)?)\s*(?:倍|x|×)/i)?.[1]:undefined;
  rows.push({row:index+1,kind,pair,symbol:pair.split('/')[0],time:m[5].padStart(2,'0')+':'+m[6],timeNote:m[1]??'',tentative:Boolean(m[1]),leverage,description:type==='spot'?terms:undefined,official:larkCellLinks(r[4]),logo:null});
 }
 return rows;
}
function larkSourceWarnings(rows,type){
 return rows.flatMap(r=>[...(type==='perp'&&!r.leverage?[r.pair+'：表格未填写杠杆倍数，请补齐后制作']:[]),...(r.tentative?[r.pair+'：原表标为“'+r.timeNote+'”，时间尚待确认']:[])]);
}
async function getLarkSource(type,date,env){
 if(!env.LARK_APP_ID||!env.LARK_APP_SECRET)throw Error('云端尚未配置 Lark 应用凭据');
 const base='https://open.larksuite.com/open-apis';
 if(!larkAuthCache||larkAuthCache.app!==env.LARK_APP_ID||larkAuthCache.expiresAt<=Date.now()){
  const auth=await read(base+'/auth/v3/tenant_access_token/internal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app_id:env.LARK_APP_ID,app_secret:env.LARK_APP_SECRET})});
  if(!auth.tenant_access_token)throw Error('Lark 应用认证失败（'+(auth.code??'unknown')+'）');
  larkAuthCache={app:env.LARK_APP_ID,access:auth.tenant_access_token,expiresAt:Date.now()+Math.max(60,(Number(auth.expire)||7200)-120)*1000};
 }
 const headers={Authorization:'Bearer '+larkAuthCache.access};
 const tabs=await read(base+'/sheets/v3/spreadsheets/'+token+'/sheets/query',{headers});
 if(tabs.code)throw Error('Lark 工作表读取失败（'+tabs.code+'），请确认机器人拥有此表权限');
 const month=Number(date.slice(5,7)),sheet=tabs.data?.sheets?.find(s=>s.title===month+'月上架');
 if(!sheet)throw Error('已连接 Lark，但未找到“'+month+'月上架”工作表');
 const count=Number(sheet.grid_properties?.row_count);if(!count||count>5000)throw Error('Lark 工作表行数异常，未读取截断数据');
 const range=sheet.sheet_id+'!A1:F'+count;
 const data=await read(base+'/sheets/v2/spreadsheets/'+token+'/values/'+encodeURIComponent(range),{headers});
 if(data.code)throw Error('Lark 表格单元格读取失败（'+data.code+'）');
 const values=data.data?.valueRange?.values;if(!Array.isArray(values))throw Error('Lark 未返回表格内容');
 const rows=parseLarkListings(values,type,date),warnings=larkSourceWarnings(rows,type);
 const text=rows.length?rows.map(r=>'第 '+r.row+' 行 · '+r.kind+' · '+(r.timeNote?r.timeNote+' ':'')+r.time+' · '+r.pair+(r.leverage?' · '+r.leverage+'x':type==='perp'?' · 杠杆待补':'')+(r.description?'\n简介：'+r.description:'')+(r.official.length?'\n参考链接：'+r.official.join('\n'):'')).join('\n\n'):date+' 暂无'+(type==='spot'?'现货':'合约')+'上新记录；工作表已成功读取。';
 return {rows,warnings,text:(type==='perp'?'制作范围：仅新上线合约，重上／恢复交易记录不纳入。\n\n':'')+text,provider:'Lark Open API',sheetName:sheet.title,sheetId:sheet.sheet_id,revision:data.data.revision??data.data.valueRange.revision,checkedAt:new Date().toISOString(),url:(env.LARK_BASE_URL||'https://example.larksuite.com')+'/sheets/'+token+'?sheet='+sheet.sheet_id};
}

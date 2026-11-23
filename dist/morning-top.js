export function morningTopCaption(source,locale='zh') {
 const tc=locale==='tc',medals=['🥇','🥈','🥉','4️⃣','5️⃣'];
 return '🔥 Hotcoin '+(tc?'每日漲幅榜':'每日涨幅榜')+' TOP 5\n⏱ '+(tc?'統計區間：截至 ':'统计区间：截至 ')+source.time+'（UTC+8）的近 24 '+(tc?'小時':'小时')+'\n\n'+source.gainers.map((r,i)=>medals[i]+' $'+r.symbol+' '+(r.change>0?'+':'')+r.change.toFixed(2)+'%').join('\n')+'\n\n'+(tc?'你最關注哪一個？👇':'你最关注哪一个？👇')+'\n\n#Hotcoin #TopGainers';
}
export async function validateMorningTop(source,prepareLogo){
 if(source.gainers?.length!==5||new Set(source.gainers.map(r=>r.symbol)).size!==5)throw Error('Top 5 榜单不完整，不能出图');
 const arts=[];
 for(const row of source.gainers){
  if(!Number.isFinite(row.change)||!row.logoVerified||row.logoSymbol!==row.symbol||!row.logoUrl||!row.image)throw Error(row.symbol+' 官方 Logo 尚未核实，不能出图，请重新获取来源');
  const art=await prepareLogo(row.image,true,true);
  const {width:w,height:h}=art.raster,pixels=art.raster.getContext('2d').getImageData(0,0,w,h).data;
  let count=0,different=0,first=null,minAlpha=255,maxAlpha=0;
  for(let i=0;i<pixels.length;i+=4){minAlpha=Math.min(minAlpha,pixels[i+3]);maxAlpha=Math.max(maxAlpha,pixels[i+3]);if(pixels[i+3]<32)continue;count++;if(!first)first=[...pixels.slice(i,i+3)];else if([0,1,2].some(k=>Math.abs(pixels[i+k]-first[k])>16))different++}
  if(!count||(different/count<.005&&maxAlpha-minAlpha<20))throw Error(row.symbol+' Logo 是空白或纯色图片，已停止出图，请重新获取来源');
  arts.push(art);
 }
 return arts;
}
export async function renderMorningTop(source,locale,prepareLogo,drawLogo,load){
 const arts=await validateMorningTop(source,prepareLogo);
 const traditional=locale==='tc';
 const title=traditional?'每日漲幅榜':'每日涨幅榜';
 const canvas=document.createElement('canvas');canvas.width=1254;canvas.height=1254;
 const c=canvas.getContext('2d');
 const template=await load('/assets/top5-template.png');c.drawImage(template,0,0,1254,1254);
 const font='"PingFang SC","Microsoft YaHei",Arial,sans-serif';
 function text(value,x,y,size,max,color='#090d0f',align='left',weight=800){
  c.font=weight+' '+size+'px '+font;
  while(c.measureText(value).width>max&&size>16)c.font=weight+' '+(--size)+'px '+font;
  c.fillStyle=color;c.textAlign=align;c.fillText(value,x,y);
 }
 text(title,75,238,83,745);
 const date=Number(source.date.slice(5,7))+'月'+Number(source.date.slice(8,10))+'日';
 const stamp=(traditional?'24小時截至 ':'24小时截至 ')+date+' '+source.time.slice(-5)+' (UTC+8)';
 text(stamp,123,310,19,368,'#171b19','left',650);
 const slots=[
  {x:626,y:524,size:204,labelX:626,labelY:741,width:338,percentY:855},
  {x:244,y:578,size:151,labelX:244,labelY:741,width:280,percentY:855},
  {x:1008,y:588,size:151,labelX:1008,labelY:741,width:280,percentY:855}
 ];
 for(const [i,row] of source.gainers.entries()){
  const art=arts[i];
  const change=(row.change>0?'+':'')+row.change.toFixed(2)+'%';
  const color=row.change<0?'#df4453':'#109d4c';
  if(i<3){
   const slot=slots[i];drawLogo(c,art,{x:slot.x,y:slot.y,width:slot.size,height:slot.size,angle:0});
   text(row.symbol,slot.labelX,slot.labelY,64,slot.width,'#080c0e','center');
   text(change,slot.labelX,slot.percentY,74,slot.width,color,'center');
  }else{
   const y=i===3?982:1102;
   drawLogo(c,art,{x:196,y,width:64,height:64,angle:0});
   text(row.symbol,260,y+21,50,515);
   text(change,1142,y+21,64,350,color,'right');
  }
 }
 text(traditional?'24 小時漲幅 · 現貨':'24 小时涨幅 · 现货',75,1198,22,650,'#6a717c','left',650);
 const caption=morningTopCaption(source,locale);
 return {locale,text:caption,image:canvas.toDataURL('image/jpeg',.93)};
}

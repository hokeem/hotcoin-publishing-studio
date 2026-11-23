export async function renderDailyReport(result,prepareLogo,drawLogo,load){
 const {snapshot:s,display:d,localized:l}=result.report;if(!s||!d||!l)throw Error('缺少日报排版数据');
 const W=1920,H=1080,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d');
 c.fillStyle='#000';c.fillRect(0,0,W,H);
 const bg=await load(result.image);c.globalAlpha=.32;c.drawImage(bg,0,0,W,H);c.globalAlpha=1;
 const fonts='Inter,"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",Arial,sans-serif';
 const fit=(text,x,y,size,max,weight=500,color='#fff',align='left')=>{c.font=weight+' '+size+'px '+fonts;while(c.measureText(text).width>max&&size>12)c.font=weight+' '+(--size)+'px '+fonts;c.fillStyle=color;c.textAlign=align;c.fillText(text,x,y)};
 const round=(x,y,w,h,r=22)=>{c.beginPath();c.roundRect(x,y,w,h,r)};
 const glass=(x,y,w,h)=>{const gradient=c.createLinearGradient(x,y,x+w,y+h);gradient.addColorStop(0,'rgba(65,65,65,.94)');gradient.addColorStop(.2,'rgba(7,7,7,.96)');gradient.addColorStop(.8,'rgba(12,12,12,.98)');gradient.addColorStop(1,'rgba(45,45,45,.94)');round(x,y,w,h);c.fillStyle=gradient;c.fill();c.strokeStyle='#9c9c9c';c.lineWidth=1.5;c.stroke();round(x+4,y+4,w-8,h-8,18);c.strokeStyle='rgba(235,235,235,.18)';c.stroke()};
 const brand=await load('/assets/hotcoin-wordmark.png');c.drawImage(brand,52,42,300,300*brand.naturalHeight/brand.naturalWidth);
 const title={zh:'每日资讯',tc:'每日資訊',pt:'Resumo diário',vi:'Bản tin hằng ngày'}[result.locale];
 fit(title+'  '+s.date+'  (UTC+8)',1868,65,27,650,500,'#eee','right');
 fit(d.quoteTime+'  UTC+8',1868,104,24,600,400,'#ccc','right');
 fit(l.marketLabel||'Market cap',64,164,31,840,650);fit(d.cap,64,229,48,270,750);fit(d.capChange,355,229,44,520,700,s.global.change<0?'#f05161':'#6fc761');
 glass(50,263,875,570);
 const wrap=(text,max,size)=>{c.font='500 '+size+'px '+fonts;const lines=[];let line='';for(const piece of Array.from(new Intl.Segmenter(undefined,{granularity:'word'}).segment(text),x=>x.segment)){if(c.measureText(line+piece).width<=max){line+=piece;continue}if(line.trim())lines.push(line.trim());line='';for(const ch of piece){if(c.measureText(line+ch).width>max){lines.push(line);line=''}line+=ch}}if(line.trim())lines.push(line.trim());return lines};
 let size=28,news,activities;
 for(;size>=18;size--){news=l.news.map(v=>wrap(v,795,size));activities=l.activities.map(v=>wrap(v,795,size));const count=[...news,...activities].reduce((a,b)=>a+b.length,0);if(count*size*1.36+205<=540)break}
 if(size<18)throw Error('文案过长，无法完整排入日报，请精简来源摘要');
 let y=312;fit(l.newsLabel||'News',88,y,33,790,750);y+=43;
 for(const [i,lines] of news.entries()){fit(String(i+1)+'.',88,y,size,40,600);for(const line of lines){fit(line,125,y,size,752,500);y+=size*1.36}y+=10}
 y+=10;c.strokeStyle='#777';c.beginPath();c.moveTo(88,y-10);c.lineTo(885,y-10);c.stroke();fit(l.activitiesLabel||'Activities',88,y+26,33,790,750);y+=67;
 for(const lines of activities){fit('•',88,y,size,35,600);for(const line of lines){fit(line,119,y,size,763,500);y+=size*1.36}y+=10}
 const arts=await Promise.all(s.gainers.map(r=>prepareLogo(result.officialLogos[r.symbol],true,true)));
 const centers=[1420,1110,1730],top=[280,345,345],heights=[310,245,245];
 for(const i of [1,0,2]){const x=centers[i],base=top[i],height=heights[i];glass(x-135,base,270,height);c.beginPath();c.moveTo(x-135,base);c.lineTo(x-112,base-24);c.lineTo(x+112,base-24);c.lineTo(x+135,base);c.closePath();const g=c.createLinearGradient(x-135,base-24,x+135,base);g.addColorStop(0,'#999');g.addColorStop(.5,'#111');g.addColorStop(1,'#777');c.fillStyle=g;c.fill();c.strokeStyle='#bbb';c.stroke();drawLogo(c,arts[i],{x,y:base-94,width:140,height:140,angle:0});fit(String(i+1),x,base+50,30,100,750,['#f7cf54','#ddd','#cf8855'][i],'center');fit(s.gainers[i].symbol,x,base+115,34,250,750,'#fff','center');fit(d.gainers[i].change+' ▲',x,base+174,34,250,700,'#f5d747','center')}
 for(let i=3;i<5;i++){const y=625+(i-3)*132;glass(975,y,890,108);fit(String(i+1),1014,y+68,34,50,700);drawLogo(c,arts[i],{x:1118,y:y+54,width:76,height:76,angle:0});fit(s.gainers[i].symbol,1188,y+68,36,400,750);fit(d.gainers[i].change+' ▲',1828,y+68,36,350,700,'#f5d747','right')}
 glass(50,873,875,145);fit(l.fearLabel||'Fear & Greed',87,920,30,800,700);const gradient=c.createLinearGradient(88,0,600,0);for(const [n,color] of [[0,'#e94c59'],[.25,'#ef9250'],[.5,'#e8d35f'],[.75,'#9dc75c'],[1,'#39a66d']])gradient.addColorStop(n,color);round(88,949,510,10,5);c.fillStyle=gradient;c.fill();const marker=88+510*s.fear.value/100;c.beginPath();c.arc(marker,954,9,0,2*Math.PI);c.fillStyle='#fff';c.fill();fit(String(s.fear.value),649,967,42,90,750);fit(l.fearClassification||s.fear.classification,883,966,25,205,500,'#fff','right');
 glass(975,900,890,118);for(const [i,r] of s.prices.entries()){const x=1028+i*425;const art=await prepareLogo(result.officialLogos[r.symbol],true,true);drawLogo(c,art,{x,y:957,width:76,height:76,angle:0});fit(r.symbol, x+54,945,30,170,750);fit(d.prices[i].price,x+54,985,28,230,700);fit(d.prices[i].change,x+376,985,27,150,650,r.change<0?'#f05161':'#6fc761','right')}
 const source='Hotcoin '+d.quoteTime+' | CoinGecko '+d.capUpdated+' | Alternative.me '+d.fearUpdated+' | PANews '+s.news.map(r=>r.date).join(' / ')+' (UTC+8)';fit(source,60,1055,20,1800,400,'#bbb');
 return {locale:result.locale,text:result.text,image:canvas.toDataURL('image/jpeg',.96),sourceDate:s.date,review:{ok:true}};
}

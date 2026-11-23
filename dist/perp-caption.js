// Asset identity from supplied CMC pages or user-provided reference copy.
const projects={
 IGV:{en:'iShares Expanded Tech-Software ETF',zh:'iShares 扩展科技软件 ETF',tc:'iShares 擴展科技軟體 ETF',pt:'ETF iShares Expanded Tech-Software'},
 ARTY:{en:'iShares Future AI & Tech ETF',zh:'iShares 未来 AI 与科技 ETF',tc:'iShares 未來 AI 與科技 ETF',pt:'ETF iShares Future AI & Tech'},
 CCJ:{en:'Cameco Corp',zh:'Cameco 公司',tc:'Cameco 公司',pt:'Cameco Corp'},
 ETN:{en:'Eaton Corporation plc',zh:'伊顿公司',tc:'伊頓公司',pt:'Eaton Corporation plc'},
 NEM:{en:'Newmont Corporation',zh:'纽蒙特公司',tc:'紐蒙特公司',pt:'Newmont Corporation'},
 LUNR:{en:'Lunar exploration company',zh:'月球探测公司',tc:'月球探測公司',pt:'Empresa de exploração lunar',handle:'@Int_Machines'},
 SPCH:{en:'2x long SpaceX ETF',zh:'2 倍做多 SpaceX ETF',tc:'2 倍做多 SpaceX ETF',pt:'ETF alavancado 2x comprado em SpaceX',handle:'@LeverageETFs'},
 USO:{en:'WTI crude oil ETF',zh:'WTI 原油 ETF',tc:'WTI 原油 ETF',pt:'ETF de petróleo bruto WTI',handle:'@USCFInvestments'}
};
function projectName(row,locale){
 const known=projects[row.symbol];if(known)return known[locale];
 if(row.projectName)return row.projectName;
 const cmc=(row.official??[]).find(u=>/^https:\/\/(?:www\.)?coinmarketcap\.com\/(?:currencies|real-world-assets)\//.test(u));
 if(cmc){const slug=new URL(cmc).pathname.split('/').filter(Boolean).at(-1);return slug.replace(/-derivatives$/,'').split('-').map(x=>['etf','ai','wti'].includes(x)?x.toUpperCase():x[0].toUpperCase()+x.slice(1)).join(' ')}
 return {en:'Perpetual contract',zh:'永续合约',tc:'永續合約',pt:'Contrato perpétuo'}[locale];
}
export function perpetualCaption(rows,locale,date){
 if(!rows.length)throw Error('没有新上线合约');
 const [year,month,day]=date.split('-').map(Number);if(!year||!month||!day)throw Error('工作日期无效');
 const count=rows.length,max=Math.max(...rows.map(r=>Number(r.leverage)));if(!Number.isFinite(max)||max<=0)throw Error('缺少杠杆倍数');
 const title={en:`🟩 Hotcoin ${count} Perpetual Contracts New Launch`,zh:`🟩 Hotcoin ${count} 永续合约全新上线`,tc:`🟩 Hotcoin ${count} 永續合約全新上線`,pt:`🟩 Hotcoin: lançamento de ${count} novos contratos perpétuos`}[locale];
 const lines=rows.map(r=>{const handle=projects[r.symbol]?.handle??(/^@[A-Za-z0-9_]{1,15}$/.test(r.handle??'')?r.handle:'');return '$'+r.symbol+' -> '+projectName(r,locale)+(handle?' '+handle:'')});
 const dates=[...new Set(rows.map(r=>r.time))].map(time=>({en:`${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month-1]} ${day} ${time} (UTC+8)`,zh:`${month} 月 ${day} 日 ${time}（UTC+8）`,tc:`${month} 月 ${day} 日 ${time}（UTC+8）`,pt:`${day} de ${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][month-1]} às ${time} (UTC+8)`}[locale]));
 const ending={en:`Up to ${max}x leverage. Trade now!`,zh:`最高可达${max}倍杠杆。立即交易！`,tc:`最高可達${max}倍槓桿。立即交易！`,pt:`Alavancagem de até ${max}x. Negocie agora!`}[locale];
 return [title,'',...lines,'',...dates,ending].join('\n');
}

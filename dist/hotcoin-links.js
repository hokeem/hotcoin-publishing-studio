// Hotcoin's own locale routes: locale changes never alter the financial instrument or quote currency.
export const hotcoinLocales={en:'en_US',zh:'zh_CN',tc:'zh_HK',pt:'pt_PT',vi:'vi_VN'};
export function localizeHotcoinLinks(text,locale){
 const target=hotcoinLocales[locale];if(!target)return text;
 return String(text).replace(/https:\/\/(?:www\.)?hotcoin\.com\/(?:[a-z]{2}_[A-Z]{2})(?=\/)/g,url=>url.replace(/\/[a-z]{2}_[A-Z]{2}$/, '/'+target));
}

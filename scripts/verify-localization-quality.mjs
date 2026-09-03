import fs from 'node:fs';
import vm from 'node:vm';
const langs=['en','es','fr','pt','tr','ar'];
function load(lang){
  let s=fs.readFileSync(`src/i18n/locales/${lang}.ts`,'utf8')
    .replace(/^import[^\n]*\n/,'')
    .replace(/export const \w+: Translations =/,'globalThis.value =');
  const ctx={}; vm.createContext(ctx); vm.runInContext(s,ctx,{timeout:3000}); return ctx.value;
}
function flat(o,p='',out={}){for(const [k,v] of Object.entries(o)){const q=p?`${p}.${k}`:k;if(typeof v==='string')out[q]=v;else if(v&&typeof v==='object'&&!Array.isArray(v))flat(v,q,out)}return out}
const d=Object.fromEntries(langs.map(l=>[l,flat(load(l))]));
const ref=new Set(Object.keys(d.en));
let errors=[];
for(const l of langs.slice(1)){
  for(const k of Object.keys(d.en)) if(!(k in d[l])) errors.push(`${l}: missing ${k}`);
  for(const k of Object.keys(d[l])) if(!ref.has(k)) errors.push(`${l}: extra ${k}`);
  for(const [k,v] of Object.entries(d[l])) if(typeof v==='string' && v.trim()==='') errors.push(`${l}: empty ${k}`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Localization structure PASS — ${ref.size} string keys × ${langs.length} languages`);

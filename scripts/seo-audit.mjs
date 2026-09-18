import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('.vercel/output/static');
const domain = 'https://mechanicslienform.com';
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const paths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]).pathname);
const errors = [], warnings = [], pages = [];
const decode = s => s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&[a-z#0-9]+;/gi,' ');
const text = s => decode(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1],decode(m[2])]));
const main = html => (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||[])[1]||'';
const read = p => fs.readFileSync(path.join(root, p.replace(/^\//,''), p.endsWith('/')?'index.html':''),'utf8');
for (const p of paths) {
 let html; try { html=read(p); } catch { errors.push(p+': sitemap target missing'); continue; }
 const title=text((html.match(/<title>(.*?)<\/title>/)||[])[1]||'');
 const tags=[...html.matchAll(/<(?:meta|link)\b[^>]*>/g)].map(m=>attrs(m[0]));
 const description=tags.find(t=>t.name==='description')?.content||'';
 const canonical=tags.find(t=>t.rel==='canonical')?.href||'';
 if(!title||!description)errors.push(p+': missing title/description');
 if(canonical!==domain+p)errors.push(p+': canonical differs '+canonical);
 if(tags.some(t=>t.name==='robots'&&/noindex/.test(t.content)))errors.push(p+': indexable page marked noindex');
 if((html.match(/<h1\b/g)||[]).length!==1)errors.push(p+': expected one h1');
 if(title.length>65)warnings.push(p+': long title ('+title.length+')');
 if(description.length>170)warnings.push(p+': long description ('+description.length+')');
 const body=main(html);
 const links=[...body.matchAll(/<a\b[^>]*>/g)].map(m=>attrs(m[0]).href).filter(Boolean);
 const ids=new Set([...html.matchAll(/\bid="([^"]*)"/g)].map(m=>m[1]));
 const schemas=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{try {const v=JSON.parse(m[1]);return Array.isArray(v)?v:[v];}catch {errors.push(p+': invalid JSON-LD');return [];}});
 for(const schema of schemas) {
  if(schema['@type']==='FAQPage')for(const q of schema.mainEntity||[]) {if(!text(body).includes(q.name)||!text(body).includes(q.acceptedAnswer.text))errors.push(p+': FAQ schema does not match visible content: '+q.name);}
 }
 const editorial=body.replace(/<aside\b[^>]*data-seo-boilerplate[^>]*>[\s\S]*?<\/aside>/g,'').replace(/<astro-island\b[^>]*>[\s\S]*?<\/astro-island>/g,'').replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/g,'');
 const words=text(editorial).toLowerCase().match(/[a-z0-9]+/g)||[];
 const shingles=new Set(words.slice(0,-4).map((_,i)=>words.slice(i,i+5).join(' ')));
 pages.push({path:p,title,description,words:words.length,links,ids,schemas,shingles,html});
}
const seen={title:new Map(),description:new Map()};
for(const p of pages)for(const key of ['title','description']) {if(seen[key].has(p[key]))errors.push('Duplicate '+key+': '+p.path+' and '+seen[key].get(p[key]));else seen[key].set(p[key],p.path);}
const byPath=new Map(pages.map(p=>[p.path,p]));
for(const p of pages) {
 // Check global navigation too, not only the editorial graph.
 for(const m of p.html.matchAll(/<a\b[^>]*>/g)) {
  const href=attrs(m[0]).href; if(!href)continue;
  const u=new URL(href,domain+p.path); if(u.origin!==domain)continue;
  let target=byPath.get(u.pathname);if(!target){try{read(u.pathname);}catch {errors.push(p.path+': broken internal link '+href);continue;}}
  if(target&&u.hash&&!target.ids.has(decodeURIComponent(u.hash.slice(1))))errors.push(p.path+': missing fragment '+href);
 }
 for(const s of p.schemas)if(s['@type']==='BreadcrumbList')for(const item of s.itemListElement||[]) {if(item.item&&new URL(item.item).origin===domain&&!byPath.has(new URL(item.item).pathname))errors.push(p.path+': broken schema breadcrumb '+item.item);}
}
const similarities=[];
for(let i=0;i<pages.length;i++)for(let j=i+1;j<pages.length;j++){
 const a=pages[i],b=pages[j];const n=[...a.shingles].filter(s=>b.shingles.has(s)).length;const score=n/(a.shingles.size+b.shingles.size-n||1);
 similarities.push({a:a.path,b:b.path,jaccard:Number(score.toFixed(3))});
 if(score>=0.5)errors.push('Review near-duplicate main content: '+a.path+' '+b.path+' '+score.toFixed(3));
}
const newSlugs=['illinois','new-york','florida','north-carolina','colorado'];
const newPages=newSlugs.map(slug=>{
 const p=byPath.get('/mechanics-lien/'+slug+'/');if(!p){errors.push('Missing new page '+slug);return {slug};}
 const inbound=pages.filter(q=>q.path!==p.path&&q.links.some(h=>new URL(h,domain+q.path).pathname===p.path)).map(q=>q.path);
 const outbound=[...new Set(p.links.filter(h=>new URL(h,domain+p.path).origin===domain).map(h=>new URL(h,domain+p.path).pathname).filter(h=>h!==p.path))];
 if(!inbound.includes('/')||!inbound.includes('/mechanics-lien/')||inbound.length<4)errors.push(p.path+': insufficient contextual discovery');
 if(!p.html.includes('data-seo-boilerplate')||!p.html.includes('$24.99'))errors.push(p.path+': missing paid product promotion');
 for(const type of ['Article','FAQPage','BreadcrumbList'])if(!p.schemas.some(s=>s['@type']===type))errors.push(p.path+': missing '+type);
 // 500 words is a review heuristic for these substantial state guides, not a Google rule.
 if(p.words<500)errors.push(p.path+': state guide needs editorial review');
 return {path:p.path,words:p.words,inbound,outbound};
});
for(const p of ['/success/','/404.html'])if(!/name="robots" content="noindex,follow"/.test(read(p)))errors.push(p+': missing noindex');
const config=JSON.parse(fs.readFileSync('.vercel/output/config.json','utf8'));
if(!config.routes.some(r=>r.status===301&&r.headers?.Location==='/preliminary-notice/california/'))errors.push('Missing deployed 301 for consolidated California guide');
const hosting=JSON.parse(fs.readFileSync('vercel.json','utf8'));
if(hosting.trailingSlash!==true)errors.push('Missing production HTML trailing-slash policy');
if(!hosting.headers?.some(r=>r.has?.some(h=>h.type==='host'&&new RegExp(h.value).test('preview.vercel.app'))&&r.headers.some(h=>h.key==='X-Robots-Tag'&&h.value.includes('noindex'))))errors.push('Missing static preview host noindex policy');
if(!hosting.redirects?.some(r=>r.has?.some(h=>h.type==='host'&&h.value==='www.mechanicslienform.com')&&r.permanent&&r.destination==='https://mechanicslienform.com/:path*'))errors.push('Missing static www host consolidation');
const reachable=new Set(['/']);let changed=true;while(changed){changed=false;for(const p of pages)if(reachable.has(p.path))for(const h of p.links){const u=new URL(h,domain+p.path);if(u.origin===domain&&byPath.has(u.pathname)&&!reachable.has(u.pathname)){reachable.add(u.pathname);changed=true;}}}
for(const p of pages)if(!reachable.has(p.path))errors.push('Orphan editorial page '+p.path);
const report={generatedAt:new Date().toISOString(),indexedPages:pages.length,errors:[...new Set(errors)],warnings:[...new Set(warnings)],newPages,pages:pages.map(p=>({path:p.path,title:p.title,description:p.description,words:p.words})),highestSimilarity:similarities.sort((a,b)=>b.jaccard-a.jaccard).slice(0,10)};
fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/seo-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.errors.length)process.exitCode=1;

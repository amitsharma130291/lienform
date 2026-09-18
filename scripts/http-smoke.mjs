import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://127.0.0.1:4321';
const report=JSON.parse(fs.readFileSync('reports/seo-audit.json','utf8'));
for(const p of report.pages) {
 const response=await fetch(base+p.path);
 assert.equal(response.status,200,p.path);
 const html=await response.text();
 assert.ok(html.includes('https://mechanicslienform.com'+p.path),p.path+' canonical');
}
const old=await fetch(base+'/20-day-preliminary-notice/california/',{redirect:'manual'});
assert.equal(old.status,301);
assert.equal(new URL(old.headers.get('location'),base).pathname,'/preliminary-notice/california/');
const missing=await fetch(base+'/missing-seo-check-page/');
assert.equal(missing.status,404);
assert.ok((await missing.text()).includes('noindex,follow'));
const success=await fetch(base+'/success/');
assert.ok((await success.text()).includes('noindex,follow'));
const xml=await (await fetch(base+'/sitemap.xml')).text();
assert.equal((xml.match(/<loc>/g)||[]).length,24);
assert.ok(!xml.includes('/20-day-preliminary-notice/'));
const robots=await fetch(base+'/robots.txt');
assert.equal(robots.status,200);
assert.ok((await robots.text()).includes('Sitemap: https://mechanicslienform.com/sitemap.xml'));
console.log('Passed: 24 HTTP page responses and canonicals, California 301, real 404/noindex, success noindex, and 24-URL sitemap.');

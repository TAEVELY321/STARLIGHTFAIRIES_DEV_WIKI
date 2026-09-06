import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const chars = JSON.parse(read('assets/characters.json'));
const pages = ['index','characters','world','story','systems','resources','guide'].map(n=>n+'.html').concat(chars.map(c=>`characters/${c.id}.html`));
let links = 0, records = 0;
for(const file of pages) {
  const html = read(file);
  assert(html.startsWith('<!doctype html>'), `${file}: doctype`);
  assert(html.includes('<html lang="ko">'), `${file}: language`);
  assert(!/프로젝트:?\s*아카데미아|천공의 탑|8×8|attachment:/.test(html), `${file}: unrelated content or unresolved attachment URL`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,`${file}: duplicate IDs`);
  for(const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = m[1].replace(/&amp;/g,'&');
    if(/^(https?:|mailto:|data:)/.test(url)) continue;
    const [urlPath,hash] = url.split('#');
    const target = path.resolve(root,path.dirname(file),decodeURIComponent(urlPath.split('?')[0] || path.basename(file)));
    assert(fs.existsSync(target),`${file}: missing ${url}`);
    if(hash) assert(fs.readFileSync(target,'utf8').includes(`id="${decodeURIComponent(hash)}"`),`${file}: invalid fragment ${url}`);
    links++;
  }
}
for(const c of chars) {
  const html = read(`characters/${c.id}.html`);
  const raw = read(`sources/${c.file}`).replace(/\r\n/g,'\n');
  const sourceChapters = [...raw.matchAll(/^####\s+(\d+)화[.\s]+([^\n]+)/gm)];
  assert.equal(sourceChapters.length,50,`${c.id}: source chapter count`);
  assert.equal((html.match(/id="chapter-\d+"/g)||[]).length,50,`${c.id}: output chapter count`);
  assert.equal((html.match(/class="volume"/g)||[]).length,5,`${c.id}: volumes`);
  for(const m of sourceChapters) {
    assert(html.includes(`id="chapter-${m[1]}"`),`${c.id}: chapter ${m[1]} missing`);
    assert(html.includes(m[2].trim()),`${c.id}: chapter title ${m[2]} missing`);
    records++;
  }
  for(const label of ['신장','체중','쓰리사이즈','성격 키워드','모에요소','게임 확정 성우']) assert(html.includes(label),`${c.id}: missing field ${label}`);
  assert(html.includes('변경·축소·확장'),`${c.id}: adaptation notice`);
}
const context = {window:{}};
vm.runInNewContext(read('assets/search-index.js'),context);
assert.equal(context.window.STARFAIR_SEARCH.length,10);
assert(context.window.STARFAIR_SEARCH.find(c=>c.id==='shizuki').text.includes('다크니스 네뷸라'));
assert(context.window.STARFAIR_SEARCH.find(c=>c.id==='umiko').text.includes('로맨스 만화'));
assert(context.window.STARFAIR_SEARCH.find(c=>c.id==='kazuki').text.includes('외부 협력자'));
console.log(`PASS: ${pages.length} pages, ${links} local links/assets, 10 character profiles, ${records} chapter records, 50 volume sections and search data.`);

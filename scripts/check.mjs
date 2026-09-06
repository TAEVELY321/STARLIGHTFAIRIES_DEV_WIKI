import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const chars = JSON.parse(read('assets/characters.json'));
const pages = ['index','characters','world','story','systems','resources','guide','artwork','adv-guide','modeling-guide'].map(n=>n+'.html').concat(chars.map(c=>`characters/${c.id}.html`));
let links = 0, records = 0, volumes = 0;
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
  const sourceVolumes = [...raw.matchAll(/^### 6\.\d+\./gm)];
  if(!c.supporting) {
    assert.equal(sourceChapters.length,50,`${c.id}: original chapter count`);
    assert.equal(sourceVolumes.length,5,`${c.id}: original volumes`);
  }
  assert.equal((html.match(/id="chapter-\d+"/g)||[]).length,sourceChapters.length,`${c.id}: output chapter count`);
  assert.equal((html.match(/class="volume"/g)||[]).length,sourceVolumes.length,`${c.id}: volumes`);
  volumes += sourceVolumes.length;
  if(c.supporting) {
    assert(html.includes('관련 문서 기반 정리'),`${c.id}: source provenance`);
    assert(!html.includes('data-portrait-tab'),`${c.id}: no main portrait form switch`);
    assert.equal(html.includes('id="corruption"'),!!c.corrupted,`${c.id}: dedicated corruption section`);
    assert.equal(html.includes('data-volumes="open"'),sourceVolumes.length>0,`${c.id}: no empty story controls`);
    for(const id of c.references) assert(chars.some(other=>other.id===id),`${c.id}: valid source reference ${id}`);
    for(const chapter of raw.split(/^#### /m).slice(1)) assert(chapter.includes('**구분:')&&chapter.includes('근거:'),`${c.id}: story type and source`);
  }
  for(const m of sourceChapters) {
    assert(html.includes(`id="chapter-${m[1]}"`),`${c.id}: chapter ${m[1]} missing`);
    assert(html.includes(m[2].trim()),`${c.id}: chapter title ${m[2]} missing`);
    records++;
  }
  for(const label of ['신장','체중','쓰리사이즈','성격 키워드','모에요소','게임 확정 성우']) assert(html.includes(label),`${c.id}: missing field ${label}`);
  assert(html.includes('변경·축소·확장'),`${c.id}: adaptation notice`);
}
const context = {window:{}};
const art = JSON.parse(read('assets/artwork.json'));
const gallery = read('artwork.html');
for(const c of chars) {
  const html=read(`characters/${c.id}.html`);
  const toggle=c.group==='페어리즈'||c.group==='흑성교단';
  assert.equal((html.match(/data-portrait-tab/g)||[]).length,toggle?2:0,`${c.id}: portrait toggle scope`);
  assert.equal((html.match(/class="swatch"/g)||[]).length,5,`${c.id}: five palette colors`);
  assert(html.includes('class="character-artwork"')&&html.includes('class="sheet-group"'),`${c.id}: collapsible concept sheets`);
  assert(gallery.includes(`id="${c.id}"`),`${c.id}: gallery section`);
  if(art[c.id]) {
    assert.equal(art[c.id].palette.length,5);
    art[c.id].palette.forEach(color=>assert(/^#[A-F0-9]{6}$/.test(color)));
    art[c.id].portraits.filter(p=>p.file).forEach(p=>{
      const buffer=fs.readFileSync(path.join(root,'sources/CharacterSheet',p.file));
      const scaleHeight=2048*buffer.readUInt32BE(20)/buffer.readUInt32BE(16);
      assert(p.view[0]>=0 && p.view[1]>=0 && p.view[0]+p.view[2]<=2048 && p.view[1]+p.view[3]<=scaleHeight,`${c.id}: front viewport within image`);
    });
  } else assert(html.includes('회색은 TBD 자리 표시'),`${c.id}: gray fallback palette`);
  const section=html.slice(html.indexOf('id="artwork"'),html.indexOf('id="overview"'));
  const first=section.indexOf('<summary>'+(c.group==='페어리즈'?'변신 전':c.group==='흑성교단'?'인간 형태':'시트'));
  const body=section.indexOf('<summary>바디');
  assert(first>=0 && body>first,`${c.id}: body follows primary sheet`);
  if(toggle) assert(section.indexOf('<summary>'+(c.group==='페어리즈'?'변신 후':'절광체 형태'))<body,`${c.id}: transformed sheet before body`);
}
assert(read('characters/natsumi.html').includes('히이라기 나츠미 · 인간 형태 정면'));
for(const id of ['momoka','umiko','natsumi']) assert(!read(`characters/${id}.html`).includes(encodeURIComponent('바디 시트')),`${id}: replacement body slot without original image link`);
for(const id of ['hina','shizuki']) assert(art[id].body.length===1,`${id}: supplied adult modeling reference`);
assert(read('index.html').includes('src="sources/branding/StarlightFairiesMainTitle.png"'));
assert(read('index.html').includes('class="header-logo"'));
console.log(`PASS: 8 two-form selectors, 8 front views, ${chars.length} five-color palettes, ordered collapsible sheets, body slots and relocated branding assets.`);
vm.runInNewContext(read('assets/search-index.js'),context);
assert.equal(context.window.STARFAIR_SEARCH.length,chars.length);
assert(context.window.STARFAIR_SEARCH.find(c=>c.id==='shizuki').text.includes('다크니스 네뷸라'));
assert(context.window.STARFAIR_SEARCH.find(c=>c.id==='umiko').text.includes('로맨스 만화'));
assert(context.window.STARFAIR_SEARCH.find(c=>c.id==='kazuki').text.includes('외부 협력자'));
console.log(`PASS: ${pages.length} pages, ${links} local links/assets, ${chars.length} character profiles, ${records} chapter records, ${volumes} volume sections and search data.`);
const supportingChapters = {
  akari:[1,11,19,21,31,42,43,47,48],
  minami:[1,2,48,50],
  chiyo:[3,4,5,6,11,12,19,21,39,40,41,42,43,45,46,47,48,49,50],
  riko:[7,8,10,48,50],
  mai:[12,13,14,48,50],
  nagisa:[]
};
assert.deepEqual(chars.filter(c=>c.supporting).map(c=>c.id),Object.keys(supportingChapters),'requested six supporting characters');
for(const [id,chapters] of Object.entries(supportingChapters)) {
  const html=read(`characters/${id}.html`);
  assert.deepEqual([...html.matchAll(/id="chapter-(\d+)"/g)].map(m=>Number(m[1])),chapters,`${id}: confirmed appearances and mentions only`);
}
assert(context.window.STARFAIR_SEARCH.find(c=>c.id==='minami').text.includes('브로큰 스완'));
assert(read('characters/nagisa.html').includes('등장 화수 확인 대기'));
console.log('PASS: six supporting profiles, confirmed chapter selection, four separate corruption sections and no portrait form toggles.');
const production = JSON.parse(read('assets/resource-guide.json'));
assert.equal(new Set(production.backgrounds.map(r=>r[0])).size,30,'background camera IDs');
assert(production.variants.every(r=>production.backgrounds.some(bg=>bg[0]===r[0])),'variant parent exists');
assert.equal(production.variants.reduce((n,r)=>n+Number(r[3]),0),24,'additional background states');
assert.equal(production.mainStanding.reduce((n,r)=>n+Number(r[4]),0),26,'main standing sets');
assert.equal(production.supportStanding.reduce((n,r)=>n+Number(r[2]),0),31,'support standing sets');
assert.equal(production.extraStanding.reduce((n,r)=>n+Number(r[1]),0),14,'planned extra standing sets');
assert.deepEqual(production.cgActs.flatMap(a=>a.rows.map(r=>Number(r[0]))),Array.from({length:50},(_,i)=>i+1),'CG budget includes every original chapter exactly once');
for(const act of production.cgActs) assert.equal(act.rows.reduce((n,r)=>n+Number(r[1]),0),act.total,`Act ${act.act} subtotal`);
assert.equal(production.cgActs.reduce((n,a)=>n+a.total,0),40,'full CG budget');
assert.equal(production.cgActs.flatMap(a=>a.rows).find(r=>r[0]==='35')[1],'0','episode 35 animation has no duplicate still CG');
console.log('PASS: production guide budgets, background references, 50 chapter allocations and animation exclusion.');

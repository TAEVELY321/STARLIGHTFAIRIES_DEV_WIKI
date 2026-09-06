import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
class Element {
  constructor(props={}) { Object.assign(this,{listeners:{},attributes:{},dataset:{},hidden:false,value:'',textContent:'',open:false,parentElement:null},props); }
  addEventListener(type,callback) {(this.listeners[type] ||= []).push(callback);}
  emit(type,event={}) {(this.listeners[type]||[]).forEach(fn=>fn(event));}
  setAttribute(k,v) {this.attributes[k]=v;}
  querySelectorAll() {return [];}
  focus() {this.focused=true;}
  scrollIntoView() {this.scrolled=true;}
}
const data=JSON.parse(fs.readFileSync(path.join(root,'assets/characters.json'),'utf8'));
const indexContext={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/search-index.js'),'utf8'),indexContext);
const groups=['전체',...new Set(data.map(c=>c.group))];
const cards=data.map(c=>new Element({dataset:{character:c.id,group:c.group}}));
const filters=groups.map(group=>new Element({dataset:{groupFilter:group}}));
const q=new Element();
const select=new Element({value:'전체',options:groups.map(value=>({value}))});
const menu=new Element();
const sidebar=new Element();
const theme=new Element();
const details=new Element({tagName:'DETAILS'});
const chapter=new Element({parentElement:details});
const reset=new Element();
const printTarget=new Element();
const portraitTabs=[new Element(),new Element()];
const portraitPanels=[new Element({hidden:false}),new Element({hidden:true,textContent:'TBD'})];
const portraitWidget=new Element();
portraitWidget.querySelectorAll=selector=>selector==='[data-portrait-tab]'?portraitTabs:portraitPanels;
const items={'character-query':q,'character-group':select,'result-count':new Element(),'empty-results':new Element(),'character-filter':new Element(),'reset-filter':reset,'chapter-27':chapter};
const classSet=new Set();
const classes={toggle(name,on){on?classSet.add(name):classSet.delete(name);},contains(name){return classSet.has(name);}};
const doc=new Element({documentElement:{dataset:{}},body:{classList:classes}});
doc.getElementById=id=>items[id];
doc.querySelector=s=>({'.theme-button':theme,'.menu-button':menu,'.sidebar':sidebar,'.scrim':new Element()}[s]);
doc.querySelectorAll=s=>({'.character-card':cards,'[data-group-filter]':filters,'[data-volumes]':[],'[data-portrait-switch]':[portraitWidget],details:[details,printTarget]}[s]||[]);
const win=new Element({STARFAIR_SEARCH:indexContext.window.STARFAIR_SEARCH});
const loc={href:'file:///wiki/characters.html?q=다크니스%20네뷸라',search:'?q=다크니스%20네뷸라',hash:'#chapter-27'};
const media=new Element({matches:true});
const context={document:doc,window:win,location:loc,history:{replaceState(){}},localStorage:{getItem(){throw Error('Storage unavailable');},setItem(){throw Error('Storage unavailable');}},matchMedia:()=>media,requestAnimationFrame:fn=>fn(),URL,URLSearchParams};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),context);
portraitTabs[1].emit('click');
assert(portraitPanels[0].hidden && !portraitPanels[1].hidden,'Selecting an unavailable form shows its TBD panel');
assert.equal(portraitTabs[1].attributes['aria-selected'],'true');
portraitTabs[1].emit('keydown',{key:'ArrowRight',preventDefault(){}});
assert(!portraitPanels[0].hidden && portraitPanels[1].hidden && portraitTabs[0].focused,'Right arrow wraps to first portrait and transfers keyboard focus');
portraitTabs[0].emit('keydown',{key:'End',preventDefault(){}});
assert.equal(portraitTabs[1].attributes.tabindex,'0');
portraitTabs[1].emit('keydown',{key:'Home',preventDefault(){}});
assert.equal(portraitTabs[0].attributes['aria-selected'],'true');
assert(details.open && chapter.scrolled,'Deep link opens a folded volume before scrolling');
assert(cards.find(c=>c.dataset.character==='shizuki').hidden===false,'Alias from URL finds Shizuki');
q.value='로맨스 만화';q.emit('input');
assert.deepEqual(cards.filter(c=>!c.hidden).map(c=>c.dataset.character),['umiko'],'Full text phrase finds source-backed hobby');
q.value='';select.value='흑성교단';select.emit('change');
assert.deepEqual(cards.filter(c=>!c.hidden).map(c=>c.dataset.character),['natsumi','kaori','yoru','yuuna','kazuki'],'Cult filter includes Kazuki with the four cult characters');
select.value='협력자·조력자';select.emit('change');
assert.deepEqual(cards.filter(c=>!c.hidden).map(c=>c.dataset.character),['spectra','akari'],'Ally filter contains Spectra and Akari, excluding Kazuki');
q.value='존재하지않는검색어123';q.emit('input');
assert.equal(items['empty-results'].hidden,false,'Empty query results are announced');
reset.emit('click');
assert.equal(cards.filter(c=>!c.hidden).length,data.length,'Reset restores all characters');
assert.equal(select.value,'전체');
filters.find(f=>f.dataset.groupFilter==='마을·여학원').emit('click');
assert.deepEqual(cards.filter(c=>!c.hidden).map(c=>c.dataset.character),['minami','chiyo','riko','mai','nagisa'],'Town and school filter excludes Akari after reclassification');
q.value='브로큰 스완';q.emit('input');
assert.deepEqual(cards.filter(c=>!c.hidden).map(c=>c.dataset.character),['minami'],'Corruption name finds Minami within supporting category');
q.value='시라이 치요';q.emit('input');
assert(cards.some(c=>c.dataset.character==='chiyo'&&!c.hidden),'New character name is searchable');
reset.emit('click');
filters[1].emit('click');
assert.equal(cards.filter(c=>!c.hidden).length,4,'Fairies chip filters four members');
assert(sidebar.inert,'Closed mobile menu cannot receive focus');
menu.emit('click');assert(!sidebar.inert && classes.contains('menu-open'));
doc.emit('keydown',{key:'Escape'});assert(sidebar.inert && menu.focused);
const previous=doc.documentElement.dataset.theme;theme.emit('click');
assert.notEqual(doc.documentElement.dataset.theme,previous,'Theme works even when localStorage is unavailable');
win.emit('beforeprint');assert(printTarget.open);
win.emit('afterprint');assert(!printTarget.open && details.open,'Printing restores previous disclosure state');
console.log('PASS: portrait tab click, missing-form TBD, keyboard arrows/Home/End, URL search, filters, mobile menu, theme fallback, deep links and print state. (Node event harness; not browser visual QA.)');

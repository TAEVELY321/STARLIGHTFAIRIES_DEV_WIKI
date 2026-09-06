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
const groups=['전체','페어리즈','흑성교단','협력자·조력자'];
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
const items={'character-query':q,'character-group':select,'result-count':new Element(),'empty-results':new Element(),'character-filter':new Element(),'reset-filter':reset,'chapter-27':chapter};
const classSet=new Set();
const classes={toggle(name,on){on?classSet.add(name):classSet.delete(name);},contains(name){return classSet.has(name);}};
const doc=new Element({documentElement:{dataset:{}},body:{classList:classes}});
doc.getElementById=id=>items[id];
doc.querySelector=s=>({'.theme-button':theme,'.menu-button':menu,'.sidebar':sidebar,'.scrim':new Element()}[s]);
doc.querySelectorAll=s=>({'.character-card':cards,'[data-group-filter]':filters,'[data-volumes]':[],details:[details,printTarget]}[s]||[]);
const win=new Element({STARFAIR_SEARCH:indexContext.window.STARFAIR_SEARCH});
const loc={href:'file:///wiki/characters.html?q=다크니스%20네뷸라',search:'?q=다크니스%20네뷸라',hash:'#chapter-27'};
const media=new Element({matches:true});
const context={document:doc,window:win,location:loc,history:{replaceState(){}},localStorage:{getItem(){throw Error('Storage unavailable');},setItem(){throw Error('Storage unavailable');}},matchMedia:()=>media,requestAnimationFrame:fn=>fn(),URL,URLSearchParams};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),context);
assert(details.open && chapter.scrolled,'Deep link opens a folded volume before scrolling');
assert(cards.find(c=>c.dataset.character==='shizuki').hidden===false,'Alias from URL finds Shizuki');
q.value='로맨스 만화';q.emit('input');
assert.deepEqual(cards.filter(c=>!c.hidden).map(c=>c.dataset.character),['umiko'],'Full text phrase finds source-backed hobby');
q.value='';select.value='흑성교단';select.emit('change');
assert.equal(cards.filter(c=>!c.hidden).length,4,'Cult category includes four related character documents');
q.value='존재하지않는검색어123';q.emit('input');
assert.equal(items['empty-results'].hidden,false,'Empty query results are announced');
reset.emit('click');
assert.equal(cards.filter(c=>!c.hidden).length,10,'Reset restores all ten characters');
assert.equal(select.value,'전체');
filters[1].emit('click');
assert.equal(cards.filter(c=>!c.hidden).length,4,'Fairies chip filters four members');
assert(sidebar.inert,'Closed mobile menu cannot receive focus');
menu.emit('click');assert(!sidebar.inert && classes.contains('menu-open'));
doc.emit('keydown',{key:'Escape'});assert(sidebar.inert && menu.focused);
const previous=doc.documentElement.dataset.theme;theme.emit('click');
assert.notEqual(doc.documentElement.dataset.theme,previous,'Theme works even when localStorage is unavailable');
win.emit('beforeprint');assert(printTarget.open);
win.emit('afterprint');assert(!printTarget.open && details.open,'Printing restores previous disclosure state');
console.log('PASS: URL search, alias/full-text lookup, group filters, no results, reset, mobile menu, theme storage fallback, deep-link expansion and print state. (Node event harness; not browser visual QA.)');

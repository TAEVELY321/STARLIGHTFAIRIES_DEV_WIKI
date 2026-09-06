import fs from 'node:fs';
import path from 'node:path';
const esc = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const urlPath = value => value.split('/').map(encodeURIComponent).join('/');
const gray = ['#DADADA','#BEBEBE','#A0A0A0','#828282','#646464'];
export function artworkHelpers(root, manifest) {
  const sheetURL = (file,prefix) => `${prefix}sources/CharacterSheet/${urlPath(file)}`;
  const dimensions = file => {
    const buffer=fs.readFileSync(path.join(root,'sources/CharacterSheet',file));
    if(buffer.toString('hex',0,8)!=='89504e470d0a1a0a') throw Error('Artwork must be PNG: '+file);
    return [buffer.readUInt32BE(16),buffer.readUInt32BE(20)];
  };
  function info(c) {
    const a=manifest[c.id] || {};
    // A navigation category does not make external collaborators a transformed character.
    const toggle=c.portraitToggle ?? (c.group==='페어리즈'||c.group==='흑성교단');
    const labels=c.group==='흑성교단'?['인간 형태','절광체 형태']:['변신 전','변신 후'];
    return {...a, portraits:a.portraits || (toggle?labels.map(label=>({label,caption:label+' · 이미지 TBD'})):[{label:'대표 이미지',caption:'대표 이미지 TBD'}]),toggle};
  }
  function cropped(p,cropId,prefix) {
    const [width,height]=dimensions(p.file);
    const scaleHeight=2048*height/width;
    const clipping=p.clip?`<defs><clipPath id="${cropId}"><polygon points="${p.clip}"/></clipPath></defs>`:'';
    return `<svg class="front-illustration" viewBox="${p.view.join(' ')}" role="img" aria-label="${esc(p.caption)} 정면" xmlns="http://www.w3.org/2000/svg">${clipping}<image href="${sheetURL(p.file,prefix)}" width="2048" height="${scaleHeight}"${p.clip?` clip-path="url(#${cropId})"`:''}/></svg>`;
  }
  function portrait(c,prefix='../') {
    const a=info(c);
    return `<div class="portrait-switch" data-portrait-switch>${a.toggle?`<div class="portrait-tabs" role="tablist" aria-label="${c.name} 모습 선택">${a.portraits.map((p,i)=>`<button type="button" role="tab" id="${c.id}-tab-${i}" aria-selected="${i===0}" aria-controls="${c.id}-portrait-${i}" tabindex="${i===0?0:-1}" data-portrait-tab>${esc(p.label)}</button>`).join('')}</div>`:''}${a.portraits.map((p,i)=>`<div class="portrait-panel" id="${c.id}-portrait-${i}" ${a.toggle?`role="tabpanel" aria-labelledby="${c.id}-tab-${i}" tabindex="0"`:''} ${i?'hidden':''}>${p.file?`<div class="front-frame">${cropped(p,`${c.id}-clip-${i}`,prefix)}</div>`:`<div class="portrait-placeholder"><b>CHARACTER VISUAL</b><span>TBD</span><small>이미지 준비 중</small></div>`}<p class="portrait-caption">${esc(p.caption)}</p></div>`).join('')}<a class="artwork-shortcut" href="${prefix}artwork.html#${c.id}">설정화·바디 시트 보기 →</a></div>`;
  }
  function palette(c) {
    const a=info(c), colors=a.palette || gray;
    return `<div class="palette" aria-label="${c.name} 5색 참고 팔레트">${colors.map(color=>`<div class="palette-chip"><span class="swatch" style="background:${color}" aria-hidden="true"></span><code>${a.palette?color:'TBD'}</code></div>`).join('')}</div><p class="palette-note">${a.palette?`이미지 기반 추정 · ${esc(a.paletteNote)}. 확정 색상 규격은 TBD.`:'이미지 미제공 · 회색은 TBD 자리 표시입니다.'}</p>`;
  }
  function sheet(item,prefix,key) {
    if(item.clothedOnly) {
      // Display only the clothed front/back references; the separate bare-body inset is excluded.
      const [w,h]=dimensions(item.file);
      return `<figure class="sheet-figure"><div class="sheet-svg-wrap"><svg class="sheet-image" viewBox="0 0 2048 ${2048*h/w}" role="img" aria-label="${esc(item.label)}" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="${key}"><path clip-rule="evenodd" d="M0 0H2048V${2048*h/w}H0Z M1647 0H1787V291H1647Z"/></clipPath></defs><image href="${sheetURL(item.file,prefix)}" width="2048" height="${2048*h/w}" clip-path="url(#${key})"/></svg></div><figcaption>${esc(item.label)} · 의복을 착용한 도면만 표시</figcaption></figure>`;
    }
    return `<figure class="sheet-figure"><a href="${sheetURL(item.file,prefix)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(item.label)} 원본 크기로 열기"><img class="sheet-image" src="${sheetURL(item.file,prefix)}" alt="${esc(item.label)} 전체 설정화" loading="lazy" decoding="async"></a><figcaption>${esc(item.label)} <a href="${sheetURL(item.file,prefix)}" target="_blank" rel="noopener noreferrer">원본 크기로 보기 ↗</a></figcaption></figure>`;
  }
  function sheets(c,prefix='../',scope='local') {
    const a=info(c);
    const groups=a.toggle?[[c.group==='흑성교단'?'인간 형태':'변신 전',a.before],[c.group==='흑성교단'?'절광체 형태':'변신 후',a.after],['바디',a.body]]:[['시트',a.before],['바디',a.body]];
    let result=groups.map(([label,items],i)=>`<details class="sheet-group"><summary>${label}<span class="badge">${items?.length?`${items.length}개 시트`:'TBD'}</span></summary><div class="sheet-content">${items?.length?items.map((s,j)=>sheet(s,prefix,`${scope}-${c.id}-sheet-${i}-${j}`)).join(''):`<div class="sheet-tbd"><strong>TBD</strong><p>${label==='바디'?esc(a.bodyNote || '모델링 체형 참고 시트 미제공'):esc(label+' 설정화 미제공')}</p></div>`}</div></details>`).join('');
    if(a.unclassified?.length) result+=`<details class="sheet-group"><summary>제공 시트 · 형태 확인 대기</summary><div class="sheet-content">${a.unclassified.map((s,j)=>sheet(s,prefix,`${scope}-${c.id}-pending-${j}`)).join('')}</div></details>`;
    return result;
  }
  return {portrait,palette,sheets,info};
}

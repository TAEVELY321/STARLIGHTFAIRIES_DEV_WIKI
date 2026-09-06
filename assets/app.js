(() => {
  'use strict';
  const root = document.documentElement;
  const themeButton = document.querySelector('.theme-button');
  function setTheme(theme) {
    root.dataset.theme = theme;
    themeButton?.setAttribute('aria-pressed', String(theme === 'dark'));
    themeButton?.setAttribute('aria-label', theme === 'dark' ? '밝은 테마로 변경' : '어두운 테마로 변경');
    if (themeButton) themeButton.textContent = theme === 'dark' ? '☀' : '◐';
  }
  let savedTheme;
  try { savedTheme = localStorage.getItem('starfair-wiki-theme'); } catch {}
  setTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  themeButton?.addEventListener('click', () => {
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    try { localStorage.setItem('starfair-wiki-theme', root.dataset.theme); } catch {}
  });
  const menu = document.querySelector('.menu-button');
  const sidebar = document.querySelector('.sidebar');
  const mobile = matchMedia('(max-width: 720px)');
  function menuState(open, restoreFocus = false) {
    document.body.classList.toggle('menu-open', open);
    menu?.setAttribute('aria-expanded', String(open));
    menu?.setAttribute('aria-label', open ? '문서 메뉴 닫기' : '문서 메뉴 열기');
    if (sidebar) sidebar.inert = mobile.matches && !open;
    if (restoreFocus) menu?.focus();
  }
  menuState(false);
  menu?.addEventListener('click', () => menuState(!document.body.classList.contains('menu-open')));
  document.querySelector('.scrim')?.addEventListener('click', () => menuState(false, true));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('menu-open')) menuState(false, true);
  });
  mobile.addEventListener('change', () => menuState(false));
  sidebar?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => menuState(false)));
  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    let parent = target.parentElement;
    while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
    if (target.tagName === 'DETAILS') target.open = true;
    requestAnimationFrame(() => target.scrollIntoView({block: 'start'}));
  }
  window.addEventListener('hashchange', revealHash);
  revealHash();
  document.querySelectorAll('[data-volumes]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('details.volume').forEach(item => { item.open = button.dataset.volumes === 'open'; });
  }));
  const q = document.getElementById('character-query');
  if (q) {
    const select = document.getElementById('character-group');
    const cards = [...document.querySelectorAll('.character-card')];
    const index = window.STARFAIR_SEARCH || [];
    const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/g, ' ').trim();
    const params = new URLSearchParams(location.search);
    q.value = params.get('q') || '';
    if ([...select.options].some(option => option.value === params.get('group'))) select.value = params.get('group');
    function filter(updateURL = true) {
      const terms = normalize(q.value).split(' ').filter(Boolean);
      let count = 0;
      cards.forEach(card => {
        const entry = index.find(item => item.id === card.dataset.character);
        const haystack = normalize(entry?.text || card.textContent);
        const show = (select.value === '전체' || card.dataset.group === select.value) && terms.every(term => haystack.includes(term));
        card.hidden = !show;
        if (show) count++;
      });
      document.getElementById('result-count').textContent = `${count}명 / 전체 ${cards.length}명`;
      document.getElementById('empty-results').hidden = count > 0;
      document.querySelectorAll('[data-group-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.groupFilter === select.value)));
      if (updateURL) {
        const next = new URL(location.href);
        q.value.trim() ? next.searchParams.set('q', q.value.trim()) : next.searchParams.delete('q');
        select.value !== '전체' ? next.searchParams.set('group', select.value) : next.searchParams.delete('group');
        try { history.replaceState(null, '', next); } catch {}
      }
    }
    q.addEventListener('input', () => filter());
    select.addEventListener('change', () => filter());
    document.getElementById('character-filter')?.addEventListener('submit', event => { event.preventDefault(); filter(); });
    document.querySelectorAll('[data-group-filter]').forEach(button => button.addEventListener('click', () => { select.value = button.dataset.groupFilter; filter(); }));
    document.getElementById('reset-filter')?.addEventListener('click', () => { q.value = ''; select.value = '전체'; filter(); q.focus(); });
    filter(false);
  }
  let printState = [];
  window.addEventListener('beforeprint', () => {
    printState = [...document.querySelectorAll('details')].map(item => [item, item.open]);
    printState.forEach(([item]) => { item.open = true; });
  });
  window.addEventListener('afterprint', () => printState.forEach(([item, open]) => { item.open = open; }));
})();

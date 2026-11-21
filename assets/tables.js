/* Интерактивные таблицы: перекрестная подсветка, закрепление строки по клику, фильтр конкурентов */
(function () {
  function enhance(table) {
    table.classList.add('ix');
    const rows = [...table.rows];
    rows.forEach((tr, i) => {
      tr.style.setProperty('--i', i);
      [...tr.cells].forEach((c, k) => { c.dataset.col = k; });
    });

    // обёртка для «сканирующей» полосы; классы появления переезжают на неё
    let wrap = table.parentElement;
    if (!wrap.classList.contains('tblwrap') && !wrap.classList.contains('tbl')) {
      wrap = document.createElement('div'); wrap.className = 'tblwrap';
      table.parentNode.insertBefore(wrap, table); wrap.appendChild(table);
      if (table.classList.contains('r')) { table.classList.remove('r'); wrap.classList.add('r'); }
      if (table.style.cssText) { wrap.style.cssText = table.style.cssText; table.style.cssText = ''; }
    } else wrap.classList.add('tblwrap');

    // жёлтым загорается только ячейка под курсором
    const clear = () => table.querySelectorAll('.cell-hot').forEach(e => e.classList.remove('cell-hot'));
    table.addEventListener('mouseover', e => {
      const c = e.target.closest('td'); clear(); if (c) c.classList.add('cell-hot');
    });
    table.addEventListener('mouseleave', clear);
    table.addEventListener('click', e => e.stopPropagation());   // в презентации клик по таблице не листает слайд

    // фильтр по типу конкурента (по data-kind у заголовков)
    const kinds = [...rows[0].cells].map(c => c.dataset.kind || '');
    if (kinds.some(k => k === 'direct')) {
      const bar = document.createElement('div'); bar.className = 'tfilter';
      const opts = [['all', 'Все'], ['direct', 'Прямые'], ['indirect', 'Косвенные']];
      bar.innerHTML = opts.map(([v, t], i) => `<button type="button" data-v="${v}" class="${i ? '' : 'on'}">${t}</button>`).join('');
      wrap.parentNode.insertBefore(bar, wrap);
      if (wrap.classList.contains('r')) { bar.classList.add('r'); bar.style.setProperty('--d', wrap.style.getPropertyValue('--d') || '.2'); }
      bar.addEventListener('click', e => {
        e.stopPropagation();
        const b = e.target.closest('button'); if (!b) return;
        bar.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        const v = b.dataset.v;
        kinds.forEach((k, col) => {
          const off = v !== 'all' && k && k !== 'main' && k !== v;
          table.querySelectorAll(`[data-col="${col}"]`).forEach(x => x.classList.toggle('col-off', off));
        });
        rows.forEach(tr => { tr.style.animation = 'none'; void tr.offsetWidth; tr.style.animation = ''; });
      });
    }

    // на сайте – появление при прокрутке; в презентации анимацию запускает активный слайд
    if (!table.closest('.slide') && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(en => {
        if (en.isIntersecting) { table.classList.add('tbl-in'); wrap.classList.add('tbl-in'); io.disconnect(); }
      }), { threshold: .15 });
      io.observe(table);
    }
  }
  document.querySelectorAll('table').forEach(enhance);
})();

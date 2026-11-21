/* Фоновая музыка и значок.
   Если в папке assets/local/ лежат ваши файлы (на GitHub не загружаются):
     menu.mp3  – играет как фоновая музыка вместо встроенного эмбиента;
     icon.png  – заменяет нарисованный знак радиации.
   Если файлов нет, работает встроенный эмбиент (assets/ambient.js) и SVG-знак. */
(function () {
  const LOCAL_MUSIC = 'assets/local/menu.mp3';
  const LOCAL_ICON = 'assets/local/icon.png';
  let audio = null, useFile = null, on = false, fadeT = null;

  function probeMusic() {
    return new Promise(res => {
      const a = new Audio(); a.preload = 'auto';
      a.oncanplaythrough = () => res(a); a.onerror = () => res(null);
      a.src = LOCAL_MUSIC; a.load();
      setTimeout(() => res(null), 2500);
    });
  }

  function fade(to) {
    clearInterval(fadeT);
    fadeT = setInterval(() => {
      const v = audio.volume + (to > audio.volume ? 0.04 : -0.06);
      if ((to > audio.volume && v >= to) || (to <= audio.volume && v <= to)) { audio.volume = to; clearInterval(fadeT); if (!to) audio.pause(); }
      else audio.volume = Math.max(0, Math.min(1, v));
    }, 60);
  }

  window.Music = {
    get on() { return on; },
    async toggle() {
      if (useFile === null) { audio = await probeMusic(); useFile = !!audio; if (audio) { audio.loop = true; audio.volume = 0; } }
      on = !on;
      if (useFile) { if (on) { audio.play().catch(() => {}); fade(0.6); } else fade(0); }
      else if (window.Ambient && Ambient.on !== on) Ambient.toggle();
      return on;
    }
  };

  // свой значок, если он лежит локально
  const img = new Image();
  img.onload = () => {
    document.querySelectorAll('svg.rad, nav .logo svg').forEach(svg => {
      const r = document.createElement('img');
      r.src = LOCAL_ICON; r.alt = ''; r.className = svg.getAttribute('class') || '';
      r.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block';
      if (svg.closest('nav')) r.style.cssText = 'width:28px;height:28px;object-fit:contain';
      svg.replaceWith(r);
    });
  };
  img.src = LOCAL_ICON;
})();

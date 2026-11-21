/* Детектор радиации в духе S.T.A.L.K.E.R.: сухие «трескучие» щелчки, пачки импульсов
   на высоком фоне и тихий шум эфира. Звук синтезируется в браузере (Web Audio), файлов нет. */
(function () {
  let ctx = null, master = null, hiss = null, clicks = [], on = false, cps = 2, timer = null, nextT = 0;
  const listeners = [];

  // короткий сухой импульс: резкий фронт + полосовой треск 3–6 кГц, без тонального звона
  function makeClick(sr) {
    const len = Math.floor(sr * (0.0025 + Math.random() * 0.002));
    const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr, env = Math.exp(-t / 0.0007);
      const n = Math.random() * 2 - 1;
      lp += (n - lp) * 0.55;                       // грубая фильтрация – «песок»
      d[i] = (n - lp) * env * 1.4;
    }
    d[0] = 1; d[1] = -0.9; d[2] = 0.5;             // щелчок разряда
    return b;
  }

  function curve(k) {                              // лёгкий перегруз для «грязного» динамика
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / n * 2 - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return c;
  }

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.55;
    const shaper = ctx.createWaveShaper(); shaper.curve = curve(6);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4200; bp.Q.value = 0.7;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
    master.connect(shaper).connect(bp).connect(hp).connect(ctx.destination);

    // тихий шум эфира, громче на высоком фоне
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2500; nf.Q.value = 0.5;
    hiss = ctx.createGain(); hiss.gain.value = 0;
    ns.connect(nf).connect(hiss).connect(ctx.destination); ns.start();

    for (let v = 0; v < 8; v++) clicks.push(makeClick(ctx.sampleRate));
  }

  function play(at, vol) {
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = clicks[(Math.random() * clicks.length) | 0];
    s.playbackRate.value = 0.85 + Math.random() * 0.3;
    g.gain.value = vol;
    s.connect(g).connect(master); s.start(at);
    listeners.forEach(f => setTimeout(f, Math.max(0, (at - ctx.currentTime) * 1000)));
  }

  function schedule() {
    const horizon = ctx.currentTime + 0.12;
    while (nextT < horizon) {
      if (on) {
        play(nextT, 0.55 + Math.random() * 0.45);
        // на высоком фоне – пачки по 2–6 импульсов, как в игре у аномалий
        if (cps > 10 && Math.random() < 0.35) {
          const k = 2 + (Math.random() * 5 | 0); let t = nextT;
          for (let i = 0; i < k; i++) { t += 0.006 + Math.random() * 0.02; play(t, 0.3 + Math.random() * 0.5); }
        }
      }
      nextT += -Math.log(1 - Math.random()) / cps;  // пуассоновский поток
    }
  }

  function applyHiss() {
    if (!hiss) return;
    const target = on ? Math.min(0.05, 0.004 + cps * 0.0015) : 0;
    hiss.gain.setTargetAtTime(target, ctx.currentTime, 0.3);
  }

  window.Geiger = {
    get on() { return on; },
    toggle() {
      init(); on = !on;
      if (ctx.state === 'suspended') ctx.resume();
      if (on && !timer) { nextT = ctx.currentTime + 0.05; timer = setInterval(schedule, 40); }
      applyHiss();
      return on;
    },
    setRate(r) { if (r !== cps) { cps = r; applyHiss(); } },
    onClick(f) { listeners.push(f); }
  };
})();

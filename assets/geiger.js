/* Счётчик Гейгера: синтез щелчков в браузере (Web Audio), пуассоновский поток импульсов */
(function () {
  let ctx = null, master = null, buffers = [], on = false, cps = 2.5, timer = null, nextT = 0;
  const listeners = [];

  function makeClick(sr, variant) {
    const len = Math.floor(sr * 0.018);
    const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    const ring = 2600 + variant * 450 + Math.random() * 300;   // «звон» мембраны динамика
    const body = 140 + Math.random() * 60;                       // глухой корпус прибора
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let v = 0;
      if (i < 2) v += (i === 0 ? 1 : -0.8);                        // резкий фронт разряда
      v += Math.exp(-t / 0.0009) * (Math.random() * 2 - 1) * 0.9;  // треск
      v += Math.exp(-t / 0.0016) * Math.sin(2 * Math.PI * ring * t) * 0.55;
      v += Math.exp(-t / 0.005) * Math.sin(2 * Math.PI * body * t) * 0.35;
      d[i] = v;
    }
    return b;
  }

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;
    const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 3200; pk.Q.value = 1.4; pk.gain.value = 5;
    master.connect(hp).connect(pk).connect(ctx.destination);
    for (let v = 0; v < 5; v++) buffers.push(makeClick(ctx.sampleRate, v));
  }

  function play(at) {
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buffers[(Math.random() * buffers.length) | 0];
    s.playbackRate.value = 0.94 + Math.random() * 0.12;
    g.gain.value = 0.45 + Math.random() * 0.55;
    s.connect(g).connect(master); s.start(at);
  }

  function schedule() {
    const horizon = ctx.currentTime + 0.12;
    while (nextT < horizon) {
      if (on) {
        play(nextT);
        listeners.forEach(f => setTimeout(f, Math.max(0, (nextT - ctx.currentTime) * 1000)));
      }
      nextT += -Math.log(1 - Math.random()) / cps;               // экспоненциальные интервалы
    }
  }

  window.Geiger = {
    get on() { return on; },
    toggle() {
      init(); on = !on;
      if (ctx.state === 'suspended') ctx.resume();
      if (on && !timer) { nextT = ctx.currentTime + 0.05; timer = setInterval(schedule, 40); }
      return on;
    },
    setRate(r) { cps = r; },
    onClick(f) { listeners.push(f); }
  };
})();

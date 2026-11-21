/* Оригинальный фоновый эмбиент «Зона»: гул, ветер, далёкие ноты с эхом, редкий скрип металла.
   Полностью генерируется в браузере (Web Audio), без аудиофайлов. */
(function () {
  let ctx = null, out = null, on = false, noteTimer = null, creakTimer = null;
  const SCALE = [110, 130.81, 146.83, 164.81, 196, 220, 261.63]; // ля минор, пентатоника

  function noiseBuffer(sec) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // «коричневый» шум
    return b;
  }

  function lfo(freq, depth, target) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq; g.gain.value = depth; o.connect(g).connect(target); o.start();
  }

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    out = ctx.createGain(); out.gain.value = 0;

    // эхо-«пространство»
    const delay = ctx.createDelay(2), fb = ctx.createGain(), wet = ctx.createGain(), dlp = ctx.createBiquadFilter();
    delay.delayTime.value = 0.62; fb.gain.value = 0.55; wet.gain.value = 0.5; dlp.type = 'lowpass'; dlp.frequency.value = 1800;
    delay.connect(dlp).connect(fb).connect(delay); dlp.connect(wet).connect(out);
    out.connect(ctx.destination);
    const bus = ctx.createGain(); bus.connect(out); bus.connect(delay);
    window.__zoneBus = bus;

    // гул: две расстроенные «пилы» через тёмный фильтр
    const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 220; dl.Q.value = 4;
    const dg = ctx.createGain(); dg.gain.value = 0.16;
    [55, 55.4, 82.4].forEach(f => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(dl); o.start(); });
    lfo(0.07, 120, dl.frequency);
    dl.connect(dg).connect(out);

    // ветер: шум с «гуляющей» полосой
    const ns = ctx.createBufferSource(); ns.buffer = noiseBuffer(4); ns.loop = true;
    const wb = ctx.createBiquadFilter(); wb.type = 'bandpass'; wb.frequency.value = 500; wb.Q.value = 0.9;
    const wg = ctx.createGain(); wg.gain.value = 0.22;
    lfo(0.045, 320, wb.frequency); lfo(0.11, 0.12, wg.gain);
    ns.connect(wb).connect(wg).connect(out); ns.start();
  }

  function note() {
    if (!on) return;
    const f = SCALE[(Math.random() * SCALE.length) | 0] * (Math.random() < 0.25 ? 2 : 1);
    const t = ctx.currentTime, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 1.004;
    lp.type = 'lowpass'; lp.frequency.value = 1400;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0008, t + 4.5);
    o.connect(lp); o2.connect(lp); lp.connect(g).connect(window.__zoneBus);
    o.start(t); o2.start(t); o.stop(t + 5); o2.stop(t + 5);
    noteTimer = setTimeout(note, 2500 + Math.random() * 6000);
  }

  function creak() {
    if (!on) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuffer(2); bp.type = 'bandpass'; bp.Q.value = 18;
    bp.frequency.setValueAtTime(700 + Math.random() * 400, t); bp.frequency.linearRampToValueAtTime(300 + Math.random() * 300, t + 1.6);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.4); g.gain.linearRampToValueAtTime(0, t + 1.8);
    s.connect(bp).connect(g).connect(window.__zoneBus); s.start(t); s.stop(t + 2);
    creakTimer = setTimeout(creak, 15000 + Math.random() * 20000);
  }

  window.Ambient = {
    get on() { return on; },
    toggle() {
      if (!ctx) build();
      if (ctx.state === 'suspended') ctx.resume();
      on = !on;
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setTargetAtTime(on ? 0.7 : 0, ctx.currentTime, on ? 1.5 : 0.4);
      clearTimeout(noteTimer); clearTimeout(creakTimer);
      if (on) { noteTimer = setTimeout(note, 1200); creakTimer = setTimeout(creak, 8000); }
      return on;
    }
  };
})();

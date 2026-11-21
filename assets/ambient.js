/* Фоновая музыка «У костра в тоннеле»: оригинальный медленный гитарный перебор в ля миноре
   поверх тихого гула и ветра. Струны синтезируются алгоритмом Карплуса–Стронга прямо в браузере,
   аудиофайлов нет. Мелодия и последовательность аккордов написаны для этого проекта. */
(function () {
  let ctx = null, out = null, bus = null, on = false, timer = null, nextT = 0, step = 0, creakTimer = null;
  const cache = {};

  const BPM = 66, EIGHTH = 60 / BPM / 2;
  // аккорды: бас + четыре струны (MIDI-ноты)
  const CH = {
    Am: [45, 52, 57, 60, 64], F: [41, 48, 53, 57, 60], C: [48, 55, 60, 64, 67],
    G: [43, 50, 55, 59, 62], E: [40, 47, 52, 56, 59], Dm: [50, 57, 62, 65, 69]
  };
  const PROG = ['Am', 'Am', 'F', 'C', 'Dm', 'Am', 'E', 'E', 'Am', 'F', 'C', 'G', 'Dm', 'E', 'Am', 'Am'];
  const PATTERN = [0, 2, 3, 4, 3, 2, 1, 2];               // перебор на восьмые
  // верхний голос: ноты над перебором (индекс восьмой → MIDI), по тактам
  const MELODY = {
    0: [[0, 76], [4, 74]], 2: [[0, 72], [5, 69]], 3: [[0, 71], [4, 72]], 4: [[0, 74], [6, 72]],
    6: [[0, 71], [4, 68]], 7: [[2, 64]], 8: [[0, 76], [3, 77], [4, 76]], 10: [[0, 72], [4, 76]],
    11: [[0, 74]], 12: [[0, 77], [4, 76]], 13: [[0, 74], [4, 71]], 14: [[0, 69]]
  };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  // струна по Карплусу–Стронгу: короткий шумовой импульс в линии задержки с усредняющим фильтром
  function pluck(m, bright) {
    const key = m + (bright ? 'b' : '');
    if (cache[key]) return cache[key];
    const sr = ctx.sampleRate, f = hz(m), N = Math.round(sr / f), len = Math.floor(sr * 4.5);
    const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0), line = new Float32Array(N);
    for (let i = 0; i < N; i++) line[i] = (Math.random() * 2 - 1) * (bright ? 1 : 0.8);
    // смягчаем атаку – звук пальца, а не медиатора
    for (let k = 0; k < 2; k++) for (let i = 1; i < N; i++) line[i] = 0.5 * (line[i] + line[i - 1]);
    const decay = 0.996 + Math.min(0.0035, f / 200000);
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const cur = line[idx], nxt = line[(idx + 1) % N];
      d[i] = cur;
      line[idx] = decay * 0.5 * (cur + nxt);
      idx = (idx + 1) % N;
    }
    return (cache[key] = b);
  }

  function noiseBuffer(sec) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    return b;
  }
  function lfo(freq, depth, target) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq; g.gain.value = depth; o.connect(g).connect(target); o.start();
  }

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    out = ctx.createGain(); out.gain.value = 0; out.connect(ctx.destination);

    // «тоннель»: два эха с затуханием и тёплый фильтр
    bus = ctx.createGain();
    const body = ctx.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 3200;
    const warm = ctx.createBiquadFilter(); warm.type = 'peaking'; warm.frequency.value = 220; warm.gain.value = 3;
    bus.connect(body).connect(warm).connect(out);
    [[0.37, 0.38], [0.71, 0.3]].forEach(([t, g]) => {
      const dl = ctx.createDelay(2), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), w = ctx.createGain();
      dl.delayTime.value = t; fb.gain.value = g; lp.type = 'lowpass'; lp.frequency.value = 1600; w.gain.value = 0.35;
      warm.connect(dl); dl.connect(lp).connect(fb).connect(dl); lp.connect(w).connect(out);
    });

    // тихий гул
    const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 180; dl.Q.value = 3;
    const dg = ctx.createGain(); dg.gain.value = 0.06;
    [55, 55.3].forEach(f => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(dl); o.start(); });
    lfo(0.06, 70, dl.frequency); dl.connect(dg).connect(out);

    // ветер в тоннеле
    const ns = ctx.createBufferSource(); ns.buffer = noiseBuffer(4); ns.loop = true;
    const wb = ctx.createBiquadFilter(); wb.type = 'bandpass'; wb.frequency.value = 450; wb.Q.value = 0.8;
    const wg = ctx.createGain(); wg.gain.value = 0.1;
    lfo(0.04, 260, wb.frequency); lfo(0.09, 0.05, wg.gain);
    ns.connect(wb).connect(wg).connect(out); ns.start();
  }

  function play(m, at, vol, bright) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    s.buffer = pluck(m, bright); g.gain.value = vol;
    if (p) { p.pan.value = Math.max(-0.6, Math.min(0.6, (m - 57) / 30)); s.connect(g).connect(p).connect(bus); }
    else s.connect(g).connect(bus);
    s.start(at); s.stop(at + 4.5);
  }

  function schedule() {
    while (nextT < ctx.currentTime + 0.2) {
      const bar = Math.floor(step / 8) % PROG.length, e = step % 8, chord = CH[PROG[bar]];
      const swing = (e % 2 ? 0.035 : 0) + (Math.random() - 0.5) * 0.012;  // живая, чуть «ленивая» игра
      const t = nextT + swing;
      const s = PATTERN[e];
      play(chord[s], t, s === 0 ? 0.55 : 0.28 + Math.random() * 0.08, false);
      (MELODY[bar] || []).forEach(([pos, note]) => { if (pos === e) play(note, t + 0.01, 0.42, true); });
      step++;
      // в конце круга – пауза в один такт, как будто гитарист задумался
      nextT += (step % (PROG.length * 8) === 0) ? EIGHTH * 8 : EIGHTH;
    }
  }

  function creak() {
    if (!on) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuffer(2); bp.type = 'bandpass'; bp.Q.value = 18;
    bp.frequency.setValueAtTime(650 + Math.random() * 300, t); bp.frequency.linearRampToValueAtTime(280, t + 1.6);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.4); g.gain.linearRampToValueAtTime(0, t + 1.8);
    s.connect(bp).connect(g).connect(out); s.start(t); s.stop(t + 2);
    creakTimer = setTimeout(creak, 25000 + Math.random() * 25000);
  }

  window.Ambient = {
    get on() { return on; },
    toggle() {
      if (!ctx) build();
      if (ctx.state === 'suspended') ctx.resume();
      on = !on;
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setTargetAtTime(on ? 0.85 : 0, ctx.currentTime, on ? 1.2 : 0.4);
      clearInterval(timer); clearTimeout(creakTimer);
      if (on) {
        nextT = ctx.currentTime + 0.3; timer = setInterval(schedule, 50);
        creakTimer = setTimeout(creak, 20000);
      }
      return on;
    }
  };
})();

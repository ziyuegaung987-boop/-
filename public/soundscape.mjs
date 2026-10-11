const SCALE = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99];
const MELODY = [0, 2, 4, 5, 4, 2, 1, -1, 0, 2, 3, 4, 3, 1, 0, -1, 4, 5, 7, 6, 5, 4, 2, -1, 3, 4, 5, 3, 2, 1, 0, -1];
const MOUNTAIN_MELODY = [0, 4, 5, 7, 5, 4, 2, -1, 2, 5, 7, 6, 5, 3, 1, -1, 4, 6, 7, 5, 4, 2, 0, -1];
const NIGHT_MELODY = [0, -1, 5, 4, -1, 2, 4, -1, 1, 3, 5, -1, 6, 5, 3, -1, 4, -1, 7, 6, 5, -1, 2, 1];

// Original pentatonic music and game effects. Audio starts inside a user gesture.
export class Soundscape {
  constructor({ contextFactory = () => {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) throw new Error('Audio unavailable');
    return new Context({ latencyHint: 'interactive' });
  } } = {}) {
    this.contextFactory = contextFactory;
    this.enabled = true; this.playing = false; this.context = null;
    this.timer = null; this.step = 0; this.nextBeat = 0; this.course = 1;
  }
  async unlock() {
    if (!this.enabled) return false;
    if (!this.context) {
      const context = this.contextFactory(); this.context = context;
      this.master = context.createGain(); this.master.gain.value = .55;
      this.music = context.createGain(); this.music.gain.value = 0;
      this.effects = context.createGain(); this.effects.gain.value = .8;
      const compressor = context.createDynamicsCompressor();
      this.music.connect(this.master); this.effects.connect(this.master);
      this.master.connect(compressor); compressor.connect(context.destination);
      this.noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const channel = this.noise.getChannelData(0);
      for (let i = 0; i < channel.length; i++) channel[i] = (Math.random() * 2 - 1) * .6;
      const wind = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
      wind.buffer = this.noise; wind.loop = true; filter.type = 'lowpass'; filter.frequency.value = 650;
      gain.gain.value = .022; this.windFilter = filter; this.windGain = gain;
      wind.connect(filter); filter.connect(gain); gain.connect(this.music); wind.start();
      this.setCourse(this.course);
      context.onstatechange = () => this.sync();
    }
    if (this.context.state !== 'running') await this.context.resume();
    this.sync(); return this.context.state === 'running';
  }
  setEnabled(enabled) { this.enabled = Boolean(enabled); this.sync(); }
  setPlaying(playing) { this.playing = Boolean(playing); this.sync(); }
  setCourse(course) {
    if (this.course !== course) this.step = 0;
    this.course = course;
    if (this.context && this.windFilter) {
      const t = this.context.currentTime;
      this.windFilter.frequency.setTargetAtTime(course === 2 ? 980 : course === 3 ? 360 : 650, t, .5);
      this.windGain.gain.setTargetAtTime(course === 2 ? .034 : course === 3 ? .012 : .022, t, .5);
    }
  }
  sync() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.enabled ? .55 : 0, now, .025);
    const active = this.enabled && this.playing && this.context.state === 'running';
    this.music.gain.cancelScheduledValues(now);
    this.music.gain.setTargetAtTime(active ? .75 : 0, now, .10);
    if (active && this.timer === null) {
      this.nextBeat = now + .03; this.schedule();
      this.timer = setInterval(() => this.schedule(), 100);
    } else if (!active && this.timer !== null) { clearInterval(this.timer); this.timer = null; }
  }
  schedule() {
    if (!this.context || !this.enabled || !this.playing) return;
    const now = this.context.currentTime;
    if (this.nextBeat < now - .5) this.nextBeat = now + .03;
    while (this.nextBeat < now + .20) {
      const melody = this.course === 2 ? MOUNTAIN_MELODY : this.course === 3 ? NIGHT_MELODY : MELODY;
      const note = melody[this.step % melody.length];
      const transpose = this.course === 2 ? 1.12246 : this.course === 3 ? .8909 : 1;
      if (note >= 0) {
        this.note(SCALE[note] * transpose, this.nextBeat, this.course === 3 ? 1.9 : 1.15, this.course === 3 ? .085 : .11, this.music, this.course === 2 ? 'sine' : 'triangle');
        if (this.course === 3 && this.step % 4 === 0) this.note(SCALE[note] * transpose * 2, this.nextBeat + .04, 1.2, .028, this.music, 'sine');
      }
      if (this.step % 8 === 0) this.note(SCALE[[0, 3, 4, 2][Math.floor(this.step / 8) % 4]] / 2, this.nextBeat, 2.4, .07, this.music, 'sine');
      this.step++; this.nextBeat += this.course === 3 ? .55 : this.course === 2 ? .43 : .46;
    }
  }
  note(frequency, time, duration, volume, bus, shape = 'sine') {
    const context = this.context, oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = shape; oscillator.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.connect(gain); gain.connect(bus); oscillator.start(time); oscillator.stop(time + duration + .03);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  effect(kind) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const context = this.context, now = context.currentTime + .005;
    if (kind === 'flap') {
      const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
      source.buffer = this.noise; filter.type = 'bandpass'; filter.frequency.value = 1200; filter.Q.value = .5;
      gain.gain.setValueAtTime(.0001, now); gain.gain.linearRampToValueAtTime(.10, now + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .11);
      source.connect(filter); filter.connect(gain); gain.connect(this.effects); source.start(now); source.stop(now + .12);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      return;
    }
    const sequences = {
      collect: [739.99, 987.77], deliver: [587.33, 739.99, 880, 1174.66],
      hit: [220, 164.81], won: [587.33, 739.99, 880, 987.77, 1174.66],
      lost: [369.99, 329.63, 293.66], start: [440, 587.33],
      boost: [587.33, 739.99, 987.77, 1174.66], shield: [659.25, 880, 1318.51],
      warning: [329.63, 293.66],
    };
    const sequence = sequences[kind];
    if (!sequence) return;
    sequence.forEach((frequency, i) => this.note(frequency, now + i * .12, kind === 'won' ? .8 : .4, kind === 'hit' ? .10 : .15, this.effects));
  }
}

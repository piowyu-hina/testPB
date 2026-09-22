export type SoundCue = 'throw' | 'hit' | 'kill';

const storageKey = 'testpb.sound';
let enabled = true;
let context: AudioContext | undefined;
let noise: AudioBuffer | undefined;

try { enabled = localStorage.getItem(storageKey) !== 'off'; }
catch { /* Storage can be unavailable. */ }

function audioContext(): AudioContext | undefined {
  if (!context) {
    try { context = new AudioContext({ latencyHint: 'interactive' }); }
    catch { return undefined; }
  }
  return context;
}

function unlockAudio(): void {
  if (!enabled) return;
  const audio = audioContext();
  if (audio?.state === 'suspended') void audio.resume().catch(() => {});
}

export function initSound(): void {
  document.addEventListener('pointerdown', unlockAudio, true);
}

export function soundEnabled(): boolean { return enabled; }

export function setSoundEnabled(value: boolean): void {
  enabled = value;
  try { localStorage.setItem(storageKey, value ? 'on' : 'off'); }
  catch { /* The current setting still works for this session. */ }
  if (value) unlockAudio();
}

function noiseBuffer(audio: AudioContext): AudioBuffer {
  if (noise) return noise;
  noise = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.35), audio.sampleRate);
  const samples = noise.getChannelData(0);
  let seed = 31781;
  for (let i = 0; i < samples.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    samples[i] = (seed / 0x80000000 - 1) * 0.8;
  }
  return noise;
}

function burst(audio: AudioContext, at: number, duration: number, fromHz: number, toHz: number, volume: number): void {
  const source = audio.createBufferSource();
  source.buffer = noiseBuffer(audio);
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(fromHz, at);
  filter.frequency.exponentialRampToValueAtTime(toHz, at + duration);
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  source.connect(filter).connect(gain).connect(audio.destination);
  source.start(at);
  source.stop(at + duration);
}

function tone(audio: AudioContext, at: number, duration: number, fromHz: number, toHz: number, volume: number, type: OscillatorType): void {
  const oscillator = audio.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(fromHz, at);
  oscillator.frequency.exponentialRampToValueAtTime(toHz, at + duration);
  const gain = audio.createGain();
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(at);
  oscillator.stop(at + duration);
}

export function playSound(cue: SoundCue): void {
  if (!enabled) return;
  const audio = audioContext();
  if (!audio) return;
  if (audio.state === 'suspended') { void audio.resume().catch(() => {}); return; }
  const at = audio.currentTime + 0.005;
  if (cue === 'throw') {
    burst(audio, at, 0.1, 2200, 650, 0.065);
    tone(audio, at, 0.12, 540, 220, 0.025, 'triangle');
  } else if (cue === 'hit') {
    burst(audio, at, 0.12, 1350, 340, 0.08);
    tone(audio, at, 0.17, 175, 75, 0.09, 'sine');
  } else {
    burst(audio, at, 0.16, 1900, 260, 0.11);
    tone(audio, at, 0.21, 205, 62, 0.12, 'sine');
    tone(audio, at + 0.025, 0.18, 430, 170, 0.04, 'triangle');
  }
}

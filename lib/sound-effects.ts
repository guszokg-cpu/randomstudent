export type SoundEffect = "menu" | "click" | "randomStart" | "randomFinish" | "point";

const soundSources: Record<SoundEffect, string> = {
  menu: "/sounds/soundtabmanu.mp3",
  click: "/sounds/sounclick.mp3",
  randomStart: "/sounds/letgo.mp3",
  randomFinish: "/sounds/clapping.mp3",
  point: "/sounds/point.mp3"
};

const soundVolumes: Record<SoundEffect, number> = {
  menu: 0.55,
  click: 0.45,
  randomStart: 0.82,
  randomFinish: 0.86,
  point: 0.84
};

const audioCache = new Map<SoundEffect, HTMLAudioElement>();
const lastPlayedAt = new Map<SoundEffect, number>();
let activeRandomStartAudio: HTMLAudioElement | null = null;
let randomStartStopTimer: number | null = null;
let rollingToneTimer: number | null = null;
let audioContext: AudioContext | null = null;

function getAudio(effect: SoundEffect) {
  const cached = audioCache.get(effect);
  if (cached) return cached;

  const audio = new Audio(soundSources[effect]);
  audio.preload = "auto";
  audio.volume = soundVolumes[effect];
  audioCache.set(effect, audio);
  return audio;
}

function playAudio(effect: SoundEffect) {
  const source = getAudio(effect);
  const audio = source.cloneNode(true) as HTMLAudioElement;
  audio.volume = soundVolumes[effect];
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
  return audio;
}

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (audioContext) return audioContext;

  const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const Context = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!Context) return null;

  audioContext = new Context();
  return audioContext;
}

function playTone(frequency: number, duration: number, volume: number, delay = 0, type: OscillatorType = "sine") {
  const context = getAudioContext();
  if (!context) return;

  const startAt = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

function startRollingTone(durationMs: number) {
  const context = getAudioContext();
  if (!context) return;
  void context.resume().catch(() => undefined);

  let step = 0;
  rollingToneTimer = window.setInterval(() => {
    const frequency = 420 + Math.min(step * 13, 520) + (step % 3) * 35;
    playTone(frequency, 0.045, 0.022, 0, step % 2 === 0 ? "square" : "triangle");
    step += 1;
  }, 155);

  window.setTimeout(() => {
    if (rollingToneTimer !== null) {
      window.clearInterval(rollingToneTimer);
      rollingToneTimer = null;
    }
  }, Math.max(300, durationMs - 130));
}

export function preloadSoundEffects() {
  if (typeof window === "undefined") return;
  (Object.keys(soundSources) as SoundEffect[]).forEach((effect) => {
    getAudio(effect).load();
  });
}

export function playSoundEffect(effect: SoundEffect) {
  if (typeof window === "undefined") return;

  const now = window.performance.now();
  const previous = lastPlayedAt.get(effect) ?? 0;
  if (now - previous < 45) return;
  lastPlayedAt.set(effect, now);

  playAudio(effect);
}

export function stopRandomRollingSound() {
  if (typeof window === "undefined") return;

  if (randomStartStopTimer !== null) {
    window.clearTimeout(randomStartStopTimer);
    randomStartStopTimer = null;
  }

  if (rollingToneTimer !== null) {
    window.clearInterval(rollingToneTimer);
    rollingToneTimer = null;
  }

  if (activeRandomStartAudio) {
    activeRandomStartAudio.pause();
    activeRandomStartAudio.currentTime = 0;
    activeRandomStartAudio = null;
  }
}

export function playRandomStartSound(durationMs = 5000) {
  if (typeof window === "undefined") return;

  stopRandomRollingSound();
  activeRandomStartAudio = playAudio("randomStart");
  startRollingTone(durationMs);
  randomStartStopTimer = window.setTimeout(() => {
    stopRandomRollingSound();
  }, Math.max(300, durationMs - 80));
}

export function playRandomFinishSound() {
  if (typeof window === "undefined") return;

  stopRandomRollingSound();
  playAudio("randomFinish");
}

export function playPointSound() {
  playSoundEffect("point");
}

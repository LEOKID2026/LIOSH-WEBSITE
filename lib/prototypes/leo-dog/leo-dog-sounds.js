/** Lightweight WebAudio beeps — no external assets. */

let ctx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

/**
 * @param {number} freq
 * @param {number} duration
 * @param {'sine'|'triangle'|'square'} [type]
 * @param {number} [volume]
 */
function tone(freq, duration, type = "sine", volume = 0.08) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + duration);
}

export function playPetSound() {
  tone(520, 0.12);
  setTimeout(() => tone(680, 0.1), 60);
}

export function playEatSound() {
  tone(280, 0.08, "triangle", 0.06);
  setTimeout(() => tone(320, 0.08, "triangle", 0.06), 100);
  setTimeout(() => tone(300, 0.08, "triangle", 0.06), 200);
}

export function playBathSound() {
  tone(880, 0.06, "sine", 0.04);
  setTimeout(() => tone(920, 0.06, "sine", 0.04), 80);
  setTimeout(() => tone(860, 0.06, "sine", 0.04), 160);
}

export function playPlaySound() {
  tone(440, 0.1);
  setTimeout(() => tone(550, 0.1), 90);
  setTimeout(() => tone(660, 0.12), 180);
}

export function playRestSound() {
  tone(220, 0.25, "sine", 0.05);
}

export function playSneezeSound() {
  tone(180, 0.05, "square", 0.05);
  setTimeout(() => tone(140, 0.08, "square", 0.04), 50);
}

export function playHappySound() {
  tone(600, 0.1);
  setTimeout(() => tone(750, 0.12), 70);
}

export function playTapSound() {
  tone(400, 0.06, "triangle", 0.05);
}

// ビープ音と音声読み上げ。iOS ではユーザー操作の中で unlockAudio() を呼ばないと音が出ない

let ctx: AudioContext | undefined;

/** 「開始」タップの中で呼ぶ */
export function unlockAudio(): void {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  // 無音を1回鳴らして iOS の音声出力を有効化する
  const src = ctx.createBufferSource();
  src.buffer = ctx.createBuffer(1, 1, 22050);
  src.connect(ctx.destination);
  src.start(0);
  if ("speechSynthesis" in window) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  }
}

export function beep(freq = 880, durationMs = 120): void {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + durationMs / 1000 + 0.02);
}

/** 読み上げ中の文は打ち切って新しい文を読む（合図が遅れないように） */
export function speak(text: string): void {
  if (!("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = 1.1;
  const voice = synth.getVoices().find((v) => v.lang === "ja-JP");
  if (voice) u.voice = voice;
  synth.speak(u);
}

export function stopSpeech(): void {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

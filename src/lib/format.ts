/** 秒を m:ss 表記にする（端数は切り捨て） */
export function formatSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** カウントダウン表示用。残り 0.2 秒なら 1 と表示したいので切り上げ */
export function formatCountdown(sec: number): string {
  return formatSec(Math.ceil(Math.max(0, sec)));
}

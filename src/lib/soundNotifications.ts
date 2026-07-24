// Per-device preference (NOT synced across devices): play a short notification
// sound when it becomes the local user's turn. Default is enabled; the absence
// of the key is treated as "on" so the feature works for brand-new visitors
// without requiring an opt-in.
const KEY = "sound_notifications";

// Lazily created on first play so the Audio element isn't instantiated at
// module load (some environments restrict audio before a user gesture).
let audio: HTMLAudioElement | null = null;

export function isSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(KEY);
    // Absent / null = enabled (default on). Explicit "false" = disabled.
    return stored !== "false";
  } catch {
    // localStorage may be disabled (private mode, etc.) — default on.
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(KEY, String(enabled));
  } catch {
    // localStorage full or disabled — silently ignore.
  }
}

export function playTurnNotification(): void {
  try {
    if (audio === null) {
      audio = new Audio("/sounds/notification.wav");
    }
    audio.currentTime = 0;
    // play() returns a Promise that rejects if blocked by autoplay policy
    // (e.g. before any user gesture). Swallow it — the sound simply won't
    // play, which is preferable to a console error or crashing the turn flow.
    audio.play().catch(() => {});
  } catch {
    // Audio construction/decoding failed — ignore.
  }
}

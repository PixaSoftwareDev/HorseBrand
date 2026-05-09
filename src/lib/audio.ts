const KEY = "hb_audio";
const TARGET_VOL = 0.22;
const FADE_IN_MS = 1500;
const FADE_OUT_MS = 800;

export function initAmbientAudio(): void {
  const btn = document.getElementById("navAudio") as HTMLButtonElement | null;
  const audio = document.getElementById("ambientAudio") as HTMLAudioElement | null;
  if (!btn || !audio) return;

  let fadeRAF: number | null = null;
  audio.volume = 0;

  function fade(from: number, to: number, ms: number, after?: () => void): void {
    if (fadeRAF !== null) cancelAnimationFrame(fadeRAF);
    const start = performance.now();
    function step(now: number): void {
      const t = Math.min(1, (now - start) / ms);
      audio!.volume = from + (to - from) * t;
      if (t < 1) fadeRAF = requestAnimationFrame(step);
      else if (after) after();
    }
    fadeRAF = requestAnimationFrame(step);
  }

  async function turnOn(): Promise<boolean> {
    try {
      audio!.volume = 0;
      await audio!.play();
      btn!.setAttribute("aria-pressed", "true");
      fade(0, TARGET_VOL, FADE_IN_MS);
      localStorage.setItem(KEY, "on");
      return true;
    } catch {
      btn!.setAttribute("aria-pressed", "false");
      return false;
    }
  }
  function turnOff(): void {
    btn!.setAttribute("aria-pressed", "false");
    fade(audio!.volume, 0, FADE_OUT_MS, () => audio!.pause());
    localStorage.setItem(KEY, "off");
  }

  btn.addEventListener("click", () => {
    if (btn.getAttribute("aria-pressed") === "true") turnOff();
    else void turnOn();
  });

  // Default: audio plays on entry. Only stays off if the user explicitly paused it.
  const userPref = localStorage.getItem(KEY);
  if (userPref !== "off") {
    let started = false;

    function armWakeFallback(): void {
      const wake = (): void => {
        void turnOn();
        window.removeEventListener("pointerdown", wake);
        window.removeEventListener("keydown", wake);
      };
      window.addEventListener("pointerdown", wake, { once: true });
      window.addEventListener("keydown", wake, { once: true });
    }

    function start(gesture: boolean): void {
      if (started) return;
      started = true;
      if (gesture) {
        // Splash click counts as the user gesture — play() will succeed.
        void turnOn().then((ok) => {
          if (!ok) armWakeFallback();
        });
      } else {
        // Auto-dismiss or already-seen splash: no gesture available, wait for one.
        armWakeFallback();
      }
    }

    window.addEventListener("hb:intro-done", ((e: CustomEvent) => {
      start(Boolean(e.detail?.gesture));
    }) as EventListener);

    // Defensive: if the splash dispatched the event before we listened (race),
    // body.intro-done will already be set.
    if (document.body.classList.contains("intro-done")) {
      start(false);
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (!audio.paused) audio.pause();
    } else if (btn.getAttribute("aria-pressed") === "true") {
      audio.play().catch(() => {});
    }
  });
}

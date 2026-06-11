export interface SettingsData {
  /** Exposure multiplier, 0.5–1.6. */
  brightness: number;
  /** Master SFX volume, 0–1. */
  volume: number;
  /** Mouse look sensitivity multiplier, 0.3–2.5. */
  mouseSens: number;
}

export const DEFAULT_SETTINGS: SettingsData = {
  brightness: 1,
  volume: 0.7,
  mouseSens: 1,
};

const KEY = "worldcreator.settings";

type Listener = (data: SettingsData) => void;

/** Persisted user settings with change notification. */
export class Settings {
  private data: SettingsData;
  private listeners: Listener[] = [];

  constructor(
    private readonly storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
  ) {
    this.data = { ...DEFAULT_SETTINGS };
    try {
      const raw = this.storage.getItem(KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) {
          this.data = { ...DEFAULT_SETTINGS, ...(parsed as Partial<SettingsData>) };
        }
      }
    } catch {
      // corrupt settings -> defaults
    }
  }

  get current(): SettingsData {
    return { ...this.data };
  }

  set<K extends keyof SettingsData>(key: K, value: SettingsData[K]): void {
    this.data[key] = value;
    this.storage.setItem(KEY, JSON.stringify(this.data));
    for (const l of this.listeners) l(this.current);
  }

  /** Subscribe to changes; fires immediately with current values. */
  onChange(listener: Listener): () => void {
    this.listeners.push(listener);
    listener(this.current);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

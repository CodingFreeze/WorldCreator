import { describe, it, expect } from "vitest";
import { Settings, DEFAULT_SETTINGS } from "./Settings";

class FakeStorage {
  private map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
}

describe("Settings", () => {
  it("starts with defaults", () => {
    const s = new Settings(new FakeStorage());
    expect(s.current).toEqual(DEFAULT_SETTINGS);
  });

  it("persists changes and reloads them", () => {
    const storage = new FakeStorage();
    const a = new Settings(storage);
    a.set("brightness", 1.4);
    a.set("volume", 0.2);
    const b = new Settings(storage);
    expect(b.current.brightness).toBe(1.4);
    expect(b.current.volume).toBe(0.2);
    expect(b.current.mouseSens).toBe(DEFAULT_SETTINGS.mouseSens);
  });

  it("notifies listeners immediately and on change", () => {
    const s = new Settings(new FakeStorage());
    const seen: number[] = [];
    const off = s.onChange((d) => seen.push(d.brightness));
    s.set("brightness", 0.8);
    off();
    s.set("brightness", 1.2);
    expect(seen).toEqual([1, 0.8]);
  });

  it("survives corrupt storage", () => {
    const storage = new FakeStorage();
    storage.setItem("worldcreator.settings", "{nope");
    expect(new Settings(storage).current).toEqual(DEFAULT_SETTINGS);
  });
});

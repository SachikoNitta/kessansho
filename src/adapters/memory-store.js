// KeyValueStore の実装：メモリ上（テスト用・保存できない環境の代わり）。

export class MemoryStore {
  #map = new Map();

  get(key) { return this.#map.has(key) ? JSON.parse(this.#map.get(key)) : null; }
  set(key, value) { this.#map.set(key, JSON.stringify(value)); }
  remove(key) { this.#map.delete(key); }
  keys(prefix) { return [...this.#map.keys()].filter((k) => k.startsWith(prefix)); }
}

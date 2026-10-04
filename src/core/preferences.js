// 表示の好み（文字の大きさなど）。保存先は KeyValueStore として注入される。

const KEY = "kessansho.prefs";

export class Preferences {
  #kv;
  #values;

  /** @param {import("./contracts.js").KeyValueStore} kv */
  constructor(kv) {
    this.#kv = kv;
    this.#values = { largeText: false, ...(kv.get(KEY) || {}) };
  }

  get largeText() { return this.#values.largeText; }

  toggleLargeText() {
    this.#values.largeText = !this.#values.largeText;
    this.#kv.set(KEY, this.#values);
    return this.#values.largeText;
  }
}

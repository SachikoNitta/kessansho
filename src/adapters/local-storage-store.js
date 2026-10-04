// KeyValueStore の実装：ブラウザの localStorage。
// 使えない環境（プライベートブラウズ等）では、例外を握りつぶして「保存されない」だけにする。

export class LocalStorageStore {
  #storage;

  constructor(storage = globalThis.localStorage) {
    this.#storage = storage;
  }

  get(key) {
    try {
      const raw = this.#storage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  set(key, value) {
    try { this.#storage.setItem(key, JSON.stringify(value)); } catch (e) { /* 保存できない環境では無視 */ }
  }

  remove(key) {
    try { this.#storage.removeItem(key); } catch (e) { /* noop */ }
  }

  keys(prefix) {
    try {
      const out = [];
      for (let i = 0; i < this.#storage.length; i++) {
        const key = this.#storage.key(i);
        if (key && key.startsWith(prefix)) out.push(key);
      }
      return out;
    } catch (e) {
      return [];
    }
  }
}

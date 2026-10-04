// ケースごとのセーブと「結末の記録」。保存先は KeyValueStore として注入される。

const PREFIX = "kessansho.v3.";

export class ProgressStore {
  #kv;

  /** @param {import("./contracts.js").KeyValueStore} kv */
  constructor(kv) {
    this.#kv = kv;
  }

  #key(caseId, kind) { return `${PREFIX}${caseId}.${kind}`; }

  // セーブ（遊んでいる途中の状態）
  loadSnapshot(caseId) { return this.#kv.get(this.#key(caseId, "save")) || null; }
  saveSnapshot(caseId, snapshot) { this.#kv.set(this.#key(caseId, "save"), snapshot); }
  clearSnapshot(caseId) { this.#kv.remove(this.#key(caseId, "save")); }
  hasProgress(caseId) { return !!this.loadSnapshot(caseId); }

  // 結末の記録（やり直しても消えない）
  records(caseId) {
    const r = this.#kv.get(this.#key(caseId, "records")) || {};
    return { inferences: r.inferences || [], endings: r.endings || [] };
  }

  /** @param {import("./contracts.js").SessionEvent[]} events */
  record(caseId, events) {
    if (!events.length) return;
    const r = this.records(caseId);
    for (const e of events) {
      const list = e.type === "ending" ? r.endings : e.type === "inference" ? r.inferences : null;
      if (list && !list.includes(e.id)) list.push(e.id);
    }
    this.#kv.set(this.#key(caseId, "records"), r);
  }

  /** すべてのケースのセーブと記録を消す */
  clearAll() {
    for (const key of this.#kv.keys(PREFIX)) this.#kv.remove(key);
  }
}

// CaseRepository の実装：アプリに同梱したケース。
// 一覧は cases/catalog.js、各ケースの中身は catalog の load() で初めて読み込む（遊ぶケースだけ読む）。

export class BundledCaseRepository {
  #catalog;
  #cache = new Map();

  /** @param {Array<import("../core/contracts.js").CaseSummary & { load?: () => Promise<{ default: object }> }>} catalog */
  constructor(catalog) {
    this.#catalog = catalog;
  }

  async listCases() {
    return this.#catalog.map(({ id, no, name, blurb, status }) => ({ id, no, name, blurb, status }));
  }

  async loadCase(id) {
    if (!this.#cache.has(id)) {
      const entry = this.#catalog.find((c) => c.id === id);
      if (!entry || entry.status !== "open" || !entry.load) throw new Error(`ケース "${id}" は遊べません`);
      this.#cache.set(id, entry.load().then((m) => m.default));
    }
    return this.#cache.get(id);
  }
}

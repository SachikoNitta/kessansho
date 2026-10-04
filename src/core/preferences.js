// 表示の好み（文字の大きさなど）。保存先は KeyValueStore として注入される。

const KEY = "kessansho.prefs";

/** 分岐で資料をどう出すか：split 上下に分ける／half 半分のシート／sheet 全画面の紙 */
export const DOCS_LAYOUTS = ["split", "half", "sheet"];

export class Preferences {
  #kv;
  #values;

  /** @param {import("./contracts.js").KeyValueStore} kv */
  constructor(kv) {
    this.#kv = kv;
    this.#values = { largeText: false, docsLayout: "split", ...(kv.get(KEY) || {}) };
    if (!DOCS_LAYOUTS.includes(this.#values.docsLayout)) this.#values.docsLayout = "split";
  }

  get largeText() { return this.#values.largeText; }

  get docsLayout() { return this.#values.docsLayout; }

  /** 次の出し方に切り替える */
  cycleDocsLayout() {
    const i = DOCS_LAYOUTS.indexOf(this.#values.docsLayout);
    this.#values.docsLayout = DOCS_LAYOUTS[(i + 1) % DOCS_LAYOUTS.length];
    this.#kv.set(KEY, this.#values);
    return this.#values.docsLayout;
  }

  toggleLargeText() {
    this.#values.largeText = !this.#values.largeText;
    this.#kv.set(KEY, this.#values);
    return this.#values.largeText;
  }
}

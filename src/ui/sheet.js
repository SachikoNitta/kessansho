// 机の上に置いた紙（モーダル）。資料・目次・設定・記録はすべてこれに中身を渡して開く。

import { el } from "./dom.js";
import { paperClip } from "./decorations.js";

export class Sheet {
  #root;
  #app;
  #returnFocus = null;

  constructor(root, app) {
    this.#root = root;
    this.#app = app;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) this.close();
    });
  }

  get isOpen() { return !!this.#root.firstChild; }

  /**
   * @param {{ title: string, label?: string, sub?: string|Node, body: Node, foot?: string, wide?: boolean }} content
   *   wide: 画面いっぱいの紙（資料を大きく読むとき）
   */
  open({ title, label, sub, body, foot, wide = false }) {
    this.#returnFocus = document.activeElement;
    const closeBtn = el("button", { class: "link underline", onclick: () => this.close() }, foot || "閉じる →");
    const desk = el("div", {
      class: wide ? "desk wide" : "desk",
      onclick: (e) => { if (e.target === desk) this.close(); },
    }, [
      el("div", { class: wide ? "sheet wide" : "sheet", role: "dialog", "aria-modal": "true", "aria-label": label || title }, [
        paperClip(),
        el("div", { class: "sheet-head" }, [
          el("span", { class: "it" }, title),
          typeof sub === "string" ? el("span", { class: "hand" }, sub) : sub,
        ]),
        body,
        el("div", { class: "sheet-foot" }, closeBtn),
      ]),
    ]);
    this.#root.replaceChildren(desk);
    this.#app.setAttribute("inert", "");
    closeBtn.focus({ preventScroll: true });
  }

  close() {
    this.#root.replaceChildren();
    this.#app.removeAttribute("inert");
    if (this.#returnFocus && document.contains(this.#returnFocus)) this.#returnFocus.focus({ preventScroll: true });
  }
}

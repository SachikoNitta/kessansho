// 表紙

import { el, svg } from "../dom.js";

/** @param {{ title: string, onOpen: Function, onSettings: Function, onRecords: Function }} props */
export function coverScreen({ title, onOpen, onSettings, onRecords }) {
  const [pre, main] = splitTitle(title);

  const arc = svg("svg", { class: "cover-arc", viewBox: "0 0 390 200", "aria-hidden": "true" }, [
    svg("defs", {}, [svg("path", { id: "cover-arc-path", d: "M 34 164 C 92 36, 298 36, 356 164" })]),
    svg("text", {}, [svg("textPath", { href: "#cover-arc-path", startOffset: "50%", "text-anchor": "middle" }, "Forensic Case Files")]),
  ]);

  const underline = svg("svg", { class: "cover-wave", viewBox: "0 0 310 36", "aria-hidden": "true" }, [
    svg("path", { d: "M 4 14 C 76 -12, 118 30, 194 6 C 248 -11, 280 -8, 306 0", fill: "none", stroke: "#2F3E5C", "stroke-width": "1.4", "stroke-linecap": "round", opacity: "0.85" }),
    svg("path", { d: "M 10 18 C 80 -4, 122 34, 196 12", fill: "none", stroke: "#2F3E5C", "stroke-width": "0.6", "stroke-linecap": "round", opacity: "0.5" }),
  ]);

  return el("section", { class: "screen" }, [
    el("button", { class: "cover-tap", "aria-label": "表紙を開く", onclick: onOpen }, [
      arc,
      el("h1", { class: "cover-title", "aria-label": title }, [
        el("span", { class: "pre" }, pre),
        el("span", { class: "main" }, [
          el("span", { class: "big" }, main[0]),
          el("span", { class: "mid" }, main[1]),
          el("span", { class: "lg" }, main.slice(2)),
          el("sup", {}, "*1"),
        ]),
      ]),
      underline,
      el("span", { class: "cover-sub" }, "証券アナリストの粉飾調査ファイル"),
      el("span", { class: "cover-open" }, [
        el("span", { class: "it" }, "open the file"),
        el("span", { class: "hand" }, "画面をタップ"),
      ]),
    ]),
    el("div", { class: "cover-foot" }, [
      el("div", { class: "cover-menu" }, [
        el("button", { onclick: onSettings }, "設定"),
        el("button", { onclick: onRecords }, "結末の記録"),
      ]),
      el("div", { class: "footnote" }, [
        el("span", { class: "it" }, "*1"),
        " 数字は嘘をつかない。決算書を書くのは、人間だ。",
        el("br"),
        "本作に登場する企業・人物・数値はすべて架空です。",
      ]),
    ]),
  ]);
}

// 「決算書は嘘をつく」→「決算書は」「嘘をつく」（ワイヤーフレームの組み方）
function splitTitle(title) {
  const i = title.indexOf("は");
  return i > 0 ? [title.slice(0, i + 1), title.slice(i + 1)] : ["", title];
}

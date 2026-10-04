// 調査一覧（ケース選択）

import { el } from "../dom.js";
import { wave, scribble } from "../decorations.js";

/**
 * @param {{ title: string, cases: Array<import("../../core/contracts.js").CaseSummary & { inProgress: boolean }>,
 *           onBack: Function, onSelect: (id: string) => void }} props
 */
export function casesScreen({ title, cases, onBack, onSelect }) {
  const items = [];
  cases.forEach((c, i) => {
    if (i > 0) items.push(el("div", { class: "case-rule" }));
    if (c.status === "open") {
      items.push(el("button", { class: "case open circled", onclick: () => onSelect(c.id) }, [
        scribble(),
        el("span", { class: "row1" }, [el("span", { class: "no" }, c.no), el("span", { class: "name" }, c.name)]),
        el("span", { class: "row2" }, [
          el("span", {}, c.blurb),
          el("span", { class: "go" }, c.inProgress ? "つづきから →" : "はじめから →"),
        ]),
      ]));
    } else {
      items.push(el("div", { class: "case locked" }, [
        el("span", { class: "row1" }, [el("span", { class: "no" }, c.no), el("span", { class: "name" }, c.name)]),
        el("span", { class: "row2" }, c.blurb),
      ]));
    }
  });
  items.push(el("div", { class: "case-rule" }));
  items.push(el("div", { class: "case ghost", "aria-hidden": "true" }, [
    el("span", { class: "no" }, `No.${String(cases.length + 1).padStart(2, "0")}`),
    el("span", { class: "hand" }, "……"),
  ]));

  return el("section", { class: "screen" }, [
    el("header", { class: "header" }, [
      el("button", { class: "link", onclick: onBack }, "← 表紙"),
      el("span", { class: "hand", style: "font-size:12px;color:#6B6255" }, title),
    ]),
    el("div", { class: "cases-head" }, [
      el("span", { class: "it" }, "Case Files"),
      el("span", { class: "ja" }, "調査一覧"),
    ]),
    wave(),
    el("div", { class: "case-list" }, items),
  ]);
}

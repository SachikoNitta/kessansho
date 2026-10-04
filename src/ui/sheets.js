// 紙（Sheet）に載せる中身。どれも Sheet.open に渡す { title, sub, body, foot, wide } を返す。

import { el } from "./dom.js";

/**
 * 資料：タブを左右に並べて切り替える。問いの資料も、これまでの資料の綴りも同じ見せ方
 * @param {{ docs: object[], renderDoc: Function, title?: string, label?: string, foot?: string, initial?: number }} props
 */
// 資料ごとの色（一覧の見出しの印と、紙の上辺に使う）
const DOC_COLORS = ["#E2BC5C", "#8DB57A", "#D98B76", "#7E9FCB", "#B392C6"];

/**
 * 資料の綴り：画面いっぱいの紙に、一覧と一枚ずつの資料。
 *   一覧 … これまでの資料（新しい順）。問いの資料（marked）は「この問いの資料」として先頭にまとめる
 *   一枚 … 資料を大きく出し、「← 一覧」と、前後の資料へ送るボタン
 * focus があればその資料を開いた状態で、なければ一覧で開く
 */
export function documentsSheet({ docs, renderDoc, marked = [], focus = null, foot = "閉じる →" }) {
  const color = (doc) => DOC_COLORS[docs.indexOf(doc) % DOC_COLORS.length];
  const others = docs.filter((d) => !marked.includes(d)).reverse();
  const order = [...marked, ...others];
  const body = el("div", { class: "sheet-body binder" });

  const row = (doc) => el("button", {
    class: "doc-row" + (marked.includes(doc) ? " marked" : ""),
    style: `--index:${color(doc)}`,
    onclick: () => showDoc(doc),
  }, [
    el("span", { class: "doc-chip", "aria-hidden": "true" }),
    el("span", { class: "doc-row-text" }, [el("span", { class: "doc-row-label" }, doc.label), doc.source && el("span", { class: "doc-row-source" }, doc.source)]),
    el("span", { class: "doc-row-go", "aria-hidden": "true" }, "›"),
  ]);

  function showList() {
    body.replaceChildren(
      marked.length > 0 && el("div", { class: "doc-group" }, [el("div", { class: "doc-group-title hand" }, "この問いの資料"), ...marked.map(row)]),
      others.length > 0 && el("div", { class: "doc-group" }, [el("div", { class: "doc-group-title hand" }, marked.length ? "これまでの資料" : "これまでの資料（新しい順）"), ...others.map(row)]),
    );
    body.scrollTop = 0;
  }

  function showDoc(doc) {
    const i = order.indexOf(doc);
    const prev = order[i - 1];
    const next = order[i + 1];
    const paper = el("div", { class: "doc-paper", style: `--index:${color(doc)}` }, [
      el("div", { class: "doc-paper-head" }, [
        el("span", { class: "doc-paper-label" }, doc.label),
        doc.source && el("span", { class: "doc-source hand" }, doc.source),
      ]),
      ...renderDoc(doc),
    ]);
    body.replaceChildren(
      el("div", { class: "binder-bar" }, [
        el("button", { class: "link", onclick: showList }, "← 資料の一覧"),
        el("span", { class: "hand binder-pos" }, `${i + 1} / ${order.length}`),
      ]),
      paper,
      el("div", { class: "binder-nav" }, [
        el("button", { class: "link", disabled: !prev, onclick: () => prev && showDoc(prev) }, prev ? `‹ ${prev.label}` : ""),
        el("button", { class: "link", disabled: !next, onclick: () => next && showDoc(next) }, next ? `${next.label} ›` : ""),
      ]),
    );
    body.scrollTop = 0;
  }

  if (focus && docs.includes(focus)) showDoc(focus);
  else showList();

  return { title: "Case File", label: "資料", body, foot, wide: true };
}

function noteList(caption, entries) {
  return el("div", { class: "notebook" }, [
    el("div", { class: "caption" }, caption),
    ...entries.map(({ text, got }) => el("div", { class: got ? "note" : "note locked" }, got ? text : "？？？")),
  ]);
}

/** 目次：章を選んでやり直す・推理ノート・控えめな状況表示・表紙や調査一覧へ戻る */
export function notebookSheet({ session, onRestart, onCases, onCover }) {
  const def = session.definition;
  const ids = Object.keys(def.inferences);
  const ch = def.chapters[session.scene.chapter] || {};

  // やり直しは二度押しで確かめる（その章より後の進み具合が消えるため）
  let armed = null;
  const chapterItems = session.chapters().map(({ chapter, current }) => {
    const c = def.chapters[chapter];
    const hint = el("span", { class: "hand" }, current ? "いまここ" : "ここから");
    const button = el("button", {
      class: "menu-item chapter-item" + (current ? " current" : ""),
      onclick: () => {
        if (armed !== chapter) {
          armed = chapter;
          chapterItems.forEach((i) => i.reset());
          hint.textContent = "もう一度押す";
          return;
        }
        onRestart(chapter);
      },
    }, [
      el("span", { class: "chapter-name" }, [el("span", { class: "it" }, c.label), c.title && ` ${c.title}`]),
      el("span", { class: "dots" }),
      hint,
    ]);
    button.reset = () => { hint.textContent = current ? "いまここ" : "ここから"; };
    return button;
  });

  return {
    title: "Contents",
    label: "目次",
    sub: `${ch.label || ""} ${ch.title || ""}`.trim(),
    body: el("div", { class: "sheet-body" }, [
      el("div", { class: "caption" }, "章のはじめからやり直す（二度押し）"),
      el("div", { class: "menu-list" }, chapterItems),
      el("div", { class: "menu-list", style: "margin-top:12px" }, [
        el("button", { class: "menu-item", onclick: onCases }, [
          el("span", {}, "調査一覧へ"), el("span", { class: "dots" }), el("span", { class: "hand" }, "続きは保存されます"),
        ]),
        el("button", { class: "menu-item", onclick: onCover }, [
          el("span", {}, "表紙へ"), el("span", { class: "dots" }), el("span", { class: "hand" }, "続きは保存されます"),
        ]),
      ]),
      el("div", { style: "height:12px" }),
      noteList(`推論 ${session.inferences.length} / ${ids.length}`,
        ids.map((id) => ({ text: def.inferences[id], got: session.hasInference(id) }))),
      el("div", { class: "caption", style: "text-align:right" }, `確度 ${session.confidence}`),
    ]),
  };
}

/** 結末の記録：遊べるケースごとに、到達した結末と得た推論 */
export function recordsSheet({ entries }) {
  return {
    title: "Records",
    label: "結末の記録",
    sub: "結末の記録",
    body: el("div", { class: "sheet-body" }, entries.flatMap(({ summary, def, records }, i) => {
      const endings = Object.entries(def.endings);
      const ids = Object.keys(def.inferences);
      return [
        el("div", { class: "notebook", style: i > 0 ? "margin-top:16px" : null }, [
          el("div", { class: "caption" }, `${summary.no} ${summary.name}　結末 ${records.endings.length} / ${endings.length}`),
          ...endings.map(([id, name]) => el("div", { class: records.endings.includes(id) ? "note" : "note locked" },
            records.endings.includes(id) ? name : "？？？")),
        ]),
        noteList(`得た推論 ${records.inferences.length} / ${ids.length}`,
          ids.map((id) => ({ text: def.inferences[id], got: records.inferences.includes(id) }))),
      ];
    })),
  };
}

/** 設定 */
export function settingsSheet({ largeText, onToggleLargeText, onClearAll }) {
  const sizeValue = el("span", { class: "hand" }, largeText ? "大きめ" : "標準");
  const clearValue = el("span", { class: "hand" }, "セーブと記録");
  let armed = false;
  return {
    title: "Settings",
    label: "設定",
    sub: "お好みで",
    body: el("div", { class: "sheet-body" }, [
      el("div", { class: "menu-list" }, [
        el("button", {
          class: "menu-item",
          onclick: () => { sizeValue.textContent = onToggleLargeText() ? "大きめ" : "標準"; },
        }, [el("span", {}, "文字の大きさ"), el("span", { class: "dots" }), sizeValue]),
        el("button", {
          class: "menu-item",
          onclick: () => {
            // 確認ダイアログは使えない環境があるので、二度押しで確かめる
            if (!armed) {
              armed = true;
              clearValue.textContent = "もう一度押すと消えます";
              setTimeout(() => { if (armed) { armed = false; clearValue.textContent = "セーブと記録"; } }, 4000);
              return;
            }
            armed = false;
            onClearAll();
            clearValue.textContent = "消しました";
          },
        }, [el("span", {}, "記録を消す"), el("span", { class: "dots" }), clearValue]),
      ]),
    ]),
  };
}

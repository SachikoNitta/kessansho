// 紙（Sheet）に載せる中身。どれも Sheet.open に渡す { title, sub, tabs, body, foot } を返す。

import { el } from "./dom.js";

/**
 * 資料：タブを左右に並べて切り替える。問いの資料も、これまでの資料の綴りも同じ見せ方
 * @param {{ docs: object[], renderDoc: Function, title?: string, label?: string, foot?: string, initial?: number }} props
 */
// 資料の束に貼るインデックスシールの色（順に繰り返す）
const INDEX_COLORS = ["#F1D58E", "#BFD8B0", "#F0B9A8", "#B9CDE6", "#D9C4E3"];

/**
 * 資料：重ねた紙の束。上の辺にインデックスシールが並び、シールを押すとその資料が一番上に来る
 */
export function documentsSheet({ docs, renderDoc, title = "Documents", label = "資料", foot = "選択肢に戻る →", initial = 0 }) {
  const { tabs, body } = documentsBundle({ docs, renderDoc, initial });
  return { title, label, tabs, body, foot };
}

/** 資料の束（インデックスシールの列と、一番上の紙）。紙の中でも、分岐の画面の中でも使う */
export function documentsBundle({ docs, renderDoc, initial = 0 }) {
  const body = el("div", { class: "sheet-body doc-paper" });
  const tabs = docs.map((doc, i) => el("button", {
    class: "tab",
    style: `--index:${INDEX_COLORS[i % INDEX_COLORS.length]}`,
    role: "tab",
    "aria-selected": "false",
    onclick: () => select(i),
  }, doc.label));

  function select(i) {
    tabs.forEach((b, j) => b.setAttribute("aria-selected", j === i ? "true" : "false"));
    // 紙が画面に出てから、選んだタブが見える位置までタブの列を送る
    requestAnimationFrame(() => tabs[i].scrollIntoView({ block: "nearest", inline: "nearest" }));
    body.style.setProperty("--index", INDEX_COLORS[i % INDEX_COLORS.length]);
    // 資料の出どころは、タブの下・資料の上に置く（見出しの横ではなく、選んだ資料に付ける）
    const source = docs[i].source && el("div", { class: "doc-source hand" }, docs[i].source);
    body.replaceChildren(...[source, ...renderDoc(docs[i])].filter(Boolean));
    body.scrollTop = 0;
  }
  const tablist = el("div", { class: "tabs index-tabs", role: "tablist" }, tabs);
  select(Math.min(initial, docs.length - 1));

  return { tabs: tablist, body };
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
const LAYOUT_NAMES = { split: "上下に分ける", half: "半分のシート", sheet: "全画面の紙" };

export function settingsSheet({ largeText, onToggleLargeText, docsLayout, onCycleDocsLayout, onClearAll }) {
  const sizeValue = el("span", { class: "hand" }, largeText ? "大きめ" : "標準");
  const layoutValue = el("span", { class: "hand" }, LAYOUT_NAMES[docsLayout]);
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
          onclick: () => { layoutValue.textContent = LAYOUT_NAMES[onCycleDocsLayout()]; },
        }, [el("span", {}, "分岐での資料"), el("span", { class: "dots" }), layoutValue]),
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

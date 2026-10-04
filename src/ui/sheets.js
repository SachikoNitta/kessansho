// 紙（Sheet）に載せる中身。どれも Sheet.open に渡す { title, sub, tabs, body, foot } を返す。

import { el } from "./dom.js";

/** 資料：複数あればタブで切り替える */
export function documentsSheet({ docs, renderDoc }) {
  const body = el("div", { class: "sheet-body" });
  const sub = el("span", { class: "hand" });
  const tabs = docs.map((doc, i) => el("button", {
    class: "tab",
    role: "tab",
    "aria-selected": "false",
    onclick: () => select(i),
  }, doc.label));

  function select(i) {
    tabs.forEach((b, j) => b.setAttribute("aria-selected", j === i ? "true" : "false"));
    sub.textContent = docs[i].source || "";
    body.replaceChildren(...renderDoc(docs[i]));
    body.scrollTop = 0;
  }
  select(0);

  return {
    title: "Documents",
    label: "資料",
    sub,
    tabs: el("div", { class: "tabs", role: "tablist" }, tabs),
    body,
    foot: "選択肢に戻る →",
  };
}

/** 資料の綴り：これまでに出てきた資料の一覧から、選んだものを開く */
export function archiveSheet({ docs, renderDoc }) {
  const body = el("div", { class: "sheet-body" });
  const sub = el("span", { class: "hand" }, `${docs.length}件`);

  function showList() {
    sub.textContent = `${docs.length}件`;
    body.replaceChildren(el("div", { class: "menu-list" }, docs.map((doc, i) => el("button", {
      class: "menu-item",
      onclick: () => showDoc(i),
    }, [el("span", {}, doc.label), el("span", { class: "dots" }), el("span", { class: "hand" }, doc.source || "")]))));
    body.scrollTop = 0;
  }

  function showDoc(i) {
    sub.textContent = docs[i].source || "";
    body.replaceChildren(
      el("button", { class: "link", onclick: showList }, "← 資料の一覧"),
      el("div", { class: "doc-title" }, docs[i].label),
      ...renderDoc(docs[i]),
    );
    body.scrollTop = 0;
  }

  showList();
  return { title: "Case File", label: "資料の綴り", sub, body };
}

function noteList(caption, entries) {
  return el("div", { class: "notebook" }, [
    el("div", { class: "caption" }, caption),
    ...entries.map(({ text, got }) => el("div", { class: got ? "note" : "note locked" }, got ? text : "？？？")),
  ]);
}

/** 目次：推理ノートと、控えめな状況表示 */
export function notebookSheet({ session, onLeave }) {
  const def = session.definition;
  const ids = Object.keys(def.inferences);
  const ch = def.chapters[session.scene.chapter] || {};
  return {
    title: "Notebook",
    label: "目次",
    sub: `${ch.label || ""} ${ch.title || ""}`.trim(),
    body: el("div", { class: "sheet-body" }, [
      noteList(`推論 ${session.inferences.length} / ${ids.length}`,
        ids.map((id) => ({ text: def.inferences[id], got: session.hasInference(id) }))),
      el("div", { class: "caption", style: "text-align:right" }, `確度 ${session.confidence}`),
      el("div", { class: "menu-list" }, [
        el("button", { class: "menu-item", onclick: onLeave }, [
          el("span", {}, "調査一覧へ"), el("span", { class: "dots" }), el("span", { class: "hand" }, "続きは保存されます"),
        ]),
      ]),
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

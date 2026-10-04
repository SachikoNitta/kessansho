// シーンの種類ごとの画面。種類は登録制で、新しい種類は createSceneViews に足すだけ（App は変えない）。
// view は ({ session, actions }) => Node。actions は App が渡す：
//   next()  choose(index)  openDocs(docIds)  openArchive()  openMenu()  exitCase()  renderDoc(docId)
//   docsLayout（"split" | "half" | "sheet"）  docsBundle(docIds) => { tabs, body }
//   chooseAhead(index)  本文と同じ画面に出した分岐で選ぶ

import { el } from "../dom.js";
import { wave, scribble, clipIcon, chapterHeader, turnThePage, paragraph } from "../decorations.js";

const NUMERALS = ["i.", "ii.", "iii.", "iv.", "v.", "vi."];

function header(session, actions) {
  return chapterHeader(session.definition.chapters[session.scene.chapter], {
    onMenu: actions.openMenu,
    onArchive: actions.openArchive,
    archiveCount: session.seenDocs.length,
  });
}

// ---------- 読む ----------

/** 本文の段落（選んだ答えの吹き出し・段落・推論）。表示の途中で押すと、まず全文を出す */
function readingParts(session, scene) {
  const paragraphs = session.paragraphs(scene);
  const parts = [];
  if (session.showsChoiceBubble()) {
    parts.push(el("div", { class: "picked" }, [el("span", {}, "→"), el("span", {}, session.lastChoice)]));
  }
  return { paragraphs, parts };
}

const ANIMATED = ".reveal, .inference, .ticker-line, .ticker-dot, .graph-line, .graph-dot, .bar, .hbar, .quote-drop, .quote-tip, .quote-line, .board-bar, .dia-arrow, .dia-tie, .dia-label, .dia-coin";

function showAllNow(root) {
  root.querySelectorAll(ANIMATED).forEach((n) => {
    n.style.animationDelay = "0s";
    n.style.animationDuration = "0.01s";
  });
  root.querySelectorAll(".ticker").forEach((n) => { n.dataset.now = "1"; });
}

function textView({ session, actions }) {
  const scene = session.scene;
  const { paragraphs, parts } = readingParts(session, scene);
  parts.push(el("div", { class: "prose" }, paragraphs.map((p, i) => paragraph(p, i, { renderDoc: actions.renderDoc }))));
  if (scene.gain) {
    parts.push(el("div", { class: "inference circled", style: `animation-delay:${paragraphs.length * 0.35 + 0.2}s` }, [
      scribble(),
      el("span", { class: "hand" }, "推論"),
      el("span", { class: "text" }, session.definition.inferences[scene.gain]),
    ]));
  }

  // 本文の次がそのまま分岐なら、本文の下に問いを出す（同じ文を二度読ませない）
  const choiceId = session.nextChoiceId?.();
  if (choiceId) {
    const lead = el("div", { class: "lead", onclick: (e) => showAllNow(e.currentTarget) }, parts);
    return choiceScreen({ session, actions, choiceId, lead, choose: actions.chooseAhead });
  }

  // 表示途中のタップは、まず全文を出す。出揃っていたら次へ。
  const revealMs = (paragraphs.length * 0.35 + (scene.gain ? 0.8 : 0.55)) * 1000;
  const shownAt = performance.now();
  let revealed = false;
  const tapArea = el("button", {
    class: "tap-area",
    "aria-label": "ページをめくる",
    onclick: () => {
      if (!revealed && performance.now() - shownAt < revealMs) {
        revealed = true;
        showAllNow(tapArea);
        return;
      }
      actions.next();
    },
  }, parts);

  return el("section", { class: "screen" }, [
    header(session, actions),
    wave(),
    tapArea,
    turnThePage(),
  ]);
}

// ---------- 分岐 ----------

// 上下に分けたときの境目の位置（画面の高さに対する資料の割合）。場面が変わっても覚えておく
let splitRatio = 0.5;

function choiceView({ session, actions }) {
  const lead = el("p", { class: "recap" }, session.scene.recap);
  return choiceScreen({ session, actions, choiceId: session.sceneId, lead, choose: actions.choose });
}

/**
 * 問いと選択肢の画面。lead は問いの上に置く文（分岐の recap か、直前の本文）。
 * 資料は、好みに合わせて「上下に分ける／半分のシート／全画面の紙」で出す
 */
function choiceScreen({ session, actions, choiceId, lead, choose }) {
  const scene = session.definition.scenes[choiceId];
  const docs = scene.docs.filter((id) => session.definition.docs[id]);

  const options = session.options(choiceId).map(({ option, index, used }, n) => el("button", {
    class: "option",
    "aria-disabled": used ? "true" : null,
    onclick: () => { if (!used) choose(index); },
  }, [el("span", { class: "num" }, NUMERALS[n] || ""), el("span", { class: "label" }, option.label)]));
  const qLine = el("div", { class: "q-line" }, [el("span", { class: "it" }, "Q."), el("span", { class: "text" }, scene.prompt)]);

  const layout = docs.length ? actions.docsLayout || "sheet" : "sheet";
  if (layout === "split") return splitChoice({ session, actions, docs, lead, qLine, options });

  const panel = layout === "half" ? halfPanel(actions.docsBundle(docs)) : null;
  const docsBtn = docs.length > 0 && el("button", {
    class: "docs-btn",
    "aria-label": `資料を見る（${docs.length}件）`,
    "aria-expanded": panel ? "false" : null,
    onclick: () => (panel ? panel.toggle() : actions.openDocs(docs)),
  }, [
    clipIcon(),
    el("span", { class: "label" }, "資料を見る"),
    el("span", { class: "count", "aria-hidden": "true" }, String(docs.length)),
  ]);
  if (panel) panel.onChange = (open) => docsBtn.setAttribute("aria-expanded", String(open));

  return el("section", { class: "screen" + (panel ? " has-panel" : "") }, [
    header(session, actions),
    wave(),
    lead,
    el("div", { style: "flex:1;min-height:32px" }),
    el("div", { class: "question" }, [qLine, docsBtn, el("div", {}, options)]),
    panel && panel.node,
  ]);
}

/** A 上下に分ける：上に資料の束、下に文と問いと選択肢。境目は指で動かせる */
function splitChoice({ session, actions, docs, lead, qLine, options }) {
  const { tabs, body } = actions.docsBundle(docs);
  const top = el("div", { class: "split-docs", style: `flex-basis:${splitRatio * 100}%` }, [tabs, body]);
  const bottom = el("div", { class: "split-choices" }, [
    lead,
    el("div", { class: "question" }, [qLine, el("div", {}, options)]),
  ]);

  const area = el("div", { class: "split-area" });
  const setRatio = (r) => {
    splitRatio = Math.min(0.75, Math.max(0.25, r));
    top.style.flexBasis = `${splitRatio * 100}%`;
    handle.setAttribute("aria-valuenow", String(Math.round(splitRatio * 100)));
  };
  const handle = el("div", {
    class: "split-handle",
    role: "separator",
    tabindex: "0",
    "aria-orientation": "horizontal",
    "aria-label": "資料と選択肢の境目",
    "aria-valuemin": "25",
    "aria-valuemax": "75",
    "aria-valuenow": String(Math.round(splitRatio * 100)),
    onpointerdown: (e) => {
      handle.setPointerCapture(e.pointerId);
      handle.classList.add("dragging");
    },
    onpointermove: (e) => {
      if (!handle.hasPointerCapture(e.pointerId)) return;
      const rect = area.getBoundingClientRect();
      setRatio((e.clientY - rect.top) / rect.height);
    },
    onpointerup: () => handle.classList.remove("dragging"),
    onpointercancel: () => handle.classList.remove("dragging"),
    onkeydown: (e) => {
      if (e.key === "ArrowUp") { setRatio(splitRatio - 0.05); e.preventDefault(); }
      if (e.key === "ArrowDown") { setRatio(splitRatio + 0.05); e.preventDefault(); }
    },
  }, el("span", { class: "grip", "aria-hidden": "true" }));
  area.append(top, handle, bottom);

  return el("section", { class: "screen split" }, [header(session, actions), wave(), area]);
}

/** B 半分のシート：下から資料が半分だけ上がり、上に残った選択肢はそのまま押せる */
function halfPanel({ tabs, body }) {
  let open = false;
  let tall = false;
  const grip = el("button", {
    class: "half-grip",
    "aria-label": "資料を大きく／小さくする",
    onclick: () => { tall = !tall; node.classList.toggle("tall", tall); },
  }, el("span", { class: "grip", "aria-hidden": "true" }));
  const close = el("button", { class: "link half-close", onclick: () => panel.toggle(false) }, "閉じる ↓");
  const node = el("div", { class: "half-panel", role: "region", "aria-label": "資料", hidden: true }, [
    el("div", { class: "half-bar" }, [grip, close]),
    el("div", { class: "half-docs" }, [tabs, body]),
  ]);
  const panel = {
    node,
    onChange: null,
    toggle(force) {
      open = force ?? !open;
      node.hidden = !open;
      node.closest(".screen")?.classList.toggle("panel-open", open);
      // 問いと選択肢が、シートの上に見えるところまで送る
      if (open) requestAnimationFrame(() => node.closest(".screen")?.querySelector(".question")?.scrollIntoView({ block: "start" }));
      panel.onChange?.(open);
    },
  };
  return panel;
}

// ---------- ケースの終わり ----------

function endView({ session, actions }) {
  const def = session.definition;
  const total = Object.keys(def.inferences).length;

  return el("section", { class: "screen" }, [
    header(session, actions),
    wave(),
    el("div", { class: "end-body" }, [
      el("div", { class: "end-title" }, [
        el("span", { class: "it" }, `${actions.caseLabel} — fin.`),
        el("span", { class: "ja" }, def.endings[session.ending] || ""),
      ]),
      el("div", { class: "notebook" }, [
        el("div", { class: "caption" }, `推論 ${session.inferences.length} / ${total}　・　確度 ${session.confidence}`),
        ...session.inferences.map((id) => el("div", { class: "note" }, def.inferences[id])),
      ]),
      def.endNote && el("p", { class: "end-note" }, def.endNote),
      el("div", { style: "flex:1" }),
      el("button", { class: "link underline", style: "align-self:center", onclick: actions.exitCase }, "調査一覧へ戻る →"),
    ]),
  ]);
}

export function createSceneViews(extra = {}) {
  return { text: textView, choice: choiceView, end: endView, ...extra };
}

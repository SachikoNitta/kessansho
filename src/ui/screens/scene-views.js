// シーンの種類ごとの画面。種類は登録制で、新しい種類は createSceneViews に足すだけ（App は変えない）。
// view は ({ session, actions }) => Node。actions は App が渡す：
//   next()  choose(index)  openDocs(docIds)  openArchive()  openMenu()  exitCase()  renderDoc(docId)
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

function choiceView({ session, actions }) {
  const lead = el("p", { class: "recap" }, session.scene.recap);
  return choiceScreen({ session, actions, choiceId: session.sceneId, lead, choose: actions.choose });
}

/** 問いと選択肢の画面。lead は問いの上に置く文（分岐の recap か、直前の本文） */
function choiceScreen({ session, actions, choiceId, lead, choose }) {
  const scene = session.definition.scenes[choiceId];
  const docs = scene.docs.filter((id) => session.definition.docs[id]);

  const options = session.options(choiceId).map(({ option, index, used }, n) => el("button", {
    class: "option",
    "aria-disabled": used ? "true" : null,
    onclick: () => { if (!used) choose(index); },
  }, [el("span", { class: "num" }, NUMERALS[n] || ""), el("span", { class: "label" }, option.label)]));
  const qLine = el("div", { class: "q-line" }, [el("span", { class: "it" }, "Q."), el("span", { class: "text" }, scene.prompt)]);

  const docsBtn = docs.length > 0 && el("button", { class: "docs-btn", onclick: () => actions.openDocs(docs), "aria-label": `資料を見る（${docs.length}件）` }, [
    clipIcon(),
    el("span", { class: "label" }, "資料を見る"),
    el("span", { class: "count", "aria-hidden": "true" }, String(docs.length)),
  ]);

  return el("section", { class: "screen" }, [
    header(session, actions),
    wave(),
    lead,
    el("div", { style: "flex:1;min-height:32px" }),
    el("div", { class: "question" }, [qLine, docsBtn, el("div", {}, options)]),
  ]);
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

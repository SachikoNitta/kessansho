// シーンの種類ごとの画面。種類は登録制で、新しい種類は createSceneViews に足すだけ（App は変えない）。
// view は ({ session, actions }) => Node。actions は App が渡す：
//   next()  choose(index)  openDocs(docIds)  openArchive()  openMenu()  exitCase()

import { el } from "../dom.js";
import { wave, scribble, clipIcon, chapterHeader, turnThePage, paragraph, verdictMark } from "../decorations.js";

const NUMERALS = ["i.", "ii.", "iii.", "iv.", "v.", "vi."];

function header(session, actions) {
  return chapterHeader(session.definition.chapters[session.scene.chapter], {
    onMenu: actions.openMenu,
    onArchive: actions.openArchive,
    archiveCount: session.seenDocs.length,
  });
}

// ---------- 読む ----------

function textView({ session, actions }) {
  const scene = session.scene;
  const paragraphs = session.paragraphs();
  const parts = [];

  if (session.showsChoiceBubble()) {
    parts.push(el("div", { class: "picked-row" }, [
      el("div", { class: "picked" }, [el("span", {}, "→"), el("span", {}, session.lastChoice)]),
      verdictMark(session.lastJudge),
    ]));
  }
  parts.push(el("div", { class: "prose" }, paragraphs.map(paragraph)));
  if (scene.gain) {
    parts.push(el("div", { class: "inference circled", style: `animation-delay:${paragraphs.length * 0.35 + 0.2}s` }, [
      scribble(),
      el("span", { class: "hand" }, "推論"),
      el("span", { class: "text" }, session.definition.inferences[scene.gain]),
    ]));
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
        tapArea.querySelectorAll(".reveal, .inference").forEach((n) => {
          n.style.animationDelay = "0s";
          n.style.animationDuration = "0.01s";
        });
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
  const scene = session.scene;
  const docs = scene.docs.filter((id) => session.definition.docs[id]);

  const options = session.options().map(({ option, index, used }, n) => el("button", {
    class: "option",
    "aria-disabled": used ? "true" : null,
    onclick: () => { if (!used) actions.choose(index); },
  }, [el("span", { class: "num" }, NUMERALS[n] || ""), el("span", { class: "label" }, option.label)]));

  return el("section", { class: "screen" }, [
    header(session, actions),
    wave(),
    el("p", { class: "recap" }, scene.recap),
    el("div", { style: "flex:1;min-height:32px" }),
    el("div", { class: "question" }, [
      el("div", { class: "q-line" }, [el("span", { class: "it" }, "Q."), el("span", { class: "text" }, scene.prompt)]),
      docs.length > 0 && el("button", { class: "docs-btn", onclick: () => actions.openDocs(docs), "aria-label": `資料を見る（${docs.length}件）` }, [
        clipIcon(),
        el("span", { class: "label" }, "資料を見る"),
        el("span", { class: "count", "aria-hidden": "true" }, String(docs.length)),
      ]),
      el("div", {}, options),
    ]),
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

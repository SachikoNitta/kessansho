// シーンの種類ごとの画面。種類は登録制で、新しい種類は createSceneViews に足すだけ（App は変えない）。
// view は ({ session, actions }) => Node。actions は App が渡す：
//   next()  choose(index)  openArchive(focusDocIds?)  openMenu()  exitCase()  renderDoc(docId)
//   chooseAhead(index)  本文と同じ画面に出した分岐で選ぶ

import { el } from "../dom.js";
import { wave, scribble, chapterHeader, docsButton, turnThePage, paragraph } from "../decorations.js";

const NUMERALS = ["i.", "ii.", "iii.", "iv.", "v.", "vi."];

function header(session, actions) {
  return chapterHeader(session.definition.chapters[session.scene.chapter], { onMenu: actions.openMenu });
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
    // 本文にすでに差し込んである資料は、問いの下でくり返さない
    const shown = paragraphs.filter((p) => p.doc).map((p) => p.doc);
    return choiceScreen({ session, actions, choiceId, lead, leadIsPage: true, shown, choose: actions.chooseAhead });
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
    docsButton({ count: session.seenDocs.length, onClick: () => actions.openArchive() }),
  ]);
}

// ---------- 分岐 ----------

function choiceView({ session, actions }) {
  const lead = el("p", { class: "recap" }, session.scene.recap);
  return choiceScreen({ session, actions, choiceId: session.sceneId, lead, choose: actions.choose });
}

/**
 * 問いと選択肢。一画面に資料は一枚まで：
 *   （本文）→ 資料 1 → 資料 2 … → 問いと選択肢
 * の順に、押すたびにめくる。資料を飛ばさずに一枚ずつ必ず目を通し、問いの画面からは「資料を見なおす」で戻れる。
 * lead は問いの上に置く文（分岐の recap か、直前の本文）。本文がある（leadIsPage）ときは、本文も一枚としてめくる。
 * 外した答えから戻ってきたときは、問いからはじめる。
 */
function choiceScreen({ session, actions, choiceId, lead, leadIsPage = false, shown = [], choose }) {
  const scene = session.definition.scenes[choiceId];
  const docs = scene.docs.filter((id) => session.definition.docs[id] && !shown.includes(id));
  const entries = session.options(choiceId);
  const retrying = entries.some((e) => e.used);

  const steps = [
    ...(leadIsPage && docs.length ? ["lead"] : []),
    ...docs.map((id, i) => ({ id, i })),
    "question",
  ];
  const body = el("div", { class: "steps" });
  const section = el("section", { class: "screen" }, [
    header(session, actions),
    wave(),
    body,
    docsButton({ count: session.seenDocs.length, onClick: () => actions.openArchive() }),
  ]);

  const go = (n) => {
    body.replaceChildren(...view(n));
    window.scrollTo(0, 0);
  };

  // 一枚ずつめくる。表示の途中で押したときは、まず全部を出す（本文と同じ）
  const page = (n, children) => {
    const shownAt = performance.now();
    let revealed = false;
    const area = el("button", {
      class: "tap-area",
      "aria-label": "次へ",
      onclick: () => {
        if (!revealed && performance.now() - shownAt < 1400) {
          revealed = true;
          showAllNow(area);
          return;
        }
        go(n + 1);
      },
    }, children);
    return [area, turnThePage()];
  };

  function view(n) {
    const step = steps[n];
    if (step === "lead") return page(n, [lead]);
    if (step !== "question") {
      const { doc, nodes } = actions.renderDoc(step.id);
      return page(n, [
        el("div", { class: "q-doc-count hand" }, docs.length > 1 ? `この問いの資料　${step.i + 1} / ${docs.length}` : "この問いの資料"),
        el("figure", { class: `q-doc doc-paper embed-${doc.type} reveal` }, [
          el("figcaption", { class: "doc-paper-head" }, [
            el("span", { class: "doc-paper-label" }, doc.label),
            doc.source && el("span", { class: "doc-source hand" }, doc.source),
          ]),
          ...nodes,
        ]),
      ]);
    }
    const options = entries.map(({ option, index, used }, k) => el("button", {
      class: "option",
      "aria-disabled": used ? "true" : null,
      onclick: () => { if (!used) choose(index); },
    }, [el("span", { class: "num" }, NUMERALS[k] || ""), el("span", { class: "label" }, option.label)]));
    // 本文を一枚としてめくった後は、問いの上には recap だけを置く
    const top = leadIsPage && docs.length ? el("p", { class: "recap" }, scene.recap) : lead;
    const firstDoc = steps.findIndex((s) => typeof s === "object");
    return [
      top,
      el("div", { style: "flex:1;min-height:32px" }),
      el("div", { class: "question" }, [
        firstDoc >= 0 && el("button", { class: "link q-back", onclick: () => go(firstDoc) }, "‹ 資料を見なおす"),
        el("div", { class: "q-line" }, [el("span", { class: "it" }, "Q."), el("span", { class: "text" }, scene.prompt)]),
        el("div", {}, options),
      ]),
    ];
  }

  go(retrying ? steps.length - 1 : 0);
  return section;
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

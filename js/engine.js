(function () {
  "use strict";

  const STORY = window.STORY;
  const SAVE_KEY = `kessansho.save.${STORY.id}.v2`;
  const RECORD_KEY = "kessansho.records.v1";
  const PREFS_KEY = "kessansho.prefs.v1";
  const app = document.getElementById("app");
  const sheetRoot = document.getElementById("sheet-root");
  const SVG_NS = "http://www.w3.org/2000/svg";

  // ---------- 保存 ----------

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 保存できない環境では無視 */ }
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* noop */ }
  }

  function freshState() {
    return {
      scene: STORY.start,
      confidence: STORY.startConfidence,
      flags: [],
      inferences: [],
      tried: {},
      lastChoice: null,
      bubble: false,
      ending: null,
    };
  }

  function loadSave() {
    const data = read(SAVE_KEY);
    return data && STORY.scenes[data.scene] ? data : null;
  }

  // 結末の記録：やり直しても消えない、これまでに得た推論と到達した結末
  function loadRecords() {
    const r = read(RECORD_KEY) || {};
    return { inferences: r.inferences || [], endings: r.endings || [] };
  }
  function record(kind, id) {
    const r = loadRecords();
    if (!r[kind].includes(id)) r[kind].push(id);
    write(RECORD_KEY, r);
  }

  let state = loadSave() || freshState();
  let prefs = read(PREFS_KEY) || { large: false };
  applyPrefs();

  function applyPrefs() {
    document.documentElement.classList.toggle("large-text", !!prefs.large);
  }

  // ---------- DOM ヘルパー ----------

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    setAttrs(node, attrs);
    append(node, children);
    return node;
  }

  function svg(tag, attrs, children) {
    const node = document.createElementNS(SVG_NS, tag);
    setAttrs(node, attrs);
    append(node, children);
    return node;
  }

  function setAttrs(node, attrs) {
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") node.setAttribute("class", v);
      else if (k === "style") node.style.cssText = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
  }

  function append(node, children) {
    for (const child of [].concat(children || [])) {
      if (child == null || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(child));
    }
  }

  function mount(screen) {
    app.replaceChildren(screen);
    window.scrollTo(0, 0);
  }

  // ---------- 手描きの装飾 ----------

  // ヘッダー下の波線
  function wave() {
    return svg("svg", { class: "wave", viewBox: "0 0 330 24", preserveAspectRatio: "none", "aria-hidden": "true" }, [
      svg("path", { d: "M 0 12 C 62 0, 110 24, 170 12 C 230 0, 290 4, 330 12", fill: "none", stroke: "#2F3E5C", "stroke-width": "1.2", "stroke-linecap": "round", opacity: "0.85", "vector-effect": "non-scaling-stroke" }),
      svg("path", { d: "M 4 16 C 66 6, 112 28, 174 16", fill: "none", stroke: "#2F3E5C", "stroke-width": "0.6", "stroke-linecap": "round", opacity: "0.5", "vector-effect": "non-scaling-stroke" }),
    ]);
  }

  // 赤ペンの丸囲み（中身の大きさに合わせて伸びる）
  function scribble() {
    return svg("svg", { class: "scribble", viewBox: "0 0 330 112", preserveAspectRatio: "none", "aria-hidden": "true" }, [
      svg("path", { d: "M 10 58 C 4 22, 76 6, 166 8 C 262 10, 324 22, 318 60 C 312 96, 246 108, 158 106 C 66 104, 16 94, 10 58 Z", fill: "none", stroke: "#8C3B2A", "stroke-width": "1.6", "stroke-linecap": "round", "vector-effect": "non-scaling-stroke" }),
      svg("path", { d: "M 16 50 C 26 20, 106 4, 202 7", fill: "none", stroke: "#8C3B2A", "stroke-width": "0.8", "stroke-linecap": "round", opacity: "0.6", "vector-effect": "non-scaling-stroke" }),
    ]);
  }

  function clipIcon() {
    return svg("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", stroke: "#2F3E5C", "stroke-width": "1.3", "stroke-linecap": "round", "aria-hidden": "true" }, [
      svg("path", { d: "M5 2.5 L5 11 a2.5 2.5 0 0 0 5 0 L10 4 a1.6 1.6 0 0 0 -3.2 0 L6.8 10.5" }),
    ]);
  }

  function header(chapterId) {
    const ch = STORY.chapters[chapterId] || {};
    return el("header", { class: "header" }, [
      el("div", { class: "chapter" }, [
        el("span", { class: "it" }, ch.label || ""),
        el("span", { class: "title" }, ch.title || ""),
      ]),
      el("button", { class: "link", onclick: openContents }, "目次"),
    ]);
  }

  function turnThePage(blink) {
    return el("div", { class: "turn" + (blink ? " blink" : ""), "aria-hidden": "true" }, [
      el("span", { class: "it" }, "turn the page"),
      el("span", { class: "hand" }, "→"),
    ]);
  }

  function visibleParagraphs(list) {
    return list.filter((p) => typeof p === "string" || !p.ifFlag || state.flags.includes(p.ifFlag));
  }

  function paragraph(p, i) {
    const item = typeof p === "string" ? { text: p } : p;
    const cls = ["reveal", item.muted && "muted", item.emphasis && "emphasis"].filter(Boolean).join(" ");
    return el("p", { class: cls, style: `animation-delay:${i * 0.35}s` }, item.text);
  }

  // ---------- 進行 ----------

  function goto(id) {
    let scene = STORY.scenes[id];
    if (scene.type === "route") {
      id = route(scene);
      scene = STORY.scenes[id];
    }
    if (STORY.endings[id]) {
      state.ending = id;
      record("endings", id);
    }
    state.scene = id;
    if (scene.gain && !state.inferences.includes(scene.gain)) {
      state.inferences.push(scene.gain);
      record("inferences", scene.gain);
    }
    write(SAVE_KEY, state);
    render();
  }

  function render() {
    const scene = STORY.scenes[state.scene];
    if (scene.type === "text") renderText(scene);
    else if (scene.type === "choice") renderChoice(scene);
    else if (scene.type === "end") renderEnd(scene);
  }

  // 結末の判定：rules を上から評価し、最初に当てはまったところへ
  function test(cond) {
    if (cond.any) return cond.any.some(test);
    if (cond.flag) return state.flags.includes(cond.flag);
    if (cond.notFlag) return !state.flags.includes(cond.notFlag);
    if (cond.confidenceBelow != null) return state.confidence < cond.confidenceBelow;
    return true;
  }

  function route(scene) {
    return scene.rules.find((r) => !r.if || test(r.if)).go;
  }

  function startOver() {
    state = freshState();
    remove(SAVE_KEY);
    goto(STORY.start);
  }

  // ---------- 表紙 ----------

  function renderCover() {
    const arc = svg("svg", { class: "cover-arc", viewBox: "0 0 390 200", "aria-hidden": "true" }, [
      svg("defs", {}, [svg("path", { id: "cover-arc-path", d: "M 34 164 C 92 36, 298 36, 356 164" })]),
      svg("text", {}, [svg("textPath", { href: "#cover-arc-path", startOffset: "50%", "text-anchor": "middle" }, "Forensic Case Files")]),
    ]);

    const underline = svg("svg", { class: "cover-wave", viewBox: "0 0 310 36", "aria-hidden": "true" }, [
      svg("path", { d: "M 4 14 C 76 -12, 118 30, 194 6 C 248 -11, 280 -8, 306 0", fill: "none", stroke: "#2F3E5C", "stroke-width": "1.4", "stroke-linecap": "round", opacity: "0.85" }),
      svg("path", { d: "M 10 18 C 80 -4, 122 34, 196 12", fill: "none", stroke: "#2F3E5C", "stroke-width": "0.6", "stroke-linecap": "round", opacity: "0.5" }),
    ]);

    mount(el("section", { class: "screen" }, [
      el("button", { class: "cover-tap", "aria-label": "表紙を開く", onclick: renderCases }, [
        arc,
        el("h1", { class: "cover-title" }, [
          el("span", { class: "pre" }, "決算書は"),
          el("span", { class: "main" }, [
            el("span", { class: "big" }, "嘘"),
            el("span", { class: "mid" }, "を"),
            el("span", { class: "lg" }, "つく"),
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
          el("button", { onclick: openSettings }, "設定"),
          el("button", { onclick: openRecords }, "結末の記録"),
        ]),
        el("div", { class: "footnote" }, [
          el("span", { class: "it" }, "*1"),
          " 数字は嘘をつかない。決算書を書くのは、人間だ。",
          el("br"),
          "本作に登場する企業・人物・数値はすべて架空です。",
        ]),
      ]),
    ]));
  }

  // ---------- 調査一覧 ----------

  function renderCases() {
    const saved = loadSave();
    const inProgress = saved && saved.scene !== STORY.start;

    const items = [];
    STORY.cases.forEach((c, i) => {
      if (i > 0) items.push(el("div", { class: "case-rule" }));
      if (c.open) {
        items.push(el("button", {
          class: "case open circled",
          onclick: () => {
            if (inProgress) { state = saved; render(); } else startOver();
          },
        }, [
          scribble(),
          el("span", { class: "row1" }, [el("span", { class: "no" }, c.no), el("span", { class: "name" }, c.name)]),
          el("span", { class: "row2" }, [
            el("span", {}, c.blurb),
            el("span", { class: "go" }, inProgress ? "つづきから →" : "プロローグから →"),
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
      el("span", { class: "no" }, `No.${String(STORY.cases.length + 1).padStart(2, "0")}`),
      el("span", { class: "hand" }, "……"),
    ]));

    mount(el("section", { class: "screen" }, [
      el("header", { class: "header" }, [
        el("button", { class: "link", onclick: renderCover }, "← 表紙"),
        el("span", { class: "hand", style: "font-size:12px;color:#6B6255" }, STORY.title),
      ]),
      el("div", { class: "cases-head" }, [
        el("span", { class: "it" }, "Case Files"),
        el("span", { class: "ja" }, "調査一覧"),
      ]),
      wave(),
      el("div", { class: "case-list" }, items),
    ]));
  }

  // ---------- 読む ----------

  function renderText(scene) {
    const paragraphs = visibleParagraphs(scene.paragraphs);
    const parts = [];
    if ((scene.showChoice || state.bubble) && state.lastChoice) {
      parts.push(el("div", { class: "picked" }, [el("span", {}, "→"), el("span", {}, state.lastChoice)]));
    }
    parts.push(el("div", { class: "prose" }, paragraphs.map(paragraph)));
    if (scene.gain) {
      parts.push(el("div", {
        class: "inference circled",
        style: `animation-delay:${paragraphs.length * 0.35 + 0.2}s`,
      }, [
        scribble(),
        el("span", { class: "hand" }, "推論"),
        el("span", { class: "text" }, STORY.inferences[scene.gain]),
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
        state.bubble = false;
        goto(scene.next);
      },
    }, parts);

    mount(el("section", { class: "screen" }, [
      header(scene.chapter),
      wave(),
      tapArea,
      turnThePage(true),
    ]));
  }

  // ---------- 分岐 ----------

  const NUMERALS = ["i.", "ii.", "iii.", "iv.", "v.", "vi."];

  function renderChoice(scene) {
    const tried = state.tried[state.scene] || [];
    const docs = (scene.docs || []).filter((id) => STORY.docs[id]);

    // 推論が必要な選択肢は、その推論を得ていなければ出さない
    const visible = scene.options
      .map((opt, i) => ({ opt, i }))
      .filter(({ opt }) => !opt.requires || state.inferences.includes(opt.requires));

    const options = visible.map(({ opt, i }, n) => {
      const used = tried.includes(i);
      return el("button", {
        class: "option",
        "aria-disabled": used ? "true" : null,
        onclick: () => {
          if (used) return;
          state.lastChoice = opt.label;
          state.bubble = !!opt.bubble;
          state.confidence += opt.delta || 0;
          for (const f of opt.flags || []) if (!state.flags.includes(f)) state.flags.push(f);
          // やり直しのある分岐で外した選択肢は、選び済みとして消し線にする
          if (scene.retry && opt.judge !== "o") state.tried[state.scene] = tried.concat(i);
          goto(opt.next);
        },
      }, [el("span", { class: "num" }, NUMERALS[n] || ""), el("span", { class: "label" }, opt.label)]);
    });

    mount(el("section", { class: "screen" }, [
      header(scene.chapter),
      wave(),
      el("p", { class: "recap" }, scene.recap),
      el("div", { style: "flex:1;min-height:32px" }),
      el("div", { class: "question" }, [
        el("div", { class: "q-line" }, [el("span", { class: "it" }, "Q."), el("span", { class: "text" }, scene.prompt)]),
        docs.length > 0 && el("button", { class: "link underline docs-link", onclick: () => openDocs(docs) }, [
          clipIcon(),
          `資料を見る（${docs.length}件）`,
        ]),
        el("div", {}, options),
      ]),
    ]));
  }

  // ---------- ケースの終わり ----------

  function renderEnd(scene) {
    const total = Object.keys(STORY.inferences).length;
    const endingName = STORY.endings[state.ending] || "";

    mount(el("section", { class: "screen" }, [
      header(scene.chapter),
      wave(),
      el("div", { class: "end-body" }, [
        el("div", { class: "end-title" }, [
          el("span", { class: "it" }, `Case ${STORY.cases[0].no.replace("No.", "")} — fin.`),
          el("span", { class: "ja" }, endingName),
        ]),
        el("div", { class: "notebook" }, [
          el("div", { class: "caption" }, `推論 ${state.inferences.length} / ${total}　・　確度 ${state.confidence}`),
          ...state.inferences.map((id) => el("div", { class: "note" }, STORY.inferences[id])),
        ]),
        el("p", { class: "end-note" }, "ケース2は、ただいま調査中です。"),
        el("div", { style: "flex:1" }),
        el("button", { class: "link underline", style: "align-self:center", onclick: () => { remove(SAVE_KEY); state = freshState(); renderCases(); } }, "調査一覧へ戻る →"),
      ]),
    ]));
  }

  // ---------- 机の上の紙（資料・設定・記録） ----------

  let sheetReturnFocus = null;

  function openSheet({ title, sub, tabs, body, foot, label }) {
    sheetReturnFocus = document.activeElement;
    const closeBtn = el("button", { class: "link underline", onclick: closeSheet }, foot || "閉じる →");
    const desk = el("div", {
      class: "desk",
      onclick: (e) => { if (e.target === desk) closeSheet(); },
    }, [
      el("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": label || title }, [
        svg("svg", { class: "clip", width: "26", height: "64", viewBox: "0 0 26 64", "aria-hidden": "true" }, [
          svg("path", { d: "M8 6 L8 48 a5 5 0 0 0 10 0 L18 12 a3.5 3.5 0 0 0 -7 0 L11 44", fill: "none", stroke: "#7D7A74", "stroke-width": "2.2", "stroke-linecap": "round" }),
        ]),
        el("div", { class: "sheet-head" }, [
          el("span", { class: "it" }, title),
          sub && el("span", { class: "hand" }, sub),
        ]),
        tabs,
        body,
        el("div", { class: "sheet-foot" }, closeBtn),
      ]),
    ]);
    sheetRoot.replaceChildren(desk);
    app.setAttribute("inert", "");
    closeBtn.focus({ preventScroll: true });
  }

  function closeSheet() {
    sheetRoot.replaceChildren();
    app.removeAttribute("inert");
    if (sheetReturnFocus && document.contains(sheetReturnFocus)) sheetReturnFocus.focus({ preventScroll: true });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sheetRoot.firstChild) closeSheet();
  });

  function openDocs(ids) {
    const list = ids.map((id) => STORY.docs[id]);
    const body = el("div", { class: "sheet-body" });
    const sub = el("span", { class: "hand" });
    const tabButtons = list.map((doc, i) => el("button", {
      class: "tab",
      role: "tab",
      "aria-selected": "false",
      onclick: () => select(i),
    }, doc.label));

    function select(i) {
      tabButtons.forEach((b, j) => b.setAttribute("aria-selected", j === i ? "true" : "false"));
      sub.textContent = list[i].source || "";
      body.replaceChildren(...renderDoc(list[i]));
      body.scrollTop = 0;
    }

    openSheet({
      title: "Documents",
      label: "資料",
      tabs: el("div", { class: "tabs", role: "tablist" }, tabButtons),
      body,
      foot: "選択肢に戻る →",
    });
    sheetRoot.querySelector(".sheet-head").append(sub);
    select(0);
  }

  function renderDoc(doc) {
    const nodes = [];
    if (doc.caption) nodes.push(el("div", { class: "caption" }, doc.caption));

    if (doc.type === "table") {
      const cols = doc.columns.map((_, i) => (i === 0 ? "minmax(0,1.3fr)" : "minmax(0,1fr)")).join(" ");
      const numericCol = doc.columns.map((_, c) => c > 0 && doc.rows.every((r) => isNumeric(r[c])));
      const row = (cells, head) => el("div", { class: "row" + (head ? " head" : ""), style: `--cols:${cols}` },
        cells.map((c, i) => el("span", { class: numericCol[i] ? "num" : i === 0 ? "" : "cell" }, c)));
      nodes.push(el("div", { class: "table" }, [row(doc.columns, true), ...doc.rows.map((r) => row(r, false))]));
    } else if (doc.type === "article") {
      nodes.push(el("div", { class: "article" }, [
        el("div", { class: "head" }, doc.head),
        ...doc.body.map((l) => el("p", {}, l)),
      ]));
    } else if (doc.type === "inferences") {
      const got = doc.items.filter((id) => state.inferences.includes(id));
      nodes.push(el("div", { class: "notebook" }, got.length
        ? got.map((id) => el("div", { class: "note" }, STORY.inferences[id]))
        : [el("div", { class: "note locked" }, "まだ推論はない")]));
    }
    return nodes;
  }

  function isNumeric(s) {
    return /^[−\-]?[\d.,]+(%|万|億)?$/.test(String(s));
  }

  // 目次：推理ノートと、控えめな状況表示
  function openContents() {
    const ids = Object.keys(STORY.inferences);
    const ch = STORY.chapters[STORY.scenes[state.scene].chapter] || {};
    openSheet({
      title: "Notebook",
      label: "目次",
      sub: `${ch.label || ""} ${ch.title || ""}`.trim(),
      body: el("div", { class: "sheet-body" }, [
        el("div", { class: "notebook" }, [
          el("div", { class: "caption" }, `推論 ${state.inferences.length} / ${ids.length}`),
          ...ids.map((id) => state.inferences.includes(id)
            ? el("div", { class: "note" }, STORY.inferences[id])
            : el("div", { class: "note locked" }, "？？？")),
        ]),
        el("div", { class: "caption", style: "text-align:right" }, `確度 ${state.confidence}`),
        el("div", { class: "menu-list" }, [
          el("button", { class: "menu-item", onclick: () => { closeSheet(); renderCases(); } }, [
            el("span", {}, "調査一覧へ"), el("span", { class: "dots" }), el("span", { class: "hand" }, "記録は残ります"),
          ]),
        ]),
      ]),
    });
  }

  function openRecords() {
    const r = loadRecords();
    const ids = Object.keys(STORY.inferences);
    const endings = Object.entries(STORY.endings);

    openSheet({
      title: "Records",
      label: "結末の記録",
      sub: "結末の記録",
      body: el("div", { class: "sheet-body" }, [
        el("div", { class: "notebook" }, [
          el("div", { class: "caption" }, `${STORY.cases[0].no} ${STORY.cases[0].name}　結末 ${r.endings.length} / ${endings.length}`),
          ...endings.map(([id, name]) => r.endings.includes(id)
            ? el("div", { class: "note" }, name)
            : el("div", { class: "note locked" }, "？？？")),
        ]),
        el("div", { class: "notebook", style: "margin-top:12px" }, [
          el("div", { class: "caption" }, `得た推論 ${r.inferences.length} / ${ids.length}`),
          ...ids.map((id) => r.inferences.includes(id)
            ? el("div", { class: "note" }, STORY.inferences[id])
            : el("div", { class: "note locked" }, "？？？")),
        ]),
      ]),
    });
  }

  function openSettings() {
    const sizeLabel = () => (prefs.large ? "大きめ" : "標準");
    const sizeValue = el("span", { class: "hand" }, sizeLabel());
    const clearValue = el("span", { class: "hand" }, "セーブと記録");

    openSheet({
      title: "Settings",
      label: "設定",
      sub: "お好みで",
      body: el("div", { class: "sheet-body" }, [
        el("div", { class: "menu-list" }, [
          el("button", {
            class: "menu-item",
            onclick: () => { prefs.large = !prefs.large; write(PREFS_KEY, prefs); applyPrefs(); sizeValue.textContent = sizeLabel(); },
          }, [el("span", {}, "文字の大きさ"), el("span", { class: "dots" }), sizeValue]),
          el("button", {
            class: "menu-item",
            onclick: () => {
              if (!window.confirm("セーブデータと結末の記録をすべて消します。よろしいですか？")) return;
              remove(SAVE_KEY);
              remove(RECORD_KEY);
              state = freshState();
              clearValue.textContent = "消しました";
            },
          }, [el("span", {}, "記録を消す"), el("span", { class: "dots" }), clearValue]),
        ]),
      ]),
    });
  }

  // ---------- 起動 ----------

  renderCover();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => { /* オフライン対応は任意 */ });
  }
})();

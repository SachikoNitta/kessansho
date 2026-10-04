(function () {
  "use strict";

  const STORY = window.STORY;
  const SAVE_KEY = "kessansho.save.v1";
  const app = document.getElementById("app");
  const sheetRoot = document.getElementById("sheet-root");

  const ICONS = {
    menu: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#5E5E59" stroke-width="1.6" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1C1C1C" stroke-width="1.6" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>',
    doc: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 2h7l3 3v11H4z"/><path d="M11 2v3h3M6.5 9h5M6.5 12h5"/></svg>',
  };

  // ---------- 状態と保存 ----------

  let state = freshState();

  function freshState() {
    return { scene: STORY.start, inferences: [], tried: {}, lastChoice: null };
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* 保存できない環境では無視 */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && STORY.scenes[data.scene] ? data : null;
    } catch (e) {
      return null;
    }
  }

  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ }
  }

  // ---------- DOM ヘルパー ----------

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "style") node.style.cssText = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const child of [].concat(children || [])) {
      if (child == null || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(child));
    }
    return node;
  }

  function mount(screen) {
    app.replaceChildren(screen);
    window.scrollTo(0, 0);
  }

  function header(chapterId) {
    return el("header", { class: "header" }, [
      el("div", { class: "chapter-label" }, STORY.chapters[chapterId] || ""),
      el("button", { class: "icon-btn", "aria-label": "メニュー", html: ICONS.menu, onclick: openMenu }),
    ]);
  }

  function paragraph(p, i) {
    const item = typeof p === "string" ? { text: p } : p;
    return el("p", {
      class: "reveal" + (item.muted ? " muted" : ""),
      style: `animation-delay:${i * 0.35}s`,
    }, item.text);
  }

  // ---------- 画面 ----------

  function goto(id) {
    state.scene = id;
    const scene = STORY.scenes[id];
    if (scene.gain && !state.inferences.includes(scene.gain)) state.inferences.push(scene.gain);
    save();
    render();
  }

  function render() {
    const scene = STORY.scenes[state.scene];
    if (scene.type === "text") renderText(scene);
    else if (scene.type === "choice") renderChoice(scene);
    else if (scene.type === "end") renderEnd(scene);
  }

  function renderTitle() {
    const saved = load();
    const start = () => { state = freshState(); clearSave(); goto(STORY.start); };
    const resume = () => { state = saved; render(); };

    mount(el("section", { class: "screen title-screen" }, [
      el("div", {}, [
        el("div", { class: "kicker" }, "FINANCIAL MYSTERY"),
        el("h1", {}, STORY.title),
        el("p", { class: "lede" }, "数字は嘘をつかない。嘘をつくのは、数字を作る人間だ。資料を読み、違和感の正体を突き止めろ。"),
      ]),
      el("div", { class: "actions" }, [
        saved && el("button", { class: "primary", onclick: resume }, "つづきから"),
        el("button", { class: saved ? "secondary" : "primary", onclick: start }, "はじめから"),
      ]),
    ]));
  }

  function renderText(scene) {
    const prose = el("div", { class: "prose" }, scene.paragraphs.map(paragraph));
    const parts = [];
    if (scene.showChoice && state.lastChoice) parts.push(el("div", { class: "bubble" }, state.lastChoice));
    parts.push(prose);
    if (scene.gain) {
      parts.push(el("div", {
        class: "inference",
        style: `animation-delay:${scene.paragraphs.length * 0.35 + 0.2}s`,
      }, [
        el("div", { class: "label" }, "推論を得た"),
        el("div", { class: "text" }, STORY.inferences[scene.gain]),
      ]));
    }

    // 表示中にタップしたら、まず全文を出す。全部出ていたら次へ。
    const revealMs = (scene.paragraphs.length * 0.35 + (scene.gain ? 0.7 : 0.5)) * 1000;
    const shownAt = performance.now();
    let revealed = false;
    const tapArea = el("button", {
      class: "tap-area",
      "aria-label": "タップで続ける",
      onclick: () => {
        if (!revealed && performance.now() - shownAt < revealMs) {
          revealed = true;
          tapArea.querySelectorAll(".reveal, .inference").forEach((n) => {
            n.style.animationDelay = "0s";
            n.style.animationDuration = "0.01s";
          });
          return;
        }
        goto(scene.next);
      },
    }, parts);

    mount(el("section", { class: "screen" }, [
      header(scene.chapter),
      tapArea,
      el("div", { class: "hint blink", "aria-hidden": "true" }, "タップで続ける"),
    ]));
  }

  function renderChoice(scene) {
    const tried = state.tried[state.scene] || [];
    const doc = scene.docs && STORY.docs[scene.docs];

    const options = scene.options.map((opt, i) => {
      const used = tried.includes(i);
      return el("button", {
        class: "option",
        "aria-disabled": used ? "true" : null,
        onclick: () => {
          if (used) return;
          state.lastChoice = opt.label;
          // 正解以外（元の選択肢へ戻る分岐）は、選び済みとして消す
          if (STORY.scenes[opt.next].next === state.scene) {
            state.tried[state.scene] = tried.concat(i);
          }
          goto(opt.next);
        },
      }, opt.label);
    });

    mount(el("section", { class: "screen" }, [
      header(scene.chapter),
      el("div", { class: "prose choice-recap" }, [el("p", {}, scene.recap)]),
      el("div", { style: "flex:1" }),
      el("div", { class: "choices" }, [
        el("div", { class: "prompt" }, scene.prompt),
        doc && el("button", {
          class: "docs-btn",
          html: `${ICONS.doc}<span>資料を開く（${doc.tabs.length}件）</span>`,
          onclick: () => openDocs(doc),
        }),
        ...options,
      ]),
    ]));
  }

  function renderEnd(scene) {
    const total = Object.keys(STORY.inferences).length;
    mount(el("section", { class: "screen end-screen" }, [
      el("div", { class: "chapter-label" }, STORY.chapters[scene.chapter] || ""),
      el("h2", {}, scene.heading),
      el("div", { class: "notebook" }, [
        el("div", { class: "caption" }, `推理ノート ${state.inferences.length} / ${total}`),
        ...state.inferences.map((id) => el("div", { class: "note" }, STORY.inferences[id])),
      ]),
      el("p", { class: "body" }, scene.body),
      el("div", { class: "actions" }, [
        el("button", { class: "secondary", onclick: () => { state = freshState(); clearSave(); renderTitle(); } }, "タイトルへ戻る"),
      ]),
    ]));
  }

  // ---------- ボトムシート ----------

  let sheetReturnFocus = null;

  function openSheet(title, bodyNodes) {
    sheetReturnFocus = document.activeElement;
    const closeBtn = el("button", { class: "icon-btn", "aria-label": "閉じる", html: ICONS.close, onclick: closeSheet });
    const scrim = el("div", {
      class: "scrim",
      onclick: (e) => { if (e.target === scrim) closeSheet(); },
    }, [
      el("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title }, [
        el("div", { class: "grabber", "aria-hidden": "true" }),
        el("div", { class: "sheet-head" }, [el("h2", {}, title), closeBtn]),
        ...bodyNodes,
      ]),
    ]);
    sheetRoot.replaceChildren(scrim);
    app.setAttribute("inert", "");
    closeBtn.focus();
  }

  function closeSheet() {
    sheetRoot.replaceChildren();
    app.removeAttribute("inert");
    if (sheetReturnFocus && document.contains(sheetReturnFocus)) sheetReturnFocus.focus();
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sheetRoot.firstChild) closeSheet();
  });

  function openDocs(doc) {
    const body = el("div", { class: "sheet-body" });
    const tabButtons = doc.tabs.map((tab, i) => el("button", {
      class: "tab",
      role: "tab",
      "aria-selected": i === 0 ? "true" : "false",
      onclick: () => select(i),
    }, tab.label));

    function select(i) {
      tabButtons.forEach((b, j) => b.setAttribute("aria-selected", j === i ? "true" : "false"));
      body.replaceChildren(...renderDocTab(doc.tabs[i]));
      body.scrollTop = 0;
    }

    openSheet(doc.title, [
      el("div", { class: "tabs", role: "tablist" }, tabButtons),
      body,
      el("button", { class: "primary", onclick: closeSheet }, "選択肢に戻る"),
    ]);
    select(0);
  }

  function renderDocTab(tab) {
    const nodes = [];
    if (tab.caption) nodes.push(el("div", { class: "caption" }, tab.caption));

    if (tab.type === "table") {
      const cols = tab.columns.map((_, i) => (i === 0 ? "1.6fr" : "1fr")).join(" ");
      const row = (cells, head) => el("div", { class: "row" + (head ? " head" : ""), style: `--cols:${cols}` },
        cells.map((c, i) => el("span", { class: i === 0 ? "" : (isNumeric(c) || head ? "num" : "sub") }, c)));
      nodes.push(el("div", { class: "table" }, [row(tab.columns, true), ...tab.rows.map((r) => row(r, false))]));
    } else if (tab.type === "reviews") {
      nodes.push(el("div", { class: "reviews" }, tab.items.map((r) => el("div", { class: "review" }, [
        el("div", { class: "meta" }, [
          el("span", { class: "stars", "aria-label": `星${r.stars}` }, "★".repeat(r.stars) + "☆".repeat(5 - r.stars)),
          el("span", {}, r.date),
        ]),
        el("div", { class: "text" }, r.text),
      ]))));
    } else if (tab.type === "list") {
      nodes.push(el("div", { class: "records" }, tab.items.map((r) => el("div", { class: "record" }, [
        el("div", { class: "head" }, r.head),
        ...r.lines.map((l) => el("div", { class: "line" }, l)),
      ]))));
    }
    return nodes;
  }

  function isNumeric(s) {
    return /^[−\-]?[\d.,]+%?$/.test(String(s));
  }

  function openMenu() {
    const total = Object.keys(STORY.inferences).length;
    const notes = Object.keys(STORY.inferences).map((id) => state.inferences.includes(id)
      ? el("div", { class: "note" }, STORY.inferences[id])
      : el("div", { class: "note locked" }, "？？？"));

    openSheet("推理ノート", [
      el("div", { class: "sheet-body" }, [
        el("div", { class: "caption" }, `${state.inferences.length} / ${total} 件`),
        el("div", { class: "notebook" }, notes),
      ]),
      el("div", { class: "menu-actions" }, [
        el("button", { class: "secondary", onclick: () => { closeSheet(); renderTitle(); } }, "タイトルへ"),
        el("button", { class: "primary", onclick: closeSheet }, "閉じる"),
      ]),
    ]);
  }

  // ---------- 起動 ----------

  renderTitle();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => { /* オフライン対応は任意 */ });
  }
})();

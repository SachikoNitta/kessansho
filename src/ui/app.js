// 画面の行き来をまとめる。依存はすべてコンストラクタで受け取り、具体的な実装は知らない。
//   repository   : CaseRepository（ケースの一覧と中身）
//   progress     : セーブと記録（ProgressStore と同じ形）
//   preferences  : 表示の好み
//   createSession: (definition, snapshot) => CaseSession と同じ形のもの
//   sceneViews   : シーンの種類 → 画面
//   docRenderers : 資料の種類 → 表示

import { coverScreen } from "./screens/cover.js";
import { casesScreen } from "./screens/cases.js";
import { documentsSheet, notebookSheet, recordsSheet, settingsSheet } from "./sheets.js";

export class App {
  #deps;
  #root;
  #sheet;
  #session = null;
  #summary = null;

  constructor({ root, sheet, title, version, repository, progress, preferences, createSession, sceneViews, docRenderers }) {
    this.#root = root;
    this.#sheet = sheet;
    this.#deps = { title, version, repository, progress, preferences, createSession, sceneViews, docRenderers };
  }

  start() {
    this.#applyPreferences();
    this.showCover();
  }

  // ---------- 画面 ----------

  showCover() {
    this.#session = null;
    this.#mount(coverScreen({
      title: this.#deps.title,
      version: this.#deps.version,
      onOpen: () => this.showCases(),
      onSettings: () => this.#openSettings(),
      onRecords: () => this.#openRecords(),
    }));
  }

  async showCases() {
    this.#session = null;
    const { repository, progress } = this.#deps;
    const cases = (await repository.listCases()).map((c) => ({ ...c, inProgress: progress.hasProgress(c.id) }));
    this.#mount(casesScreen({
      title: this.#deps.title,
      cases,
      onBack: () => this.showCover(),
      onSelect: (id) => this.#openCase(cases.find((c) => c.id === id)),
    }));
  }

  async #openCase(summary) {
    const { repository, progress, createSession } = this.#deps;
    const def = await repository.loadCase(summary.id);
    this.#summary = summary;
    this.#session = createSession(def, progress.loadSnapshot(def.id));
    this.#renderScene();
  }

  #renderScene() {
    const session = this.#session;
    const view = this.#deps.sceneViews[session.scene.type];
    if (!view) throw new Error(`シーンの種類 "${session.scene.type}" の画面がありません`);
    this.#mount(view({ session, actions: this.#actions() }));
  }

  #actions() {
    return {
      caseLabel: `Case ${this.#summary.no.replace(/^No\./, "")}`,
      next: () => this.#commit(this.#session.advance()),
      choose: (index) => this.#commit(this.#session.choose(index)),
      // 本文と同じ画面に出した分岐で選ぶ：本文を読み終えてから、その分岐で選ぶ
      chooseAhead: (index) => this.#commit([...this.#session.advance(), ...this.#session.choose(index)]),
      openArchive: (focus) => this.#openArchive(focus),
      renderDoc: (id) => {
        const doc = this.#session.definition.docs[id];
        return { doc, nodes: this.#renderDoc()(doc) };
      },
      openMenu: () => this.#openNotebook(),
      exitCase: () => {
        this.#deps.progress.clearSnapshot(this.#session.definition.id);
        this.showCases();
      },
    };
  }

  /** 状態が変わったら、保存・記録してから描き直す */
  #commit(events) {
    const { progress } = this.#deps;
    const id = this.#session.definition.id;
    progress.saveSnapshot(id, this.#session.snapshot());
    progress.record(id, events);
    this.#renderScene();
  }

  #mount(node) {
    this.#root.replaceChildren(node);
    window.scrollTo(0, 0);
  }

  // ---------- 紙 ----------

  #renderDoc() {
    const session = this.#session;
    const { docRenderers } = this.#deps;
    const ctx = { inference: (id) => (session.hasInference(id) ? session.definition.inferences[id] : null) };
    return (doc) => {
      const render = docRenderers[doc.type];
      if (!render) throw new Error(`資料の種類 "${doc.type}" の表示がありません`);
      return render(doc, ctx);
    };
  }

  /** これまでの資料の綴り。focus（いまの問いの資料）があれば、その一枚目を開いた状態で出す */
  #openArchive(focus = []) {
    const docs = this.#session.definition.docs;
    const seen = this.#session.seenDocs.map((id) => docs[id]);
    const marked = focus.map((id) => docs[id]).filter((d) => seen.includes(d));
    this.#sheet.open(documentsSheet({
      docs: seen,
      renderDoc: this.#renderDoc(),
      marked,
      focus: marked[0] || null,
      foot: marked.length ? "選択肢に戻る →" : "閉じる →",
    }));
  }

  #openNotebook() {
    this.#sheet.open(notebookSheet({
      session: this.#session,
      onRestart: (chapter) => {
        this.#sheet.close();
        this.#commit(this.#session.restartChapter(chapter));
      },
      onCases: () => { this.#sheet.close(); this.showCases(); },
      onCover: () => { this.#sheet.close(); this.showCover(); },
    }));
  }

  async #openRecords() {
    const { repository, progress } = this.#deps;
    const open = (await repository.listCases()).filter((c) => c.status === "open");
    const entries = await Promise.all(open.map(async (summary) => ({
      summary,
      def: await repository.loadCase(summary.id),
      records: progress.records(summary.id),
    })));
    this.#sheet.open(recordsSheet({ entries }));
  }

  #openSettings() {
    const { preferences, progress } = this.#deps;
    this.#sheet.open(settingsSheet({
      largeText: preferences.largeText,
      onToggleLargeText: () => {
        const on = preferences.toggleLargeText();
        this.#applyPreferences();
        return on;
      },
      onClearAll: () => progress.clearAll(),
    }));
  }

  #applyPreferences() {
    document.documentElement.classList.toggle("large-text", this.#deps.preferences.largeText);
  }
}

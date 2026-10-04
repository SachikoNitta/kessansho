// 1ケースを遊ぶ進行状態。画面も保存先も知らない純粋なロジック。
// 状態が変わる操作は SessionEvent の配列を返し、記録や保存は呼び出し側が行う。

const clone = (value) => JSON.parse(JSON.stringify(value));

export class CaseSession {
  #def;
  #conditions;
  #state;

  /**
   * @param {import("./contracts.js").CaseDefinition} definition
   * @param {{ conditions: { evaluate: Function }, snapshot?: object | null }} deps
   */
  constructor(definition, { conditions, snapshot = null }) {
    if (!conditions) throw new Error("conditions が必要です");
    this.#def = definition;
    this.#conditions = conditions;
    this.#state = snapshot && definition.scenes[snapshot.scene]
      ? { ...CaseSession.initialState(definition), ...clone(snapshot) }
      : CaseSession.initialState(definition);
    this.#rememberDocs(this.scene);
  }

  static initialState(def) {
    return {
      scene: def.start,
      confidence: def.startConfidence ?? 0,
      flags: [],
      inferences: [],
      docs: [],
      tried: {},
      lastChoice: null,
      lastJudge: null,
      bubble: false,
      ending: null,
    };
  }

  // ---------- 読み取り ----------

  get definition() { return this.#def; }
  get sceneId() { return this.#state.scene; }
  get scene() { return this.#def.scenes[this.#state.scene]; }
  get confidence() { return this.#state.confidence; }
  get inferences() { return [...this.#state.inferences]; }
  /** これまでの分岐で出てきた資料（出てきた順） */
  get seenDocs() { return [...this.#state.docs]; }
  get ending() { return this.#state.ending; }
  get lastChoice() { return this.#state.lastChoice; }
  /** 直前の選択の判定（"o" | "tri" | "x"）。正解のない分岐では null */
  get lastJudge() { return this.#state.lastJudge; }

  hasFlag(name) { return this.#state.flags.includes(name); }
  hasInference(id) { return this.#state.inferences.includes(id); }

  /** 条件つき段落を除いた、いま表示する段落 */
  paragraphs(scene = this.scene) {
    return scene.paragraphs
      .map((p) => (typeof p === "string" ? { text: p } : p))
      .filter((p) => !p.ifFlag || this.hasFlag(p.ifFlag));
  }

  /** 直前の選択を吹き出しで見せるか */
  showsChoiceBubble() {
    return !!this.#state.lastChoice && (!!this.scene.showChoice || this.#state.bubble);
  }

  /** いま選べる選択肢。必要な推論がないものは出さず、外して戻ってきたものは used */
  options() {
    const scene = this.#expect("choice");
    const tried = this.#state.tried[this.sceneId] || [];
    return scene.options
      .map((option, index) => ({ option, index, used: tried.includes(index) }))
      .filter(({ option }) => !option.requires || this.hasInference(option.requires));
  }

  // ---------- 操作 ----------

  /** 本文を読み終えて次へ */
  advance() {
    const scene = this.#expect("text");
    this.#state.bubble = false;
    return this.#enter(scene.next);
  }

  /** 分岐で index 番目の選択肢を選ぶ */
  choose(index) {
    const scene = this.#expect("choice");
    const entry = this.options().find((o) => o.index === index);
    if (!entry || entry.used) return [];
    const { option } = entry;
    const s = this.#state;
    s.lastChoice = option.label;
    s.lastJudge = scene.graded === false ? null : option.judge;
    s.bubble = !!option.bubble;
    s.confidence += option.delta || 0;
    for (const f of option.flags || []) if (!s.flags.includes(f)) s.flags.push(f);
    if (scene.retry && option.judge !== "o") s.tried[this.sceneId] = [...(s.tried[this.sceneId] || []), index];
    return this.#enter(option.next);
  }

  /** 保存用の素のデータ */
  snapshot() {
    return clone(this.#state);
  }

  // ---------- 内部 ----------

  #expect(type) {
    const scene = this.scene;
    if (scene.type !== type) throw new Error(`いまのシーン ${this.sceneId} は ${type} ではありません`);
    return scene;
  }

  #enter(id) {
    const events = [];
    let scene = this.#def.scenes[id];
    for (let guard = 0; scene && scene.type === "route"; guard++) {
      if (guard > 20) throw new Error("route が循環しています");
      id = this.#route(scene);
      scene = this.#def.scenes[id];
    }
    if (!scene) throw new Error(`シーン ${id} がありません`);

    const s = this.#state;
    if (scene.gain && !s.inferences.includes(scene.gain)) {
      s.inferences.push(scene.gain);
      events.push({ type: "inference", id: scene.gain });
    }
    if (this.#def.endings && this.#def.endings[id]) {
      s.ending = id;
      events.push({ type: "ending", id });
    }
    s.scene = id;
    this.#rememberDocs(scene);
    return events;
  }

  #rememberDocs(scene) {
    if (scene.type !== "choice") return;
    for (const d of scene.docs || []) if (!this.#state.docs.includes(d)) this.#state.docs.push(d);
  }

  #route(scene) {
    const view = { flags: this.#state.flags, inferences: this.#state.inferences, confidence: this.#state.confidence };
    const rule = scene.rules.find((r) => this.#conditions.evaluate(r.if, view));
    if (!rule) throw new Error("どの rule にも当てはまりません");
    return rule.go;
  }
}

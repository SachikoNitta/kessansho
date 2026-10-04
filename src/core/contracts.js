// コアが依存する「抽象」の定義（JSDoc の型だけで、実装は持たない）。
// コアはこのファイルに書かれた形にだけ依存し、保存先・ケースの入手方法・画面の作り方は知らない。

/**
 * 1ケース分のシナリオ。ケースのファイルが作り、コアが読む。JSON にそのまま書き出せる純粋なデータ。
 * @typedef {Object} CaseDefinition
 * @property {string} id
 * @property {string} start                 最初のシーン id
 * @property {number} startConfidence       確度の初期値
 * @property {Object<string, {label: string, title: string}>} chapters
 * @property {Object<string, string>} inferences   推論 id → 一行の結論
 * @property {Object<string, string>} endings      結末シーン id → 結末名
 * @property {Object<string, DocDefinition>} docs
 * @property {Object<string, Scene>} scenes
 * @property {string} [endNote]             ケースを終えたときの一言
 */

/**
 * @typedef {{ type: string, label: string, source?: string, caption?: string }} DocDefinition
 *   type ごとの中身は資料レンダラーが解釈する（コアは中身を見ない）。
 */

/**
 * @typedef {TextScene | ChoiceScene | RouteScene | EndScene} Scene
 * @typedef {{ type: "text", chapter: string, paragraphs: Array<string|Paragraph>, next: string, gain?: string|null, showChoice?: boolean }} TextScene
 * @typedef {{ text?: string, muted?: boolean, emphasis?: boolean, ifFlag?: string, doc?: string, chart?: { name: string, label?: string, note?: string, points: number[] } }} Paragraph
 *   doc … 本文に資料を差し込む（資料 id）。差し込んだ資料は「これまでの資料」にも入る
 *   graph … 本文にグラフを差し込む（src/ui/charts.js の spec）
 * @typedef {{ type: "choice", chapter: string, recap: string, prompt: string, docs: string[], retry: boolean, options: Option[] }} ChoiceScene
 * @typedef {{ label: string, judge: "o"|"tri"|"x", delta: number, flags: string[], requires: string|null, next: string, bubble?: boolean }} Option
 * @typedef {{ type: "route", chapter: string, rules: Array<{ if?: Object, go: string }> }} RouteScene
 * @typedef {{ type: "end", chapter: string }} EndScene
 */

/**
 * セッションが外へ知らせる出来事。記録の保存などは受け取った側が行う。
 * @typedef {{ type: "inference" | "ending", id: string }} SessionEvent
 */

/**
 * 文字列キーで JSON を読み書きできる保存先（ポート）。
 * @typedef {Object} KeyValueStore
 * @property {(key: string) => any} get
 * @property {(key: string, value: any) => void} set
 * @property {(key: string) => void} remove
 * @property {(prefix: string) => string[]} keys
 */

/**
 * ケース一覧に出す情報。
 * @typedef {{ id: string, no: string, name: string, blurb: string, status: "open" | "locked" }} CaseSummary
 */

/**
 * ケースを入手する方法（ポート）。同梱モジュールでも、テスト用のメモリでもよい。
 * @typedef {Object} CaseRepository
 * @property {() => Promise<CaseSummary[]>} listCases
 * @property {(id: string) => Promise<CaseDefinition>} loadCase
 */

export {};

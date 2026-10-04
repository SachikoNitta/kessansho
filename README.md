# 決算書は嘘をつく

決算書を読み解いて粉飾を暴く、スマートフォン向けのミステリーノベルゲームです。

物語を読み、分岐では「資料」（決算表・登記・適時開示・業界ニュースなど）を開いて選択肢を選びます。正解すると「推論」を得て、後の分岐で武器になります。選択によって「確度」とフラグが変わり、終章で結末が分かれます。デザインはワイヤーフレームの「曲線タイポ・アナログ版」に準拠しています。

収録ケース：No.01 Nulo（プロローグ＋全5章＋幕間3つ＋終章＋エピローグ、結末4つ）

## 遊び方・開発

```sh
npm start          # http://localhost:8080 を開く（python3 の簡易サーバー）
npm test           # 単体テスト・ケースの検証・依存の向き・オフライン用キャッシュの漏れ
npm run validate   # ケースごとの概要（シーン数、全問正解の確度と結末）を表示
npm run build      # dist/ に Web 版を出力
```

ビルドは不要です（ES Modules）。ホーム画面に追加すればオフラインでも遊べます（PWA）。

## リリース（Web 版）

GitHub Actions でビルドし、**GitHub Pages に公開**して、**Release に zip を添付**します。

- Web 版：https://sachikonitta.github.io/kessansho/ （スマホのブラウザで開き、「ホーム画面に追加」でアプリのように起動）
- 表紙の下に `ver 0.3.0` のように版が出るので、スマホで最新版かどうか確かめられる

出し方：

1. 初回だけ、リポジトリの **Settings → Pages → Source** を **GitHub Actions** にする
2. **Actions → Release → Run workflow** で版（例：`0.3.0`）を入れて実行（スマホのブラウザからも可）
3. テスト → ビルド → Pages に公開 → Release（`v0.3.0`、zip 添付、Web 版の URL 入り）の順に進む

ビルドだけ手元で試すとき：`node scripts/build.js 0.3.0` → `dist/` に出力。プッシュのたびに CI がテストとビルドを確かめます。

## 非公開のプレビュー（Claude の Artifact）

公開せずにスマホで確かめるときは、アプリ全体を 1 枚の HTML にまとめて Claude の非公開ページに載せます。

```sh
npm install                                   # 初回だけ（esbuild）
node scripts/build-artifact.js 0.3.0          # dist-artifact/index.html に出力
```

- 表紙の版は `ver 0.3.0-preview` と出る
- Artifact では Service Worker を使わない（オフライン対応は GitHub Pages 版のみ）
- セーブは、そのページを開いた端末のブラウザごとに保存される

## ケースの配布方針

**ケースはアプリに同梱し、アプリのアップデートで追加・更新します。** 外部サーバーからの配信は行いません。

- ケースの追加・修正は、アプリの新しい版として出す
- リリースのビルドが `sw.js` の `CACHE` に版を書き込むので、新しい版を開くと端末のキャッシュが入れ替わる
- セーブと結末の記録はケースごとに端末に保存されるので、ケースを足しても既存のセーブは消えない

## 構成

依存は常に「具体 → 抽象」の向きで、`src/core`（進行のルール）はどこにも依存しません。具体的な実装を選んで組み立てるのは `src/main.js` だけです。この向きは `tests/architecture.test.js` が守ります。

```
src/
  core/                 進行のルール（画面・保存先・ケースの中身を知らない）
    contracts.js          抽象の定義：CaseDefinition, KeyValueStore, CaseRepository …
    session.js            CaseSession：1ケースの進行。操作は出来事（推論・結末）を返すだけ
    conditions.js         結末判定の条件式（種類は登録制）
    progress.js           ケースごとのセーブと結末の記録（KeyValueStore を注入）
    preferences.js        表示の好み（KeyValueStore を注入）
    validate.js           ケースの整合性チェック
  authoring/
    case-builder.js       ケースを書くための道具（出力は JSON にできる純粋なデータ）
  adapters/             抽象の実装
    local-storage-store.js   KeyValueStore ← localStorage
    memory-store.js          KeyValueStore ← メモリ（テスト用）
    bundled-case-repository.js  CaseRepository ← 同梱ケース
  ui/                   画面（core の契約だけを知り、注入された依存で動く）
    app.js                画面の行き来
    screens/              表紙・調査一覧・シーンの種類ごとの画面（登録制）
    doc-renderers.js      資料の種類ごとの表示（登録制）
    sheet.js, sheets.js   机の上の紙（資料・目次・設定・記録）
  main.js               組み立て
cases/
  catalog.js            同梱ケースの一覧
  nulo/case.js          ケース1
  _template/case.js     新しいケースの雛形
```

| 依存してよい先 | |
| --- | --- |
| `src/core` | `src/core` だけ |
| `src/authoring` | なし |
| `src/adapters` | `src/core/contracts.js` だけ |
| `src/ui` | `src/ui` と `src/core/contracts.js` だけ |
| `cases` | `src/authoring` と `cases` だけ |
| `src/main.js` | すべて |

### 拡張のしかた（既存のコードは変えずに足す）

- **資料の新しい種類**（例：株価チャート）… `createDocRenderers({ chart })` に表示を足す
- **シーンの新しい種類** … `createSceneViews({ ... })` に画面を足す
- **結末判定の新しい条件** … `createConditionEvaluator({ ... })` に条件を足す
- **保存先の差し替え**（例：ネイティブアプリの保存領域）… `KeyValueStore` を実装して `main.js` で渡す

## ケースを追加する

1. `cases/_template/case.js` を `cases/<ケースid>/case.js` にコピーして書く
2. `cases/catalog.js` に1行足す（公開前は `status: "locked"` で「調査中」として出せる）
3. `sw.js` の `ASSETS` にファイルを足す（ここが配布ファイルの一覧も兼ねる）
4. `npm test` を通す

書き方（`src/authoring/case-builder.js`）：

- `pages(id, chapter, [[段落…], [段落…]], next)` … 本文。1つの配列が1画面。段落は文字列か `{ text, muted, emphasis, ifFlag }`
- `choice(id, chapter, { recap, prompt, docs, retry, graded, next, options })` … 分岐。`docs` には選択肢に出てくる資料をすべて入れる（出てきた資料は画面上部の「資料」からいつでも見返せる）。`graded: false` は正解のない分岐で、○△× の印を出さない。選択肢は `judge`（`o`/`tri`/`x`）、`text`（選んだ後の本文）、`gain`（推論）、`delta`（確度）、`flags`、`requires`（必要な推論）を持てる。`retry` の分岐で外すと理由を読んで分岐に戻り、その選択肢は消し線になる
- `route(id, chapter, [{ if, go }])` … 結末の判定。上から評価し、最後は無条件
- `end(id, chapter)` … ケースの終わり
- 資料は `docs` に `table` / `article` / `inferences` の形で書く

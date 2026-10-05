# 国会議員図鑑

国会議員が**何を約束し、何をしてきたか**を、出典つきで、ゲームのキャラ紹介のように読めるサイトの試作です。

- 一覧はキャラカード（ちびキャラ・院・当選回数の星・政党・公約の状況バー・本人の一言）
- タップするとステータス画面：プロフィール、得意分野（スキル）、**公約クエスト**（実現／進行中／動きなし／停滞・撤回／判定できず）、**活動ログ**（法案・質疑・質問主意書・役職）
- すべての公約・実績に、原文の引用とリンクを添える

いま入っているのは**デザイン確認用の架空のサンプル**です（実在の人物・政党とは関係ありません）。

## 動かす

```sh
cd giin-zukan
npm start               # http://localhost:8081
npm test                # 照合ロジックとデータの検証
npm run validate        # data/members.json の形と出典を確かめる
npm run build:preview   # dist-preview/index.html（1枚にまとめたプレビュー）
```

ビルドは不要（素の HTML / CSS / JS）。データは `data/members.json` だけです。

## 公開情報から AI でつくる

```sh
npm install
cp sources/_example.json sources/<議員id>.json   # 氏名・選挙区・公約ページの URL を書く
ANTHROPIC_API_KEY=... npm run generate -- sources/<議員id>.json
```

`scripts/generate.js` がすること：

1. **国会会議録検索システム API**（国立国会図書館）から本人の発言を集める
2. 設定に書いた**選挙公報・公式サイトの政策ページ**を取り込む
3. Claude に、構造化出力で「資料にあることだけ」から公約と実績を抜き出させる。出典は資料 ID と**原文そのままの引用**で返させる
4. **引用が本当に原文にあるかを機械で照合**し、見つからない出典は捨てる。出典が残らない公約・実績は丸ごと捨てる。判定の根拠が確かめられない公約は「判定できず」に落とす
5. `data/members.json` に `review.reviewed: false`（画面では「AI下書き・未確認」）で書き込む

人が出典を確かめたら `review.reviewed` を `true` にします。`npm run validate` は「実現・進行中・停滞」と判定した公約に根拠の出典がないと落ちます。

## 方針（公開前に必ず）

- **中立**：評価語を使わない。星は当選回数で、議員の優劣ではない。並び順はふりがな順
- **出典が先**：出典のない記述は載せない。AI の判定は必ず「AI判定」と根拠を並べる
- **人の確認**：実在の議員を公開する前に、出典を人の目で確かめる。誤りの訂正窓口を用意する
- **写真を使わない**：肖像の権利を避けるため、データの色・髪型から描くちびキャラにしている
- **選挙期間中の扱い**：公職選挙法上の扱い（更新の止め方など）は、公開前に専門家に確認する

## 構成

```
giin-zukan/
  index.html, style.css, app.js   画面
  data/members.json               図鑑データ（scripts/make-sample.js が架空サンプルを書き出す）
  sources/_example.json           生成の設定の雛形
  scripts/lib.js                  スキーマ・引用の照合・データ検証（純粋な関数）
  scripts/generate.js             公開情報 → Claude → 照合 → data/members.json
  scripts/validate.js             データの検証
  scripts/build-preview.js        1枚の HTML にまとめる
  tests/                          node --test
```

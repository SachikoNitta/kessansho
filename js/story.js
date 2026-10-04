// 物語データ。シーンは id で参照し合う。
//   type "text"   : paragraphs を表示し、タップで next へ。showChoice で直前の選択を吹き出し表示、gain で推論を獲得。
//   type "choice" : recap（直前の一文）、prompt、docs（資料 id）、options[{ label, next }]。
//   type "end"    : 章の終わり。
(function (root) {
  const STORY = {
    title: "決算書は嘘をつく",
    start: "c1_s1",

    chapters: {
      c1: "第1章　違和感",
    },

    inferences: {
      ad_revenue: "売上の原資は、自社の広告費ではないか",
      round_trip: "広告代理店と最大の販売先は、同じ会社だ",
    },

    docs: {
      financials: {
        title: "資料",
        tabs: [
          {
            label: "決算の推移",
            type: "table",
            caption: "有価証券報告書より・単位 億円",
            columns: ["項目", "2期前", "前期", "今期"],
            rows: [
              ["売上高", "12", "31", "68"],
              ["広告宣伝費", "3", "21", "57"],
              ["営業損益", "−4", "−8", "−12"],
              ["売掛金", "2.0", "2.6", "3.1"],
            ],
          },
          {
            label: "アプリのレビュー",
            type: "reviews",
            caption: "Nulo Assist・ストアのレビュー（新しい順）",
            items: [
              { stars: 5, date: "3日前", text: "広告から来ました！法人プランが一年無料でした。" },
              { stars: 5, date: "3日前", text: "キャンペーンで登録。まだ使っていませんが期待しています。" },
              { stars: 2, date: "1週間前", text: "請求書の宛先がうちの会社じゃなかった。問い合わせても返事なし。" },
              { stars: 5, date: "1週間前", text: "広告で見て登録しました。無料なのでとりあえず。" },
              { stars: 1, date: "2週間前", text: "アカウントが百個以上発行されているのに、社内で使っているのは三人だけ。" },
            ],
          },
        ],
      },

      notes: {
        title: "資料",
        tabs: [
          {
            label: "関連当事者",
            type: "table",
            caption: "関連当事者との取引・単位 億円",
            columns: ["相手先", "関係", "内容", "金額"],
            rows: [
              ["ブライトリンク(株)", "役員の近親者が支配", "広告の委託", "41.2"],
              ["エヌ・キャピタル(同)", "代表が出資", "事務所賃借", "0.4"],
            ],
          },
          {
            label: "主要販売先",
            type: "table",
            caption: "売上高の10%以上を占める販売先・単位 億円",
            columns: ["販売先", "売上高", "割合"],
            rows: [
              ["BLソリューションズ(株)", "38.5", "57%"],
              ["(株)東和システム", "7.1", "10%"],
            ],
          },
          {
            label: "登記情報",
            type: "list",
            caption: "法人登記の写し（抜粋）",
            items: [
              {
                head: "株式会社ブライトリンク",
                lines: ["設立　6年前", "本店　東京都港区芝浦三丁目 ハーバービル 14階", "代表取締役　久我 真澄"],
              },
              {
                head: "BLソリューションズ株式会社",
                lines: ["設立　2年前", "本店　東京都港区芝浦三丁目 ハーバービル 14階", "代表取締役　久我 真澄"],
              },
              {
                head: "合同会社エヌ・キャピタル",
                lines: ["設立　9年前", "本店　東京都渋谷区神宮前五丁目", "代表社員　沢渡 恭一"],
              },
            ],
          },
        ],
      },
    },

    scenes: {
      c1_s1: {
        type: "text",
        chapter: "c1",
        paragraphs: [
          "午前二時。モニターには、Nuloの有価証券報告書が開いたままだ。",
          "上場から一年。株価は公開価格の四倍。どの記事も、日本発のAIの星だと書く。",
          "だが、数字が綺麗すぎる。",
          "売上は三期で十二億から六十八億。成長企業なら、珍しい話ではない。",
          { text: "問題は、何と一緒に増えているかだ。", muted: true },
        ],
        next: "c1_q1",
      },

      c1_q1: {
        type: "choice",
        chapter: "c1",
        recap: "問題は、何と一緒に増えているかだ。",
        prompt: "この会社の数字で、いちばんおかしいのはどこか。",
        docs: "financials",
        options: [
          { label: "売上の割に、売掛金が多すぎる", next: "c1_q1_receivables" },
          { label: "売上と広告費が、同じだけ増えている", next: "c1_r1" },
          { label: "成長しているのに、赤字が続いている", next: "c1_q1_loss" },
        ],
      },

      c1_q1_receivables: {
        type: "text",
        chapter: "c1",
        showChoice: true,
        paragraphs: [
          "売掛金は三期で二億から三億一千万。売上が五倍以上になったのに、ほとんど増えていない。",
          "架空の売上なら、回収できない売掛金が膨らむはずだ。",
          "ここは、むしろ健全に見える。",
          { text: "別の数字を見よう。", muted: true },
        ],
        next: "c1_q1",
      },

      c1_q1_loss: {
        type: "text",
        chapter: "c1",
        showChoice: true,
        paragraphs: [
          "赤字そのものは、成長企業ではよくある話だ。先行投資で赤字を掘る会社はいくらでもある。",
          "おかしいのは、赤字の大きさではない。",
          { text: "何に金を使っているか、だ。", muted: true },
        ],
        next: "c1_q1",
      },

      c1_r1: {
        type: "text",
        chapter: "c1",
        showChoice: true,
        paragraphs: [
          "売上が十九億増えた年、広告費は十八億増えている。翌年は三十七億と三十六億。",
          "偶然にしては、揃いすぎている。",
          "売れたから広告を打ったのではない。広告を打った分だけ、売れている。",
        ],
        gain: "ad_revenue",
        next: "c1_s3",
      },

      c1_s3: {
        type: "text",
        chapter: "c1",
        paragraphs: [
          "自分の広告費で、自分の売上を買う。そんなことが可能なのか。",
          "広告費は、どこかの代理店に支払われる。その代理店が、Nuloのサービスを買えばいい。",
          "金は一周して、売上として戻ってくる。",
          "循環取引。教科書でしか見たことのない言葉だ。",
        ],
        next: "c1_s4",
      },

      c1_s4: {
        type: "text",
        chapter: "c1",
        paragraphs: [
          "だが、推論は証拠ではない。",
          "金の行き先を辿るには、広告を誰に出しているかを知る必要がある。",
          { text: "有報の注記を、もう一度頭から読む。", muted: true },
        ],
        next: "c1_q2",
      },

      c1_q2: {
        type: "choice",
        chapter: "c1",
        recap: "有報の注記を、もう一度頭から読む。",
        prompt: "広告費の流れ先として、もっとも疑わしいのはどこか。",
        docs: "notes",
        options: [
          { label: "代表が出資するエヌ・キャピタルに、金が流れている", next: "c1_q2_ncap" },
          { label: "広告代理店と最大の販売先は、同じ会社だ", next: "c1_r2" },
          { label: "アプリのレビューは、サクラが書いている", next: "c1_q2_reviews" },
        ],
      },

      c1_q2_ncap: {
        type: "text",
        chapter: "c1",
        showChoice: true,
        paragraphs: [
          "エヌ・キャピタルへの支払いは、事務所の家賃で四千万。",
          "役員の資産管理会社に家賃を払う。褒められた話ではないが、どこにでもある。",
          "六十八億の売上を説明するには、桁が二つ足りない。",
          { text: "もっと大きな金の流れがあるはずだ。", muted: true },
        ],
        next: "c1_q2",
      },

      c1_q2_reviews: {
        type: "text",
        chapter: "c1",
        showChoice: true,
        paragraphs: [
          "怪しいレビューなのは確かだ。だが、レビューをいくら偽装しても、売上は一円も立たない。",
          "あれは症状だ。原因ではない。",
          { text: "金の流れを追え。", muted: true },
        ],
        next: "c1_q2",
      },

      c1_r2: {
        type: "text",
        chapter: "c1",
        showChoice: true,
        paragraphs: [
          "ブライトリンクへの広告費、四十一億。BLソリューションズからの売上、三十八億五千万。",
          "登記簿の住所は、同じビルの同じフロア。代表者の名前も、同じだ。",
          "金は、一周している。",
        ],
        gain: "round_trip",
        next: "c1_s5",
      },

      c1_s5: {
        type: "text",
        chapter: "c1",
        paragraphs: [
          "時計を見る。午前三時を回っている。",
          "その時、机の上の電話が震えた。",
          "画面には、知らない番号。",
          { text: "「——Nuloの決算書を、調べていますね」", muted: true },
        ],
        next: "c1_end",
      },

      c1_end: {
        type: "end",
        chapter: "c1",
        heading: "第1章　完",
        body: "第2章は準備中です。",
      },
    },
  };

  if (typeof module !== "undefined" && module.exports) module.exports = STORY;
  else root.STORY = STORY;
})(typeof window !== "undefined" ? window : globalThis);

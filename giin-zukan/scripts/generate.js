// 公開情報から一人分の図鑑データを AI で下書きする。
//
//   node scripts/generate.js sources/<議員id>.json
//
// 1. 国会会議録検索システムの API から本人の発言を集める
// 2. 設定に書いた公約ページ（選挙公報・公式サイトなど）を取り込む
// 3. Claude に「資料にあることだけ」で公約と実績を抜き出させる（出典は原文の引用つき）
// 4. 引用が本当に資料にあるかを機械的に照合し、確かめられないものは捨てる
// 5. data/members.json に「未確認（AI下書き）」として書き込む
//
// 人の目で出典を確かめたら、その議員の review.reviewed を true にする。

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACTION_SCHEMA, htmlToText, speechesToDocs, upsertMember, validateData, verifyExtraction,
} from "./lib.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data", "members.json");
const KOKKAI_API = "https://kokkai.ndl.go.jp/api/speech";
const MODEL = "claude-opus-5-5";
const MAX_SPEECHES = 300;
const MAX_DOC_CHARS = 12000; // 一つの資料から渡す上限（長い発言は先頭だけ）

async function fetchSpeeches(speaker, from) {
  const docs = [];
  let start = 1;
  while (docs.length < MAX_SPEECHES) {
    const url = new URL(KOKKAI_API);
    url.search = new URLSearchParams({
      speaker, from, startRecord: String(start), maximumRecords: "100", recordPacking: "json",
    });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`国会会議録 API が ${res.status} を返しました: ${url}`);
    const body = await res.json();
    docs.push(...speechesToDocs(body, docs.length + 1));
    if (!body.nextRecordPosition) break;
    start = body.nextRecordPosition;
    await new Promise((r) => setTimeout(r, 1000)); // API への負荷を抑える
  }
  return docs.slice(0, MAX_SPEECHES);
}

async function fetchPages(pages) {
  const docs = [];
  for (const [i, page] of pages.entries()) {
    const res = await fetch(page.url);
    if (!res.ok) {
      console.warn(`取り込めませんでした（${res.status}）: ${page.url}`);
      continue;
    }
    docs.push({ id: `W${i + 1}`, kind: "web", title: page.title, url: page.url, date: page.date ?? "", text: htmlToText(await res.text()) });
  }
  return docs;
}

const SYSTEM = `あなたは国会議員の公約と活動を、有権者向けに中立に整理する編集者です。
渡された資料に書かれていることだけを使います。資料にないことは、一般に知られていても書きません。

- 公約: 本人が「〜します」「〜を実現する」など将来の行動を約束したもの。政党全体の公約は、本人が自分の言葉で掲げたものに限ります。
- 状況: 資料の中に根拠があるときだけ achieved / in_progress / stalled と判定し、evidence にその出典を入れます。根拠がなければ unverifiable にします。
- 実績: 議員立法の提出、質疑、質問主意書、委員会での役職など、日付と出典で確かめられる行動。
- 引用(quote)は資料の文字をそのまま写します。要約・言い換え・つなぎ合わせはしません。
- 評価語（「素晴らしい」「失敗」など）や、支持・不支持をにじませる書き方はしません。事実を淡々と短く書きます。`;

async function extract(member, docs) {
  const client = new Anthropic();
  const corpus = docs
    .map((d) => `<doc id="${d.id}" title="${d.title}" date="${d.date}">\n${d.text.slice(0, MAX_DOC_CHARS)}\n</doc>`)
    .join("\n\n");

  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "high", format: { type: "json_schema", schema: EXTRACTION_SCHEMA } },
    messages: [{
      role: "user",
      content: `${member.house}議員「${member.name}」（${member.district}）について、次の資料から公約と実績を抜き出してください。\n\n${corpus}`,
    }],
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error(`抜き出しを断られました: ${message.stop_details?.explanation ?? "理由不明"}`);
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("出力が上限で途切れました。資料を減らすか、期間（from）を短くしてください。");
  }
  const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return { extraction: JSON.parse(text), model: message.model };
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error("使い方: node scripts/generate.js sources/<議員id>.json");
    process.exit(1);
  }
  const member = JSON.parse(await readFile(configPath, "utf8"));

  console.log(`資料を集めています: ${member.name}`);
  const docs = [
    ...(await fetchPages(member.pages ?? [])),
    ...(await fetchSpeeches(member.kokkaiSpeaker ?? member.name, member.from ?? "2021-01-01")),
  ];
  if (docs.length === 0) throw new Error("資料が一つも集まりませんでした。");
  console.log(`資料 ${docs.length} 件を Claude に渡します`);

  const { extraction, model } = await extract(member, docs);
  const verified = verifyExtraction(extraction, docs);
  for (const d of verified.dropped) console.warn(`捨てました: ${d.where} — ${d.reason}`);

  const data = JSON.parse(await readFile(DATA, "utf8"));
  const next = upsertMember(data, {
    id: member.id,
    name: member.name,
    kana: member.kana,
    house: member.house,
    district: member.district,
    party: member.party,
    terms: member.terms,
    avatar: member.avatar,
    catchphrase: verified.catchphrase,
    fields: verified.fields,
    promises: verified.promises,
    achievements: verified.achievements,
    review: { reviewed: false, generatedAt: new Date().toISOString().slice(0, 10), model, sourceCount: docs.length },
  });

  const errors = validateData(next);
  if (errors.length) throw new Error(`データの形に問題があります:\n${errors.join("\n")}`);
  await writeFile(DATA, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`書き込みました: 公約 ${verified.promises.length} 件、実績 ${verified.achievements.length} 件（捨てた項目 ${verified.dropped.length} 件）`);
  console.log("出典を人の目で確かめたら、review.reviewed を true にしてください。");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

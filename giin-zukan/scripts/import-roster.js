// 実在の議員の基本属性を、公開情報から決まった手順で取り込む（AI は使わない）。
//
//   node scripts/import-roster.js              名簿・生年・経歴・性別
//   node scripts/import-roster.js --speeches   ＋ 国会での発言回数（会議録 API を1人1回、約12分）
//
// 出典
//   衆議院：衆議院ウェブサイトの「議員一覧」「会派名及び会派別所属議員数」と各議員の紹介ページ
//   参議院：スマートニュース メディア研究所「国会議案データベース：参議院」（参議院ウェブサイトを整理した公開データ、MIT）
//   性別　：Wikidata（公式の会派別の女性議員数と突き合わせて検算する）
//   発言数：国立国会図書館「国会会議録検索システム」API
//
// 取得したページは .cache/ に保存し、2回目からはそれを使う（--refresh で取り直す）。
// 公約・実績は持たない。ある議員の公約を作るときは generate.js を使う。

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serializeData, validateData } from "./lib.js";
import {
  NATIONAL, classifyCareer, normKana, normName, parseBirth, parseShugiinKaiha, parseShugiinList, parseShugiinProfile, regionOf,
} from "./roster-lib.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, ".cache");
const REFRESH = process.argv.includes("--refresh");
const WITH_SPEECHES = process.argv.includes("--speeches");

const SHU = "https://www.shugiin.go.jp/internet/itdb_annai.nsf/html/statics";
const SAN_DATA = "https://raw.githubusercontent.com/smartnews-smri/house-of-councillors/main/data";
const SPEECH_FROM = "2025-10-01";
const SPEECH_UNTIL = "2026-09-30";

// 両院で略称が違う同じ政党は、ひとつにまとめる
const MERGE = { 民主: "国民", みら: "みらい", 無: "無所属" };

let SHU_AS_OF = "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cached(url, { encoding = "utf-8", delay = 300 } = {}) {
  await mkdir(CACHE, { recursive: true });
  const file = join(CACHE, createHash("sha1").update(url).digest("hex"));
  if (!REFRESH && existsSync(file)) return readFile(file, "utf8");
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "giin-zukan/0.1 (research prototype)" } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const text = new TextDecoder(encoding).decode(await res.arrayBuffer());
      await writeFile(file, text);
      await sleep(delay);
      return text;
    } catch (e) {
      if (attempt >= 4) throw e;
      await sleep(2000 * 2 ** (attempt - 1));
    }
  }
}

const table = (json) => {
  const [head, ...rows] = JSON.parse(json);
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
};

async function loadShugiin() {
  const rows = [];
  for (let i = 1; i <= 10; i++) {
    const url = `${SHU}/syu/${i}giin.htm`;
    rows.push(...parseShugiinList(await cached(url, { encoding: "shift_jis" }), url));
  }
  const kaihaHtml = await cached(`${SHU}/shiryo/kaiha_m.htm`, { encoding: "shift_jis" });
  const kaiha = parseShugiinKaiha(kaihaHtml);
  const r = kaihaHtml.normalize("NFKC").match(/令和(\d+)年(\d+)月(\d+)日現在/);
  SHU_AS_OF = r ? `${2018 + Number(r[1])}-${r[2].padStart(2, "0")}-${r[3].padStart(2, "0")}` : "";
  console.log(`衆議院：名簿 ${rows.length} 人。紹介ページを読みます…`);
  for (const [i, r] of rows.entries()) {
    Object.assign(r, parseShugiinProfile(await cached(r.profileUrl, { encoding: "shift_jis" })));
    if ((i + 1) % 100 === 0) console.log(`  ${i + 1} / ${rows.length}`);
  }
  return {
    members: rows.map((r) => ({
      id: `shu-${r.profileUrl.match(/(\d+)\.html$/)[1]}`,
      name: r.name,
      kana: r.kana,
      house: "衆議院",
      district: r.district,
      kaiha: r.kaiha,
      terms: r.terms,
      termsOther: r.termsOther,
      birth: r.birth,
      bio: r.bio,
      profileUrl: r.profileUrl,
    })),
    kaiha: kaiha.map((k) => ({ ...k, house: "衆議院" })),
    asOf: SHU_AS_OF,
  };
}

async function loadSangiin() {
  const giin = table(await cached(`${SAN_DATA}/giin.json`));
  const kaiha = table(await cached(`${SAN_DATA}/kaiha.json`));
  return {
    members: giin.map((g) => ({
      id: `san-${g["議員個人の紹介ページ"].match(/(\d+)\.htm$/)[1]}`,
      name: g["議員氏名"].replace(/\s+/g, " "),
      kana: g["読み方"].replace(/\s+/g, " "),
      house: "参議院",
      district: g["選挙区"],
      kaiha: g["会派"],
      terms: Number(g["当選回数"]),
      termsOther: Number(g["経歴"].normalize("NFKC").match(/衆議院議員(\d+)期/)?.[1] ?? 0),
      birth: parseBirth(g["経歴"]),
      bio: g["経歴"],
      profileUrl: g["議員個人の紹介ページ"],
    })),
    kaiha: kaiha.map((k) => ({ name: k["会派名"], abbr: k["略称"], seats: k["議員数"], women: k["議員数／女性"], house: "参議院" })),
    asOf: kaiha[0]?.["議員数の時点"] ?? "",
  };
}

// Wikidata：衆参の議員だった人の名前・性別・生年月日
async function loadWikidata() {
  const query = `SELECT ?p ?name ?kana ?gender ?birth WHERE {
    VALUES ?pos { wd:Q17506823 wd:Q14552828 }
    ?p wdt:P39 ?pos ; rdfs:label ?name . FILTER(LANG(?name) = "ja")
    OPTIONAL { ?p wdt:P1814 ?kana }
    OPTIONAL { ?p wdt:P21 ?g . BIND(IF(?g = wd:Q6581072, "女性", IF(?g = wd:Q6581097, "男性", "その他・非公表")) AS ?gender) }
    OPTIONAL { ?p wdt:P569 ?birth }
  }`;
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
  const json = JSON.parse(await cached(url, { delay: 0 }));
  const byName = new Map();
  const byKana = new Map();
  const add = (map, key, b) => {
    if (!key) return;
    const list = map.get(key) ?? [];
    if (!list.some((x) => x.qid === b.p.value)) {
      list.push({ qid: b.p.value, gender: b.gender?.value, birth: b.birth?.value.slice(0, 10), birthYear: b.birth ? Number(b.birth.value.slice(0, 4)) : null });
    }
    map.set(key, list);
  };
  for (const b of json.results.bindings) {
    add(byName, normName(b.name.value), b);
    add(byKana, b.kana && normKana(b.kana.value), b);
  }
  return { byName, byKana };
}

async function speechCount(name) {
  const url = new URL("https://kokkai.ndl.go.jp/api/speech");
  url.search = new URLSearchParams({ speaker: normName(name), from: SPEECH_FROM, until: SPEECH_UNTIL, maximumRecords: "1", recordPacking: "json" });
  const json = JSON.parse(await cached(url.href, { delay: 1000 }));
  return Number(json.numberOfRecords ?? 0);
}

async function main() {
  const shu = await loadShugiin();
  const san = await loadSangiin();
  const wiki = await loadWikidata();
  const kaiha = [...shu.kaiha, ...san.kaiha];
  const members = [...shu.members, ...san.members];

  // 性別：名前が一致し、生年が食い違わない人が一人だけのときに採る
  // 名前で見つからなければ、ふりがなで探す（ひらがなの通称や旧字体の名前のため）
  let matched = 0;
  for (const m of members) {
    const year = m.birth ? Number(m.birth.slice(0, 4)) : null;
    const fits = (list) => (list ?? []).filter((c) => !year || !c.birthYear || Math.abs(c.birthYear - year) <= 1);
    let candidates = fits(wiki.byName.get(normName(m.name)));
    if (!candidates.length) candidates = fits(wiki.byKana.get(normKana(m.kana)));
    const genders = [...new Set(candidates.map((c) => c.gender).filter(Boolean))];
    if (candidates.length >= 1 && genders.length === 1) {
      m.gender = genders[0];
      m.genderSource = "Wikidata";
      if (candidates.length === 1) m.wikidata = candidates[0].qid;
      matched++;
    } else {
      m.gender = "照合できず";
    }
    // 公式の経歴から生年を読めなかったときだけ、照合できた Wikidata の生年月日を使う
    if (!m.birth && candidates.length === 1 && candidates[0].birth) {
      m.birth = candidates[0].birth;
      m.birthSource = "Wikidata";
    }
  }
  console.log(`性別：${members.length} 人中 ${matched} 人を Wikidata で照合`);

  // 検算：会派ごとの女性の数を、公式の数と比べる
  console.log("会派ごとの女性議員（公式 / 照合結果 / 照合できず）");
  let mismatch = 0;
  for (const k of kaiha) {
    const ms = members.filter((m) => m.house === k.house && (MERGE[m.kaiha] ?? m.kaiha) === (MERGE[k.abbr] ?? k.abbr));
    const women = ms.filter((m) => m.gender === "女性").length;
    const unknown = ms.filter((m) => m.gender === "照合できず").length;
    // 照合できた女性の数が公式と一致する会派では、照合できなかった人は女性ではないと決まる
    if (women === k.women && unknown > 0) {
      for (const m of ms) if (m.gender === "照合できず") { m.gender = "男性"; m.genderSource = "会派別の女性議員数（公式）から"; }
    }
    const ok = women === k.women;
    if (!ok) mismatch++;
    console.log(`  ${k.house} ${k.abbr.padEnd(4, "　")} ${k.women} / ${women} / ${unknown}${ok ? "" : "  ← 差あり"}`);
  }

  if (WITH_SPEECHES) {
    console.log(`発言回数：${SPEECH_FROM}〜${SPEECH_UNTIL} を会議録 API で数えます（1人1秒ほど）`);
    for (const [i, m] of members.entries()) {
      m.activity = {
        speeches: await speechCount(m.name),
        since: SPEECH_FROM,
        until: SPEECH_UNTIL,
        source: { title: `国会会議録検索システム（発言者「${normName(m.name)}」${SPEECH_FROM}〜${SPEECH_UNTIL}）`, url: "https://kokkai.ndl.go.jp/" },
      };
      if ((i + 1) % 100 === 0) console.log(`  ${i + 1} / ${members.length}`);
    }
  }

  // 政党：両院の会派をまとめ、議席の多い順に並べる。色は上位7つまで（8つめ以降は「その他」の灰色）
  const SLOTS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7"];
  const partyKey = (abbr) => MERGE[abbr] ?? abbr;
  const parties = new Map();
  for (const m of members) {
    const id = partyKey(m.kaiha);
    const p = parties.get(id) ?? { id, name: id, seats: 0, kaiha: {} };
    p.seats++;
    p.kaiha[m.house] = kaiha.find((k) => k.house === m.house && partyKey(k.abbr) === id)?.name ?? m.kaiha;
    parties.set(id, p);
  }
  const partyList = [...parties.values()]
    .sort((a, b) => (a.id === "無所属") - (b.id === "無所属") || b.seats - a.seats)
    .map((p, i) => ({ id: p.id, name: p.name, color: SLOTS[i] ?? "#8A90A6", kaiha: p.kaiha }));

  const today = new Date().toISOString().slice(0, 10);
  const data = {
    meta: {
      sample: false,
      updatedAt: today,
      note: "院・会派・選挙区・当選回数・生年・経歴は公式の公開情報から取り込んだものです。性別は Wikidata と照合し、前職は経歴の文から機械的に分類した目安です。公約・実績はまだ作成していません。",
      sources: [
        { title: "衆議院 議員一覧・会派名及び会派別所属議員数・議員の紹介ページ", url: `${SHU}/syu/1giin.htm` },
        { title: "スマートニュース メディア研究所「国会議案データベース：参議院」（参議院ウェブサイトを整理した公開データ、MIT ライセンス）", url: "https://github.com/smartnews-smri/house-of-councillors" },
        { title: "Wikidata（性別・生年月日の照合）", url: "https://www.wikidata.org/" },
        ...(WITH_SPEECHES ? [{ title: `国立国会図書館 国会会議録検索システム（発言回数 ${SPEECH_FROM}〜${SPEECH_UNTIL}）`, url: "https://kokkai.ndl.go.jp/" }] : []),
      ],
      asOf: { 衆議院: shu.asOf, 参議院: san.asOf },
    },
    parties: partyList,
    members: members
      .map(({ kaiha: k, ...m }) => ({
        ...m,
        party: partyKey(k),
        birthYear: m.birth ? Number(m.birth.slice(0, 4)) : null,
        career: classifyCareer(m.bio),
        region: regionOf(m.house, m.district) ?? NATIONAL,
        fields: [],
        promises: [],
        achievements: [],
        catchphrase: null,
        avatar: null,
        review: null,
      }))
      .sort((a, b) => a.kana.localeCompare(b.kana, "ja")),
  };

  const missingBirth = data.members.filter((m) => !m.birthYear);
  if (missingBirth.length) console.warn(`生年を読めなかった議員：${missingBirth.map((m) => m.name).join("、")}`);
  const errors = validateData(data);
  if (errors.length) throw new Error(`データの形に問題があります:\n${errors.slice(0, 30).join("\n")}`);
  await writeFile(join(ROOT, "data", "members.json"), serializeData(data));
  console.log(`data/members.json に ${data.members.length} 人を書き出しました（女性の数が公式と食い違う会派 ${mismatch}）`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

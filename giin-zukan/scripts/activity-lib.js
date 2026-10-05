// 議員立法と質問主意書（公開データ）を、議員ごとの活動ログにする純粋な関数。
import { normName } from "./roster-lib.js";

const ERAS = { 平成: 1988, 令和: 2018 };
// 「令和 8年 3月12日」→ "2026-03-12"
export function warekiDate(s) {
  const m = String(s ?? "").normalize("NFKC").match(/(平成|令和)\s*(元|\d+)年\s*(\d+)月\s*(\d+)日/);
  if (!m) return null;
  const y = ERAS[m[1]] + (m[2] === "元" ? 1 : Number(m[2]));
  return `${y}-${m[3].padStart(2, "0")}-${m[4].padStart(2, "0")}`;
}

// 「吉田　はるみ君外四名」「吉田はるみ君; 江田憲司君」→ 名前の配列
export const splitNames = (s) => String(s ?? "").split(/[;；、]/).map((x) => normName(x.replace(/君.*$/, ""))).filter(Boolean);

const table = ([head, ...rows]) => rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));

// 衆議院の議案データ（スマートニュース メディア研究所）から議員立法（衆法・参法）を取り出す。
// 参法は衆議院側の記録に筆頭発議者しか載らないので、参議院の議案データで提出日を補う。
export function billsFrom(shuGian, sanGian, sinceSession) {
  const sanDate = new Map(table(sanGian).map((r) => [`${r["提出回次"]}-${r["提出番号"]}`, r["議案審議情報一覧 - 提出日"]]));
  const seen = new Map();
  for (const r of table(shuGian)) {
    if (!["衆法", "参法"].includes(r["議案種類"]) || Number(r["提出回次"]) < sinceSession) continue;
    if (/委員長/.test(r["議案提出者"])) continue; // 委員会が出した法案は除く
    const key = `${r["議案種類"]}-${r["提出回次"]}-${r["番号"]}`;
    if (seen.has(key)) continue;
    const sponsors = r["議案種類"] === "衆法" ? splitNames(r["議案提出者一覧"]) : [];
    const lead = splitNames(r["議案提出者"])[0];
    seen.set(key, {
      kind: r["議案種類"],
      house: r["議案種類"] === "衆法" ? "衆議院" : "参議院",
      title: r["議案件名"],
      lead,
      sponsors: sponsors.length ? sponsors : [lead],
      date: r["議案種類"] === "衆法" ? warekiDate(r["衆議院議案受理年月日"]) : sanDate.get(`${r["提出回次"]}-${r["番号"]}`) ?? null,
      session: Number(r["提出回次"]),
      url: r["経過情報URL"],
    });
  }
  return [...seen.values()];
}

// 参議院の質問主意書（スマートニュース メディア研究所）
export function sanQuestions(syuisyo, sinceSession) {
  return table(syuisyo)
    .filter((r) => Number(r["提出回次"]) >= sinceSession)
    .map((r) => ({ house: "参議院", session: Number(r["提出回次"]), title: r["件名"], submitters: splitNames(r["提出者"]), date: r["提出日"], url: r["明細URL"] }));
}

// 衆議院「質問主意書・答弁書一覧」（回次ごとのページ）
export function parseShugiinQuestionList(html, baseUrl) {
  const out = [];
  for (const [, tr] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (tds.length < 5) continue;
    const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const keika = tds[4].match(/href="([^"]+)"/i)?.[1];
    if (!/^\d+$/.test(text(tds[0])) || !keika) continue;
    out.push({ house: "衆議院", title: text(tds[1]), submitters: splitNames(text(tds[2])), keikaUrl: new URL(keika, baseUrl).href });
  }
  return out;
}

// 衆議院の質問主意書の経過ページから提出日を読む
export function parseShugiinQuestionDate(html) {
  const t = String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return warekiDate(t.match(/提出年月日\s*((?:平成|令和)\s*\S+?年\s*\S+?月\s*\S+?日)/)?.[1]);
}

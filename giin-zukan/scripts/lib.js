// 議員図鑑のデータまわりの純粋な関数（ネットワークにも API にも触れない）。
// generate.js と validate.js とテストが共有する。

export const HOUSES = ["衆議院", "参議院"];
// 「照合できず」は、公開データで性別を確かめられなかった人
export const GENDERS = ["男性", "女性", "その他・非公表", "照合できず"];
// 前職（議員になる直前の主な職業）。分析の軸に使うので、決まった言葉から選ぶ
export const CAREERS = ["地方議員・首長", "官僚", "議員秘書", "民間企業", "弁護士", "医師・医療", "メディア", "労働組合", "教育・研究", "その他"];
// 地域は比例代表のブロックで分ける
export const REGIONS = ["北海道", "東北", "北関東", "南関東", "東京", "北陸信越", "東海", "近畿", "中国", "四国", "九州", "全国（参院比例）"];

// 公約の状況。判定は AI の下書きなので、画面では必ず「AI判定」と根拠を添える。
export const STATUSES = {
  achieved: "実現",
  in_progress: "進行中",
  not_started: "動きなし",
  stalled: "停滞・撤回",
  unverifiable: "判定できず",
};

export const ACHIEVEMENT_TYPES = {
  bill: "法案",
  question: "質問・質疑",
  written_question: "質問主意書",
  committee: "委員会・役職",
  other: "その他",
};

// Claude に返させる形（構造化出力の JSON Schema）。出典は docId と原文の引用で示させ、
// 引用が本当に原文にあるかは verifyExtraction で機械的に確かめる。
const SOURCE_REF = {
  type: "object",
  additionalProperties: false,
  required: ["docId", "quote"],
  properties: {
    docId: { type: "string", description: "資料の ID（例: S3）" },
    quote: { type: "string", description: "資料からそのまま写した短い引用（80字以内、言い換え禁止）" },
  },
};

export const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["catchphrase", "fields", "promises", "achievements"],
  properties: {
    catchphrase: {
      type: "object",
      additionalProperties: false,
      required: ["quote", "docId"],
      properties: {
        quote: { type: "string", description: "本人の発言からそのまま写した、人柄や主張が伝わる一言（40字以内）" },
        docId: { type: "string" },
      },
    },
    fields: { type: "array", items: { type: "string" }, description: "力を入れている政策分野（3〜5個、短い名詞）" },
    promises: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "field", "madeAt", "madeIn", "status", "statusNote", "sources", "evidence"],
        properties: {
          title: { type: "string", description: "公約を20字以内で" },
          detail: { type: "string", description: "何をどうすると約束したか（資料にある範囲だけ）" },
          field: { type: "string" },
          madeAt: { type: "string", description: "約束した日 YYYY-MM-DD（わからなければ YYYY か空文字）" },
          madeIn: { type: "string", description: "どこで約束したか（例: 2024年衆院選の選挙公報）" },
          status: { type: "string", enum: Object.keys(STATUSES) },
          statusNote: { type: "string", description: "その判定の根拠。資料で確かめられる事実だけ" },
          sources: { type: "array", items: SOURCE_REF, description: "約束したことの出典" },
          evidence: { type: "array", items: SOURCE_REF, description: "状況判定の根拠になる出典（なければ空）" },
        },
      },
    },
    achievements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["date", "type", "title", "summary", "sources"],
        properties: {
          date: { type: "string", description: "YYYY-MM-DD" },
          type: { type: "string", enum: Object.keys(ACHIEVEMENT_TYPES) },
          title: { type: "string" },
          summary: { type: "string" },
          sources: { type: "array", items: SOURCE_REF },
        },
      },
    },
  },
};

// 空白・改行・全角半角スペースの違いを無視して比べる
export function normalize(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .replace(/[\s　]+/g, "")
    .replace(/[「」『』"“”]/g, "");
}

export function quoteFound(quote, docText) {
  const q = normalize(quote);
  return q.length >= 4 && normalize(docText).includes(q);
}

// AI の抽出結果を資料と照合する。引用が資料に見つからない出典は捨て、
// 出典が一つも残らない公約・実績は丸ごと捨てる。捨てたものは dropped に記録する。
export function verifyExtraction(extraction, docs) {
  const byId = new Map(docs.map((d) => [d.id, d]));
  const dropped = [];

  const resolve = (refs, where) =>
    (refs ?? []).flatMap((ref) => {
      const doc = byId.get(ref.docId);
      if (doc && quoteFound(ref.quote, doc.text)) {
        return [{ title: doc.title, url: doc.url, date: doc.date ?? "", quote: ref.quote }];
      }
      dropped.push({ where, docId: ref.docId, quote: ref.quote, reason: doc ? "引用が資料に見つからない" : "存在しない資料ID" });
      return [];
    });

  const promises = (extraction.promises ?? []).flatMap((p, i) => {
    const sources = resolve(p.sources, `promises[${i}].sources`);
    if (sources.length === 0) {
      dropped.push({ where: `promises[${i}]`, title: p.title, reason: "確かめられる出典がない" });
      return [];
    }
    const evidence = resolve(p.evidence, `promises[${i}].evidence`);
    // 根拠が確かめられない判定は「判定できず」に落とす
    const status = evidence.length === 0 && p.status !== "not_started" ? "unverifiable" : p.status;
    return [{
      id: `p${i + 1}`,
      title: p.title,
      detail: p.detail,
      field: p.field,
      madeAt: p.madeAt,
      madeIn: p.madeIn,
      status,
      statusNote: status === p.status ? p.statusNote : "根拠となる資料を確かめられなかったため、判定を保留しています。",
      sources,
      evidence,
    }];
  });

  const achievements = (extraction.achievements ?? []).flatMap((a, i) => {
    const sources = resolve(a.sources, `achievements[${i}].sources`);
    if (sources.length === 0) {
      dropped.push({ where: `achievements[${i}]`, title: a.title, reason: "確かめられる出典がない" });
      return [];
    }
    return [{ id: `a${i + 1}`, date: a.date, type: a.type, title: a.title, summary: a.summary, sources, ai: true }];
  });

  const cp = extraction.catchphrase;
  const cpDoc = cp && byId.get(cp.docId);
  const catchphrase = cpDoc && quoteFound(cp.quote, cpDoc.text)
    ? { quote: cp.quote, source: { title: cpDoc.title, url: cpDoc.url, date: cpDoc.date ?? "" } }
    : null;
  if (cp && !catchphrase) dropped.push({ where: "catchphrase", quote: cp.quote, reason: "引用が資料に見つからない" });

  return { catchphrase, fields: extraction.fields ?? [], promises, achievements, dropped };
}

// HTML から本文らしい文字だけを取り出す（公約ページなどの取り込み用）
export function htmlToText(html) {
  return String(html)
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t　]+/g, " ")
    .replace(/ *\n\s*/g, "\n")
    .trim();
}

// 国会会議録検索システム API（speech）の応答を資料の形にする
export function speechesToDocs(apiResponse, startIndex = 1) {
  return (apiResponse.speechRecord ?? []).map((r, i) => ({
    id: `S${startIndex + i}`,
    kind: "kokkai",
    title: `${r.nameOfHouse} ${r.nameOfMeeting} ${r.issue ?? ""}`.trim(),
    url: r.speechURL,
    date: r.date,
    text: r.speech,
  }));
}

// 図鑑データの形を確かめる。問題の一覧を返す（空なら合格）。
export function validateData(data) {
  const errors = [];
  const err = (path, msg) => errors.push(`${path}: ${msg}`);
  const isDate = (s) => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(s);
  const checkSources = (list, path, { required = true } = {}) => {
    if (!Array.isArray(list)) return err(path, "配列でない");
    if (required && list.length === 0) err(path, "出典がない");
    list.forEach((s, i) => {
      if (!/^https?:\/\//.test(s.url ?? "")) err(`${path}[${i}].url`, "URL でない");
      if (!s.title) err(`${path}[${i}].title`, "空");
      if (!s.quote) err(`${path}[${i}].quote`, "引用が空");
    });
  };

  if (!data || typeof data !== "object") return ["データがオブジェクトでない"];
  if (!data.meta || typeof data.meta.sample !== "boolean") err("meta.sample", "true/false で書く");
  const parties = new Set((data.parties ?? []).map((p) => p.id));
  const memberIds = new Set();

  (data.members ?? []).forEach((m, mi) => {
    const at = `members[${mi}](${m.id ?? "?"})`;
    if (!m.id) err(at, "id がない");
    if (memberIds.has(m.id)) err(at, "id が重複");
    memberIds.add(m.id);
    if (!m.name) err(at, "name がない");
    if (!HOUSES.includes(m.house)) err(`${at}.house`, `${HOUSES.join(" / ")} のどれか`);
    if (!parties.has(m.party)) err(`${at}.party`, `parties にない: ${m.party}`);
    if (!GENDERS.includes(m.gender)) err(`${at}.gender`, `${GENDERS.join(" / ")} のどれか`);
    if (m.birthYear !== null && !Number.isInteger(m.birthYear)) err(`${at}.birthYear`, "西暦の整数か null で書く");
    if (!CAREERS.includes(m.career)) err(`${at}.career`, `${CAREERS.join(" / ")} のどれか`);
    if (!REGIONS.includes(m.region)) err(`${at}.region`, `${REGIONS.join(" / ")} のどれか`);
    if (!Number.isInteger(m.terms) || m.terms < 1) err(`${at}.terms`, "1以上の整数");
    if (m.activity && !Number.isInteger(m.activity.speeches)) err(`${at}.activity.speeches`, "整数で書く");
    // AI で作った公約・実績を持つ議員は、人が確認したかどうかを必ず書く
    // 公開データから機械的に作った活動ログ（ai を持たない）は確認の対象外
    const hasAiContent = (m.promises ?? []).length > 0 || (m.achievements ?? []).some((x) => x.ai);
    if (hasAiContent && (!m.review || typeof m.review.reviewed !== "boolean")) err(`${at}.review.reviewed`, "true/false で書く");
    if (m.catchphrase) checkSources([m.catchphrase.source ? { ...m.catchphrase.source, quote: m.catchphrase.quote } : {}], `${at}.catchphrase`);

    const pids = new Set();
    (m.promises ?? []).forEach((p, pi) => {
      const pat = `${at}.promises[${pi}]`;
      if (pids.has(p.id)) err(pat, "id が重複");
      pids.add(p.id);
      if (!p.title) err(pat, "title がない");
      if (!(p.status in STATUSES)) err(`${pat}.status`, `${Object.keys(STATUSES).join(" / ")} のどれか`);
      if (p.madeAt && !isDate(p.madeAt)) err(`${pat}.madeAt`, "YYYY-MM-DD で書く");
      checkSources(p.sources, `${pat}.sources`);
      checkSources(p.evidence ?? [], `${pat}.evidence`, { required: false });
      if (["achieved", "in_progress", "stalled"].includes(p.status) && !(p.evidence ?? []).length) {
        err(`${pat}.evidence`, "実現・進行中・停滞と判定するなら根拠の出典が要る");
      }
    });
    (m.achievements ?? []).forEach((a, ai) => {
      const aat = `${at}.achievements[${ai}]`;
      if (!isDate(a.date ?? "")) err(`${aat}.date`, "YYYY-MM-DD で書く");
      if (!(a.type in ACHIEVEMENT_TYPES)) err(`${aat}.type`, `${Object.keys(ACHIEVEMENT_TYPES).join(" / ")} のどれか`);
      checkSources(a.sources, `${aat}.sources`);
    });
  });
  return errors;
}

// 生成した一人分を図鑑データに差し込む（同じ id があれば置き換える）
export function upsertMember(data, member) {
  const members = (data.members ?? []).filter((m) => m.id !== member.id);
  members.push(member);
  members.sort((a, b) => (a.kana ?? a.name).localeCompare(b.kana ?? b.name, "ja"));
  return { ...data, members };
}

// 1行に1人ずつ書く（差分が読みやすく、ファイルも小さい）
export function serializeData(data) {
  const { members, ...rest } = data;
  const head = JSON.stringify(rest).slice(0, -1);
  return `${head},"members":[\n${members.map((m) => JSON.stringify(m)).join(",\n")}\n]}\n`;
}

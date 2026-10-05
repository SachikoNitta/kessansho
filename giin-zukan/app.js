// 国会議員図鑑：議員の集団を、いろいろな軸で切って見比べる道具。
// 一人＝一つの点。縦軸×横軸のマスに点を並べ、色で三つめの軸を重ねる。
// マスを選ぶとその集団のプロフィール、点や名前を選ぶとその議員のステータス画面が開く。
// データは window.GIIN_DATA（1枚にまとめたプレビュー）か data/members.json から読む。

const STATUS = {
  achieved: "実現",
  in_progress: "進行中",
  not_started: "動きなし",
  stalled: "停滞・撤回",
  unverifiable: "判定できず",
};
const STATUS_ORDER = Object.keys(STATUS);
const TYPE = { bill: "法案", question: "質問・質疑", written_question: "質問主意書", committee: "委員会・役職", other: "その他" };
const CAREERS = ["地方議員・首長", "官僚", "議員秘書", "民間企業", "弁護士", "医師・医療", "メディア", "労働組合", "教育・研究", "その他"];
const REGIONS = ["北海道", "東北", "北関東", "南関東", "東京", "北陸信越", "東海", "近畿", "中国", "四国", "九州", "全国（参院比例）"];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const safeUrl = (u) => (/^https?:\/\//.test(u ?? "") ? u : "#");
const fmt = (n, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// 写真のかわりに、データの髪色・髪型・メガネから描くちびキャラ
function avatar(a = {}, color = "#2F5BEA") {
  const skin = a.skin ?? "#F3D2B5";
  const hair = a.hair ?? "#2B2A33";
  const hairs = {
    short: `<path d="M30 52 C28 26 48 16 60 16 C74 16 92 24 90 52 C86 40 78 34 60 34 C44 34 34 40 30 52Z" fill="${hair}"/>`,
    bob: `<path d="M26 66 C20 30 44 14 60 14 C78 14 100 28 94 66 L86 66 C88 46 80 34 60 34 C42 34 32 46 34 66Z" fill="${hair}"/>`,
    long: `<path d="M24 92 C16 40 40 14 60 14 C80 14 104 40 96 92 L86 92 C90 52 80 34 60 34 C40 34 30 52 34 92Z" fill="${hair}"/>`,
    spiky: `<path d="M28 54 L26 30 L38 36 L42 18 L52 30 L60 12 L68 30 L78 18 L82 36 L94 30 L92 54 C86 40 76 34 60 34 C44 34 34 40 28 54Z" fill="${hair}"/>`,
  };
  const glasses = a.glasses
    ? `<g fill="none" stroke="#1B2238" stroke-width="2.4"><circle cx="48" cy="60" r="8"/><circle cx="72" cy="60" r="8"/><path d="M56 60 H64"/></g>`
    : "";
  return `<svg viewBox="0 0 120 110" role="img" aria-hidden="true">
    <path d="M18 110 C20 88 38 80 60 80 C82 80 100 88 102 110Z" fill="${color}" stroke="#1B2238" stroke-width="3"/>
    <path d="M52 80 L60 96 L68 80Z" fill="#FFFFFF" stroke="#1B2238" stroke-width="2"/>
    <circle cx="60" cy="56" r="30" fill="${skin}" stroke="#1B2238" stroke-width="3"/>
    ${hairs[a.style] ?? hairs.short}
    <ellipse cx="48" cy="60" rx="3.4" ry="4.4" fill="#1B2238"/><ellipse cx="72" cy="60" rx="3.4" ry="4.4" fill="#1B2238"/>
    <circle cx="49.4" cy="58.4" r="1.2" fill="#FFFFFF"/><circle cx="73.4" cy="58.4" r="1.2" fill="#FFFFFF"/>
    <ellipse cx="41" cy="70" rx="5" ry="3" fill="#F28A8A" opacity=".45"/><ellipse cx="79" cy="70" rx="5" ry="3" fill="#F28A8A" opacity=".45"/>
    <path d="M53 72 Q60 78 67 72" fill="none" stroke="#1B2238" stroke-width="2.6" stroke-linecap="round"/>
    ${glasses}
  </svg>`;
}

// 実在の議員には顔を描かない（似ていない顔を作らないため）。政党の色のシルエットだけ
function silhouette(color = "#8A90A6") {
  return `<svg viewBox="0 0 120 110" role="img" aria-hidden="true">
    <path d="M18 110 C20 88 38 80 60 80 C82 80 100 88 102 110Z" fill="${color}" stroke="#1B2238" stroke-width="3"/>
    <circle cx="60" cy="52" r="26" fill="${color}" stroke="#1B2238" stroke-width="3" opacity=".55"/>
  </svg>`;
}

function statusCounts(members) {
  const c = Object.fromEntries(STATUS_ORDER.map((k) => [k, 0]));
  for (const m of members) for (const p of m.promises ?? []) c[p.status] = (c[p.status] ?? 0) + 1;
  return c;
}

function statusBar(c, label = "公約の状況") {
  const total = Object.values(c).reduce((a, b) => a + b, 0) || 1;
  const on = STATUS_ORDER.filter((k) => c[k]);
  const segs = on.map((k) => `<span style="width:${(c[k] / total) * 100}%;background:var(--st-${k})" title="${STATUS[k]} ${c[k]}件"></span>`).join("");
  const legend = on.map((k) => `<span><i style="background:var(--st-${k})"></i>${STATUS[k]} ${c[k]}</span>`).join("");
  return `<div class="bar" role="img" aria-label="${label} ${on.map((k) => `${STATUS[k]}${c[k]}件`).join("、")}">${segs}</div><div class="legend">${legend}</div>`;
}

const reviewBadge = (m) => (m.review?.reviewed
  ? `<span class="badge-ai badge-ok">出典確認ずみ</span>`
  : `<span class="badge-ai">AI下書き・未確認</span>`);

const stars = (n) => "★".repeat(Math.min(n ?? 0, 8));

function sourceList(sources, label = "出典") {
  if (!sources?.length) return "";
  return `<details class="src"><summary>${label}（${sources.length}）</summary><ul>${sources.map((s) => `
    <li><q>${esc(s.quote)}</q><a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">${esc(s.title)}</a>${s.date ? ` <span class="when">${esc(s.date)}</span>` : ""}</li>`).join("")}</ul></details>`;
}

// ---- 軸 -------------------------------------------------------------------
// kind: "cat"（順序のない区分）は区別しやすいカテゴリ色、"ord"（順序のある区分）は一色の濃淡で塗る
function buildAxes(data) {
  // 年齢は生年月日（わかる範囲）とデータの時点から数える。生年がわからなければ null
  const [ay, am, ad] = String(data.meta.updatedAt ?? new Date().toISOString().slice(0, 10)).split("-").map(Number);
  const age = (m) => {
    if (!m.birthYear) return null;
    const [, bm, bd] = String(m.birth ?? m.birthYear).split("-").map(Number);
    const notYet = bm && (bm > am || (bm === am && bd && bd > ad));
    return ay - m.birthYear - (notYet ? 1 : 0);
  };
  const achievedShare = (m) => {
    const ps = m.promises ?? [];
    return ps.length ? ps.filter((p) => p.status === "achieved").length / ps.length : -1;
  };
  const bills = (m) => (m.achievements ?? []).filter((a) => a.type === "bill").length;
  const band = (v, edges, labels) => labels[edges.findIndex((e) => v <= e)] ?? labels.at(-1);

  // 政党が9つ以上なら、色分けできるように上位7つ＋「その他」にまとめた軸も用意する
  const partyName = (m) => data.partyById.get(m.party)?.name;
  const OTHER = "その他の会派";
  const top = data.parties.length > 8 ? new Set(data.parties.slice(0, 7).map((p) => p.name)) : null;
  const hasPromises = data.members.some((m) => (m.promises ?? []).length);
  const hasAchievements = data.members.some((m) => (m.achievements ?? []).length);
  const hasActivity = data.members.some((m) => m.activity);
  const has = (key) => data.members.some((m) => m[key] !== undefined && m[key] !== null);
  const hasStats = has("stats");
  // 出身大学は人数の多い6校＋その他＋記載なし（色分けできる8つまで）
  const uniCount = new Map();
  for (const m of data.members) if (m.university) uniCount.set(m.university, (uniCount.get(m.university) ?? 0) + 1);
  const topUni = [...uniCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([u]) => u);
  const topUniSet = new Set(topUni);
  const nowYear = ay;

  // group は軸を選ぶ欄の見出し
  const axes = [
    { id: "none", group: "基本", label: "まとめない", kind: "cat", values: ["全員"], get: () => "全員" },
    { id: "house", group: "基本", label: "院", kind: "cat", values: ["衆議院", "参議院"], get: (m) => m.house },
    top
      ? { id: "party", group: "基本", label: "政党（上位7＋その他）", kind: "cat", values: [...top, OTHER], get: (m) => (top.has(partyName(m)) ? partyName(m) : OTHER) }
      : { id: "party", group: "基本", label: "政党", kind: "cat", values: data.parties.map((p) => p.name), get: partyName },
    top && { id: "party_all", group: "基本", label: "政党（すべて）", kind: "cat", values: data.parties.map((p) => p.name), get: partyName },
    { id: "gender", group: "基本", label: "性別", kind: "cat", values: ["男性", "女性", "その他・非公表", "照合できず"], get: (m) => m.gender },
    { id: "age", group: "基本", label: "年代", kind: "ord", values: ["30代以下", "40代", "50代", "60代", "70代以上", "生年不明"], get: (m) => (age(m) === null ? "生年不明" : band(age(m), [39, 49, 59, 69], ["30代以下", "40代", "50代", "60代", "70代以上"])) },
    { id: "terms", group: "経歴", label: "当選回数", kind: "ord", values: ["1回", "2〜3回", "4〜6回", "7回以上"], get: (m) => band(m.terms, [1, 3, 6], ["1回", "2〜3回", "4〜6回", "7回以上"]) },
    { id: "career", group: "経歴", label: data.meta.sample ? "前職" : "前職（経歴文からの目安）", kind: "cat", values: CAREERS, get: (m) => m.career },
    { id: "region", group: "基本", label: "地域", kind: "cat", values: REGIONS, get: (m) => m.region },
    hasPromises && { id: "field", group: "公約", label: "一番の得意分野", kind: "cat", values: [...new Set(data.members.map((m) => m.fields?.[0]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja")), get: (m) => m.fields?.[0] ?? "—" },
    hasPromises && { id: "achieve", group: "公約", label: "公約の実現割合（AI判定）", kind: "ord", values: ["実現なし", "3割未満", "3〜6割", "6割以上"], get: (m) => { const s = achievedShare(m); return s <= 0 ? "実現なし" : band(s, [0.299, 0.6], ["3割未満", "3〜6割", "6割以上"]); } },
    hasActivity && { id: "speeches", group: "国会での活動", label: data.meta.sample ? "国会での発言回数" : "国会での発言回数（答弁・議事進行も含む）", kind: "ord", values: ["0回", "1〜20回", "21〜50回", "51〜100回", "101回以上"], get: (m) => band(m.activity?.speeches ?? 0, [0, 20, 50, 100], ["0回", "1〜20回", "21〜50回", "51〜100回", "101回以上"]) },
    hasStats
      ? { id: "bills", group: "国会での活動", label: "議員立法（筆頭提出者として）", kind: "ord", values: ["0件", "1件", "2件以上"], get: (m) => band(m.stats.billsLead, [0, 1], ["0件", "1件", "2件以上"]) }
      : hasAchievements && { id: "bills", group: "国会での活動", label: "議員立法の提出", kind: "ord", values: ["なし", "1件", "2件以上"], get: (m) => band(bills(m), [0, 1], ["なし", "1件", "2件以上"]) },
    hasStats && { id: "cosponsor", group: "国会での活動", label: "議員立法（共同提出者として・衆院）", kind: "ord", values: ["0件", "1件", "2件以上"], get: (m) => band(m.stats.billsCosponsored, [0, 1], ["0件", "1件", "2件以上"]) },
    hasStats && { id: "questions", group: "国会での活動", label: "質問主意書の提出", kind: "ord", values: ["0件", "1〜2件", "3〜9件", "10件以上"], get: (m) => band(m.stats.questions, [0, 2, 9], ["0件", "1〜2件", "3〜9件", "10件以上"]) },
    has("electedBy") && { id: "electedBy", group: "経歴", label: "選ばれ方", kind: "cat", values: ["衆・小選挙区", "衆・比例代表", "参・選挙区", "参・比例代表"], get: (m) => m.electedBy },
    has("firstElected") && { id: "tenure", group: "経歴", label: "議員歴（初当選から）", kind: "ord", values: ["1年未満", "1〜5年", "6〜10年", "11〜20年", "21年以上", "初当選の年が不明"], get: (m) => (m.firstElected ? band(nowYear - m.firstElected, [0, 5, 10, 20], ["1年未満", "1〜5年", "6〜10年", "11〜20年", "21年以上"]) : "初当選の年が不明") },
    has("ministerial") && { id: "ministerial", group: "経歴", label: "大臣・副大臣の経験（経歴文から）", kind: "ord", values: ["経歴に記載なし", "副大臣・政務官の経験あり", "大臣の経験あり"], get: (m) => m.ministerial },
    has("dynasty") && { id: "dynasty", group: "経歴", label: "親・祖父母に国会議員（Wikidataで確認できた人）", kind: "cat", values: ["親・祖父母に国会議員", "Wikidataでは見つからない", "照合できず"], get: (m) => m.dynasty },
    has("university") && { id: "university", group: "学び", label: "出身大学（上位6校）", kind: "cat", values: [...topUni, "その他の大学", "大学の記載なし"], get: (m) => (!m.university ? "大学の記載なし" : topUniSet.has(m.university) ? m.university : "その他の大学") },
    has("studiedAbroad") && { id: "abroad", group: "学び", label: "海外で学んだ経歴", kind: "cat", values: ["あり", "経歴に記載なし"], get: (m) => (m.studiedAbroad ? "あり" : "経歴に記載なし") },
    has("hometown") && { id: "hometown", group: "基本", label: "地元生まれか（選挙区・比例ブロック）", kind: "cat", values: ["地元（同じ都道府県・ブロック）生まれ", "ほかの地域の生まれ", "海外生まれ", "出生地の記載なし", "対象外（参院比例）"], get: (m) => m.hometown },
  ].filter(Boolean);
  return { axes, byId: new Map(axes.map((a) => [a.id, a])), age, hasPromises, hasStats };
}

// 色に使える軸は区分が8つまで（それより多い色は見分けられない）
const colorable = (axis) => axis.values.length <= 8;

// わからない人・書かれていない人は、どの区分の色とも紛れない灰色
const GRAY = /不明|照合できず|その他の会派|記載なし|見つからない|対象外/;

function colorOf(axis, value) {
  if (axis.id === "none") return "var(--s1)";
  if (GRAY.test(value)) return "var(--st-not_started)";
  if (axis.kind === "ord") {
    const known = axis.values.filter((v) => !GRAY.test(v));
    const i = known.indexOf(value);
    const q = known.length === 1 ? 5 : Math.round(1 + (i / (known.length - 1)) * 4); // q1〜q5 に割り当てる
    return `var(--q${q})`;
  }
  const known = axis.values.filter((v) => !GRAY.test(v));
  return `var(--s${known.indexOf(value) + 1})`;
}

const PRESETS = [
  { label: "政党ごとの女性の割合", x: "party_all", y: "none", color: "gender" },
  { label: "親・祖父母も議員？", x: "party", y: "none", color: "dynasty" },
  { label: "大臣になる人の議員歴", x: "tenure", y: "none", color: "ministerial" },
  { label: "出身大学と政党", x: "university", y: "none", color: "party" },
  { label: "質問主意書を出すのは誰", x: "party_all", y: "questions", color: "electedBy" },
  { label: "議員歴と発言の多さ", x: "tenure", y: "speeches", color: "party" },
  { label: "地元生まれは何割", x: "electedBy", y: "none", color: "hometown" },
  { label: "政党ごとの年代", x: "party", y: "age", color: "gender" },
  { label: "前職と政党", x: "career", y: "none", color: "party" },
  { label: "年代と公約の実現", x: "age", y: "achieve", color: "house" },
];

// ---- 画面 -----------------------------------------------------------------
function renderApp(root, data) {
  data.partyById = new Map(data.parties.map((p) => [p.id, p]));
  const { axes, byId, age, hasPromises, hasStats } = buildAxes(data);
  // 使えない軸を含む問いは出さない。「すべての政党」がない（政党が8つ以下）ときは政党の軸で代わりにする
  const presets = PRESETS.map((p) => ({ ...p, x: byId.has(p.x) ? p.x : p.x.replace("_all", "") }))
    .filter((p) => [p.x, p.y, p.color].every((id) => byId.has(id)));
  const state = { x: presets[0]?.x ?? "party", y: "none", color: "gender", house: "", q: "", cell: null, sort: "kana", limit: 40 };

  const axisOptions = (list, current) => {
    const groups = [...new Set(list.map((a) => a.group))];
    return groups.map((g) => `<optgroup label="${esc(g)}">${list.filter((a) => a.group === g).map((a) => `<option value="${a.id}" ${a.id === current ? "selected" : ""}>${esc(a.label)}</option>`).join("")}</optgroup>`).join("");
  };

  root.innerHTML = `
    <header class="masthead">
      <h1 class="logo"><small>KOKKAI GIIN ZUKAN</small>国会議員<em>図鑑</em></h1>
      <p class="lede">一人ひとりが一つの点。軸を選んで、議員の集団を切り分けてみましょう。</p>
    </header>
    ${data.meta.sample
      ? `<p class="notice"><strong>サンプル表示中：</strong>${esc(data.meta.note)}</p>`
      : `<p class="notice is-info"><strong>実在の議員 ${data.members.length}人</strong>（衆議院 ${data.meta.asOf?.衆議院 ?? ""}、参議院 ${data.meta.asOf?.参議院 ?? ""} 時点）。${esc(data.meta.note)}</p>`}

    <section class="controls" aria-label="分析の設定">
      <div class="axis-pickers">
        <label class="picker"><span>横軸</span><select id="ax-x">${axisOptions(axes, state.x)}</select></label>
        <label class="picker"><span>縦軸</span><select id="ax-y">${axisOptions(axes, state.y)}</select></label>
        <label class="picker"><span>色分け</span><select id="ax-color">${axisOptions(axes.filter(colorable), state.color)}</select></label>
        <button class="swap" id="swap" type="button" title="横軸と縦軸を入れかえる">⇄ 入れかえ</button>
      </div>
      <div class="filters">
        <div class="seg" role="group" aria-label="院で絞り込む">
          <button class="chip" data-house="" aria-pressed="true">両院</button>
          <button class="chip" data-house="衆議院" aria-pressed="false">衆議院</button>
          <button class="chip" data-house="参議院" aria-pressed="false">参議院</button>
        </div>
        <input type="search" id="q" placeholder="${hasPromises ? "名前・公約の言葉で絞り込む（例：保育）" : "名前・経歴の言葉で絞り込む（例：弁護士、松下政経塾）"}" aria-label="名前や公約の言葉で絞り込む">
      </div>
      <div class="presets" aria-label="問いから始める"><span>問いから始める：</span>${presets.map((p, i) => `<button class="preset" data-preset="${i}">${esc(p.label)}</button>`).join("")}</div>
    </section>

    <section class="board" aria-label="集団の地図">
      <div class="legend-row" id="legend"></div>
      <div class="matrix-scroll"><div class="matrix" id="matrix"></div></div>
      <p class="hint">マスを選ぶと、その集団のプロフィールが下に出ます。点にふれると名前、選ぶとその議員のステータス画面が開きます。${data.meta.sample ? "" : `発言回数・議員立法・質問主意書は、いまの議員がそろった${esc(data.members.find((m) => m.stats)?.stats.since ?? "")}以降の分を数えています。発言回数は大臣の答弁や委員長の議事進行も1件に数えます。「経歴に記載なし」「見つからない」は、無いと確かめたわけではありません。`}</p>
    </section>

    <section class="group" id="group" aria-live="polite"></section>

    <footer class="footer">
      公約・実績は国会会議録・選挙公報などの公開情報から AI が下書きし、引用が原文にあることを機械で照合しています。
      「公約の実現割合」は AI の判定にもとづくため、各議員の画面で根拠の出典を確かめてください。
      ${data.meta.updatedAt ? `最終更新 ${esc(data.meta.updatedAt)}` : ""}
      ${data.meta.sources?.length ? `<ul class="sources">${data.meta.sources.map((x) => `<li><a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener">${esc(x.title)}</a></li>`).join("")}</ul>` : ""}
    </footer>
    <div class="tooltip" id="tip" hidden></div>
    <div class="detail" id="detail" hidden></div>`;

  const $ = (sel) => root.querySelector(sel);
  const matrix = $("#matrix");
  const tip = $("#tip");
  const detail = $("#detail");
  const byMember = new Map(data.members.map((m) => [m.id, m]));

  const filtered = () => data.members.filter((m) => {
    if (state.house && m.house !== state.house) return false;
    if (!state.q) return true;
    const hay = [m.name, m.kana, m.district, m.career, m.bio, ...(m.fields ?? []), ...(m.promises ?? []).map((p) => p.title)].join(" ");
    return hay.includes(state.q);
  });

  function render() {
    const X = byId.get(state.x);
    const Y = byId.get(state.y);
    const C = byId.get(state.color);
    const list = filtered();
    const cIndex = (m) => C.values.indexOf(C.get(m));

    // 区分ごとに数える（0人の区分は出さない。ただし順序のある軸は抜けがわかるように残す）
    const unknown = (v) => /不明|照合できず/.test(v);
    const present = (axis) => axis.values.filter((v) => (axis.kind === "ord" && !unknown(v)) || list.some((m) => axis.get(m) === v));
    const xs = present(X);
    const ys = present(Y);
    const cells = new Map();
    for (const m of list) {
      const key = `${Y.get(m)}\u0000${X.get(m)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(m);
    }
    // 同じ色を隣りあわせにして、積み上げ棒のように読めるようにする
    for (const ms of cells.values()) ms.sort((a, b) => cIndex(a) - cIndex(b) || a.kana.localeCompare(b.kana, "ja"));

    // 凡例（色の区分と人数）
    const cCounts = C.values.map((v) => list.filter((m) => C.get(m) === v).length);
    $("#legend").innerHTML = state.color === "none" ? "" : `<span class="legend-title">${esc(C.label)}</span>${C.values.map((v, i) => cCounts[i] ? `<span class="key"><i style="background:${colorOf(C, v)}"></i>${esc(v)} <b>${cCounts[i]}</b></span>` : "").join("")}`;

    // マス目
    const showY = state.y !== "none";
    matrix.style.gridTemplateColumns = `${showY ? "minmax(84px, max-content) " : ""}repeat(${xs.length}, minmax(${xs.length > 6 ? 108 : 132}px, 1fr))`;
    const maxCell = Math.max(1, ...[...cells.values()].map((v) => v.length));
    let html = showY ? `<div class="corner">${esc(Y.label)} ＼ ${esc(X.label)}</div>` : "";
    html += xs.map((x) => `<div class="colhead">${esc(x)}<small>${list.filter((m) => X.get(m) === x).length}人</small></div>`).join("");
    for (const y of ys) {
      if (showY) html += `<div class="rowhead">${esc(y)}<small>${list.filter((m) => Y.get(m) === y).length}人</small></div>`;
      for (const x of xs) {
        const key = `${y}\u0000${x}`;
        const ms = cells.get(key) ?? [];
        const selected = state.cell === key;
        const heat = ms.length / maxCell;
        html += `<button class="cell${selected ? " is-selected" : ""}${ms.length ? "" : " is-empty"}" data-key="${esc(key)}" ${ms.length ? "" : "disabled"}
          aria-label="${showY ? `${esc(Y.label)} ${esc(y)}、` : ""}${esc(X.label)} ${esc(x)}：${ms.length}人" style="--heat:${heat.toFixed(3)}">
          <span class="n">${ms.length}<small>人</small></span>
          <span class="dots">${ms.map((m) => `<i data-id="${esc(m.id)}" style="background:${colorOf(C, C.get(m))}"></i>`).join("")}</span>
        </button>`;
      }
    }
    matrix.innerHTML = html;
    renderGroup(list, X, Y);
  }

  function renderGroup(list, X, Y) {
    let group = list;
    let title = state.house || state.q ? "絞り込んだ議員" : "すべての議員";
    if (state.cell) {
      const [y, x] = state.cell.split("\u0000");
      group = list.filter((m) => X.get(m) === x && Y.get(m) === y);
      title = [state.y !== "none" ? y : null, state.x !== "none" ? x : null].filter(Boolean).join(" × ") || "全員";
      if (!group.length) { state.cell = null; return renderGroup(list, X, Y); }
    }
    const all = data.members;
    const stat = (ms) => {
      const n = ms.length || 1;
      const sp = ms.map((m) => m.activity?.speeches ?? 0).sort((a, b) => a - b);
      return {
        n: ms.length,
        age: (() => { const ages = ms.map(age).filter((x) => x !== null); return ages.reduce((s, x) => s + x, 0) / (ages.length || 1); })(),
        female: pct(ms.filter((m) => m.gender === "女性").length, ms.length),
        terms: ms.reduce((s, m) => s + m.terms, 0) / n,
        speeches: sp.length ? sp[Math.floor(sp.length / 2)] : 0,
        minister: pct(ms.filter((m) => m.ministerial === "大臣の経験あり").length, ms.length),
        dynasty: pct(ms.filter((m) => m.dynasty === "親・祖父母に国会議員").length, ms.length),
        bills: ms.reduce((s, m) => s + (m.stats?.billsLead ?? 0), 0),
        questions: ms.reduce((s, m) => s + (m.stats?.questions ?? 0), 0),
      };
    };
    const g = stat(group);
    const a = stat(all);

    // ある区分に入る議員の割合を、全体と並べて出す（keys は一人が複数の区分に入ってもよい）
    const shareList = (title, keys, note, limit = 6) => {
      const count = (ms) => {
        const c = new Map();
        for (const m of ms) for (const k of keys(m)) c.set(k, (c.get(k) ?? 0) + 1);
        return c;
      };
      const gc = count(group);
      const ac = count(all);
      const top = [...gc.entries()].sort((p, q) => q[1] - p[1]).slice(0, limit);
      const max = Math.max(...top.map(([k, v]) => Math.max(v / group.length, (ac.get(k) ?? 0) / all.length)), 0.01);
      return `<section class="panel"><h3>${title}</h3>
        <ul class="fields">${top.map(([k, v]) => {
          const share = v / group.length;
          const base = (ac.get(k) ?? 0) / all.length;
          return `<li><span class="f-name" title="${esc(k)}">${esc(k)}</span>
            <span class="f-track"><span class="f-bar" style="width:${(share / max) * 100}%"></span><span class="f-base" style="left:${Math.min(99.5, (base / max) * 100)}%" title="全体 ${Math.round(base * 100)}%"></span></span>
            <span class="f-val">${Math.round(share * 100)}%</span></li>`;
        }).join("")}</ul>
        <p class="note">${note}</p></section>`;
    };
    const baseNote = "縦の線は議員全体での割合。";
    const panels = hasPromises
      ? `<section class="panel">
          <h3>公約の状況 <span class="badge-ai">AI判定</span></h3>
          ${statusBar(statusCounts(group))}
          <p class="note">この集団の議員が掲げた公約 ${group.reduce((s, m) => s + (m.promises?.length ?? 0), 0)} 件の内訳。全体の内訳：</p>
          ${statusBar(statusCounts(all), "全体の公約の状況")}
        </section>
        ${shareList("よく掲げる分野", (m) => m.fields ?? [], `棒はこの集団でその分野を掲げる議員の割合。${baseNote}`)}`
      : `${shareList("前職（経歴文からの目安）", (m) => [m.career], `議員になる前の主な職業を、公式の経歴の文から機械的に分類したもの。${baseNote}`)}
        ${shareList("出身大学", (m) => [m.university ?? "大学の記載なし"], `経歴の文に最初に出てくる大学。${baseNote}`)}
        ${shareList("政党", (m) => [data.partyById.get(m.party)?.name], baseNote)}
        ${shareList("選ばれ方", (m) => [m.electedBy].filter(Boolean), baseNote)}`;

    const sorters = {
      kana: (p, q) => p.kana.localeCompare(q.kana, "ja"),
      speeches: (p, q) => (q.activity?.speeches ?? 0) - (p.activity?.speeches ?? 0),
      terms: (p, q) => q.terms - p.terms,
      age: (p, q) => (age(q) ?? -1) - (age(p) ?? -1),
    };
    const rows = [...group].sort(sorters[state.sort]);
    const shown = rows.slice(0, state.limit);

    $("#group").innerHTML = `
      <header class="group-head">
        <div><span class="eyebrow">この集団のプロフィール</span><h2>${esc(title)}</h2></div>
        ${state.cell ? `<button class="chip" id="clear-cell">選択を外す</button>` : ""}
      </header>
      <div class="kpis">
        ${kpi("人数", `${g.n}<small>人</small>`, state.cell || g.n !== a.n ? `全体の${pct(g.n, a.n)}%` : "")}
        ${kpi("平均年齢", `${fmt(g.age, 1)}<small>歳</small>`, `全体 ${fmt(a.age, 1)}歳`)}
        ${kpi("女性の割合", `${g.female}<small>%</small>`, `全体 ${a.female}%`)}
        ${kpi("平均当選回数", `${fmt(g.terms, 1)}<small>回</small>`, `全体 ${fmt(a.terms, 1)}回`)}
        ${kpi("発言回数（中央値）", `${g.speeches}<small>回</small>`, `全体 ${a.speeches}回`)}
        ${hasStats ? `
        ${kpi("大臣経験のある人", `${g.minister}<small>%</small>`, `全体 ${a.minister}%`)}
        ${kpi("親・祖父母に国会議員", `${g.dynasty}<small>%</small>`, `全体 ${a.dynasty}%（Wikidataで確認できた人）`)}
        ${kpi("議員立法（筆頭）", `${g.bills}<small>件</small>`, `全体 ${a.bills}件`)}
        ${kpi("質問主意書", `${g.questions}<small>件</small>`, `全体 ${a.questions}件`)}` : ""}
      </div>
      <div class="group-grid">
        ${panels}
      </div>
      <section class="panel">
        <div class="list-head">
          <h3>議員の一覧 <small>${group.length}人</small></h3>
          <label class="picker small"><span>並べ方</span><select id="sort">
            <option value="kana" ${state.sort === "kana" ? "selected" : ""}>ふりがな順</option>
            <option value="speeches" ${state.sort === "speeches" ? "selected" : ""}>発言の多い順</option>
            <option value="terms" ${state.sort === "terms" ? "selected" : ""}>当選回数の多い順</option>
            <option value="age" ${state.sort === "age" ? "selected" : ""}>年齢の高い順</option>
          </select></label>
        </div>
        <div class="table-scroll"><table class="members">
          <thead><tr><th scope="col">名前</th><th scope="col">政党</th><th scope="col">院・選挙区</th><th scope="col" class="num">年齢</th><th scope="col" class="num">当選</th><th scope="col" class="num">発言</th><th scope="col">${hasPromises ? "公約の状況" : "前職（目安）"}</th></tr></thead>
          <tbody>${shown.map((m) => {
            const p = data.partyById.get(m.party);
            const c = statusCounts([m]);
            return `<tr>
              <th scope="row"><button class="name-link" data-open="${esc(m.id)}">${esc(m.name)}</button></th>
              <td><span class="party" style="--pc:${esc(p?.color)}">${esc(p?.name)}</span></td>
              <td>${esc(m.house.slice(0, 1))}・${esc(m.district)}</td>
              <td class="num">${age(m) ?? "—"}</td><td class="num">${m.terms}</td><td class="num">${m.activity?.speeches ?? "—"}</td>
              <td>${hasPromises ? `<span class="mini">${STATUS_ORDER.filter((k) => c[k]).map((k) => `<i style="background:var(--st-${k});flex:${c[k]}" title="${STATUS[k]} ${c[k]}件"></i>`).join("")}</span>` : esc(m.career)}</td>
            </tr>`;
          }).join("")}</tbody>
        </table></div>
        ${rows.length > shown.length ? `<button class="more" id="more">もっと見る（残り ${rows.length - shown.length}人）</button>` : ""}
      </section>`;
  }

  const kpi = (label, value, sub) => `<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ""}</div>`;

  // ---- 一人のステータス画面 ----
  function openDetail(id, tab = "quests") {
    const m = byMember.get(id);
    if (!m) return;
    tip.hidden = true;
    const p = data.partyById.get(m.party);
    const c = statusCounts([m]);
    const promises = [...(m.promises ?? [])].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
    const log = [...(m.achievements ?? [])].sort((a, b) => b.date.localeCompare(a.date));

    detail.innerHTML = `<div class="sheet" style="--pc:${esc(p?.color)}" role="dialog" aria-modal="true" aria-labelledby="d-name">
      <button class="close" id="close">✕ 分析にもどる</button>
      <section class="hero">
        <div class="art">${m.avatar ? avatar(m.avatar, p?.color) : silhouette(p?.color)}</div>
        <div class="info">
          <div><span class="kana">${esc(m.kana)}</span><h2 class="name" id="d-name">${esc(m.name)}</h2></div>
          <dl class="profile">
            <dt>所属</dt><dd>${esc(m.house)}・${esc(p?.name)}</dd>
            <dt>選挙区</dt><dd>${esc(m.district)}</dd>
            <dt>当選</dt><dd>${esc(m.terms)}回${m.termsOther ? `（${m.house === "衆議院" ? "参" : "衆"}${m.termsOther}回）` : ""} <span class="stars">${stars(m.terms)}</span></dd>
            <dt>年齢・性別</dt><dd>${age(m) === null ? "生年不明" : `${age(m)}歳`}・${esc(m.gender)}</dd>
            <dt>前職</dt><dd>${esc(m.career)}${data.meta.sample ? "" : `<span class="when">（経歴文からの目安）</span>`}</dd>
            ${m.electedBy ? `<dt>選ばれ方</dt><dd>${esc(m.electedBy)}${m.firstElected ? `・初当選 ${m.firstElected}年` : ""}</dd>` : ""}
            ${m.ministerial ? `<dt>政府の役職</dt><dd>${esc(m.ministerial)}</dd>` : ""}
            ${m.electedBy ? `<dt>学び</dt><dd>${esc(m.university ?? "大学の記載なし")}${m.studiedAbroad ? "・海外で学んだ経歴あり" : ""}</dd>` : ""}
            ${m.hometown ? `<dt>生まれ</dt><dd>${esc(m.birthPref ?? "—")}（${esc(m.hometown)}）</dd>` : ""}
            ${m.dynasty === "親・祖父母に国会議員" ? `<dt>家族</dt><dd>親・祖父母に国会議員<span class="when">（${m.wikidata ? `<a href="${esc(safeUrl(m.wikidata))}" target="_blank" rel="noopener">Wikidata</a>` : "Wikidata"}）</span></dd>` : ""}
          </dl>
          <div class="skills" aria-label="力を入れている分野">${(m.fields ?? []).map((f) => `<span class="skill">${esc(f)}</span>`).join("")}</div>
          ${m.catchphrase ? `<p class="serif">「${esc(m.catchphrase.quote)}」<small>${esc(m.catchphrase.source.title)} ${esc(m.catchphrase.source.date)}・<a href="${esc(safeUrl(m.catchphrase.source.url))}" target="_blank" rel="noopener">原文</a></small></p>` : ""}
          ${m.review ? `<div>${reviewBadge(m)} ${m.review.generatedAt ? `<span class="when">下書き ${esc(m.review.generatedAt)}</span>` : ""}</div>` : ""}
          ${m.profileUrl ? `<p class="when">出典：<a href="${esc(safeUrl(m.profileUrl))}" target="_blank" rel="noopener">${esc(m.house)}の紹介ページ</a>${m.genderSource ? `・性別は${esc(m.genderSource)}` : ""}${m.birthSource ? `・生年は${esc(m.birthSource)}` : ""}</p>` : ""}
        </div>
      </section>
      ${m.bio ? `<details class="bio"><summary>公式の経歴を読む</summary><p>${esc(m.bio)}</p></details>` : ""}
      <section class="stats" aria-label="ステータス">
        ${(m.promises ?? []).length ? `
        <div class="stat"><div class="label">公約</div><div class="value">${m.promises.length}</div></div>
        <div class="stat"><div class="label">実現</div><div class="value" style="color:var(--st-achieved)">${c.achieved}</div></div>
        <div class="stat"><div class="label">進行中</div><div class="value" style="color:var(--st-in_progress)">${c.in_progress}</div></div>` : `
        <div class="stat"><div class="label">当選</div><div class="value">${m.terms}</div></div>
        <div class="stat"><div class="label">年齢</div><div class="value">${age(m) ?? "—"}</div></div>
        <div class="stat"><div class="label">${m.stats ? "議員立法・質問主意書" : "議員立法"}</div><div class="value">${m.stats ? `${m.stats.billsLead + m.stats.billsCosponsored}・${m.stats.questions}` : (m.achievements ?? []).filter((x) => x.type === "bill").length || "—"}</div></div>`}
        <div class="stat"><div class="label">国会での発言</div><div class="value">${m.activity?.speeches ?? "—"}</div></div>
      </section>
      ${(m.promises ?? []).length ? statusBar(c) : ""}
      <div class="tabs" role="tablist">
        <button class="tab" role="tab" data-tab="quests" aria-selected="${tab === "quests"}">公約クエスト</button>
        <button class="tab" role="tab" data-tab="log" aria-selected="${tab === "log"}">活動ログ</button>
      </div>
      <div ${tab === "quests" ? "" : "hidden"} data-panel="quests">
        ${promises.length ? "" : `<p class="empty-note">この議員の公約はまだ作成していません。選挙公報と会議録から、出典つきで AI が下書きする予定です（scripts/generate.js）。</p>`}
        <ul class="quests">${promises.map((q) => `
          <li class="quest" style="--sc:var(--st-${esc(q.status)})">
            <header><h3>${esc(q.title)}</h3><span class="status">${esc(STATUS[q.status])}</span></header>
            <p>${esc(q.detail)}</p>
            <span class="when">${esc(q.madeIn)}${q.madeAt ? `（${esc(q.madeAt)}）` : ""}・分野：${esc(q.field)}</span>
            <div class="why"><b>AI判定の根拠</b>${esc(q.statusNote)}</div>
            ${sourceList(q.sources, "約束の出典")}
            ${sourceList(q.evidence, "判定の根拠")}
          </li>`).join("")}</ul>
      </div>
      <div ${tab === "log" ? "" : "hidden"} data-panel="log">
        ${log.length ? "" : `<p class="empty-note">${m.stats ? "第219回国会（2025年10月）以降、この議員が提出した議員立法・質問主意書は見つかりませんでした。" : "法案・質問主意書などの活動ログはまだ作成していません。"}</p>`}
        <ul class="log">${log.map((a) => `
          <li><time datetime="${esc(a.date)}">${esc(a.date)}</time>
            <div class="entry"><span class="type">${esc(TYPE[a.type] ?? a.type)}</span><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p>${sourceList(a.sources)}</div>
          </li>`).join("")}</ul>
        ${m.activity ? `<p class="when">国会での発言 ${m.activity.speeches}回（${esc(m.activity.since)}以降）・<a href="${esc(safeUrl(m.activity.source.url))}" target="_blank" rel="noopener">${esc(m.activity.source.title)}</a></p>` : ""}
      </div>
    </div>`;
    detail.hidden = false;
    document.body.style.overflow = "hidden";
    detail.querySelector("#close").focus();
    detail.dataset.from = id;
  }

  function closeDetail() {
    const id = detail.dataset.from;
    detail.hidden = true;
    detail.innerHTML = "";
    document.body.style.overflow = "";
    root.querySelector(`[data-open="${CSS.escape(id ?? "")}"]`)?.focus();
  }

  // ---- 操作 ----
  const set = (patch) => { Object.assign(state, patch); render(); };
  $("#ax-x").addEventListener("change", (e) => set({ x: e.target.value, cell: null }));
  $("#ax-y").addEventListener("change", (e) => set({ y: e.target.value, cell: null }));
  $("#ax-color").addEventListener("change", (e) => set({ color: e.target.value }));
  $("#swap").addEventListener("click", () => {
    set({ x: state.y, y: state.x, cell: null });
    $("#ax-x").value = state.x;
    $("#ax-y").value = state.y;
  });
  $("#q").addEventListener("input", (e) => set({ q: e.target.value.trim(), cell: null, limit: 40 }));
  root.querySelectorAll("[data-house]").forEach((b) => b.addEventListener("click", () => {
    root.querySelectorAll("[data-house]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    set({ house: b.dataset.house, cell: null, limit: 40 });
  }));
  root.querySelector(".presets").addEventListener("click", (e) => {
    const b = e.target.closest("[data-preset]");
    if (!b) return;
    const p = presets[Number(b.dataset.preset)];
    $("#ax-x").value = p.x; $("#ax-y").value = p.y; $("#ax-color").value = p.color;
    set({ x: p.x, y: p.y, color: p.color, cell: null, limit: 40 });
  });

  matrix.addEventListener("click", (e) => {
    const dot = e.target.closest("i[data-id]");
    if (dot) return openDetail(dot.dataset.id);
    const cell = e.target.closest(".cell");
    if (!cell) return;
    const key = cell.dataset.key;
    set({ cell: state.cell === key ? null : key, limit: 40 });
    $("#group").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });
  matrix.addEventListener("pointermove", (e) => {
    const dot = e.target.closest("i[data-id]");
    if (!dot) { tip.hidden = true; return; }
    const m = byMember.get(dot.dataset.id);
    const C = byId.get(state.color);
    tip.innerHTML = `<b>${esc(m.name)}</b><span>${esc(data.partyById.get(m.party)?.name)}・${esc(m.house)}</span>${state.color !== "none" ? `<span>${esc(C.label)}：${esc(C.get(m))}</span>` : ""}`;
    tip.hidden = false;
    const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8);
    const y = e.clientY + 16 + tip.offsetHeight > innerHeight ? e.clientY - tip.offsetHeight - 10 : e.clientY + 16;
    tip.style.transform = `translate(${x}px, ${y}px)`;
  });
  matrix.addEventListener("pointerleave", () => { tip.hidden = true; });

  $("#group").addEventListener("click", (e) => {
    const open = e.target.closest("[data-open]");
    if (open) return openDetail(open.dataset.open);
    if (e.target.closest("#clear-cell")) return set({ cell: null });
    if (e.target.closest("#more")) return set({ limit: state.limit + 80 });
  });
  $("#group").addEventListener("change", (e) => { if (e.target.id === "sort") set({ sort: e.target.value }); });

  detail.addEventListener("click", (e) => {
    if (e.target === detail || e.target.closest("#close")) return closeDetail();
    const tab = e.target.closest("[data-tab]");
    if (tab) {
      detail.querySelectorAll("[data-tab]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      detail.querySelectorAll("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !detail.hidden) closeDetail(); });

  render();
}

async function boot() {
  const root = document.getElementById("app");
  try {
    const data = window.GIIN_DATA ?? await (await fetch("data/members.json")).json();
    renderApp(root, data);
  } catch (e) {
    root.innerHTML = `<p class="empty">データを読み込めませんでした（${esc(e.message)}）。data/members.json があるか確かめてください。</p>`;
  }
}

boot();

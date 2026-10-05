// 議員図鑑の画面。データは window.GIIN_DATA（1枚にまとめたプレビュー）か data/members.json から読む。

const STATUS = {
  achieved: "実現",
  in_progress: "進行中",
  not_started: "動きなし",
  stalled: "停滞・撤回",
  unverifiable: "判定できず",
};
const STATUS_ORDER = Object.keys(STATUS);
const TYPE = { bill: "法案", question: "質問・質疑", written_question: "質問主意書", committee: "委員会・役職", other: "その他" };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const safeUrl = (u) => (/^https?:\/\//.test(u ?? "") ? u : "#");

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

function counts(m) {
  const c = Object.fromEntries(STATUS_ORDER.map((k) => [k, 0]));
  for (const p of m.promises ?? []) c[p.status] = (c[p.status] ?? 0) + 1;
  return c;
}

function statusBar(m) {
  const c = counts(m);
  const total = (m.promises ?? []).length || 1;
  const segs = STATUS_ORDER.filter((k) => c[k]).map((k) => `<span style="width:${(c[k] / total) * 100}%;background:var(--st-${k})" title="${STATUS[k]} ${c[k]}件"></span>`).join("");
  const legend = STATUS_ORDER.filter((k) => c[k]).map((k) => `<span><i style="background:var(--st-${k})"></i>${STATUS[k]} ${c[k]}</span>`).join("");
  return `<div class="bar" role="img" aria-label="公約の状況 ${STATUS_ORDER.filter((k) => c[k]).map((k) => `${STATUS[k]}${c[k]}件`).join("、")}">${segs}</div><div class="legend">${legend}</div>`;
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

function renderApp(root, data) {
  const parties = new Map(data.parties.map((p) => [p.id, p]));
  const state = { q: "", house: "", party: "" };

  root.innerHTML = `
    <header class="masthead">
      <h1 class="logo"><small>KOKKAI GIIN ZUKAN</small>国会議員<em>図鑑</em></h1>
      <div class="count">登録 <b id="count">${data.members.length}</b> 人</div>
    </header>
    ${data.meta.sample ? `<p class="notice"><strong>サンプル表示中：</strong>${esc(data.meta.note)}</p>` : ""}
    <div class="filters" role="search">
      <input type="search" id="q" placeholder="名前・分野・公約で探す（例：保育）" aria-label="議員を探す">
      <button class="chip" data-house="" aria-pressed="true">全員</button>
      <button class="chip" data-house="衆議院" aria-pressed="false">衆議院</button>
      <button class="chip" data-house="参議院" aria-pressed="false">参議院</button>
      <select id="party" class="chip" aria-label="政党で絞り込む">
        <option value="">すべての政党</option>
        ${data.parties.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}
      </select>
    </div>
    <div class="grid" id="grid"></div>
    <footer class="footer">
      内容は国会会議録・選挙公報などの公開情報から AI が下書きし、引用が原文にあることを機械で照合しています。
      「AI下書き・未確認」の議員は、人の目での確認がまだです。誤りに気づいたら出典を添えてお知らせください。
      ${data.meta.updatedAt ? `最終更新 ${esc(data.meta.updatedAt)}` : ""}
    </footer>
    <div class="detail" id="detail" hidden></div>`;

  const grid = root.querySelector("#grid");
  const detail = root.querySelector("#detail");

  const matches = (m) => {
    if (state.house && m.house !== state.house) return false;
    if (state.party && m.party !== state.party) return false;
    if (!state.q) return true;
    const hay = [m.name, m.kana, m.district, parties.get(m.party)?.name, ...(m.fields ?? []),
      ...(m.promises ?? []).flatMap((p) => [p.title, p.detail])].join(" ");
    return hay.includes(state.q);
  };

  function renderGrid() {
    const list = data.members.filter(matches);
    root.querySelector("#count").textContent = list.length;
    grid.innerHTML = list.length ? list.map((m) => {
      const p = parties.get(m.party);
      return `<button class="card" data-id="${esc(m.id)}" style="--pc:${esc(p?.color)}" aria-label="${esc(m.name)}のステータスを見る">
        <div class="art">${avatar(m.avatar, p?.color)}<span class="house">${esc(m.house)}</span><span class="terms" title="当選${m.terms}回">${stars(m.terms)}</span></div>
        <div class="body">
          <span class="kana">${esc(m.kana)}</span>
          <h2 class="name">${esc(m.name)}</h2>
          <div class="meta"><span class="party">${esc(p?.name)}</span>・${esc(m.district)}</div>
          ${statusBar(m)}
          ${m.catchphrase ? `<p class="quote">${esc(m.catchphrase.quote)}</p>` : ""}
          <div>${reviewBadge(m)}</div>
        </div>
      </button>`;
    }).join("") : `<p class="empty">条件に合う議員が見つかりません。言葉を変えて探してみてください。</p>`;
  }

  function openDetail(id, tab = "quests") {
    const m = data.members.find((x) => x.id === id);
    if (!m) return;
    const p = parties.get(m.party);
    const c = counts(m);
    const promises = [...(m.promises ?? [])].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
    const log = [...(m.achievements ?? [])].sort((a, b) => b.date.localeCompare(a.date));

    detail.innerHTML = `<div class="sheet" style="--pc:${esc(p?.color)}" role="dialog" aria-modal="true" aria-labelledby="d-name">
      <button class="close" id="close">✕ 図鑑にもどる</button>
      <section class="hero">
        <div class="art">${avatar(m.avatar, p?.color)}</div>
        <div class="info">
          <div><span class="kana">${esc(m.kana)}</span><h2 class="name" id="d-name">${esc(m.name)}</h2></div>
          <dl class="profile">
            <dt>所属</dt><dd>${esc(m.house)}・${esc(p?.name)}</dd>
            <dt>選挙区</dt><dd>${esc(m.district)}</dd>
            <dt>当選</dt><dd>${esc(m.terms)}回 <span style="color:var(--star)">${stars(m.terms)}</span></dd>
          </dl>
          <div class="skills" aria-label="力を入れている分野">${(m.fields ?? []).map((f) => `<span class="skill">${esc(f)}</span>`).join("")}</div>
          ${m.catchphrase ? `<p class="serif">「${esc(m.catchphrase.quote)}」<small>${esc(m.catchphrase.source.title)} ${esc(m.catchphrase.source.date)}・<a href="${esc(safeUrl(m.catchphrase.source.url))}" target="_blank" rel="noopener">原文</a></small></p>` : ""}
          <div>${reviewBadge(m)} ${m.review?.generatedAt ? `<span class="when">下書き ${esc(m.review.generatedAt)}</span>` : ""}</div>
        </div>
      </section>
      <section class="stats" aria-label="ステータス">
        <div class="stat"><div class="label">公約</div><div class="value">${(m.promises ?? []).length}</div></div>
        <div class="stat"><div class="label">実現</div><div class="value" style="color:var(--st-achieved)">${c.achieved}</div></div>
        <div class="stat"><div class="label">進行中</div><div class="value" style="color:var(--st-in_progress)">${c.in_progress}</div></div>
        <div class="stat"><div class="label">活動ログ</div><div class="value">${log.length}</div></div>
      </section>
      ${statusBar(m)}
      <div class="tabs" role="tablist">
        <button class="tab" role="tab" data-tab="quests" aria-selected="${tab === "quests"}">公約クエスト</button>
        <button class="tab" role="tab" data-tab="log" aria-selected="${tab === "log"}">活動ログ</button>
      </div>
      <div ${tab === "quests" ? "" : "hidden"} data-panel="quests">
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
        <ul class="log">${log.map((a) => `
          <li><time datetime="${esc(a.date)}">${esc(a.date)}</time>
            <div class="entry"><span class="type">${esc(TYPE[a.type] ?? a.type)}</span><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p>${sourceList(a.sources)}</div>
          </li>`).join("")}</ul>
      </div>
      <section class="howto">
        <h2>この図鑑の読み方</h2>
        <ul>
          <li>「公約クエスト」は本人が選挙公報や発言で約束したこと。状況は AI が資料から判定し、根拠の出典を添えています。</li>
          <li>根拠が見つからないものは「判定できず」にしています。「動きなし」は資料の範囲で動きを確認できないという意味です。</li>
          <li>星の数は当選回数です。議員どうしの優劣をつけるものではありません。</li>
        </ul>
      </section>
    </div>`;
    detail.hidden = false;
    document.body.style.overflow = "hidden";
    detail.querySelector("#close").focus();
    if (location.hash !== `#${m.id}`) history.replaceState(null, "", `#${m.id}`);
  }

  function closeDetail() {
    const id = location.hash.slice(1);
    detail.hidden = true;
    detail.innerHTML = "";
    document.body.style.overflow = "";
    history.replaceState(null, "", location.pathname + location.search);
    grid.querySelector(`[data-id="${CSS.escape(id)}"]`)?.focus();
  }

  root.querySelector("#q").addEventListener("input", (e) => { state.q = e.target.value.trim(); renderGrid(); });
  root.querySelector("#party").addEventListener("change", (e) => { state.party = e.target.value; renderGrid(); });
  root.querySelectorAll("[data-house]").forEach((b) => b.addEventListener("click", () => {
    state.house = b.dataset.house;
    root.querySelectorAll("[data-house]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    renderGrid();
  }));
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) openDetail(card.dataset.id);
  });
  detail.addEventListener("click", (e) => {
    if (e.target === detail || e.target.closest("#close")) return closeDetail();
    const tab = e.target.closest("[data-tab]");
    if (tab) {
      detail.querySelectorAll("[data-tab]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      detail.querySelectorAll("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !detail.hidden) closeDetail(); });

  renderGrid();
  const start = location.hash.slice(1);
  if (start) openDetail(start);
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

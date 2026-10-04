// 本文に差し込む株価チャート。線が左から引かれ、株価の数字が終値まで動く。
// 上昇は赤、下落は紺（日本の相場表示にならう）。
// before（それまでの終値）があれば、左側に細い線で常に描いておき、その日の動きとの落差を見せる。
// kind: "quote" は値がつかなかった日。売買が成立しないので線は引かず、気配値まで落ちる矢印と、板を出す。

import { el, svg } from "./dom.js";

const W = 300;
const H = 104;
const PAD = 6;
const SPLIT = 0.42; // before がある時、左からこの割合までを「それまで」に使う
const yen = (n) => Math.round(n).toLocaleString("ja-JP");

/**
 * それまでの推移と、その日の値動きを同じ縦軸に置く。
 * @param {number[]} before それまでの終値（最後が前日終値）
 * @param {number[]} values その日の縦軸に乗せたい値
 */
function frame(before, values) {
  const all = [...before, ...values];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || hi * 0.05;
  const y = (v) => H - PAD - ((v - (lo - pad)) / (hi - lo + pad * 2)) * (H - PAD * 2);
  const x0 = before.length ? PAD + (W - PAD * 2) * SPLIT : PAD;
  const past = before.length > 1
    ? [svg("path", {
        class: "ticker-past",
        d: before.map((v, i) => `${i ? "L" : "M"} ${(PAD + (i / (before.length - 1)) * (x0 - PAD)).toFixed(1)} ${y(v).toFixed(1)}`).join(" "),
      })]
    : [];
  return { y, x0, past };
}

/**
 * @param {{ name: string, label?: string, note?: string, points: number[], before?: number[] }} chart  label は書き手のメモ（画面には出さない）
 * @param {number} delay 表示を始めるまでの秒数（段落の浮かび上がりに合わせる）
 */
export function stockChart(chart, delay = 0) {
  if (chart.kind === "quote") return limitQuote(chart, delay);
  const { points, before = [] } = chart;
  const first = points[0];
  const last = points[points.length - 1];
  const diff = last - first;
  const pct = (diff / first) * 100;
  const dir = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "±";

  const { y, x0, past } = frame(before, points);
  const x = (i) => x0 + (i / (points.length - 1)) * (W - PAD - x0);
  const d = points.map((v, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");

  const price = el("span", { class: "ticker-price" }, yen(first));
  const figure = el("figure", { class: `ticker ticker-${dir} reveal`, style: `animation-delay:${delay}s` }, [
    el("div", { class: "ticker-head" }, [
      el("span", { class: "ticker-name" }, chart.name),
      el("span", { class: "ticker-now" }, [price, el("small", {}, "円")]),
    ]),
    svg("svg", { class: "ticker-chart", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", role: "img",
      "aria-label": `${chart.name}${before.length ? ` ${yen(before[0])}円から上がり続け、` : " "}${yen(first)}円から${yen(last)}円へ（${sign}${Math.abs(pct).toFixed(1)}%）` }, [
      ...past,
      svg("line", { class: "ticker-base", x1: x0, x2: W - PAD, y1: y(first), y2: y(first) }),
      svg("path", { class: "ticker-line", d, pathLength: "1", style: `animation-delay:${delay + 0.2}s` }),
      svg("circle", { class: "ticker-dot", cx: x(points.length - 1), cy: y(last), r: 3.5, style: `animation-delay:${delay + 1.4}s` }),
    ]),
    ends(before[0] ?? first, last, delay),
    el("div", { class: "ticker-foot" }, [
      el("span", { class: "ticker-chg" }, `${dir === "up" ? "▲" : dir === "down" ? "▼" : "―"} ${yen(Math.abs(diff))}円（${sign}${Math.abs(pct).toFixed(1)}%）`),
      chart.note && el("span", { class: "ticker-note" }, chart.note),
    ]),
  ]);

  // 数字を前日終値から終値まで動かす（線を引く1.2秒に合わせる）
  countTo(figure, price, (t) => points[Math.round(t * (points.length - 1))], last, delay + 0.2, 1200);
  return figure;
}

/** チャートの左端と右端（終値）の値段 */
function ends(left, last, delay) {
  return el("div", { class: "ticker-ends" }, [
    el("span", {}, `${yen(left)}円`),
    el("span", { class: "ticker-end-last", style: `animation-delay:${delay + 1.4}s` }, `${yen(last)}円`),
  ]);
}

/** 表示中の数字を動かす。全文表示のタップ（data-now）や動きを減らす設定では、すぐ最後の値へ */
function countTo(figure, node, at, last, delay, ms) {
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { node.textContent = yen(last); return; }
  const startAt = performance.now() + delay * 1000;
  const run = (now) => {
    if (!figure.isConnected && now > startAt + 3000) return;
    if (figure.dataset.now) { node.textContent = yen(last); return; }
    const t = Math.min(1, Math.max(0, (now - startAt) / ms));
    node.textContent = yen(at(t));
    if (t < 1) requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
}

/**
 * 値がつかなかった日（ストップ安の売り気配／ストップ高の買い気配）。
 * 寄りつきで気配値まで落ち（上がり）、その値のまま一日が終わる。線ではなく点を並べて「気配」を示す
 */
function limitQuote(chart, delay) {
  const { close, limit, sell, buy, before = [] } = chart;
  const down = limit < close;
  const side = down ? "売り気配" : "買い気配";
  const diff = limit - close;
  const pct = (diff / close) * 100;
  const sign = down ? "−" : "+";

  const { y, x0, past } = frame(before, [close, limit]);
  const X0 = x0 + 8;
  const tip = y(limit) + (down ? -7 : 7);

  const price = el("span", { class: "ticker-price" }, yen(close));
  const max = Math.max(sell, buy) || 1;
  const row = (name, n, k) => el("div", { class: `board-row board-${k}` }, [
    el("span", { class: "board-side" }, name),
    el("span", { class: "board-track" }, el("span", {
      class: "board-bar",
      style: `width:max(2px, ${(n / max) * 100}%);animation-delay:${delay + 1.1 + (k === "sell" ? 0 : 0.15)}s`,
    })),
    el("span", { class: "board-qty" }, `${yen(n)}株`),
  ]);

  const figure = el("figure", { class: `ticker ticker-quote ticker-${down ? "down" : "up"} reveal`, style: `animation-delay:${delay}s` }, [
    el("div", { class: "ticker-head" }, [
      el("span", { class: "ticker-name" }, chart.name),
      el("span", { class: "ticker-now" }, [
        el("span", { class: "quote-badge" }, side),
        price, el("small", {}, "円"),
      ]),
    ]),
    svg("svg", { class: "ticker-chart", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", role: "img",
      "aria-label": `${chart.name} 前日終値${yen(close)}円。${yen(limit)}円の${side}のまま、値がつかなかった。売り${yen(sell)}株、買い${yen(buy)}株` }, [
      ...past,
      svg("line", { class: "ticker-base", x1: x0, x2: W - PAD, y1: y(close), y2: y(close) }),
      svg("path", { class: "quote-drop", d: `M ${X0} ${y(close)} L ${X0} ${y(limit)}`, pathLength: "1", style: `animation-delay:${delay + 0.2}s` }),
      svg("path", { class: "quote-tip", d: `M ${X0 - 5} ${tip} L ${X0} ${y(limit)} L ${X0 + 5} ${tip}`, style: `animation-delay:${delay + 0.75}s` }),
      // 売買が成立していないので、線ではなく点を並べる（寄りから大引けまで、気配のまま）
      svg("g", { class: "quote-line", style: `animation-delay:${delay + 0.8}s` },
        Array.from({ length: Math.floor((W - PAD - X0 - 8) / 8) + 1 }, (_, i) =>
          svg("circle", { cx: X0 + 8 + i * 8, cy: y(limit), r: 1.6 }))),
    ]),
    ends(before[0] ?? close, limit, delay),
    el("div", { class: "board", role: "table", "aria-label": "板" }, [
      row("売り", sell, "sell"),
      row("買い", buy, "buy"),
    ]),
    el("div", { class: "ticker-foot" }, [
      el("span", { class: "ticker-chg" }, `${down ? "▼" : "▲"} ${yen(Math.abs(diff))}円（${sign}${Math.abs(pct).toFixed(1)}%）`),
      chart.note && el("span", { class: "ticker-note" }, chart.note),
    ]),
    el("div", { class: "quote-volume" }, "値つかず　出来高 0株"),
  ]);

  countTo(figure, price, (t) => close + diff * t, limit, delay + 0.2, 550);
  return figure;
}

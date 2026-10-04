// 本文に差し込む株価チャート。線が左から引かれ、株価の数字が終値まで動く。
// 上昇は赤、下落は紺（日本の相場表示にならう）。

import { el, svg } from "./dom.js";

const W = 300;
const H = 92;
const PAD = 6;
const yen = (n) => Math.round(n).toLocaleString("ja-JP");

/**
 * @param {{ name: string, label?: string, note?: string, points: number[] }} chart
 * @param {number} delay 表示を始めるまでの秒数（段落の浮かび上がりに合わせる）
 */
export function stockChart(chart, delay = 0) {
  const { points } = chart;
  const first = points[0];
  const last = points[points.length - 1];
  const diff = last - first;
  const pct = (diff / first) * 100;
  const dir = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "±";

  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const x = (i) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (v) => H - PAD - ((v - lo) / (hi - lo || 1)) * (H - PAD * 2);
  const d = points.map((v, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");

  const price = el("span", { class: "ticker-price" }, yen(first));
  const lineDelay = `animation-delay:${delay + 0.2}s`;
  const figure = el("figure", { class: `ticker ticker-${dir} reveal`, style: `animation-delay:${delay}s` }, [
    el("div", { class: "ticker-head" }, [
      el("span", { class: "ticker-name" }, chart.name),
      el("span", { class: "ticker-now" }, [price, el("small", {}, "円")]),
    ]),
    svg("svg", { class: "ticker-chart", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", role: "img",
      "aria-label": `${chart.name} ${yen(first)}円から${yen(last)}円へ（${sign}${Math.abs(pct).toFixed(1)}%）` }, [
      svg("line", { class: "ticker-base", x1: PAD, x2: W - PAD, y1: y(first), y2: y(first) }),
      svg("path", { class: "ticker-line", d, pathLength: "1", style: lineDelay }),
      svg("circle", { class: "ticker-dot", cx: x(points.length - 1), cy: y(last), r: 3.5, style: `animation-delay:${delay + 1.4}s` }),
    ]),
    el("div", { class: "ticker-foot" }, [
      el("span", { class: "ticker-chg" }, `${dir === "up" ? "▲" : dir === "down" ? "▼" : "―"} ${yen(Math.abs(diff))}円（${sign}${Math.abs(pct).toFixed(1)}%）`),
      el("span", { class: "ticker-label" }, [chart.label, chart.note && el("span", { class: "ticker-note" }, chart.note)]),
    ]),
  ]);

  // 数字を前日終値から終値まで動かす（線を引く1.2秒に合わせる）。全文表示のタップで即座に終値へ
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    price.textContent = yen(last);
  } else {
    const startAt = performance.now() + (delay + 0.2) * 1000;
    const run = (now) => {
      if (!figure.isConnected && now > startAt + 3000) return;
      if (figure.dataset.now) { price.textContent = yen(last); return; }
      const t = Math.min(1, Math.max(0, (now - startAt) / 1200));
      price.textContent = yen(points[Math.round(t * (points.length - 1))]);
      if (t < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }
  return figure;
}

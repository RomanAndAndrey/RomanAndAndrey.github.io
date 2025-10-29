"use strict";

// Валюты: соответствие ISO-кода (для подписи) и ID ЦБ (VAL_NM_RQ)
const CURRENCIES = {
  R01235: { code: "USD", name: "Доллар США" },
  R01239: { code: "EUR", name: "Евро" },
  R01375: { code: "CNY", name: "Китайский юань" },
  R01035: { code: "GBP", name: "Британский фунт" },
  R01820: { code: "JPY", name: "Японская иена" },
  R01335: { code: "KZT", name: "Казахстанский тенге" }
};

const $ = (sel) => document.querySelector(sel);

window.addEventListener("DOMContentLoaded", () => {
  $("#reload-btn").addEventListener("click", loadAndRender);
  $("#currency-select").addEventListener("change", loadAndRender);
  $("#period-select").addEventListener("change", loadAndRender);
  loadAndRender();
});

async function loadAndRender() {
  const id = $("#currency-select").value;
  const days = parseInt($("#period-select").value, 10);
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days);

  setError("");
  setLoading(true);
  try {
    const points = await fetchDynamicRates(id, from, to);
    if (!points.length) throw new Error("Нет данных от ЦБ РФ по заданному периоду");

    // Пересчитать к 1 единице валюты, отсортировать по дате
    points.sort((a, b) => a.date - b.date);
    const values = points.map((p) => ({
      date: p.date,
      value: p.nominal && p.nominal > 0 ? p.value / p.nominal : p.value
    }));

    // Обновить метрики
    const last = values[values.length - 1].value;
    const first = values[0].value;
    const diff = last - first;
    const pct = (diff / first) * 100;
    $("#current-rate").textContent = fmtPrice(last) + " ₽ за 1 " + CURRENCIES[id].code;
    $("#change-rate").innerHTML = diff >= 0
      ? `<span style="color:#2ecc71">▲ ${fmtPrice(diff)} (${pct.toFixed(2)}%)</span>`
      : `<span style="color:#e74c3c">▼ ${fmtPrice(Math.abs(diff))} (${pct.toFixed(2)}%)</span>`;

    // Нарисовать график
    const canvas = $("#chart");
    drawChart(canvas, values, `${CURRENCIES[id].code} / RUB за ${days} дн.`);
  } catch (e) {
    console.error(e);
    setError(
      "Не удалось загрузить данные ЦБ РФ. Возможно, браузер блокирует CORS-запрос к cbr.ru. Откройте проект локально (python3 -m http.server) и попробуйте другой браузер, либо уменьшите период."
    );
  } finally {
    setLoading(false);
  }
}

function setLoading(is) {
  $("#reload-btn").disabled = is;
  $("#reload-btn").textContent = is ? "Загрузка…" : "Обновить";
}

function setError(msg) {
  const box = $("#error");
  if (!msg) {
    box.hidden = true;
    box.textContent = "";
  } else {
    box.hidden = false;
    box.textContent = msg;
  }
}

function fmtPrice(v) {
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function ddmmyyyy(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

async function fetchDynamicRates(id, from, to) {
  const query = `date_req1=${ddmmyyyy(from)}&date_req2=${ddmmyyyy(to)}&VAL_NM_RQ=${encodeURIComponent(id)}`;

  // Стратегия:
  // 1) Если локально и запущен наш прокси — пробуем его
  // 2) Пытаемся прямой запрос к ЦБ РФ
  // 3) Фолбэк на публичный CORS-прокси (можно отключить флагом)

  const tryUrls = [];
  const isLocal = /^(localhost|127\.0\.0\.1)/.test(location.hostname);
  const useLocalProxy = (window.USE_LOCAL_PROXY ?? true) && isLocal;
  const allowPublicProxy = !(window.DISABLE_PUBLIC_PROXY ?? false);

  if (useLocalProxy) {
    tryUrls.push(`http://localhost:8787/cbr?${query}`);
  }
  tryUrls.push(`https://www.cbr.ru/scripts/XML_dynamic.asp?${query}`);
  if (allowPublicProxy) {
    tryUrls.push(`https://cors.isomorphic-git.org/https://www.cbr.ru/scripts/XML_dynamic.asp?${query}`);
  }

  let lastErr = null;
  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("CBR HTTP " + res.status);
      const text = await res.text();
      const xml = new window.DOMParser().parseFromString(text, "text/xml");
      const recs = Array.from(xml.getElementsByTagName("Record"));
      return recs.map((rec) => {
        const dateAttr = rec.getAttribute("Date"); // DD.MM.YYYY
        const [d, m, y] = dateAttr.split(".").map((x) => parseInt(x, 10));
        const date = new Date(y, m - 1, d);
        const valNode = rec.getElementsByTagName("Value")[0];
        const nomNode = rec.getElementsByTagName("Nominal")[0];
        const raw = valNode ? valNode.textContent.trim().replace(",", ".") : "0";
        const nominal = nomNode ? parseInt(nomNode.textContent.trim(), 10) : 1;
        const value = parseFloat(raw);
        return { date, value, nominal };
      });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Не удалось получить данные ЦБ РФ");
}

function drawChart(canvas, series, title) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Padding
  const pad = { l: 60, r: 20, t: 36, b: 40 };

  // Domain
  const values = series.map((p) => p.value);
  const vmin = Math.min(...values);
  const vmax = Math.max(...values);
  const vrange = vmax - vmin || 1;
  const ymin = vmin - vrange * 0.1;
  const ymax = vmax + vrange * 0.1;

  // Scales
  const X = (i) => pad.l + (i * (W - pad.l - pad.r)) / (series.length - 1 || 1);
  const Y = (v) => pad.t + (1 - (v - ymin) / (ymax - ymin)) * (H - pad.t - pad.b);

  // Background grid
  ctx.strokeStyle = "#2a2f55";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let gy = 0; gy <= 5; gy++) {
    const v = ymin + (gy * (ymax - ymin)) / 5;
    const y = Y(v);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
    // Y labels
    ctx.fillStyle = "#aab2c5";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(fmtPrice(v), pad.l - 8, y);
  }
  ctx.setLineDash([]);

  // Title
  ctx.fillStyle = "#e9ecf1";
  ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(title, pad.l, 10);

  // X labels (start, middle, end)
  const idxs = [0, Math.floor(series.length / 2), series.length - 1];
  idxs.forEach((i) => {
    if (i < 0) return;
    const x = X(i);
    const d = series[i].date;
    const label = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    ctx.fillStyle = "#aab2c5";
    ctx.textAlign = i === 0 ? "left" : i === series.length - 1 ? "right" : "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, x, H - 10);
  });

  if (series.length < 2) return;

  // Line with colored segments
  ctx.lineWidth = 2;
  for (let i = 0; i < series.length - 1; i++) {
    const a = series[i];
    const b = series[i + 1];
    ctx.strokeStyle = b.value >= a.value ? "#2ecc71" : "#e74c3c";
    ctx.beginPath();
    ctx.moveTo(X(i), Y(a.value));
    ctx.lineTo(X(i + 1), Y(b.value));
    ctx.stroke();
  }

  // Points
  for (let i = 0; i < series.length; i++) {
    const v = series[i].value;
    ctx.fillStyle = "#6aa2ff";
    ctx.beginPath();
    ctx.arc(X(i), Y(v), 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

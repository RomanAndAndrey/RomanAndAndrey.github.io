"use strict";

const $ = (sel) => document.querySelector(sel);
const state = {
  messages: [],
  projects: [],
  repoInfo: new Map(),
  adminToken: localStorage.getItem("admin_token") || "",
  projectQuery: ""
};

window.addEventListener("DOMContentLoaded", () => {
  try {
    bindUi();
    updateAdminUi(false);
    checkHealth();
    loadMessages();
    loadProjects();
  } catch (e) {
    console.error("Init error", e);
  }
});

function bindUi() {
  const msgForm = $("#message-form");
  if (msgForm) msgForm.addEventListener("submit", onMessageSubmit);

  const search = $("#repo-search");
  if (search) search.addEventListener("input", () => {
    state.projectQuery = search.value.trim().toLowerCase();
    renderProjects();
  });

  const addBtn = $("#add-source-btn");
  if (addBtn) addBtn.addEventListener("click", openAddModal);
  const addClose = $("#add-close");
  if (addClose) addClose.addEventListener("click", closeAddModal);
  const addModal = $("#add-modal");
  if (addModal) addModal.addEventListener("click", (e) => { if (e.target === addModal) closeAddModal(); });
  const addForm = $("#add-form");
  if (addForm) addForm.addEventListener("submit", onProjectSubmit);

  const viewerClose = $("#viewer-close");
  if (viewerClose) viewerClose.addEventListener("click", closeViewer);
  const viewerModal = $("#viewer-modal");
  if (viewerModal) viewerModal.addEventListener("click", (e) => { if (e.target === viewerModal) closeViewer(); });

  const adminBtn = $("#admin-btn");
  if (adminBtn) adminBtn.addEventListener("click", toggleAdmin);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeViewer();
      closeAddModal();
      
    }
  });
}

function isAdmin() {
  return Boolean(state.adminToken);
}

function updateAdminUi(redraw = true) {
  document.body.classList.toggle("is-admin", isAdmin());
  const btn = $("#admin-btn");
  if (btn) btn.textContent = isAdmin() ? "Выйти из админ режима" : "Войти как админ";
  // Кнопка загрузки доступна всем
  // Кнопка загрузки архивов удалена
  if (redraw) {
    renderMessages();
    renderProjects();
  }
}

function toggleAdmin() {
  if (isAdmin()) {
    state.adminToken = "";
    localStorage.removeItem("admin_token");
    updateAdminUi();
    return;
  }
  const token = prompt("Введите админ-токен:");
  if (!token) return;
  state.adminToken = token.trim();
  localStorage.setItem("admin_token", state.adminToken);
  updateAdminUi();
}

async function checkHealth() {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    const data = await res.json();
    $("#health").textContent = data.status || "ok";
  } catch (e) {
    $("#health").textContent = "offline";
  }
}

async function loadMessages() {
  try {
    const data = await api("/api/messages");
    state.messages = Array.isArray(data) ? data : [];
    renderMessages();
  } catch (e) {
    console.error(e);
  }
}

function renderMessages() {
  const container = $("#list");
  if (!container) return;
  container.innerHTML = "";
  const frag = document.createDocumentFragment();
  state.messages.forEach((m) => {
    const li = document.createElement("li");
    li.dataset.id = m.id;
    const name = escapeHtml(m.name || "Гость");
    const txt = escapeHtml(m.text || "");
    const dt = escapeHtml(m.created_at || "");
    li.innerHTML = `<div class="meta">${name} • ${dt}</div><div class="message-text">${txt}</div>`;
    if (isAdmin()) {
      const actions = document.createElement("div");
      actions.className = "msg-actions";
      const edit = document.createElement("button");
      edit.className = "btn btn-sm";
      edit.textContent = "Изменить";
      edit.addEventListener("click", () => editMessage(m));
      const del = document.createElement("button");
      del.className = "btn btn-sm btn-danger";
      del.textContent = "Удалить";
      del.addEventListener("click", () => deleteMessage(m));
      actions.append(edit, del);
      li.appendChild(actions);
    }
    frag.appendChild(li);
  });
  container.appendChild(frag);
}

async function deleteMessage(message) {
  if (!confirm("Удалить сообщение?")) return;
  try {
    await api(`/api/messages/${message.id}`, { method: "DELETE" });
    state.messages = state.messages.filter((m) => m.id !== message.id);
    renderMessages();
  } catch (e) {
    alert(e.message || "Не удалось удалить сообщение");
  }
}

async function editMessage(message) {
  let text = prompt("Изменить текст сообщения:", message.text || "");
  if (text == null) return;
  text = text.trim();
  if (!text) {
    alert("Текст не может быть пустым");
    return;
  }
  let name = prompt("Имя автора:", message.name || "");
  if (name == null) return;
  name = name.trim() || "Гость";
  try {
    await api(`/api/messages/${message.id}`, {
      method: "PUT",
      body: JSON.stringify({ name, text })
    });
    message.name = name;
    message.text = text;
    renderMessages();
  } catch (e) {
    alert(e.message || "Не удалось обновить сообщение");
  }
}

async function onMessageSubmit(ev) {
  ev.preventDefault();
  const name = $("#name").value.trim();
  const text = $("#text").value.trim();
  if (!text) return;
  try {
    await api("/api/messages", {
      method: "POST",
      body: JSON.stringify({ name, text })
    });
    $("#text").value = "";
    loadMessages();
  } catch (e) {
    alert(e.message || "Не удалось отправить сообщение");
  }
}

async function loadProjects() {
  try {
    const data = await api("/api/projects");
    state.projects = Array.isArray(data) ? data : [];
    // Фолбэк: если раньше были добавлены проекты в localStorage (старый механизм)
    try {
      const legacy = JSON.parse(localStorage.getItem("proj_custom") || "[]");
      if (Array.isArray(legacy) && legacy.length) {
        const mapped = legacy.map((r, i) => ({
          id: -(i + 1),
          title: r.name || r.title || (r.owner?.login + "/" + r.name) || "Проект",
          username: r.owner?.login || "",
          fullname: r.owner?.login || "",
          repo_url: r.html_url || (r.owner?.login && r.name ? `https://github.com/${r.owner.login}/${r.name}` : (r.repo_url || "")),
          created_at: new Date().toISOString()
        })).filter(p => p.repo_url);
        state.projects = [...mapped, ...state.projects];
      }
    } catch {}
    renderProjects();
    state.projects.forEach((p) =>
      Promise.resolve(ensureRepoInfo(p)).then(() => {
        const card = document.querySelector(`.repo-card[data-id="${p.id}"]`);
        if (card) applyRepoInfo(card, p);
      })
    );
  } catch (e) {
    console.error(e);
  }
}

function renderProjects() {
  const root = document.getElementById("projects-root");
  const empty = document.getElementById("repos-empty");
  if (!root) return;
  root.innerHTML = "";
  const query = state.projectQuery;
  const list = state.projects.filter((p) => {
    if (!query) return true;
    const hay = `${p.title} ${p.username} ${p.fullname}`.toLowerCase();
    return hay.includes(query);
  });
  if (!list.length) {
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";
  const frag = document.createDocumentFragment();
  list.forEach((project) => frag.appendChild(buildProjectCard(project)));
  root.appendChild(frag);
}

function buildProjectCard(project) {
  const card = document.createElement("div");
  card.className = "repo-card";
  card.dataset.id = project.id;
  card.innerHTML = `
    <div class="repo-header">
      <h3>${escapeHtml(project.title)}</h3>
      ${isAdmin() ? '<button class="btn btn-sm btn-danger" data-delete>Удалить</button>' : ''}
    </div>
    <div class="repo-owner">${escapeHtml(project.fullname)} • <a href="https://github.com/${encodeURIComponent(project.username)}" target="_blank" rel="noopener">${escapeHtml(project.username)}</a></div>
    <div class="repo-desc" data-role="desc">Описание загружается...</div>
    <div class="repo-meta">
      <span data-role="lang"></span>
      <span data-role="stars"></span>
      <span data-role="forks"></span>
      <span data-role="updated"></span>
    </div>
    <div class="repo-links">
      <button class="btn" data-open>Открыть</button>
      <a class="btn" href="${project.repo_url}" target="_blank" rel="noopener">GitHub</a>
    </div>
  `;
  const openBtn = card.querySelector("[data-open]");
  if (openBtn) openBtn.addEventListener("click", () => openProject(project));
  if (isAdmin()) {
    const del = card.querySelector("[data-delete]");
    if (del) del.addEventListener("click", () => deleteProject(project));
  }
  applyRepoInfo(card, project);
  return card;
}

function applyRepoInfo(card, project) {
  const info = getRepoInfo(project);
  const descEl = card.querySelector('[data-role="desc"]');
  const langEl = card.querySelector('[data-role="lang"]');
  const starEl = card.querySelector('[data-role="stars"]');
  const forkEl = card.querySelector('[data-role="forks"]');
  const updEl = card.querySelector('[data-role="updated"]');

  if (info === undefined) {
    if (descEl) descEl.textContent = "Описание загружается...";
    if (langEl) langEl.textContent = "";
    if (starEl) starEl.textContent = "";
    if (forkEl) forkEl.textContent = "";
    if (updEl) updEl.textContent = "";
      Promise.resolve(ensureRepoInfo(project)).then(() => {
      const refreshed = document.querySelector(`.repo-card[data-id="${project.id}"]`);
      if (refreshed) applyRepoInfo(refreshed, project);
    });
    return;
  }

  if (info === null) {
    if (descEl) descEl.textContent = "Описание недоступно";
    if (langEl) langEl.textContent = "";
    if (starEl) starEl.textContent = "";
    if (forkEl) forkEl.textContent = "";
    if (updEl) updEl.textContent = "";
    return;
  }

  if (descEl) descEl.textContent = info.description ? info.description : "";
  if (langEl) langEl.textContent = info.language ? `Язык: ${info.language}` : "";
  if (starEl) starEl.textContent = info.stargazers_count ? `⭐ ${info.stargazers_count}` : "";
  if (forkEl) forkEl.textContent = info.forks_count ? `🍴 ${info.forks_count}` : "";
  if (updEl && info.updated_at) updEl.textContent = `Обновлено: ${timeAgo(new Date(info.updated_at))}`;
}

function getRepoInfo(project) {
  const parsed = parseRepoUrl(project.repo_url);
  // Если ссылка не на GitHub — метаданных нет и не будет
  if (!parsed) return null;
  const key = `${parsed.owner}/${parsed.repo}`.toLowerCase();
  if (!state.repoInfo.has(key)) return undefined;
  return state.repoInfo.get(key);
}

async function ensureRepoInfo(project) {
  const parsed = parseRepoUrl(project.repo_url);
  if (!parsed) return null;
  const key = `${parsed.owner}/${parsed.repo}`.toLowerCase();
  if (state.repoInfo.has(key)) return state.repoInfo.get(key);
  try {
    const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
      headers: window.GH_TOKEN ? { Authorization: `Bearer ${window.GH_TOKEN}` } : {}
    });
    // Тихо обрабатываем распространённые случаи: 404 (нет репо/приватный) и 403 (rate-limit)
    if (!res.ok) {
      if (res.status === 404 || res.status === 403) {
        state.repoInfo.set(key, null);
        return null;
      }
      throw new Error("GitHub HTTP " + res.status);
    }
    const info = await res.json();
    state.repoInfo.set(key, info);
    return info;
  } catch (e) {
    // Не шумим в консоли на сетевых ошибках/ограничениях — просто скрываем метаданные
    state.repoInfo.set(key, null);
    return null;
  }
}

function parseRepoUrl(url) {
  const match = /^https:\/\/github\.com\/([^\/#\s]+)\/([^\/#\s]+)(?:\/.*)?$/i.exec(url);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function buildDemoUrl(project) {
  const info = getRepoInfo(project);
  const parsed = parseRepoUrl(project.repo_url);
  if (!parsed) return project.repo_url;
  if (info && info.homepage) return info.homepage;
  if (info && info.has_pages) return `https://${parsed.owner}.github.io/${parsed.repo}/`;
  const branch = (info && info.default_branch) || "main";
  return `https://htmlpreview.github.io/?https://github.com/${parsed.owner}/${parsed.repo}/blob/${branch}/index.html`;
}

function openProject(project) {
  const url = buildDemoUrl(project);
  const title = `${project.fullname} — ${project.title}`;
  const modal = $("#viewer-modal");
  const frame = $("#viewer-frame");
  const link = $("#viewer-open");
  const t = $("#viewer-title");
  if (!modal || !frame || !link || !t) {
    window.open(url, "_blank");
    return;
  }
  frame.src = url;
  link.href = url;
  t.textContent = title;
  const note = $("#viewer-note");
  if (note) note.style.display = "none";
  modal.hidden = false;
  setTimeout(() => {
    try {
      if (!frame.contentDocument || !frame.contentDocument.body.childElementCount) {
        if (note) note.style.display = "block";
      }
    } catch (e) {
      if (note) note.style.display = "block";
    }
  }, 3000);
}

function closeViewer() {
  const modal = $("#viewer-modal");
  const frame = $("#viewer-frame");
  if (frame) frame.src = "about:blank";
  if (modal) modal.hidden = true;
}

function openAddModal() {
  const modal = $("#add-modal");
  if (modal) modal.hidden = false;
  const form = $("#add-form");
  if (form) form.reset();
  const err = $("#add-error");
  if (err) { err.textContent = ""; err.hidden = true; }
}

function closeAddModal() {
  const modal = $("#add-modal");
  if (modal) modal.hidden = true;
}

// Загрузка архивов отключена

async function onProjectSubmit(ev) {
  ev.preventDefault();
  const title = $("#add-title").value.trim();
  const username = $("#add-username").value.trim();
  const fullname = $("#add-fullname").value.trim();
  const repoUrl = $("#add-url").value.trim();
  const errorBox = $("#add-error");
  const errors = [];
  if (!title) errors.push("Введите название проекта");
  if (!/^[A-Za-z0-9-]{1,39}$/.test(username)) errors.push("Некорректный GitHub ник");
  if (!fullname) errors.push("Введите имя и фамилию");
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) errors.push("Ссылка должна быть формата https://github.com/owner/repo");
  else if (parsed.owner.toLowerCase() !== username.toLowerCase()) errors.push("Ник должен совпадать с owner в ссылке");
  if (errors.length) {
    if (errorBox) { errorBox.textContent = errors.join(". "); errorBox.hidden = false; }
    return;
  }
  if (errorBox) { errorBox.textContent = ""; errorBox.hidden = true; }
  try {
    const res = await api("/api/projects", {
      method: "POST",
      body: JSON.stringify({ title, username, fullname, repo_url: repoUrl })
    });
    if (res && res.project) {
      state.projects.unshift(res.project);
      renderProjects();
      Promise.resolve(ensureRepoInfo(res.project)).then(() => {
        const card = document.querySelector(`.repo-card[data-id="${res.project.id}"]`);
        if (card) applyRepoInfo(card, res.project);
      });
    }
    closeAddModal();
  } catch (e) {
    if (errorBox) { errorBox.textContent = e.message || "Не удалось добавить проект"; errorBox.hidden = false; }
  }
}

async function deleteProject(project) {
  if (!confirm("Удалить проект?")) return;
  try {
    await api(`/api/projects/${project.id}`, { method: "DELETE" });
    state.projects = state.projects.filter((p) => p.id !== project.id);
    renderProjects();
  } catch (e) {
    alert(e.message || "Не удалось удалить проект");
  }
}

async function api(path, options = {}) {
  const opts = { ...options };
  opts.headers = { ...(options.headers || {}) };
  if (opts.body && !(opts.body instanceof FormData) && !opts.headers["Content-Type"]) {
    opts.headers["Content-Type"] = "application/json";
  }
  if (isAdmin()) {
    opts.headers["X-Admin-Token"] = state.adminToken;
  }
  const res = await fetch(path, opts);
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      if (data && data.error) msg = data.error;
    } catch (e) {
      msg = res.statusText;
    }
    throw new Error(msg || `HTTP ${res.status}`);
  }
  const ct = res.headers.get("Content-Type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function timeAgo(date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  const units = [
    [60, "сек"],
    [60, "мин"],
    [24, "ч"],
    [30, "дн"],
    [12, "мес"],
  ];
  let n = diff;
  let i = 0;
  for (; i < units.length && n >= units[i][0]; i++) {
    n /= units[i][0];
  }
  const labels = ["сек", "мин", "ч", "дн", "мес", "г"];
  const value = Math.max(1, Math.floor(n));
  const label = labels[i] || "г";
  return `${value} ${label} назад`;
}




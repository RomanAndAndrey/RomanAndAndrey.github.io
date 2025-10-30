// Рендер карточек в контейнер
function renderProjects(list, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  list.forEach((project) => {
    const card = document.createElement('div');
    card.className = 'project-link';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', project.name);

    if (project.image) {
      const img = document.createElement('img');
      img.className = 'project-img';
      img.src = project.image;
      img.alt = project.name;
      card.appendChild(img);
    }

    const title = document.createElement('h2');
    title.textContent = project.name;
    card.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = project.description || '';
    card.appendChild(desc);

    card.addEventListener('click', () => openModal(project));
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') openModal(project);
    });

    container.appendChild(card);
  });
}

// Модальное окно
function openModal(project) {
  const img = document.getElementById('modal-img');
  if (project.image) {
    img.src = project.image;
    img.style.display = '';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
  }
  img.alt = project.name || '';

  document.getElementById('modal-title').textContent = project.name || '';
  document.getElementById('modal-desc').textContent = project.description || '';
  document.getElementById('modal-link').href = project.path || '#';
  document.getElementById('modal').style.display = 'flex';
  document.getElementById('modal').setAttribute('aria-hidden', 'false');
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('modal').setAttribute('aria-hidden', 'true');
}

// Темная тема
function setTheme(isDark) {
  document.body.classList.toggle('dark', isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeIcon();
}

function toggleTheme() {
  setTheme(!document.body.classList.contains('dark'));
}

function updateThemeIcon() {
  const themeToggle = document.getElementById('theme-toggle');
  const dark = document.body.classList.contains('dark');
  themeToggle.textContent = dark ? '☀️' : '🌙';
}

// Загрузка проектов из README.md
async function loadProjectsFromReadme() {
  try {
    const org = document.querySelector('meta[name="gh-org"]')?.content || location.hostname.split('.')[0];
    const repo = document.querySelector('meta[name="gh-repo"]')?.content || `${org}.github.io`;
    const url = `https://raw.githubusercontent.com/${org}/${repo}/main/README.md`;

    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();

    const projects = parseProjectsFromMarkdown(md);
    renderProjects(projects.andrey, 'andrey-projects');
    renderProjects(projects.roman, 'roman-projects');
    renderProjects(projects.joint, 'joint-projects');

    const status = document.getElementById('load-status');
    if (status) status.textContent = '';
  } catch (e) {
    const status = document.getElementById('load-status');
    if (status) status.textContent = 'Не удалось загрузить README.md';
    console.error('README fetch error:', e);
  }
}

// Парсер проектов
// Поддерживает строки вида:
// - [Название](путь) — описание
// - БАД [Название](путь)
// - ТРФ [Название](путь) - описание
// Маркеры ТРФ/TRF → Роман, БАД/BAD → Андрей, без маркера → совместный
function parseProjectsFromMarkdown(md) {
  const lines = md.split(/\r?\n/);
  const buckets = { andrey: [], roman: [], joint: [] };

  for (const line of lines) {
    const link = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (!link) continue;

    const name = link[1].trim();
    const path = link[2].trim();
    const rest = line.slice(line.indexOf(')') + 1);
    const descMatch = rest.match(/[—\-–]\s*(.+)$/);
    const description = descMatch ? descMatch[1].trim() : '';
    const imgMatch = line.match(/!\[[^\]]*\]\(([^)]+)\)/);
    const image = imgMatch ? imgMatch[1] : undefined;

    const upper = line.toUpperCase();
    const isRoman = upper.includes('ТРФ') || upper.includes('TRF');
    const isAndrey = upper.includes('БАД') || upper.includes('BAD');

    const item = { name, path, description };
    if (image) item.image = image;

    if (isRoman && !isAndrey) buckets.roman.push(item);
    else if (isAndrey && !isRoman) buckets.andrey.push(item);
    else buckets.joint.push(item);
  }

  return buckets;
}

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  setTheme(savedTheme === 'dark');
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  loadProjectsFromReadme();

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target && e.target.id === 'modal') closeModal();
  });
});

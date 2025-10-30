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

// Загрузка проектов из projects.json
async function loadProjectsFromJson() {
  try {
    const res = await fetch('projects.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Универсальный вход: поддерживаем
    // 1) { andrey:[], roman:[], joint:[] }
    // 2) { projects: [] }
    // 3) [ ... ] — массив верхнего уровня
    // Во всех случаях распределяем по меткам в названии: БАД/BAD → Андрей, ТРФ/TRF → Роман, иначе → Совместные
    let items = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (Array.isArray(data?.projects)) {
      items = data.projects;
    } else {
      items = [...(data.andrey || []), ...(data.roman || []), ...(data.joint || [])];
    }

    const buckets = splitByMarkers(items);

    renderProjects(buckets.andrey, 'andrey-projects');
    renderProjects(buckets.roman, 'roman-projects');
    renderProjects(buckets.joint, 'joint-projects');

    const status = document.getElementById('load-status');
    if (status) status.textContent = '';
  } catch (e) {
    const status = document.getElementById('load-status');
    if (status) status.textContent = 'Не удалось загрузить projects.json';
    console.error('Projects fetch error:', e);
  }
}

// Классификация по меткам в названии и очистка названий
function splitByMarkers(items) {
  const buckets = { andrey: [], roman: [], joint: [] };
  const ANDREY = /(\bБАД\b|\bBAD\b)/i;
  const ROMAN = /(\bТРФ\b|\bTRF\b)/i;

  items.forEach((raw) => {
    const item = { ...raw };
    const title = String(item.name || '');
    const src = `${title} ${item.path || ''}`;
    const isAndrey = ANDREY.test(src);
    const isRoman = ROMAN.test(src);

    // Чистим метки из названия
    item.name = title
      .replace(/[\[\]()]/g, ' ')
      .replace(/\b(БАД|BAD|ТРФ|TRF)\b/gi, ' ')
      .replace(/\s*[-–—:]\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (isAndrey && !isRoman) buckets.andrey.push(item);
    else if (isRoman && !isAndrey) buckets.roman.push(item);
    else buckets.joint.push(item);
  });

  return buckets;
}

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  setTheme(savedTheme === 'dark');
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  loadProjectsFromJson();

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target && e.target.id === 'modal') closeModal();
  });
});

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

    renderProjects(data.andrey || [], 'andrey-projects');
    renderProjects(data.roman || [], 'roman-projects');
    renderProjects(data.joint || [], 'joint-projects');

    const status = document.getElementById('load-status');
    if (status) status.textContent = '';
  } catch (e) {
    const status = document.getElementById('load-status');
    if (status) status.textContent = 'Не удалось загрузить projects.json';
    console.error('Projects fetch error:', e);
  }
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

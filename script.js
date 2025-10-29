// Данные проектов — отредактируйте под себя
// Проекты Андрея
const andreyProjects = [
  {
    name: 'Paint — рисовалка на Canvas',
    path: 'Paint/',
    description: 'Небольшое приложение для рисования на HTML5 Canvas.'
  },
  {
    name: 'Bootstrap примеры',
    path: 'bootstrap/',
    description: 'Подборка демо-страниц и компонентов Bootstrap.'
  }
];

// Проекты Романа
const romanProjects = [
  {
    name: 'Примеры на Vue',
    path: 'vue/',
    description: 'Эксперименты и примеры на Vue.js.'
  }
];

// Совместные проекты
const jointProjects = [
  {
    name: 'Игра: Угадай по картинке',
    path: 'JS_guess_from_the_picture-main/guess_pictures.html',
    image: 'JS_guess_from_the_picture-main/backgrounds/got01.jpg',
    description: 'Игра на угадывание по картинке с несколькими режимами.'
  }
];

// Рендер карточек в указанный контейнер
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

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
  // Тема
  const savedTheme = localStorage.getItem('theme');
  setTheme(savedTheme === 'dark');
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Рендер списков
  renderProjects(andreyProjects, 'andrey-projects');
  renderProjects(romanProjects, 'roman-projects');
  renderProjects(jointProjects, 'joint-projects');

  // Модалка
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target && e.target.id === 'modal') closeModal();
  });
});

// Конфигурация проектов — редактируйте только этот блок
// Каждый проект: { name, description, path, image }
const andreyProjects = [
  { name: 'bootstrap', description: 'Практика использования bootstrap', path: 'bootstrap/', image: 'bootstrap/bootstrap.png' },
  { name: 'Test massive', description: 'Использование massive для создания теста', path: 'Test massive/', image: 'Test massive/testmassive.png' },
  { name: 'Анекдоты', description: 'Тестирование возможностей ИИ', path: 'Анекдоты/', image: 'Анекдоты/sticker.webp' },
  { name: 'Проект от ИИ', description: 'Курсы валют ЦБ РФ', path: 'Проект от ИИ/', image: 'Проект от ИИ/icon.svg' },
  { name: 'Рисовалка', description: 'Рисуем с помощью canvas', path: 'bootstrap/', image: 'Рисовалка/canvas.png' },
  { name: 'Рисуем', description: 'Знакомство с canvas на паре', path: 'Рисуем/', image: 'Рисуем/рисуем.png' },
  { name: 'Угадай число', description: 'Выполненное задание недели 5', path: 'Угадай число', image: 'Угадай число/Угадайчисло.webp' }
];

const romanProjects = [
  { name: 'Викторина по информатике', description: 'Работа на паре', path: 'Викторина по информатике/', image: 'Викторина по информатике/викторина.png' },
  { name: 'Тест', description: 'Создание теста с использованием массива', path: 'Тест/', image: 'Тест/тест.avif' },
  { name: 'Таблица и песня', description: 'Работа на паре', path: 'Таблица и песня/' },
  { name: 'Таблица глаголов исключений', description: 'Работа на паре, табличная верстка', path: 'Таблица глаголов исключений/' }
];

const jointProjects = [
  { name: 'bootstrap', description: 'Практика использования bootstrap', path: 'bootstrap/', image: 'bootstrap/bootstrap.png' },
  { name: 'vue', description: 'Работа с vue на паре', path: 'vue/', image: 'vue/vue.png' },
  { name: 'Сайт в интернете', description: 'Личный сайт', path: 'Сайт в интернете/', image: 'Сайт в интернете/сайт.jpg' },
];

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

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  setTheme(savedTheme === 'dark');
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  renderProjects(andreyProjects, 'andrey-projects');
  renderProjects(romanProjects, 'roman-projects');
  renderProjects(jointProjects, 'joint-projects');

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target && e.target.id === 'modal') closeModal();
  });
});

const canvas = document.getElementById('canvas');
const preview = document.getElementById('preview');
const ctx = canvas.getContext('2d');
const pctx = preview.getContext('2d');

const colorPicker = document.getElementById('colorPicker');
const shapePicker = document.getElementById('shapePicker');
const sizePicker = document.getElementById('sizePicker');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const themeToggle = document.getElementById('themeToggle');

let drawing = false;
let startX = 0, startY = 0;
let color = colorPicker.value;
let shape = shapePicker.value;
let lineWidth = sizePicker.value;

// === Обновление параметров ===
colorPicker.oninput = e => color = e.target.value;
shapePicker.onchange = e => shape = e.target.value;
sizePicker.oninput = e => lineWidth = e.target.value;

// === Получение координат относительно холста ===
function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// === Начало рисования ===
canvas.addEventListener('mousedown', e => {
    drawing = true;
    const { x, y } = getCoords(e);
    startX = x; startY = y;
    ctx.beginPath();
    ctx.moveTo(x, y);
});

// === Рисование ===
canvas.addEventListener('mousemove', e => {
    if (!drawing) return;
    const { x, y } = getCoords(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";

    pctx.clearRect(0, 0, preview.width, preview.height);
    pctx.strokeStyle = color;
    pctx.lineWidth = lineWidth;
    pctx.lineCap = "round";

    if (shape === 'free') {
        ctx.lineTo(x, y);
        ctx.stroke();
    } else {
        pctx.beginPath();
        switch (shape) {
            case 'rect':
                pctx.strokeRect(startX, startY, x - startX, y - startY);
                break;
            case 'circle':
                const radius = Math.hypot(x - startX, y - startY);
                pctx.arc(startX, startY, radius, 0, Math.PI * 2);
                pctx.stroke();
                break;
            case 'line':
                pctx.moveTo(startX, startY);
                pctx.lineTo(x, y);
                pctx.stroke();
                break;
        }
    }
});

// === Завершение рисования ===
canvas.addEventListener('mouseup', e => {
    if (!drawing) return;
    drawing = false;
    const { x, y } = getCoords(e);
    pctx.clearRect(0, 0, preview.width, preview.height);

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    if (shape !== 'free') {
        switch (shape) {
            case 'rect':
                ctx.strokeRect(startX, startY, x - startX, y - startY);
                break;
            case 'circle':
                const radius = Math.hypot(x - startX, y - startY);
                ctx.arc(startX, startY, radius, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'line':
                ctx.moveTo(startX, startY);
                ctx.lineTo(x, y);
                ctx.stroke();
                break;
        }
    }
});

canvas.addEventListener('mouseleave', () => {
    drawing = false;
    pctx.clearRect(0, 0, preview.width, preview.height);
});

// === Очистка ===
clearBtn.onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// === Сохранение ===
saveBtn.onclick = () => {
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL();
    link.click();
};

// === Тёмная тема ===
let dark = localStorage.getItem('darkMode') === 'true';
if (dark) {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '☀️ Светлая тема';
}

themeToggle.onclick = () => {
    dark = !dark;
    document.body.classList.toggle('dark-mode', dark);
    themeToggle.textContent = dark ? '☀️ Светлая тема' : '🌙 Тёмная тема';
    localStorage.setItem('darkMode', dark);
};

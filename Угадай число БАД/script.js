let secretNumber = Math.floor(Math.random() * 100) + 1;
let attempts = 0;
const maxAttempts = 10;
const Images = [
  "img1.jpg",
  "img2.jpg",
  "img3.jpg",
  "img4.jpg",
  "img5.jpg",
  "img6.jpg",
  "img7.jpg",
  "img8.jpg",
  "img9.jpg",
  "img10.jpg",
];
let guessedNumbers = []; // объявлен массив для хранения введенных чисел

function Guess() {
  const outputDiv = document.getElementById('output');
  const inputField = document.getElementById('userInput');
  const userInput = parseInt(inputField.value);

  // Получаем аудиозаписи
  const correctSound = document.getElementById('correctSound');
  const wrongSound = document.getElementById('wrongSound');

  // Проверка введенного числа
  if (isNaN(userInput) || userInput < 1 || userInput > 100) {
    outputDiv.textContent = "Пожалуйста, введите число от 1 до 100.";
    return;
  }

  // Проверка на повторное число
  if (guessedNumbers.includes(userInput)) {
    outputDiv.textContent = "Вы уже вводили это число. Попробуйте другое.";
    inputField.value = '';
    return;
  }

  guessedNumbers.push(userInput);
  attempts++;

  // Показать картинку для текущей попытки
  const funImageDiv = document.getElementById('Image');
  if (attempts <= Images.length) {
    funImageDiv.innerHTML = `<img src="${Images[attempts - 1]}" alt="Забавная картинка" style="max-width:200px;">`;
  } else {
    funImageDiv.innerHTML = '';
  }

  if (userInput === secretNumber) {
    outputDiv.textContent = `Поздравляю! Вы угадали число ${secretNumber} за ${attempts} ${attempts === 1 ? "попытку" : "попытки"}.`;
    inputField.disabled = true;
    if (correctSound) correctSound.play();
  } else if (userInput < secretNumber) {
    outputDiv.textContent = "Ваше число меньше загаданного.";
    if (wrongSound) wrongSound.play();
  } else {
    outputDiv.textContent = "Ваше число больше загаданного.";
    if (wrongSound) wrongSound.play();
  }

  if (attempts === maxAttempts) {
    outputDiv.textContent = `Извините, вы использовали все ${maxAttempts} попыток. Загаданное число было ${secretNumber}.`;
    inputField.disabled = true;
  }

  inputField.value = '';
}

function NewGame() {
  secretNumber = Math.floor(Math.random() * 100) + 1;
  attempts = 0;
  guessedNumbers = [];
  document.getElementById('userInput').value = '';
  document.getElementById('userInput').disabled = false;
  document.getElementById('output').textContent = '';
  document.getElementById('Image').innerHTML = '';
}
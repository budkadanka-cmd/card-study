// Загрузка пула из локальной памяти устройства
let cards = JSON.parse(localStorage.getItem('cloud_pool_cards')) || [];
let activeIndex = -1;

// DOM элементы
const frontTextInput = document.getElementById('front-text');
const frontImgInput = document.getElementById('front-image');
const backTextInput = document.getElementById('back-text');
const backImgInput = document.getElementById('back-image');
const addBtn = document.getElementById('add-btn');
const statsText = document.getElementById('stats');
const counterBadge = document.getElementById('card-index-counter');

const flashcard = document.getElementById('flashcard');
const cardFrontContent = document.getElementById('card-front-content');
const cardBackContent = document.getElementById('card-back-content');
const nextBtn = document.getElementById('next-btn');
const actionButtons = document.getElementById('action-buttons');

const wrongBtn = document.getElementById('wrong-btn');
const flipBtn = document.getElementById('flip-btn');
const rightBtn = document.getElementById('right-btn');
const gallery = document.getElementById('cards-gallery');

// Инициализация
updateUI();

// Отслеживание названий загружаемых файлов
document.querySelectorAll('.file-label input').forEach(input => {
    input.addEventListener('change', (e) => {
        if(e.target.files.length > 0) {
            e.target.nextElementSibling.innerText = "📁 " + e.target.files.name.substring(0, 12) + "...";
        }
    });
});

function fileToBase64(fileInput) {
    return new Promise((resolve) => {
        if (!fileInput.files || !fileInput.files[0]) return resolve(null);
        const reader = new FileReader();
        reader.readAsDataURL(fileInput.files[0]);
        reader.onload = () => resolve(reader.result);
    });
}

// Добавление карты
async function addCard() {
    const frontText = frontTextInput.value.trim();
    const backText = backTextInput.value.trim();

    if (!frontText && !frontImgInput.files[0]) return alert('Заполните лицевую сторону!');
    if (!backText && !backImgInput.files[0]) return alert('Заполните обратную сторону!');

    const frontImg = await fileToBase64(frontImgInput);
    const backImg = await fileToBase64(backImgInput);

    const newCard = {
        id: Date.now(),
        frontText,
        frontImg,
        backText,
        backImg
    };

    cards.push(newCard);
    saveData();
    
    // Сброс формы
    frontTextInput.value = '';
    backTextInput.value = '';
    frontImgInput.value = '';
    backImgInput.value = '';
    document.getElementById('front-image').nextElementSibling.innerText = "📷 Прикрепить фото";
    document.getElementById('back-image').nextElementSibling.innerText = "📷 Прикрепить фото";

    updateUI();
}

function saveData() {
    localStorage.setItem('cloud_pool_cards', JSON.stringify(cards));
}

function updateUI() {
    saveData();
    statsText.innerText = `Загружено серверов-карт: ${cards.length}`;
    renderGallery();
}

// Рендеринг нижней галереи хранилища
function renderGallery() {
    gallery.innerHTML = '';
    if (cards.length === 0) {
        gallery.innerHTML = '<p style="color: #64748b; font-size: 14px;">Облако пусто. Создайте свою первую карту выше.</p>';
        return;
    }

    cards.forEach((card) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        
        let previewHtml = '';
        if(card.frontImg) previewHtml = `<img src="${card.frontImg}">`;

        item.innerHTML = `
            <div class="gallery-info">
                <h4>Вопрос: ${card.frontText || '[Фотография]'}</h4>
                <p>Ответ: ${card.backText || '[Фотография]'}</p>
                ${previewHtml}
            </div>
            <button class="btn-delete" onclick="deleteCard(${card.id})">Удалить из облака</button>
        `;
        gallery.appendChild(item);
    });
}

// Удаление карты
window.deleteCard = function(id) {
    cards = cards.filter(c => c.id !== id);
    if (activeIndex >= cards.length) activeIndex = -1;
    updateUI();
    resetSessionView();
};

function resetSessionView() {
    flashcard.classList.remove('is-flipped');
    cardFrontContent.innerHTML = '<p class="placeholder-text">Нажмите «Случайный микс 🎲», чтобы активировать систему облачного повторения</p>';
    nextBtn.classList.remove('hidden');
    actionButtons.classList.add('hidden');
    counterBadge.innerText = "Сессия готова";
    activeIndex = -1;
}

// Запуск случайного выбора (Бесконечный микс)
function pickRandomCard() {
    if (cards.length === 0) {
        cardFrontContent.innerHTML = '<p class="placeholder-text" style="color:#ef4444">Ошибка: Облачное хранилище пусто!</p>';
        return;
    }

    flashcard.classList.remove('is-flipped');
    nextBtn.classList.add('hidden');
    actionButtons.classList.remove('hidden');

    // Чистый рандом
    activeIndex = Math.floor(Math.random() * cards.length);
    const card = cards[activeIndex];

    counterBadge.innerText = `Карточка ${activeIndex + 1} из ${cards.length}`;

    renderCardSide(cardFrontContent, card.frontText, card.frontImg);
    renderCardSide(cardBackContent, card.backText, card.backImg);
}

function renderCardSide(target, text, img) {
    target.innerHTML = '';
    if (img) {
        const imgEl = document.createElement('img');
        imgEl.src = img;
        target.appendChild(imgEl);
    }
    if (text) {
        const textEl = document.createElement('p');
        textEl.innerText = text;
        target.appendChild(textEl);
    }
}

function toggleFlip() {
    if (activeIndex === -1) return;
    flashcard.classList.toggle('is-flipped');
}

// Слушатели событий интерфейса
addBtn.addEventListener('click', addCard);
nextBtn.addEventListener('click', pickRandomCard);
flashcard.addEventListener('click', toggleFlip);
flipBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFlip(); });

wrongBtn.addEventListener('click', (e) => { e.stopPropagation(); pickRandomCard(); });
rightBtn.addEventListener('click', (e) => { e.stopPropagation(); pickRandomCard(); });

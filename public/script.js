// НАСТРОЙКА СВЯЗИ С ВАШИМ ОБЛАКОМ SUPABASE
const SUPABASE_URL = "https://fftsunsvesznwluhqcpu.supabase.co";
const SUPABASE_KEY = "sb_publishable_eMPL5srko__l0MwgrSrE8W_v_q1nh9E";

let cards = [];
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

// Главная функция для отправки запросов в облачную базу
async function supabaseFetch(endpoint, options = {}) {
    const headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        ...options.headers
    };
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, { ...options, headers });
    if (!response.ok) {
        const err = await response.text();
        console.error("Ошибка Supabase:", err);
    }
    return response;
}

// Загрузка всех карточек из облака (Синхронизация)
async function loadCardsFromCloud() {
    const response = await supabaseFetch("cards?select=*&order=id.asc");
    if (response.ok) {
        cards = await response.json();
        statsText.innerText = `Синхронизировано карт в облаке: ${cards.length}`;
        renderGallery();
    }
}

function fileToBase64(fileInput) {
    return new Promise((resolve) => {
        if (!fileInput.files || !fileInput.files[0]) return resolve(null);
        const reader = new FileReader();
        reader.readAsDataURL(fileInput.files[0]);
        reader.onload = () => resolve(reader.result);
    });
}

// Отправка новой карты в облачную базу
async function addCard() {
    const frontText = frontTextInput.value.trim();
    const backText = backTextInput.value.trim();

    if (!frontText && !frontImgInput.files[0]) return alert('Заполните лицевую сторону!');
    if (!backText && !backImgInput.files[0]) return alert('Заполните обратную сторону!');

    addBtn.innerText = "Синхронизация...";
    addBtn.disabled = true;

    const frontImg = await fileToBase64(frontImgInput);
    const backImg = await fileToBase64(backImgInput);

    // Отправляем POST запрос в таблицу cards
    const response = await supabaseFetch("cards", {
        method: "POST",
        body: JSON.stringify({ frontText, frontImg, backText, backImg })
    });

    if (response.ok) {
        frontTextInput.value = '';
        backTextInput.value = '';
        frontImgInput.value = '';
        backImgInput.value = '';
        document.getElementById('front-image').nextElementSibling.innerText = "📷 Прикрепить фото";
        document.getElementById('back-image').nextElementSibling.innerText = "📷 Прикрепить фото";
        
        // Перезагружаем пул из облака
        await loadCardsFromCloud();
        alert('Карточка сохранена в облачную базу!');
    }
    addBtn.innerText = "Добавить в облако";
    addBtn.disabled = false;
}

// Удаление карты из облачной базы
window.deleteCard = async function(id) {
    if(!confirm("Удалить карточку из облака насовсем?")) return;
    
    const response = await supabaseFetch(`cards?id=eq.${id}`, {
        method: "DELETE"
    });

    if (response.ok) {
        await loadCardsFromCloud();
        resetSessionView();
    }
};

function renderGallery() {
    gallery.innerHTML = '';
    if (cards.length === 0) {
        gallery.innerHTML = '<p style="color: #64748b; font-size: 14px;">Облако пусто. Создайте свою первую карту выше.</p>';
        return;
    }

    cards.forEach((card) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        let previewHtml = card.frontImg ? `<img src="${card.frontImg}">` : '';

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

function resetSessionView() {
    flashcard.classList.remove('is-flipped');
    cardFrontContent.innerHTML = '<p class="placeholder-text">Нажмите «Случайный микс 🎲», чтобы активировать систему облачного повторения</p>';
    nextBtn.classList.remove('hidden');
    actionButtons.classList.add('hidden');
    counterBadge.innerText = "Сессия готова";
    activeIndex = -1;
}

function pickRandomCard() {
    if (cards.length === 0) {
        cardFrontContent.innerHTML = '<p class="placeholder-text" style="color:#ef4444">Ошибка: Облачное хранилище пусто!</p>';
        return;
    }

    flashcard.classList.remove('is-flipped');
    nextBtn.classList.add('hidden');
    actionButtons.classList.remove('hidden');

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

// Навешиваем слушатели
addBtn.addEventListener('click', addCard);
nextBtn.addEventListener('click', pickRandomCard);
flashcard.addEventListener('click', toggleFlip);
flipBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFlip(); });
wrongBtn.addEventListener('click', (e) => { e.stopPropagation(); pickRandomCard(); });
rightBtn.addEventListener('click', (e) => { e.stopPropagation(); pickRandomCard(); });

// Первичный запуск загрузки при открытии сайта
loadCardsFromCloud();

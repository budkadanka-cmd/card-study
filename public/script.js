// НАСТРОЙКА СВЯЗИ С ВАШИМ ОБЛАКОМ SUPABASE
const SUPABASE_URL = "https://fftsunsvesznwluhqcpu.supabase.co";
const SUPABASE_KEY = "sb_publishable_eMPL5srko__l0MwgrSrE8w_v_q1nh9E";

let allCards = []; // Все карточки из облака
let filteredCards = []; // Карточки выбранной колоды
let activeIndex = -1;

// DOM элементы
const frontTextInput = document.getElementById('front-text');
const frontImgInput = document.getElementById('front-image');
const backTextInput = document.getElementById('back-text');
const backImgInput = document.getElementById('back-image');
const deckSelectInput = document.getElementById('deck-select-input'); // Выбор колоды при создании
const deckFilter = document.getElementById('deck-filter'); // Выбор колоды для учебы

const addBtn = document.getElementById('add-btn');
const statsText = document.getElementById('stats');
const counterBadge = document.getElementById('card-index-counter');

const flashcard = document.getElementById('flashcard');
const cardFrontContent = document.getElementById('card-front-content') || document.querySelector('.side-front'); // Совместимость верстки
const cardBackContent = document.getElementById('card-back-content') || document.querySelector('.side-back');
const nextBtn = document.getElementById('next-btn') || document.querySelector('.btn-next');
const actionButtons = document.getElementById('action-buttons') || document.querySelector('.action-buttons');

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
        allCards = await response.json();
        applyDeckFilter(); // Применяем фильтр колод после загрузки
    }
}

// Функция фильтрации карточек под выбранную колоду
function applyDeckFilter() {
    const selectedDeck = deckFilter.value;
    if (selectedDeck === "Все") {
        filteredCards = allCards;
    } else {
        filteredCards = allCards.filter(card => card.deck === selectedDeck);
    }
    
    statsText.innerText = `Карточек в выбранной колоде: ${filteredCards.length} (Всего в облаке: ${allCards.length})`;
    renderGallery();
    resetSessionView();
}

function fileToBase64(fileInput) {
    return new Promise((resolve) => {
        if (!fileInput || !fileInput.files || !fileInput.files[0]) return resolve(null);
        const reader = new FileReader();
        reader.readAsDataURL(fileInput.files[0]);
        reader.onload = () => resolve(reader.result);
    });
}

// Отправка новой карты в облачную базу с указанием колоды
async function addCard() {
    const frontText = frontTextInput.value.trim();
    const backText = backTextInput.value.trim();
    const deck = deckSelectInput.value; // Получаем выбранную колоду

    if (!frontText && !frontImgInput.files[0]) return alert('Заполните лицевую сторону!');
    if (!backText && !backImgInput.files[0]) return alert('Заполните обратную сторону!');

    addBtn.innerText = "Синхронизация...";
    addBtn.disabled = true;

    const frontImg = await fileToBase64(frontImgInput);
    const backImg = await fileToBase64(backImgInput);

    // Отправляем POST запрос в таблицу cards с полем deck
    const response = await supabaseFetch("cards", {
        method: "POST",
        body: JSON.stringify({ frontText, frontImg, backText, backImg, deck })
    });

    if (response.ok) {
        frontTextInput.value = '';
        backTextInput.value = '';
        frontImgInput.value = '';
        backImgInput.value = '';
        
        const labels = document.querySelectorAll('.file-label span');
        if(labels.length > 0) {
            labels[0].innerText = "📷 Прикрепить фото";
            labels[1].innerText = "📷 Прикрепить фото";
        }
        
        await loadCardsFromCloud();
        alert(`Карточка успешно сохранена в колоду "${deck}"!`);
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
    }
};

function renderGallery() {
    if(!gallery) return;
    gallery.innerHTML = '';
    if (filteredCards.length === 0) {
        gallery.innerHTML = '<p style="color: #64748b; font-size: 14px;">В этой колоде пока нет карточек.</p>';
        return;
    }

    filteredCards.forEach((card) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        let previewHtml = card.frontImg ? `<img src="${card.frontImg}" style="max-width:100px; max-height:100px; display:block; margin-top:5px;">` : '';
        let deckBadge = `<span style="background:#e2e8f0; padding:2px 6px; border-radius:4px; font-size:11px; color:#475569;">${card.deck || 'Общая'}</span>`;

        item.innerHTML = `
            <div class="gallery-info">
                <h4>Вопрос: ${card.frontText || '[Фотография]'} ${deckBadge}</h4>
                <p>Ответ: ${card.backText || '[Фотография]'}</p>
                ${previewHtml}
            </div>
            <button class="btn-delete" onclick="deleteCard(${card.id})">Удалить</button>
        `;
        gallery.appendChild(item);
    });
}

function resetSessionView() {
    if(!flashcard) return;
    flashcard.classList.remove('is-flipped');
    
    const frontTarget = cardFrontContent || flashcard.querySelector('.side-front p') || flashcard.querySelector('.side-front');
    if(frontTarget) {
        frontTarget.innerHTML = '<p class="placeholder-text">Нажмите «Случайный микс 🎲», чтобы начать учить выбранную колоду</p>';
    }
    
    if(nextBtn) nextBtn.classList.remove('hidden');
    if(actionButtons) actionButtons.classList.add('hidden');
    if(counterBadge) counterBadge.innerText = "Сессия готова";
    activeIndex = -1;
}

function pickRandomCard() {
    if (filteredCards.length === 0) {
        alert('В выбранной колоде нет карточек для повторения!');
        return;
    }

    if(flashcard) flashcard.classList.remove('is-flipped');
    if(nextBtn) nextBtn.classList.add('hidden');
    if(actionButtons) actionButtons.classList.remove('hidden');

    activeIndex = Math.floor(Math.random() * filteredCards.length);
    const card = filteredCards[activeIndex];

    if(counterBadge) counterBadge.innerText = `Карточка ${activeIndex + 1} из ${filteredCards.length}`;

    renderCardSide(cardFrontContent, card.frontText, card.frontImg);
    renderCardSide(cardBackContent, card.backText, card.backImg);
}

function renderCardSide(target, text, img) {
    if(!target) return;
    target.innerHTML = '';
    if (img) {
        const imgEl = document.createElement('img');
        imgEl.src = img;
        imgEl.style.maxWidth = "100%";
        imgEl.style.maxHeight = "70%";
        target.appendChild(imgEl);
    }
    if (text) {
        const textEl = document.createElement('p');
        textEl.innerText = text;
        target.appendChild(textEl);
    }
}

function toggleFlip() {
    if (activeIndex === -1 || !flashcard) return;
    flashcard.classList.toggle('is-flipped');
}

// Навешиваем слушатели событий
if(addBtn) addBtn.addEventListener('click', addCard);
if(nextBtn) nextBtn.addEventListener('click', pickRandomCard);
if(flashcard) flashcard.addEventListener('click', toggleFlip);
if(deckFilter) deckFilter.addEventListener('change', applyDeckFilter); // Переключение колоды для учебы

if(flipBtn) flipBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFlip(); });
if(wrongBtn) wrongBtn.addEventListener('click', (e) => { e.stopPropagation(); pickRandomCard(); });
if(rightBtn) rightBtn.addEventListener('click', (e) => { e.stopPropagation(); pickRandomCard(); });

// Первичный запуск загрузки при открытии сайта
loadCardsFromCloud();
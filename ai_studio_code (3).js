/* =================== 1. دعم PWA والتثبيت على أندرويد =================== */
let deferredPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.log('SW Registration error:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('btn-install-pwa');
  if (btn) btn.style.display = 'inline-flex';
});

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        const btn = document.getElementById('btn-install-pwa');
        if (btn) btn.style.display = 'none';
      }
      deferredPrompt = null;
    });
  }
}

/* =================== 2. إدارة الحالة والتخزين الموحد =================== */
const STORAGE_KEY = 'BRAWL_A4_V4_FINAL_STUDIO';

let state = {
  global: {
    cols: 4,
    rows: 3,
    borderWidth: 3,
    borderColor: '#000000',
    bgColor: '#121829',

    // شريط الاسم العام
    barHeightPct: 30,
    titleSizePct: 13,
    titleColor: '#ffffff',
    fontWeight: '900',
    strokeColor: '#000000',
    strokeWidth: 2,

    // الأيقونات العامة
    iconPos: 'right',
    iconSizePct: 70,

    // الأسماء العامة
    namesSizePct: 12,
    namesColor: '#ffffff',
    padVerticalPct: 4,
    padHorizontalPct: 4,
    namesGapPct: 3
  },
  icons: [],
  cards: [],
  selectedCardIndex: 0
};

// إنشاء كرت مع تخصيص لونه الخاص المستقل
function createBlankCard(i) {
  return {
    id: i + 1,
    title: `كرت #${i + 1}`,
    upperBg: '#1c2847', // خلفية مساحة الأسماء الخاصة بهذا الكرت
    barBg: '#0a0f1d',   // خلفية شريط الاسم الخاصة بهذا الكرت
    iconBase64: null,
    names: ['', '', '', '', '', '', '', '']
  };
}

function ensureCardsCapacity() {
  const needed = state.global.cols * state.global.rows;
  if (!state.cards) state.cards = [];
  while (state.cards.length < needed) {
    state.cards.push(createBlankCard(state.cards.length));
  }
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state.global = { ...state.global, ...(parsed.global || {}) };
      state.icons = parsed.icons || [];
      state.cards = (parsed.cards || []).map((c, idx) => ({
        ...createBlankCard(idx),
        ...c
      }));
      state.selectedCardIndex = parsed.selectedCardIndex || 0;
    } catch (e) {
      console.error(e);
    }
  }
  ensureCardsCapacity();
  if (state.selectedCardIndex >= state.cards.length) {
    state.selectedCardIndex = 0;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* =================== 3. توليد كود HTML المتجاوب للكرت =================== */
function generateCardHTML(card) {
  const g = state.global;

  // تنصيف الأسماء وتجاهل الخانات الفارغة تماماً
  const activeNames = (card.names || [])
    .map((n) => (n || '').trim())
    .filter((n) => n.length > 0);

  let namesHTML = '';
  activeNames.forEach((name) => {
    namesHTML += `
      <div class="card-name-item" style="
        color: ${g.namesColor};
        font-size: ${g.namesSizePct}cqi;
      ">${name}</div>
    `;
  });

  const strokeStyle = (g.strokeWidth > 0)
    ? `-webkit-text-stroke: ${g.strokeWidth}px ${g.strokeColor};`
    : '';

  const iconClass = (g.iconPos === 'left') ? 'icon-left' : 'icon-right';

  const iconImg = card.iconBase64
    ? `<img src="${card.iconBase64}" alt="icon" style="height:${g.iconSizePct}%;" />`
    : '';

  return `
    <div class="card-content-box" style="background:${card.upperBg || '#1c2847'};">
      <div class="card-upper-area" style="
        padding: ${g.padVerticalPct}% ${g.padHorizontalPct}%;
        gap: ${g.namesGapPct}%;
      ">
        ${namesHTML}
      </div>
      <div class="card-lower-bar ${iconClass}" style="
        background: ${card.barBg || '#0a0f1d'};
        height: ${g.barHeightPct}%;
      ">
        <div class="card-title-text" style="
          color: ${g.titleColor};
          font-weight: ${g.fontWeight};
          font-size: ${g.titleSizePct}cqi;
          ${strokeStyle}
        ">
          ${card.title}
        </div>
        <div class="card-icon-slot">
          ${iconImg}
        </div>
      </div>
    </div>
  `;
}

/* =================== 4. رسم وتحديث المعاينة A4 (842 × 595) =================== */
function renderA4Page() {
  const page = document.getElementById('a4-page');
  const g = state.global;

  page.style.gridTemplateColumns = `repeat(${g.cols}, 1fr)`;
  page.style.gridTemplateRows = `repeat(${g.rows}, 1fr)`;
  page.style.gap = `${g.borderWidth}px`;
  page.style.backgroundColor = g.borderColor;
  page.style.padding = `${g.borderWidth}px`;

  page.innerHTML = '';
  const total = g.cols * g.rows;

  for (let i = 0; i < total; i++) {
    const slot = document.createElement('div');
    slot.className = `a4-slot ${i === state.selectedCardIndex ? 'selected' : ''}`;
    slot.style.backgroundColor = g.bgColor;

    const card = state.cards[i] || createBlankCard(i);
    slot.innerHTML = generateCardHTML(card);
    slot.onclick = () => selectCard(i);

    page.appendChild(slot);
  }
}

function renderActiveCardStage() {
  const currentCard = state.cards[state.selectedCardIndex] || createBlankCard(state.selectedCardIndex);
  const holder = document.getElementById('active-card-holder');
  holder.innerHTML = generateCardHTML(currentCard);

  document.getElementById('current-card-badge').innerText = `الكرت المحدد: #${state.selectedCardIndex + 1}`;
}

function selectCard(index) {
  state.selectedCardIndex = index;
  saveState();
  renderA4Page();
  renderActiveCardStage();
  populateCardTabFields();
}

/* =================== 5. مزامنة الإعدادات العامة =================== */
function syncDual(fromId, toId, callback) {
  const val = document.getElementById(fromId).value;
  document.getElementById(toId).value = val;
  if (callback) callback();
}

function updateGlobalConfig() {
  const g = state.global;

  g.cols = Math.max(1, parseInt(document.getElementById('cfg-cols').value) || 1);
  g.rows = Math.max(1, parseInt(document.getElementById('cfg-rows').value) || 1);
  g.borderWidth = parseInt(document.getElementById('cfg-border-w-slider').value) || 0;
  g.borderColor = document.getElementById('cfg-border-c').value;
  g.bgColor = document.getElementById('cfg-bg-c').value;

  g.barHeightPct = parseFloat(document.getElementById('g-bar-h-slider').value) || 30;
  g.titleSizePct = parseFloat(document.getElementById('g-title-s-slider').value) || 13;
  g.strokeWidth = parseFloat(document.getElementById('g-stroke-w-slider').value) || 0;
  g.fontWeight = document.getElementById('g-font-weight').value;
  g.titleColor = document.getElementById('g-title-c').value;
  g.strokeColor = document.getElementById('g-stroke-c').value;

  g.iconPos = document.getElementById('g-icon-pos').value;
  g.iconSizePct = parseFloat(document.getElementById('g-icon-s-slider').value) || 70;

  g.namesSizePct = parseFloat(document.getElementById('g-names-s-slider').value) || 12;
  g.padVerticalPct = parseFloat(document.getElementById('g-pad-v-slider').value) || 4;
  g.padHorizontalPct = parseFloat(document.getElementById('g-pad-h-slider').value) || 4;
  g.namesGapPct = parseFloat(document.getElementById('g-names-gap-slider').value) || 3;
  g.namesColor = document.getElementById('g-names-c').value;

  ensureCardsCapacity();
  saveState();
  renderA4Page();
  renderActiveCardStage();
}

function populateGlobalFields() {
  const g = state.global;

  document.getElementById('cfg-cols').value = g.cols;
  document.getElementById('cfg-rows').value = g.rows;

  const setPair = (sliderId, numId, val) => {
    document.getElementById(sliderId).value = val;
    document.getElementById(numId).value = val;
  };

  setPair('cfg-border-w-slider', 'cfg-border-w-num', g.borderWidth);
  document.getElementById('cfg-border-c').value = g.borderColor;
  document.getElementById('cfg-bg-c').value = g.bgColor;

  setPair('g-bar-h-slider', 'g-bar-h-num', g.barHeightPct);
  setPair('g-title-s-slider', 'g-title-s-num', g.titleSizePct);
  setPair('g-stroke-w-slider', 'g-stroke-w-num', g.strokeWidth);
  document.getElementById('g-font-weight').value = g.fontWeight;
  document.getElementById('g-title-c').value = g.titleColor;
  document.getElementById('g-stroke-c').value = g.strokeColor;

  document.getElementById('g-icon-pos').value = g.iconPos;
  setPair('g-icon-s-slider', 'g-icon-s-num', g.iconSizePct);

  setPair('g-names-s-slider', 'g-names-s-num', g.namesSizePct);
  setPair('g-pad-v-slider', 'g-pad-v-num', g.padVerticalPct);
  setPair('g-pad-h-slider', 'g-pad-h-num', g.padHorizontalPct);
  setPair('g-names-gap-slider', 'g-names-gap-num', g.namesGapPct);
  document.getElementById('g-names-c').value = g.namesColor;
}

/* =================== 6. تبويب الكرت المحدد (تعديل فردي) =================== */
function populateCardTabFields() {
  const card = state.cards[state.selectedCardIndex] || createBlankCard(state.selectedCardIndex);

  document.getElementById('ed-single-title').value = card.title;
  document.getElementById('ed-single-upper-bg').value = card.upperBg || '#1c2847';
  document.getElementById('ed-single-bar-bg').value = card.barBg || '#0a0f1d';

  for (let i = 0; i < 8; i++) {
    const inp = document.getElementById(`ed-name-field-${i}`);
    if (inp) inp.value = (card.names && card.names[i]) ? card.names[i] : '';
  }

  populateIconPicker();
}

function onCurrentCardChange() {
  const card = state.cards[state.selectedCardIndex];
  if (!card) return;

  card.title = document.getElementById('ed-single-title').value || `كرت #${state.selectedCardIndex + 1}`;
  card.upperBg = document.getElementById('ed-single-upper-bg').value;
  card.barBg = document.getElementById('ed-single-bar-bg').value;

  const names = [];
  for (let i = 0; i < 8; i++) {
    const inp = document.getElementById(`ed-name-field-${i}`);
    names.push(inp ? inp.value : '');
  }
  card.names = names;

  saveState();
  renderA4Page();
  renderActiveCardStage();
}

function buildNamesInputs() {
  const container = document.getElementById('names-inputs-container');
  container.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = `اسم ${i + 1}`;
    inp.id = `ed-name-field-${i}`;
    inp.oninput = onCurrentCardChange;
    container.appendChild(inp);
  }
}

function populateIconPicker() {
  const container = document.getElementById('ed-icon-picker');
  container.innerHTML = '';

  const currentCard = state.cards[state.selectedCardIndex];

  const noneDiv = document.createElement('div');
  noneDiv.className = `icon-picker-item ${!currentCard.iconBase64 ? 'selected' : ''}`;
  noneDiv.innerText = 'بلا';
  noneDiv.style.fontSize = '10px';
  noneDiv.onclick = () => {
    currentCard.iconBase64 = null;
    saveState();
    renderA4Page();
    renderActiveCardStage();
    populateIconPicker();
  };
  container.appendChild(noneDiv);

  state.icons.forEach((ic) => {
    const item = document.createElement('div');
    item.className = `icon-picker-item ${currentCard.iconBase64 === ic ? 'selected' : ''}`;
    item.innerHTML = `<img src="${ic}" alt="icon" />`;
    item.onclick = () => {
      currentCard.iconBase64 = ic;
      saveState();
      renderA4Page();
      renderActiveCardStage();
      populateIconPicker();
    };
    container.appendChild(item);
  });
}

function switchControlTab(tab) {
  document.getElementById('tab-btn-global').classList.toggle('active', tab === 'global');
  document.getElementById('tab-btn-card').classList.toggle('active', tab === 'card');
  document.getElementById('panel-global').classList.toggle('active', tab === 'global');
  document.getElementById('panel-card').classList.toggle('active', tab === 'card');
  lucide.createIcons();
}

/* =================== 7. التقريب والتنقل (Pinch Zoom & Pan) =================== */
const viewport = document.getElementById('a4-viewport');
const canvasContainer = document.getElementById('a4-canvas-container');
let scale = 0.85, panX = 0, panY = 0;
let isPanning = false, startX = 0, startY = 0;
let initialDist = 0, initialScale = 1;

function applyTransform() {
  canvasContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

function resetZoom() {
  const cw = viewport.clientWidth;
  const ch = viewport.clientHeight;
  scale = Math.min((cw - 40) / 842, (ch - 40) / 595, 1);
  panX = 0;
  panY = 0;
  applyTransform();
}

viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = 1.08;
  scale = (e.deltaY < 0) ? Math.min(scale * factor, 4) : Math.max(scale / factor, 0.2);
  applyTransform();
}, { passive: false });

viewport.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    isPanning = true;
    startX = e.touches[0].clientX - panX;
    startY = e.touches[0].clientY - panY;
  } else if (e.touches.length === 2) {
    isPanning = false;
    initialDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    initialScale = scale;
  }
});

viewport.addEventListener('touchmove', (e) => {
  if (isPanning && e.touches.length === 1) {
    panX = e.touches[0].clientX - startX;
    panY = e.touches[0].clientY - startY;
    applyTransform();
  } else if (e.touches.length === 2) {
    const curDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    if (initialDist > 0) {
      scale = Math.min(Math.max(initialScale * (curDist / initialDist), 0.2), 4);
      applyTransform();
    }
  }
});

viewport.addEventListener('touchend', () => { isPanning = false; });

viewport.addEventListener('mousedown', (e) => {
  if (e.target.closest('.a4-slot')) return;
  isPanning = true;
  startX = e.clientX - panX;
  startY = e.clientY - panY;
});
window.addEventListener('mousemove', (e) => {
  if (!isPanning) return;
  panX = e.clientX - startX;
  panY = e.clientY - startY;
  applyTransform();
});
window.addEventListener('mouseup', () => { isPanning = false; });

/* =================== 8. تصدير A4 بدقة 4K الحقيقية (3840 × 2713) =================== */
async function exportTo4KPNG() {
  const page = document.getElementById('a4-page');
  const oldTransform = canvasContainer.style.transform;
  canvasContainer.style.transform = 'none';

  // 3840 / 842 = 4.5605倍 -> الدقة الناتجة: 3840 × 2713 بكسل (أبعاد A4 الصحيحة)
  const scaleFactor = 3840 / page.offsetWidth;

  try {
    const canvas = await html2canvas(page, {
      scale: scaleFactor,
      useCORS: true,
      backgroundColor: null,
      logging: false
    });

    const link = document.createElement('a');
    link.download = `Brawl_Cards_A4_4K_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    alert('حدث خطأ أثناء التصدير، يرجى المحاولة ثانية.');
    console.error(err);
  } finally {
    canvasContainer.style.transform = oldTransform;
  }
}

/* =================== 9. إدارة بنك الأيقونات =================== */
function openIconModal() {
  renderIconModalList();
  document.getElementById('modal-icons').classList.add('open');
  lucide.createIcons();
}

function closeIconModal() {
  document.getElementById('modal-icons').classList.remove('open');
  populateIconPicker();
}

function handleIconUpload(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  let remaining = files.length;
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      state.icons.push(evt.target.result);
      remaining--;
      if (remaining === 0) {
        saveState();
        renderIconModalList();
        populateIconPicker();
      }
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function deleteIcon(index) {
  state.icons.splice(index, 1);
  saveState();
  renderIconModalList();
  populateIconPicker();
}

function renderIconModalList() {
  const list = document.getElementById('icons-manager-list');
  list.innerHTML = '';
  if (!state.icons.length) {
    list.innerHTML = '<div style="color:#777; font-size:0.8rem; width:100%; text-align:center;">لا توجد أيقونات مضافة بعد.</div>';
    return;
  }

  state.icons.forEach((ic, idx) => {
    const box = document.createElement('div');
    box.className = 'manage-icon-thumb';
    box.innerHTML = `
      <img src="${ic}" alt="icon" />
      <div class="del-btn" onclick="deleteIcon(${idx})">✕</div>
    `;
    list.appendChild(box);
  });
}

/* =================== 10. وضع ملء الشاشة ومنع القوائم =================== */
window.addEventListener('contextmenu', (e) => e.preventDefault());

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

/* =================== التشغيل المبدئي للتطبيق =================== */
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  buildNamesInputs();
  populateGlobalFields();
  populateCardTabFields();

  renderA4Page();
  renderActiveCardStage();

  resetZoom();
  lucide.createIcons();
});

window.addEventListener('resize', () => {
  resetZoom();
});
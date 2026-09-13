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

/* =================== 2. لوحات الألوان الجاهزة (20 فاقع + 20 داكن) =================== */
const VIBRANT_PALETTE = [
  '#FFCC00', '#FFA500', '#FF5722', '#FF1744', '#F50057', 
  '#D500F9', '#7C4DFF', '#3D5AFE', '#2979FF', '#00B0FF', 
  '#00E5FF', '#1DE9B6', '#00E676', '#76FF03', '#C6FF00', 
  '#FFEA00', '#FF9100', '#FF3D00', '#E040FB', '#FFFFFF'
];

const DARK_PALETTE = [
  '#000000', '#0A0E17', '#121829', '#151D30', '#1C2847', 
  '#0A0F1D', '#1A233A', '#232D42', '#2B1736', '#3D1528', 
  '#3D2015', '#332712', '#142E1E', '#0D2B33', '#1C2630', 
  '#2C3E50', '#34495E', '#212F3D', '#3E2723', '#263238'
];

/* =================== 3. إدارة الحالة والتخزين =================== */
const STORAGE_KEY = 'BRAWL_A4_V5_STROKE_POPUP_COLORS';

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

    // الأسماء العامة (ستروك ونوع الخط)
    namesSizePct: 12,
    namesColor: '#ffffff',
    namesFontWeight: '900',       // 400 (رفيع) أو 700 (عادي) أو 900 (سميك)
    namesStrokeWidth: 1,          // سماكة الستروك
    namesStrokeColor: '#000000',  // لون الستروك
    padVerticalPct: 4,
    padHorizontalPct: 4,
    namesGapPct: 3
  },
  icons: [],
  cards: [],
  selectedCardIndex: 0
};

function createBlankCard(i) {
  return {
    id: i + 1,
    title: `كرت #${i + 1}`,
    upperBg: '#1c2847',
    barBg: '#0a0f1d',
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

/* =================== 4. توليد كود HTML المتجاوب للكرت =================== */
function generateCardHTML(card) {
  const g = state.global;

  const activeNames = (card.names || [])
    .map((n) => (n || '').trim())
    .filter((n) => n.length > 0);

  const namesStrokeStyle = (g.namesStrokeWidth > 0)
    ? `-webkit-text-stroke: ${g.namesStrokeWidth}px ${g.namesStrokeColor};`
    : '';

  let namesHTML = '';
  activeNames.forEach((name) => {
    namesHTML += `
      <div class="card-name-item" style="
        color: ${g.namesColor};
        font-size: ${g.namesSizePct}cqi;
        font-weight: ${g.namesFontWeight || '900'};
        ${namesStrokeStyle}
      ">${name}</div>
    `;
  });

  const titleStrokeStyle = (g.strokeWidth > 0)
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
          ${titleStrokeStyle}
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

/* =================== 5. رسم المعاينة A4 والكرت المختار =================== */
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

/* =================== 6. مزامنة المدخلات العامة =================== */
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

  g.barHeightPct = parseFloat(document.getElementById('g-bar-h-slider').value) || 30;
  g.titleSizePct = parseFloat(document.getElementById('g-title-s-slider').value) || 13;
  g.strokeWidth = parseFloat(document.getElementById('g-stroke-w-slider').value) || 0;
  g.fontWeight = document.getElementById('g-font-weight').value;

  g.iconPos = document.getElementById('g-icon-pos').value;
  g.iconSizePct = parseFloat(document.getElementById('g-icon-s-slider').value) || 70;

  g.namesFontWeight = document.getElementById('g-names-weight').value;
  g.namesSizePct = parseFloat(document.getElementById('g-names-s-slider').value) || 12;
  g.namesStrokeWidth = parseFloat(document.getElementById('g-names-stroke-w-slider').value) || 0;
  g.padVerticalPct = parseFloat(document.getElementById('g-pad-v-slider').value) || 4;
  g.padHorizontalPct = parseFloat(document.getElementById('g-pad-h-slider').value) || 4;
  g.namesGapPct = parseFloat(document.getElementById('g-names-gap-slider').value) || 3;

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
  setPair('g-bar-h-slider', 'g-bar-h-num', g.barHeightPct);
  setPair('g-title-s-slider', 'g-title-s-num', g.titleSizePct);
  setPair('g-stroke-w-slider', 'g-stroke-w-num', g.strokeWidth);
  document.getElementById('g-font-weight').value = g.fontWeight;

  document.getElementById('g-icon-pos').value = g.iconPos;
  setPair('g-icon-s-slider', 'g-icon-s-num', g.iconSizePct);

  document.getElementById('g-names-weight').value = g.namesFontWeight || '900';
  setPair('g-names-s-slider', 'g-names-s-num', g.namesSizePct);
  setPair('g-names-stroke-w-slider', 'g-names-stroke-w-num', g.namesStrokeWidth || 1);
  setPair('g-pad-v-slider', 'g-pad-v-num', g.padVerticalPct);
  setPair('g-pad-h-slider', 'g-pad-h-num', g.padHorizontalPct);
  setPair('g-names-gap-slider', 'g-names-gap-num', g.namesGapPct);

  updateAllColorSwatches();
}

/* =================== 7. نظام المودال المنبثق للألوان (Color Picker Modal) =================== */
let activeColorTargetKey = null;

function triggerColorPicker(targetKey) {
  activeColorTargetKey = targetKey;
  const currentColor = getColorByKey(targetKey);

  document.getElementById('hex-custom-color-input').value = currentColor.toUpperCase();
  document.getElementById('native-custom-color-input').value = currentColor;

  document.getElementById('modal-color-picker').classList.add('open');
  lucide.createIcons();
}

function closeColorPicker() {
  document.getElementById('modal-color-picker').classList.remove('open');
  activeColorTargetKey = null;
}

function getColorByKey(key) {
  const g = state.global;
  const currentCard = state.cards[state.selectedCardIndex] || createBlankCard(state.selectedCardIndex);

  switch (key) {
    case 'cfg-border-c': return g.borderColor;
    case 'cfg-bg-c': return g.bgColor;
    case 'g-title-c': return g.titleColor;
    case 'g-stroke-c': return g.strokeColor;
    case 'g-names-c': return g.namesColor;
    case 'g-names-stroke-c': return g.namesStrokeColor || '#000000';
    case 'ed-single-upper-bg': return currentCard.upperBg || '#1c2847';
    case 'ed-single-bar-bg': return currentCard.barBg || '#0a0f1d';
    default: return '#ffffff';
  }
}

function applySelectedColor(hexColor) {
  if (!activeColorTargetKey) return;
  const g = state.global;
  const currentCard = state.cards[state.selectedCardIndex];

  switch (activeColorTargetKey) {
    case 'cfg-border-c': g.borderColor = hexColor; break;
    case 'cfg-bg-c': g.bgColor = hexColor; break;
    case 'g-title-c': g.titleColor = hexColor; break;
    case 'g-stroke-c': g.strokeColor = hexColor; break;
    case 'g-names-c': g.namesColor = hexColor; break;
    case 'g-names-stroke-c': g.namesStrokeColor = hexColor; break;
    case 'ed-single-upper-bg': if (currentCard) currentCard.upperBg = hexColor; break;
    case 'ed-single-bar-bg': if (currentCard) currentCard.barBg = hexColor; break;
  }

  updateAllColorSwatches();
  saveState();
  renderA4Page();
  renderActiveCardStage();
  closeColorPicker();
}

function onCustomColorPick(val) {
  document.getElementById('hex-custom-color-input').value = val.toUpperCase();
  applySelectedColor(val);
}

function onHexInput(val) {
  if (/^#[0-9A-F]{6}$/i.test(val)) {
    document.getElementById('native-custom-color-input').value = val;
  }
}

function applyCustomHex() {
  const val = document.getElementById('hex-custom-color-input').value.trim();
  if (/^#[0-9A-F]{6}$/i.test(val)) {
    applySelectedColor(val);
  } else {
    alert('يرجى إدخال صيغة HEX صحيحة مثل #FF0000');
  }
}

function updateAllColorSwatches() {
  const g = state.global;
  const currentCard = state.cards[state.selectedCardIndex] || createBlankCard(state.selectedCardIndex);

  const setSwatch = (id, color) => {
    const el = document.getElementById(id);
    if (el) el.style.backgroundColor = color;
  };

  setSwatch('swatch-cfg-border-c', g.borderColor);
  setSwatch('swatch-cfg-bg-c', g.bgColor);
  setSwatch('swatch-g-title-c', g.titleColor);
  setSwatch('swatch-g-stroke-c', g.strokeColor);
  setSwatch('swatch-g-names-c', g.namesColor);
  setSwatch('swatch-g-names-stroke-c', g.namesStrokeColor || '#000000');
  setSwatch('swatch-ed-single-upper-bg', currentCard.upperBg || '#1c2847');
  setSwatch('swatch-ed-single-bar-bg', currentCard.barBg || '#0a0f1d');
}

function buildColorPalettesUI() {
  const vibrantGrid = document.getElementById('vibrant-palette-grid');
  vibrantGrid.innerHTML = '';
  VIBRANT_PALETTE.forEach((color) => {
    const dot = document.createElement('div');
    dot.className = 'palette-color-circle';
    dot.style.backgroundColor = color;
    dot.onclick = () => applySelectedColor(color);
    vibrantGrid.appendChild(dot);
  });

  const darkGrid = document.getElementById('dark-palette-grid');
  darkGrid.innerHTML = '';
  DARK_PALETTE.forEach((color) => {
    const dot = document.createElement('div');
    dot.className = 'palette-color-circle';
    dot.style.backgroundColor = color;
    dot.onclick = () => applySelectedColor(color);
    darkGrid.appendChild(dot);
  });
}

/* =================== 8. تبويب الكرت المحدد =================== */
function populateCardTabFields() {
  const card = state.cards[state.selectedCardIndex] || createBlankCard(state.selectedCardIndex);

  document.getElementById('ed-single-title').value = card.title;
  updateAllColorSwatches();

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

/* =================== 9. التقريب والتنقل (Pinch-to-zoom & Pan) =================== */
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
  scale = Math.min((cw - 20) / 842, (ch - 20) / 595, 1);
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

/* =================== 10. تصدير A4 بدقة 4K (3840 × 2713) =================== */
async function exportTo4KPNG() {
  const page = document.getElementById('a4-page');
  const oldTransform = canvasContainer.style.transform;
  canvasContainer.style.transform = 'none';

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
    alert('حدث خطأ أثناء التصدير، يرجى المحاولة مجدداً.');
    console.error(err);
  } finally {
    canvasContainer.style.transform = oldTransform;
  }
}

/* =================== 11. إدارة بنك الأيقونات =================== */
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

/* =================== 12. وضع ملء الشاشة ومنع القوائم =================== */
window.addEventListener('contextmenu', (e) => e.preventDefault());

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

/* =================== التشغيل المبدئي =================== */
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  buildNamesInputs();
  buildColorPalettesUI();
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

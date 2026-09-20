// 1. 状态与数据区
const state = {
  activeNav: 'home',
  productIndex: 0,
  wristSize: 14,
  isDragging: false,
  draggedMaterial: null,
  draggedBead: null,
  beads: [],
  beadHistory: [],
  historyIndex: -1,
  savedBracelets: JSON.parse(localStorage.getItem('savedBracelets') || '[]'),
};

// 2. DOM 元素获取区
const dom = {
  navButtons: document.querySelectorAll('.nav-btn'),
  primaryBtn: document.querySelector('.btn-primary'),
  dots: document.querySelectorAll('.dot'),
  wuxingBtns: document.querySelectorAll('.wu-card__btn'),
  heroSection: document.querySelector('.hero-section'),
  wuxingSection: document.querySelector('.wuxing-section'),
  designSection: document.querySelector('.design-section'),
  myBraceletsSection: document.querySelector('.my-bracelets-section'),
  braceletsGrid: document.getElementById('bracelets-grid'),
  wristSizeSelect: document.getElementById('wrist-size'),
  canvasRing: document.getElementById('canvas-ring'),
  braceletCanvas: document.querySelector('.bracelet-canvas'),
  beadPreview: document.getElementById('bead-preview'),
  materialItems: document.querySelectorAll('.material-item'),
  saveBtn: document.querySelector('.btn-save'),
  dragGhost: null,
};

// 3. 核心逻辑与工具函数
function setActiveNav(key) {
  state.activeNav = key;
  
  dom.navButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.nav === key);
  });

  if (key === 'design') {
    if (dom.heroSection) dom.heroSection.style.display = 'none';
    if (dom.wuxingSection) dom.wuxingSection.style.display = 'none';
    if (dom.myBraceletsSection) {
      dom.myBraceletsSection.style.display = 'none';
      dom.myBraceletsSection.classList.remove('is-active');
    }
    if (dom.designSection) {
      dom.designSection.style.display = 'block';
      dom.designSection.classList.add('is-active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (key === 'about') {
    if (dom.heroSection) dom.heroSection.style.display = 'none';
    if (dom.wuxingSection) dom.wuxingSection.style.display = 'none';
    if (dom.designSection) {
      dom.designSection.style.display = 'none';
      dom.designSection.classList.remove('is-active');
    }
    if (dom.myBraceletsSection) {
      dom.myBraceletsSection.style.display = 'block';
      dom.myBraceletsSection.classList.add('is-active');
    }
    renderSavedBracelets();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    if (dom.heroSection) dom.heroSection.style.display = '';
    if (dom.wuxingSection) dom.wuxingSection.style.display = '';
    if (dom.designSection) {
      dom.designSection.style.display = 'none';
      dom.designSection.classList.remove('is-active');
    }
    if (dom.myBraceletsSection) {
      dom.myBraceletsSection.style.display = 'none';
      dom.myBraceletsSection.classList.remove('is-active');
    }
    if (key === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

function handleNavClick(e) {
  const target = e.currentTarget;
  setActiveNav(target.dataset.nav);
}

function handlePrimaryCta() {
  setActiveNav('design');
}

function handleDotClick(e) {
  const target = e.currentTarget;
  dom.dots.forEach((dot, idx) => {
    const active = dot === target;
    dot.classList.toggle('is-active', active);
    if (active) state.productIndex = idx;
  });
}

function handleWuxingClick(e) {
  const target = e.currentTarget;
  const wuxing = target.dataset.wuxing;
  if (wuxing) {
    setActiveNav('design');
  }
}

function updateCanvasRing(size) {
  const baseSize = 210;
  const increment = 15;
  const diameter = baseSize + (size - 14) * increment;
  
  if (dom.canvasRing) {
    dom.canvasRing.style.width = `${diameter}px`;
    dom.canvasRing.style.height = `${diameter}px`;
  }
  
  redrawBeads();
}

function handleWristSizeChange(e) {
  const value = e.target.value;
  const size = parseInt(value.replace('cm', ''));
  state.wristSize = size;
  updateCanvasRing(size);
}

function createDragGhost(materialItem, isBead = false) {
  const img = materialItem.querySelector('.material-img') || materialItem.querySelector('.placed-bead-img');
  if (!img) return null;
  
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.innerHTML = `<img src="${img.src || ''}" alt="${img.alt}" class="ghost-img" />`;
  ghost.style.opacity = isBead ? '0.85' : '0.7';
  
  document.body.appendChild(ghost);
  return ghost;
}

function updateDragGhostPosition(e) {
  if (!dom.dragGhost) return;
  
  dom.dragGhost.style.left = `${e.clientX - 20}px`;
  dom.dragGhost.style.top = `${e.clientY - 20}px`;
}

function removeDragGhost() {
  if (dom.dragGhost) {
    document.body.removeChild(dom.dragGhost);
    dom.dragGhost = null;
  }
}

function isPointInCanvas(e) {
  if (!dom.braceletCanvas) return false;
  
  const rect = dom.braceletCanvas.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const distance = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));
  
  const ringWidth = dom.canvasRing ? parseFloat(dom.canvasRing.style.width) || 210 : 210;
  const radius = ringWidth / 2 + 30;
  
  return distance <= radius;
}

function getCanvasCenter() {
  if (!dom.braceletCanvas) return { x: 0, y: 0 };
  
  const rect = dom.braceletCanvas.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function getRingRadius() {
  const ringWidth = dom.canvasRing ? parseFloat(dom.canvasRing.style.width) || 210 : 210;
  return ringWidth / 2;
}

function calculateAngleFromPoint(e) {
  const center = getCanvasCenter();
  const angle = Math.atan2(e.clientY - center.y, e.clientX - center.x);
  let degrees = angle * (180 / Math.PI);
  degrees = (degrees + 90 + 360) % 360;
  return degrees;
}

function getBeadAngleThreshold() {
  const beadDiameter = 40;
  const ringRadius = getRingRadius();
  const circumference = 2 * Math.PI * ringRadius;
  const anglePerBead = (beadDiameter / circumference) * 360;
  return anglePerBead * 1.1;
}

function getMaxBeadCount() {
  const beadDiameter = 40;
  const ringRadius = getRingRadius();
  const circumference = 2 * Math.PI * ringRadius;
  return Math.floor(circumference / beadDiameter);
}

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function anglesOverlap(angle1, angle2, threshold) {
  const a1 = normalizeAngle(angle1);
  const a2 = normalizeAngle(angle2);
  
  const diff = Math.abs(a1 - a2);
  const minDiff = Math.min(diff, 360 - diff);
  
  return minDiff < threshold;
}

function isAngleOccupied(targetAngle, threshold, excludeBeadId = null) {
  return state.beads.some(bead => {
    if (bead.id === excludeBeadId) return false;
    return anglesOverlap(bead.angle, targetAngle, threshold);
  });
}

function findNearestEmptyAngle(targetAngle, excludeBeadId = null) {
  const threshold = getBeadAngleThreshold();
  const maxAngle = 360;
  
  if (!isAngleOccupied(targetAngle, threshold, excludeBeadId)) {
    return targetAngle;
  }
  
  let step = 1;
  let currentAngle;
  
  for (let i = 1; i <= maxAngle / 2; i += step) {
    currentAngle = normalizeAngle(targetAngle + i);
    if (!isAngleOccupied(currentAngle, threshold, excludeBeadId)) {
      return currentAngle;
    }
    
    currentAngle = normalizeAngle(targetAngle - i);
    if (!isAngleOccupied(currentAngle, threshold, excludeBeadId)) {
      return currentAngle;
    }
  }
  
  return null;
}

function addBead(materialItem, angle) {
  const img = materialItem.querySelector('.material-img');
  if (!img) return;
  
  const bead = {
    id: Date.now() + Math.random(),
    src: img.src,
    alt: img.alt,
    angle: angle
  };
  
  state.beads.push(bead);
  pushHistory();
  renderBead(bead);
}

function updateBeadAngle(beadId, newAngle) {
  const bead = state.beads.find(b => b.id === beadId);
  if (bead) {
    bead.angle = newAngle;
    pushHistory();
    redrawBeads();
  }
}

function renderBead(bead) {
  if (!dom.beadPreview) return;
  
  const ringRadius = getRingRadius();
  
  const angleRad = (bead.angle - 90) * (Math.PI / 180);
  const x = Math.cos(angleRad) * ringRadius;
  const y = Math.sin(angleRad) * ringRadius;
  
  const beadEl = document.createElement('div');
  beadEl.className = 'placed-bead';
  beadEl.dataset.id = bead.id;
  beadEl.style.transform = `translate(${x}px, ${y}px)`;
  beadEl.innerHTML = `
    <img src="${bead.src}" alt="${bead.alt}" class="placed-bead-img" />
    <button type="button" class="bead-delete-btn" data-id="${bead.id}" style="display: none;">✕</button>
  `;
  beadEl.setAttribute('draggable', 'true');
  beadEl.addEventListener('dragstart', handlePlacedBeadDragStart);
  beadEl.addEventListener('dblclick', handleBeadDoubleClick);
  
  const deleteBtn = beadEl.querySelector('.bead-delete-btn');
  deleteBtn.addEventListener('click', handleBeadDelete);
  
  dom.beadPreview.appendChild(beadEl);
}

function handleBeadDoubleClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const beadEl = e.currentTarget;
  const deleteBtn = beadEl.querySelector('.bead-delete-btn');
  
  document.querySelectorAll('.bead-delete-btn').forEach(btn => {
    btn.style.display = 'none';
  });
  
  deleteBtn.style.display = 'flex';
}

function handleBeadDelete(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const btn = e.currentTarget;
  const beadId = parseFloat(btn.dataset.id);
  
  state.beads = state.beads.filter(bead => bead.id !== beadId);
  pushHistory();
  redrawBeads();
}

function handleDocumentClick(e) {
  const target = e.target;
  
  if (!target.closest('.placed-bead')) {
    document.querySelectorAll('.bead-delete-btn').forEach(btn => {
      btn.style.display = 'none';
    });
  }
}

function redrawBeads() {
  if (!dom.beadPreview) return;
  
  dom.beadPreview.innerHTML = '';
  
  state.beads.forEach(bead => {
    renderBead(bead);
  });
}

function handleMaterialDragStart(e) {
  const target = e.currentTarget;
  state.isDragging = true;
  state.draggedMaterial = target;
  state.draggedBead = null;
  
  dom.dragGhost = createDragGhost(target);
  
  e.dataTransfer.effectAllowed = 'copy';
}

function handlePlacedBeadDragStart(e) {
  const target = e.currentTarget;
  const beadId = parseFloat(target.dataset.id);
  
  state.isDragging = true;
  state.draggedMaterial = target;
  state.draggedBead = beadId;
  
  dom.dragGhost = createDragGhost(target, true);
  
  e.dataTransfer.effectAllowed = 'move';
}

function handleDocumentDrag(e) {
  if (!state.isDragging) return;
  
  e.preventDefault();
  updateDragGhostPosition(e);
}

function handleDocumentDragEnd(e) {
  if (!state.isDragging) return;
  
  if (isPointInCanvas(e)) {
    const targetAngle = calculateAngleFromPoint(e);
    
    if (state.draggedBead !== null) {
      const emptyAngle = findNearestEmptyAngle(targetAngle, state.draggedBead);
      
      if (emptyAngle !== null) {
        updateBeadAngle(state.draggedBead, emptyAngle);
      } else {
        redrawBeads();
      }
    } else {
      const maxBeads = getMaxBeadCount();
      
      if (state.beads.length >= maxBeads) {
        alert(`手链已满！最多可放置 ${maxBeads} 颗珠子`);
      } else {
        const emptyAngle = findNearestEmptyAngle(targetAngle);
        
        if (emptyAngle !== null) {
          addBead(state.draggedMaterial, emptyAngle);
        } else {
          alert('手链已满！无法添加更多珠子');
        }
      }
    }
  }
  
  removeDragGhost();
  state.isDragging = false;
  state.draggedMaterial = null;
  state.draggedBead = null;
}

function clearAllBeads() {
  state.beads = [];
  pushHistory();
  if (dom.beadPreview) {
    dom.beadPreview.innerHTML = '';
  }
}

function pushHistory() {
  state.beadHistory = state.beadHistory.slice(0, state.historyIndex + 1);
  state.beadHistory.push(state.beads.map(b => ({ ...b })));
  state.historyIndex = state.beadHistory.length - 1;
}

function undo() {
  if (state.historyIndex <= 0) return;
  state.historyIndex--;
  state.beads = state.beadHistory[state.historyIndex].map(b => ({ ...b }));
  redrawBeads();
}

function redo() {
  if (state.historyIndex >= state.beadHistory.length - 1) return;
  state.historyIndex++;
  state.beads = state.beadHistory[state.historyIndex].map(b => ({ ...b }));
  redrawBeads();
}

function exportDesign() {
  if (state.beads.length === 0) {
    alert('请先添加珠子到手链上');
    return;
  }

  const isFileProtocol = window.location.protocol === 'file:';
  if (isFileProtocol) {
    alert('检测到本地文件协议！推荐使用 VSCode Live Server 插件运行项目。\n\n导出将继续进行，但建议使用 http://localhost 以获得最佳体验。');
  }

  const canvasContainer = dom.braceletCanvas;
  if (!canvasContainer) {
    alert('无法找到画布容器');
    return;
  }

  convertImagesToBase64().then(base64Map => {
    replaceImageSrcs(base64Map);

    html2canvas(canvasContainer, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#F7F5F3',
      scale: 2
    }).then(canvas => {
      finishExport(canvas);
      restoreImageSrcs(base64Map);
    }).catch(err => {
      console.error('html2canvas error:', err);
      restoreImageSrcs(base64Map);
      fallbackCanvasExport(base64Map);
    });
  }).catch(err => {
    console.error('Base64 conversion error:', err);
    fallbackCanvasExport({});
  });
}

function convertImagesToBase64() {
  const uniqueUrls = [...new Set(state.beads.map(b => b.src).filter(Boolean))];

  if (uniqueUrls.length === 0) {
    return Promise.resolve({});
  }

  const promises = uniqueUrls.map(url => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL('image/png');
        resolve({ url, base64, success: true });
      };
      img.onerror = () => resolve({ url, base64: null, success: false });
      img.src = url;
    });
  });

  return Promise.all(promises).then(results => {
    const map = {};
    results.forEach(r => {
      if (r.success) {
        map[r.url] = r.base64;
      } else {
        console.warn('图片加载失败（无法转换base64）:', r.url);
      }
    });
    if (Object.keys(map).length < results.length) {
      console.warn('部分图片转换 base64 失败，导出图片中可能缺少对应素材');
    }
    return map;
  });
}

function replaceImageSrcs(base64Map) {
  document.querySelectorAll('.placed-bead-img, .material-img').forEach(img => {
    const originalSrc = img.getAttribute('data-original-src') || img.src;
    if (!img.getAttribute('data-original-src')) {
      img.setAttribute('data-original-src', originalSrc);
    }
    if (base64Map[originalSrc]) {
      img.src = base64Map[originalSrc];
    }
  });
}

function restoreImageSrcs(base64Map) {
  document.querySelectorAll('.placed-bead-img, .material-img').forEach(img => {
    const originalSrc = img.getAttribute('data-original-src');
    if (originalSrc) {
      img.src = originalSrc;
      img.removeAttribute('data-original-src');
    }
  });
}

function fallbackCanvasExport(base64Map) {
  const canvasSize = 380;
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');

  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  const ringRadius = getRingRadius();

  ctx.strokeStyle = '#D4A0A0';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  const beadRadius = 20;
  const beadImages = [];
  let loadedCount = 0;

  const drawBeadFailed = (x, y) => {
    ctx.fillStyle = '#E0E0E0';
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, beadRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#999999';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('素材加载失败', x, y);
  };

  const drawBeadImg = (img, x, y) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, beadRadius, 0, 2 * Math.PI);
    ctx.clip();
    ctx.drawImage(img, x - beadRadius, y - beadRadius, beadRadius * 2, beadRadius * 2);
    ctx.restore();
  };

  state.beads.forEach(bead => {
    const angleRad = (bead.angle - 90) * (Math.PI / 180);
    const bx = cx + Math.cos(angleRad) * ringRadius;
    const by = cy + Math.sin(angleRad) * ringRadius;

    const src = bead.src && base64Map[bead.src] ? base64Map[bead.src] : bead.src;
    if (src) {
      const img = new Image();
      img.onload = () => {
        drawBeadImg(img, bx, by);
        loadedCount++;
        if (loadedCount === beadImages.length) finishExport(canvas);
      };
      img.onerror = () => {
        drawBeadFailed(bx, by);
        loadedCount++;
        if (loadedCount === beadImages.length) finishExport(canvas);
      };
      img.src = src;
      beadImages.push(img);
    } else {
      drawBeadFailed(bx, by);
    }
  });

  if (beadImages.length === 0) {
    finishExport(canvas);
  }
}

function finishExport(canvas) {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '手串设计_' + new Date().toLocaleDateString('zh-CN').replace(/\//g, '-') + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function saveDesign() {
  if (state.beads.length === 0) {
    alert('请先添加珠子到手链上');
    return;
  }

  const braceletData = {
    id: Date.now(),
    beads: [...state.beads],
    wristSize: state.wristSize,
    createdAt: new Date().toISOString(),
  };

  state.savedBracelets.push(braceletData);
  localStorage.setItem('savedBracelets', JSON.stringify(state.savedBracelets));

  alert('设计已保存！');
}

function renderSavedBracelets() {
  if (!dom.braceletsGrid) return;

  if (state.savedBracelets.length === 0) {
    dom.braceletsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💎</div>
        <p class="empty-text">暂无设计的手串</p>
        <p class="empty-hint">去设计界面创建你的专属手串吧！</p>
      </div>
    `;
    return;
  }

  dom.braceletsGrid.innerHTML = state.savedBracelets.map(bracelet => {
    const firstBead = bracelet.beads[0];
    const previewStyle = bracelet.beads.length > 0 
      ? `background: linear-gradient(135deg, ${getBeadColors(bracelet)});`
      : 'background: var(--accent);';

    return `
      <div class="bracelet-card" data-id="${bracelet.id}">
        <div class="bracelet-img-wrapper" style="${previewStyle}">
          ${bracelet.beads.length > 0 && firstBead.src ? 
            `<img class="bracelet-img" src="${firstBead.src}" alt="手串" />` : 
            '<div class="bracelet-placeholder">' + bracelet.beads.length + '颗珠子</div>'
          }
        </div>
        <div class="bracelet-actions">
          <button type="button" class="bracelet-btn" data-id="${bracelet.id}">查看更多</button>
          <button type="button" class="bracelet-btn-delete" data-id="${bracelet.id}">删除</button>
        </div>
      </div>
    `;
  }).join('');
  
  document.querySelectorAll('.bracelet-btn').forEach(btn => {
    btn.addEventListener('click', handleViewBracelet);
  });
  
  document.querySelectorAll('.bracelet-btn-delete').forEach(btn => {
    btn.addEventListener('click', handleDeleteBracelet);
  });
}

function getBeadColors(bracelet) {
  if (bracelet.beads.length < 2) return '#A8B5A2, #D4A0A0';
  
  const first = bracelet.beads[0];
  const last = bracelet.beads[bracelet.beads.length - 1];
  
  return getColorFromSrc(first.src) + ', ' + getColorFromSrc(last.src);
}

function getColorFromSrc(src) {
  const colorMap = {
    'aaa.png': '#A8B5A2',
  };
  return colorMap[src.split('/').pop()] || '#D4A0A0';
}

function handleViewBracelet(e) {
  const btn = e.currentTarget;
  const braceletId = parseFloat(btn.dataset.id);
  
  const bracelet = state.savedBracelets.find(b => b.id === braceletId);
  if (!bracelet) return;
  
  clearAllBeads();
  
  state.beads = [...bracelet.beads];
  state.wristSize = bracelet.wristSize;
  
  if (dom.wristSizeSelect) {
    dom.wristSizeSelect.value = bracelet.wristSize + 'cm';
  }
  
  updateCanvasRing(bracelet.wristSize);
  redrawBeads();
  
  setActiveNav('design');
}

function handleDeleteBracelet(e) {
  e.stopPropagation();
  
  const btn = e.currentTarget;
  const braceletId = parseFloat(btn.dataset.id);
  
  if (!confirm('确定要删除这个手串吗？')) {
    return;
  }
  
  state.savedBracelets = state.savedBracelets.filter(b => b.id !== braceletId);
  localStorage.setItem('savedBracelets', JSON.stringify(state.savedBracelets));
  
  renderSavedBracelets();
}

function init() {
  dom.navButtons.forEach((btn) => btn.addEventListener('click', handleNavClick));
  if (dom.primaryBtn) dom.primaryBtn.addEventListener('click', handlePrimaryCta);
  dom.dots.forEach((dot) => dot.addEventListener('click', handleDotClick));
  dom.wuxingBtns.forEach((btn) => btn.addEventListener('click', handleWuxingClick));
  
  if (dom.wristSizeSelect) {
    dom.wristSizeSelect.addEventListener('change', handleWristSizeChange);
    updateCanvasRing(state.wristSize);
  }
  
  dom.materialItems.forEach((item) => {
    item.setAttribute('draggable', 'true');
    item.addEventListener('dragstart', handleMaterialDragStart);
  });
  
  document.addEventListener('drag', handleDocumentDrag);
  document.addEventListener('dragend', handleDocumentDragEnd);
  document.addEventListener('click', handleDocumentClick);
  
  const clearBtn = document.querySelector('.action-btn[title="清空"]');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAllBeads);
  }
  
  const undoBtn = document.querySelector('.action-btn[title="上一步"]');
  if (undoBtn) {
    undoBtn.addEventListener('click', undo);
  }
  
  const redoBtn = document.querySelector('.action-btn[title="下一步"]');
  if (redoBtn) {
    redoBtn.addEventListener('click', redo);
  }
  
  if (dom.saveBtn) {
    dom.saveBtn.addEventListener('click', saveDesign);
  }
  
  const exportBtn = document.querySelector('.btn-preview');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportDesign);
  }
  
  renderSavedBracelets();
  pushHistory();
}

init();

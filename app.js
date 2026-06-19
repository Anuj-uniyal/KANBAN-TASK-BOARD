/* ══════════════════════════════════════════════
   KanFlow — Kanban Board App Logic
   Features: Drag & Drop (HTML5), CRUD, localStorage
   ══════════════════════════════════════════════ */

'use strict';

// ── Storage Key ──────────────────────────────────────
const STORAGE_KEY = 'kanflow_board_v2';

// ── State ─────────────────────────────────────────────
let state = {
  cards: {} // { id: { id, title, description, priority, tag, due, column, createdAt } }
};

// Currently dragged card id
let draggedCardId = null;

// Modal state
let modalMode = null; // 'create' | 'edit'
let modalColumn = null;
let modalEditId = null;

// Delete state
let deleteCardId = null;

// Complete state
let completeCardId = null;


// ── DOM Refs ──────────────────────────────────────────
const dom = {
  modal:          () => document.getElementById('modal-overlay'),
  modalTitle:     () => document.getElementById('modal-title'),
  modalSaveText:  () => document.getElementById('modal-save-text'),
  titleInput:     () => document.getElementById('card-title-input'),
  descInput:      () => document.getElementById('card-desc-input'),
  priorityInput:  () => document.getElementById('card-priority-input'),
  tagInput:       () => document.getElementById('card-tag-input'),
  dueInput:       () => document.getElementById('card-due-input'),
  deleteOverlay:  () => document.getElementById('delete-overlay'),
  deleteCardName: () => document.getElementById('delete-card-name'),

  completeOverlay:     () => document.getElementById('complete-overlay'),
  completeCardNameEl: () => document.getElementById('complete-card-name'),
  completeConfirmBtn: () => document.getElementById('complete-confirm'),
  completeCancelBtn:  () => document.getElementById('complete-cancel'),

  toastContainer: () => document.getElementById('toast-container'),
};


const COLUMNS = ['todo', 'inprogress', 'done'];

// ── localStorage ──────────────────────────────────────
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migration: ensure all cards have required fields
      if (parsed.cards) {
        Object.values(parsed.cards).forEach(card => {
          card.priority = card.priority || 'medium';
          card.tag      = card.tag || '';
          card.due      = card.due || '';
          card.description = card.description || '';
        });
        state = parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load state:', e);
    state = { cards: {} };
  }
}

// ── ID Generator ─────────────────────────────────────
function generateId() {
  return `card_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Render ────────────────────────────────────────────
function render() {
  COLUMNS.forEach(col => {
    const container = document.getElementById(`cards-${col}`);
    const countEl   = document.getElementById(`count-${col}`);
    const cards = Object.values(state.cards).filter(c => c.column === col)
      .sort((a, b) => a.createdAt - b.createdAt);

    countEl.textContent = cards.length;

    container.innerHTML = '';

    if (cards.length === 0) {
      container.appendChild(createEmptyState(col));
    } else {
      cards.forEach(card => container.appendChild(createCardEl(card)));
    }
  });

  updateStats();
}

function updateStats() {
  const counts = { todo: 0, inprogress: 0, done: 0 };
  Object.values(state.cards).forEach(c => { if (counts[c.column] !== undefined) counts[c.column]++; });

  document.getElementById('stat-todo').textContent     = `${counts.todo} to do`;
  document.getElementById('stat-progress').textContent = `${counts.inprogress} in progress`;
  document.getElementById('stat-done').textContent     = `${counts.done} done`;

  // Premium completion progress
  const total = counts.todo + counts.inprogress + counts.done;
  const completed = counts.done;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  const labelEl = document.getElementById('progress-label');
  const fillEl  = document.getElementById('progress-fill');
  if (labelEl) labelEl.textContent = `${percent}% complete`;
  if (fillEl) fillEl.style.width = `${percent}%`;
}


// ── Empty State ───────────────────────────────────────
const COLUMN_EMPTY = {
  todo:       { icon: '📋', text: 'No tasks yet.\nClick + to add your first card.' },
  inprogress: { icon: '⚡', text: 'Nothing in progress.\nDrag cards here to start.' },
  done:       { icon: '✅', text: 'Nothing completed yet.\nKeep going!' },
};

function createEmptyState(col) {
  const div = document.createElement('div');
  div.className = 'empty-state';
  const { icon, text } = COLUMN_EMPTY[col];
  div.innerHTML = `
    <div class="empty-state-icon">${icon}</div>
    <div class="empty-state-text">${text.replace('\n', '<br>')}</div>
  `;
  return div;
}

// ── Card Element ──────────────────────────────────────
function createCardEl(card) {
  const el = document.createElement('div');
  el.className = 'card';
  el.setAttribute('draggable', 'true');
  el.setAttribute('data-id', card.id);
  el.setAttribute('role', 'listitem');
  el.setAttribute('aria-label', `Card: ${card.title}`);

  // Due date formatting
  let dueHtml = '';
  if (card.due) {
    const due = new Date(card.due + 'T00:00:00');
    const now = new Date();
    now.setHours(0,0,0,0);
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    let dueClass = '';
    let dueLabel = formatDate(card.due);
    if (diff < 0)      { dueClass = 'overdue'; dueLabel = `Overdue · ${formatDate(card.due)}`; }
    else if (diff <= 2) { dueClass = 'due-soon'; }
    dueHtml = `<span class="card-due ${dueClass}">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      ${dueLabel}
    </span>`;
  }

  el.innerHTML = `
    <div class="card-header">
      <span class="card-title">${escapeHtml(card.title)}</span>
      <div class="card-actions">
        <button class="card-btn edit-btn" data-id="${card.id}" title="Edit card" aria-label="Edit card">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 2 2L10 15l-3 1 1-3z"/></svg>
        </button>
        <button class="card-btn delete-btn" data-id="${card.id}" title="Delete card" aria-label="Delete card">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="m19 6-.867 14.142A2 2 0 0 1 16.138 22H7.862a2 2 0 0 1-1.995-1.858L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>
    ${card.description ? `<p class="card-description">${escapeHtml(card.description)}</p>` : ''}
    <div class="card-meta">
      <span class="card-priority priority-${card.priority}">${card.priority}</span>
      ${card.tag ? `<span class="card-tag">${escapeHtml(card.tag)}</span>` : ''}
      ${dueHtml}
    </div>
    <button class="btn-clear-task" data-id="${card.id}" aria-label="Clear task">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="m19 6-.867 14.142A2 2 0 0 1 16.138 22H7.862a2 2 0 0 1-1.995-1.858L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      Clear Task
    </button>

    ${card.column === 'todo' || card.column === 'inprogress' ? `
      <button class="btn-complete-task" data-id="${card.id}" aria-label="Complete task">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        Complete
      </button>
    ` : ''}
  `;

  // Drag events
  el.addEventListener('dragstart', onCardDragStart);
  el.addEventListener('dragend',   onCardDragEnd);

  // Action buttons
  el.querySelector('.edit-btn').addEventListener('click', e => {
    e.stopPropagation();
    openEditModal(card.id);
  });
  el.querySelector('.delete-btn').addEventListener('click', e => {
    e.stopPropagation();
    openDeleteModal(card.id);
  });
  el.querySelector('.btn-clear-task').addEventListener('click', e => {
    e.stopPropagation();
    openDeleteModal(card.id);
  });

  // Complete action (only for To Do / In Progress cards)
  if (card.column === 'todo' || card.column === 'inprogress') {
    const completeBtn = el.querySelector('.btn-complete-task');
    if (completeBtn) {
      completeBtn.addEventListener('click', e => {
        e.stopPropagation();
        openCompleteModal(card.id);
      });
    }
  }

  return el;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Drag & Drop ───────────────────────────────────────
function onCardDragStart(e) {
  draggedCardId = e.currentTarget.getAttribute('data-id');
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedCardId);
}

function onCardDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  // Remove all hover states
  document.querySelectorAll('.column').forEach(col => col.classList.remove('drag-over'));
  document.querySelectorAll('.card').forEach(c => c.classList.remove('drag-ghost-over'));
  draggedCardId = null;
}

function setupColumnDropZones() {
  COLUMNS.forEach(col => {
    const column    = document.getElementById(`col-${col}`);
    const container = document.getElementById(`cards-${col}`);

    column.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      column.classList.add('drag-over');
    });

    column.addEventListener('dragleave', e => {
      // Only remove if actually leaving the column
      if (!column.contains(e.relatedTarget)) {
        column.classList.remove('drag-over');
      }
    });

    column.addEventListener('drop', e => {
      e.preventDefault();
      column.classList.remove('drag-over');
      if (!draggedCardId) return;

      const card = state.cards[draggedCardId];
      if (!card) return;

      const prevCol = card.column;
      if (prevCol === col) return; // Same column

      card.column = col;
      saveState();
      render();

      const colLabels = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
      showToast(`Moved to "${colLabels[col]}"`, 'info', '🚀');
    });
  });
}

// ── Modal (Create / Edit) ─────────────────────────────
function openCreateModal(col) {
  modalMode   = 'create';
  modalColumn = col;
  modalEditId = null;

  dom.modalTitle().textContent   = 'New Card';
  dom.modalSaveText().textContent = 'Create Card';
  clearModalForm();
  showModal('modal-overlay');
  setTimeout(() => dom.titleInput().focus(), 100);
}

function openEditModal(id) {
  const card = state.cards[id];
  if (!card) return;

  modalMode   = 'edit';
  modalEditId = id;

  dom.modalTitle().textContent   = 'Edit Card';
  dom.modalSaveText().textContent = 'Save Changes';
  dom.titleInput().value    = card.title;
  dom.descInput().value     = card.description || '';
  dom.priorityInput().value = card.priority || 'medium';
  dom.tagInput().value      = card.tag || '';
  dom.dueInput().value      = card.due || '';
  showModal('modal-overlay');
  setTimeout(() => dom.titleInput().focus(), 100);
}

function clearModalForm() {
  dom.titleInput().value    = '';
  dom.descInput().value     = '';
  dom.priorityInput().value = 'medium';
  dom.tagInput().value      = '';
  dom.dueInput().value      = '';
}

function handleModalSave() {
  const title = dom.titleInput().value.trim();
  if (!title) {
    dom.titleInput().focus();
    dom.titleInput().classList.add('input-error');
    setTimeout(() => dom.titleInput().classList.remove('input-error'), 800);
    showToast('Title is required!', 'error', '⚠️');
    return;
  }

  if (modalMode === 'create') {
    const id = generateId();
    state.cards[id] = {
      id,
      title,
      description: dom.descInput().value.trim(),
      priority:    dom.priorityInput().value,
      tag:         dom.tagInput().value.trim(),
      due:         dom.dueInput().value,
      column:      modalColumn,
      createdAt:   Date.now(),
    };
    saveState();
    render();
    closeModal('modal-overlay');
    showToast('Card created!', 'success', '✅');
  } else if (modalMode === 'edit' && modalEditId) {
    const card = state.cards[modalEditId];
    if (!card) return;
    card.title       = title;
    card.description = dom.descInput().value.trim();
    card.priority    = dom.priorityInput().value;
    card.tag         = dom.tagInput().value.trim();
    card.due         = dom.dueInput().value;
    saveState();
    render();
    closeModal('modal-overlay');
    showToast('Card updated!', 'success', '✏️');
  }
}

// ── Delete Modal ──────────────────────────────────────
function openDeleteModal(id) {
  const card = state.cards[id];
  if (!card) return;
  deleteCardId = id;
  dom.deleteCardName().textContent = `"${card.title}"`;
  showModal('delete-overlay');
}

function handleDeleteConfirm() {
  if (!deleteCardId) return;
  delete state.cards[deleteCardId];
  deleteCardId = null;
  saveState();
  render();
  closeModal('delete-overlay');
  showToast('Card deleted', 'error', '🗑️');
}

// ── Complete Modal ───────────────────────────────────
function openCompleteModal(id) {
  const card = state.cards[id];
  if (!card) return;
  completeCardId = id;
  dom.completeCardNameEl().textContent = `"${card.title}"`;
  showModal('complete-overlay');
}

function handleCompleteConfirm() {
  if (!completeCardId) return;
  const card = state.cards[completeCardId];
  if (!card) {
    completeCardId = null;
    closeModal('complete-overlay');
    return;
  }

  card.column = 'done';
  completeCardId = null;
  saveState();
  render();
  closeModal('complete-overlay');
  showToast('Card marked as completed!', 'success', '✅');
}


// ── Modal Helpers ─────────────────────────────────────
function showModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

// ── Clear Done ────────────────────────────────────────
function clearDoneCards() {
  const doneCards = Object.values(state.cards).filter(c => c.column === 'done');
  if (doneCards.length === 0) {
    showToast('No completed cards to clear', 'info', 'ℹ️');
    return;
  }
  doneCards.forEach(c => delete state.cards[c.id]);
  saveState();
  render();
  showToast(`Cleared ${doneCards.length} done card${doneCards.length !== 1 ? 's' : ''}`, 'success', '🧹');
}

// ── Toast ─────────────────────────────────────────────
function showToast(message, type = 'info', icon = 'ℹ️') {
  const container = dom.toastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 2800);
}

// ── Keyboard Shortcuts ────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal('modal-overlay');
    closeModal('delete-overlay');
    closeModal('complete-overlay');
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const modalActive = document.getElementById('modal-overlay').classList.contains('active');
    if (modalActive) handleModalSave();
  }
});

// ── Event Listeners ───────────────────────────────────
function bindEvents() {
  // Add card buttons
  document.querySelectorAll('.btn-add-card').forEach(btn => {
    btn.addEventListener('click', () => openCreateModal(btn.getAttribute('data-column')));
  });

  // Modal save / cancel / close
  document.getElementById('modal-save').addEventListener('click', handleModalSave);
  document.getElementById('modal-cancel').addEventListener('click', () => closeModal('modal-overlay'));
  document.getElementById('modal-close').addEventListener('click', () => closeModal('modal-overlay'));

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal('modal-overlay');
  });

  // Delete modal
  document.getElementById('delete-confirm').addEventListener('click', handleDeleteConfirm);
  document.getElementById('delete-cancel').addEventListener('click', () => closeModal('delete-overlay'));
  document.getElementById('delete-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('delete-overlay')) closeModal('delete-overlay');
  });

  // Complete modal
  document.getElementById('complete-confirm').addEventListener('click', handleCompleteConfirm);
  document.getElementById('complete-cancel').addEventListener('click', () => closeModal('complete-overlay'));
  document.getElementById('complete-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('complete-overlay')) closeModal('complete-overlay');
  });


  // Clear done
  document.getElementById('btn-clear-done').addEventListener('click', clearDoneCards);

  // Title input: remove error styling on input
  document.getElementById('card-title-input').addEventListener('input', () => {
    document.getElementById('card-title-input').classList.remove('input-error');
  });
}

// ── Seed Demo Data ────────────────────────────────────
function seedDemoData() {
  const now = Date.now();
  const todayPlus = (days) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    return d.toISOString().slice(0,10);
  };

  const demos = [
    { id: generateId(), title: 'Design new landing page',    description: 'Create wireframes and mockups for the redesigned homepage.', priority: 'high',   tag: 'Design',    due: todayPlus(3),  column: 'todo',       createdAt: now - 6000 },
    { id: generateId(), title: 'Set up CI/CD pipeline',      description: 'Configure GitHub Actions for automated testing and deployment.', priority: 'urgent', tag: 'DevOps', due: todayPlus(-1), column: 'todo',       createdAt: now - 5000 },
    { id: generateId(), title: 'Write unit tests for auth',  description: 'Cover login, registration, and password reset flows.', priority: 'medium', tag: 'Testing',  due: todayPlus(7),  column: 'todo',       createdAt: now - 4000 },
    { id: generateId(), title: 'API integration with Stripe', description: 'Implement payment gateway for subscription plans.', priority: 'high',   tag: 'Backend',   due: todayPlus(2),  column: 'inprogress', createdAt: now - 3000 },
    { id: generateId(), title: 'Dashboard analytics charts', description: 'Build real-time charts using Chart.js.', priority: 'medium', tag: 'Frontend', due: todayPlus(5),  column: 'inprogress', createdAt: now - 2000 },
    { id: generateId(), title: 'User onboarding flow',       description: 'Completed the 5-step onboarding wizard with animations.', priority: 'low',    tag: 'UX',        due: todayPlus(-3), column: 'done',       createdAt: now - 1000 },
    { id: generateId(), title: 'Fix mobile nav bug',         description: 'Resolved hamburger menu overflow on iOS Safari.', priority: 'high',   tag: 'Bug',       due: todayPlus(-2), column: 'done',       createdAt: now - 500  },
  ];

  demos.forEach(card => { state.cards[card.id] = card; });
  saveState();
}

// ── Init ──────────────────────────────────────────────
function init() {
  loadState();

  // Seed demo data only on first visit
  if (Object.keys(state.cards).length === 0) {
    seedDemoData();
  }

  setupColumnDropZones();
  bindEvents();
  render();
}

document.addEventListener('DOMContentLoaded', init);

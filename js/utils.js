/* =========================================================================
   TaskFlow — utils.js
   Pure helper functions: id generation, dates, hierarchical tree helpers,
   filtering/search, and LocalStorage persistence.
   Loaded as a plain (non-module) script so everything below is attached
   to the shared global scope and reused by store.js / components.js / etc.
   ========================================================================= */

/* ---------------------- ID generation ---------------------- */
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/* ---------------------- Priority metadata ---------------------- */
const PRIORITY_LABEL = { low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente' };
const PRIORITY_COLOR = { low: '#64748b', medium: '#3b82f6', high: '#f97316', urgent: '#ef4444' };
const PRIORITY_ICON = { urgent: '🔴', high: '🟠', medium: '🔵', low: '⚪' };
const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
const PROJECT_COLORS = [
  '#6366f1', '#ec4899', '#f97316', '#f59e0b',
  '#84cc16', '#10b981', '#06b6d4', '#3b82f6',
  '#8b5cf6', '#ef4444', '#64748b', '#0ea5e9',
];

/* ---------------------- Date helpers (ISO yyyy-mm-dd strings) ---------------------- */
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayISO() {
  return toISODate(new Date());
}

function isToday(iso) {
  if (!iso) return false;
  return iso === todayISO();
}

function isOverdue(iso, completed) {
  if (!iso || completed) return false;
  return iso < todayISO();
}

function isUpcoming(iso) {
  if (!iso) return false;
  return iso > todayISO();
}

function isWithinWeek(iso) {
  if (!iso) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + 'T00:00:00');
  const diffDays = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const today = todayISO();
  const tomorrow = toISODate(new Date(Date.now() + 86400000));
  const yesterday = toISODate(new Date(Date.now() - 86400000));
  if (iso === today) return "Aujourd'hui";
  if (iso === tomorrow) return 'Demain';
  if (iso === yesterday) return 'Hier';
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('fr-FR', opts);
}

function formatDateTime(ts) {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/* ---------------------- Hierarchical tree helpers ---------------------- */

/** Build a nested tree from a flat task list, filtered by parentId, sorted by position. */
function buildTree(tasks, parentId = null, depth = 0) {
  return tasks
    .filter((t) => t.parentId === parentId)
    .sort((a, b) => a.position - b.position)
    .map((t) => ({ ...t, depth, children: buildTree(tasks, t.id, depth + 1) }));
}

/** Flatten a tree back into a visible list, skipping children of collapsed nodes. */
function flattenVisible(nodes) {
  const result = [];
  for (const node of nodes) {
    result.push(node);
    if (!node.collapsed && node.children && node.children.length > 0) {
      result.push(...flattenVisible(node.children));
    }
  }
  return result;
}

/** All descendant ids (recursive) of a task. */
function getDescendantIds(tasks, taskId) {
  const direct = tasks.filter((t) => t.parentId === taskId).map((t) => t.id);
  let all = [...direct];
  for (const id of direct) all = all.concat(getDescendantIds(tasks, id));
  return all;
}

/** Count total & completed tasks in a subtree (inclusive of the task itself). */
function countSubtree(tasks, taskId) {
  const ids = [taskId, ...getDescendantIds(tasks, taskId)];
  const set = new Set(ids);
  const subset = tasks.filter((t) => set.has(t.id));
  return { total: subset.length, completed: subset.filter((t) => t.completed).length };
}

/** True if candidateAncestorId is an ancestor of (or equal to) taskId. */
function isAncestor(tasks, candidateAncestorId, taskId) {
  let current = tasks.find((t) => t.id === taskId);
  while (current) {
    if (current.id === candidateAncestorId) return true;
    if (!current.parentId) return false;
    current = tasks.find((t) => t.id === current.parentId);
  }
  return false;
}

function getSiblings(tasks, projectId, parentId) {
  return tasks
    .filter((t) => t.projectId === projectId && t.parentId === parentId)
    .sort((a, b) => a.position - b.position);
}

function nextPosition(tasks, projectId, parentId) {
  const siblings = getSiblings(tasks, projectId, parentId);
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((s) => s.position)) + 1;
}

/* ---------------------- Filtering & search ---------------------- */

function applyFilters(tasks, filters) {
  return tasks.filter((t) => {
    if (filters.status === 'active' && t.completed) return false;
    if (filters.status === 'completed' && !t.completed) return false;
    if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
    if (filters.projectId !== 'all' && t.projectId !== filters.projectId) return false;
    if (filters.tag !== 'all' && !t.tags.includes(filters.tag)) return false;
    if (filters.dateRange === 'overdue' && !isOverdue(t.dueDate, t.completed)) return false;
    if (filters.dateRange === 'today' && !isToday(t.dueDate)) return false;
    if (filters.dateRange === 'week' && !isWithinWeek(t.dueDate)) return false;
    if (filters.dateRange === 'none' && t.dueDate) return false;
    return true;
  });
}

function searchTasks(tasks, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return tasks;
  return tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

/** Expand a filtered/searched subset to include ancestors, so hierarchy stays visible. */
function withAncestors(allTasks, subset) {
  const ids = new Set(subset.map((t) => t.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of allTasks) {
      if (ids.has(t.id) && t.parentId && !ids.has(t.parentId)) {
        ids.add(t.parentId);
        changed = true;
      }
    }
  }
  return allTasks.filter((t) => ids.has(t.id));
}

/* ---------------------- LocalStorage persistence ---------------------- */

const STORAGE_KEY = 'taskflow.data.v1';
const THEME_KEY = 'taskflow.theme';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.projects) || !Array.isArray(parsed.tasks)) return null;
    return parsed;
  } catch (e) {
    console.error('Erreur de lecture du stockage local', e);
    return null;
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Erreur d'écriture du stockage local", e);
  }
}

function clearStoredData() {
  localStorage.removeItem(STORAGE_KEY);
}

function loadTheme() {
  const t = localStorage.getItem(THEME_KEY);
  if (t === 'dark' || t === 'light') return t;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

/* ---------------------- First-run demo data ---------------------- */

function seedData() {
  const now = Date.now();
  const projectId = generateId();
  const tomorrow = toISODate(new Date(Date.now() + 86400000));

  const rootId = generateId();
  const childAId = generateId();
  const childBId = generateId();
  const grandchildId = generateId();
  const rootId2 = generateId();
  const rootId3 = generateId();

  return {
    version: 1,
    projects: [
      { id: projectId, name: 'Développement du jeu', color: '#6366f1', archived: false, createdAt: now },
    ],
    tasks: [
      {
        id: rootId, projectId, parentId: null,
        title: 'Développer le système de sauvegarde',
        description: 'Concevoir et implémenter la persistance des parties.',
        completed: false, completedAt: null, priority: 'high', dueDate: tomorrow,
        tags: ['backend'], createdAt: now, updatedAt: now, position: 0, collapsed: false,
      },
      {
        id: childAId, projectId, parentId: rootId,
        title: 'Créer la structure des données', description: '',
        completed: false, completedAt: null, priority: 'medium', dueDate: null,
        tags: [], createdAt: now, updatedAt: now, position: 0, collapsed: false,
      },
      {
        id: grandchildId, projectId, parentId: childAId,
        title: 'Créer les utilisateurs', description: '',
        completed: false, completedAt: null, priority: 'low', dueDate: null,
        tags: [], createdAt: now, updatedAt: now, position: 0, collapsed: false,
      },
      {
        id: generateId(), projectId, parentId: childAId,
        title: 'Créer les sauvegardes', description: '',
        completed: false, completedAt: null, priority: 'low', dueDate: null,
        tags: [], createdAt: now, updatedAt: now, position: 1, collapsed: false,
      },
      {
        id: childBId, projectId, parentId: rootId,
        title: 'Créer le système de sauvegarde', description: '',
        completed: false, completedAt: null, priority: 'medium', dueDate: null,
        tags: [], createdAt: now, updatedAt: now, position: 1, collapsed: false,
      },
      {
        id: rootId2, projectId, parentId: null,
        title: 'Tester le système', description: '',
        completed: false, completedAt: null, priority: 'urgent', dueDate: todayISO(),
        tags: ['qa'], createdAt: now, updatedAt: now, position: 1, collapsed: false,
      },
      {
        id: rootId3, projectId, parentId: null,
        title: 'Écrire la documentation', description: '',
        completed: true, completedAt: now, priority: 'low', dueDate: null,
        tags: ['docs'], createdAt: now, updatedAt: now, position: 2, collapsed: false,
      },
    ],
  };
}

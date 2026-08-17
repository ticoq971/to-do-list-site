/* =========================================================================
   TaskFlow — store.js
   Centralized state management (Context + reducer) and small sibling
   contexts for filters / selection / open task modal. Everything is
   attached to the global scope (no ES modules, no build step).
   ========================================================================= */

/* All React hooks used across the whole app are destructured ONCE here.
   Classic <script> tags share a single global lexical scope, so redeclaring
   `const useState` etc. in another file would throw a fatal SyntaxError
   ("Identifier has already been declared") and silently blank the page. */
const {
  createContext, useContext, useEffect, useMemo, useReducer, useRef, useState,
} = React;

/* ---------------------- Reducer ---------------------- */

function taskflowReducer(state, action) {
  switch (action.type) {
    case 'ADD_PROJECT': {
      const project = {
        id: action.payload.id,
        name: action.payload.name,
        color: action.payload.color,
        archived: false,
        createdAt: Date.now(),
      };
      return { ...state, projects: [...state.projects, project] };
    }
    case 'UPDATE_PROJECT': {
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.payload.id ? { ...p, ...action.payload.changes } : p)),
      };
    }
    case 'DELETE_PROJECT': {
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.payload.id),
        tasks: state.tasks.filter((t) => t.projectId !== action.payload.id),
      };
    }
    case 'ARCHIVE_PROJECT': {
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.payload.id ? { ...p, archived: action.payload.archived } : p)),
      };
    }
    case 'ADD_TASK': {
      const { projectId, parentId, title, extra } = action.payload;
      const task = {
        id: generateId(),
        projectId,
        parentId,
        title,
        description: '',
        completed: false,
        completedAt: null,
        priority: 'medium',
        dueDate: null,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        position: nextPosition(state.tasks, projectId, parentId),
        collapsed: false,
        ...extra,
      };
      return { ...state, tasks: [...state.tasks, task] };
    }
    case 'UPDATE_TASK': {
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.changes, updatedAt: Date.now() } : t
        ),
      };
    }
    case 'DELETE_TASK': {
      const idsToRemove = new Set([action.payload.id, ...getDescendantIds(state.tasks, action.payload.id)]);
      return { ...state, tasks: state.tasks.filter((t) => !idsToRemove.has(t.id)) };
    }
    case 'TOGGLE_COMPLETE': {
      const task = state.tasks.find((t) => t.id === action.payload.id);
      if (!task) return state;
      const newCompleted = !task.completed;
      const descendantIds = getDescendantIds(state.tasks, task.id);
      const affected = new Set([task.id, ...descendantIds]);
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          affected.has(t.id)
            ? { ...t, completed: newCompleted, completedAt: newCompleted ? Date.now() : null, updatedAt: Date.now() }
            : t
        ),
      };
    }
    case 'TOGGLE_COLLAPSE': {
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.payload.id ? { ...t, collapsed: !t.collapsed } : t)),
      };
    }
    case 'MOVE_TASK': {
      const { id, newParentId } = action.payload;
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return state;
      if (newParentId) {
        if (newParentId === id) return state;
        if (isAncestor(state.tasks, id, newParentId)) return state;
      }
      const newProjectId = action.payload.newProjectId || task.projectId;
      const pos = nextPosition(state.tasks, newProjectId, newParentId);
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, parentId: newParentId, projectId: newProjectId, position: pos, updatedAt: Date.now() } : t
        ),
      };
    }
    case 'REORDER_SIBLINGS': {
      const { orderedIds } = action.payload;
      const posMap = new Map(orderedIds.map((id, idx) => [id, idx]));
      return {
        ...state,
        tasks: state.tasks.map((t) => (posMap.has(t.id) ? { ...t, position: posMap.get(t.id) } : t)),
      };
    }
    case 'INDENT_TASK': {
      const task = state.tasks.find((t) => t.id === action.payload.id);
      if (!task) return state;
      const siblings = getSiblings(state.tasks, task.projectId, task.parentId);
      const idx = siblings.findIndex((s) => s.id === task.id);
      const prevSibling = siblings[idx - 1];
      if (!prevSibling) return state;
      const pos = nextPosition(state.tasks, task.projectId, prevSibling.id);
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === task.id ? { ...t, parentId: prevSibling.id, position: pos, updatedAt: Date.now() } : t
        ),
      };
    }
    case 'OUTDENT_TASK': {
      const task = state.tasks.find((t) => t.id === action.payload.id);
      if (!task || !task.parentId) return state;
      const parent = state.tasks.find((t) => t.id === task.parentId);
      if (!parent) return state;
      const pos = nextPosition(state.tasks, task.projectId, parent.parentId);
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === task.id ? { ...t, parentId: parent.parentId, position: pos, updatedAt: Date.now() } : t
        ),
      };
    }
    case 'IMPORT_DATA': {
      const incoming = action.payload || {};
      const projects = Array.isArray(incoming.projects) ? incoming.projects : [];
      const tasks = Array.isArray(incoming.tasks) ? incoming.tasks : [];
      if (incoming.merge) {
        const projectIds = new Set(state.projects.map((p) => p.id));
        const taskIds = new Set(state.tasks.map((t) => t.id));
        return {
          ...state,
          projects: [...state.projects, ...projects.filter((p) => p && p.id && !projectIds.has(p.id))],
          tasks: [...state.tasks, ...tasks.filter((t) => t && t.id && !taskIds.has(t.id))],
        };
      }
      return { projects, tasks };
    }
    case 'RESET_DATA': {
      return seedData();
    }
    default:
      return state;
  }
}

/* ---------------------- Task store context ---------------------- */

const StoreContext = createContext(null);

function TaskStoreProvider({ children }) {
  const initial = useRef(loadData() || seedData());
  const [state, dispatch] = useReducer(taskflowReducer, initial.current);

  useEffect(() => {
    saveData(state);
  }, [state]);

  const value = useMemo(() => ({
    state,
    addProject: (name, color) => {
      const id = generateId();
      dispatch({ type: 'ADD_PROJECT', payload: { id, name, color } });
      return id;
    },
    updateProject: (id, changes) => dispatch({ type: 'UPDATE_PROJECT', payload: { id, changes } }),
    deleteProject: (id) => dispatch({ type: 'DELETE_PROJECT', payload: { id } }),
    archiveProject: (id, archived) => dispatch({ type: 'ARCHIVE_PROJECT', payload: { id, archived } }),
    addTask: (projectId, parentId, title, extra) => {
      const id = generateId();
      dispatch({ type: 'ADD_TASK', payload: { projectId, parentId, title, extra: { id, ...(extra || {}) } } });
      return id;
    },
    updateTask: (id, changes) => dispatch({ type: 'UPDATE_TASK', payload: { id, changes } }),
    deleteTask: (id) => dispatch({ type: 'DELETE_TASK', payload: { id } }),
    toggleComplete: (id) => dispatch({ type: 'TOGGLE_COMPLETE', payload: { id } }),
    moveTask: (id, newParentId, newProjectId) => dispatch({ type: 'MOVE_TASK', payload: { id, newParentId, newProjectId } }),
    reorderSiblings: (projectId, parentId, orderedIds) =>
      dispatch({ type: 'REORDER_SIBLINGS', payload: { projectId, parentId, orderedIds } }),
    toggleCollapse: (id) => dispatch({ type: 'TOGGLE_COLLAPSE', payload: { id } }),
    indentTask: (id) => dispatch({ type: 'INDENT_TASK', payload: { id } }),
    outdentTask: (id) => dispatch({ type: 'OUTDENT_TASK', payload: { id } }),
    importData: (data, merge) => dispatch({ type: 'IMPORT_DATA', payload: { ...data, merge: !!merge } }),
    resetData: () => {
      clearStoredData();
      dispatch({ type: 'RESET_DATA' });
    },
  }), [state]);

  return React.createElement(StoreContext.Provider, { value }, children);
}

function useTaskStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useTaskStore must be used within TaskStoreProvider');
  return ctx;
}

/* ---------------------- Filters context ---------------------- */

const DEFAULT_FILTERS = { priority: 'all', status: 'all', projectId: 'all', tag: 'all', dateRange: 'all' };
const FiltersContext = createContext(null);

function FiltersProvider({ children }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const resetFilters = () => setFilters(DEFAULT_FILTERS);
  const filtersActive =
    filters.priority !== 'all' || filters.status !== 'all' || filters.projectId !== 'all' ||
    filters.tag !== 'all' || filters.dateRange !== 'all';

  return React.createElement(
    FiltersContext.Provider,
    { value: { filters, setFilters, resetFilters, search, setSearch, filtersActive } },
    children
  );
}

function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters must be used within FiltersProvider');
  return ctx;
}

/* ---------------------- Selection context (keyboard navigation) ---------------------- */

const SelectionContext = createContext(null);

function SelectionProvider({ children }) {
  const [selectedId, setSelectedId] = useState(null);
  const [visibleIds, setVisibleIds] = useState([]);
  return React.createElement(
    SelectionContext.Provider,
    { value: { selectedId, setSelectedId, visibleIds, setVisibleIds } },
    children
  );
}

function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider');
  return ctx;
}

function useSelectionSafe() {
  try {
    return useSelection();
  } catch {
    return null;
  }
}

/* ---------------------- Task modal (open task editor) context ---------------------- */

const TaskModalContext = createContext(null);

function TaskModalProvider({ children }) {
  const [openTaskId, setOpenTaskId] = useState(null);
  return React.createElement(
    TaskModalContext.Provider,
    { value: { openTaskId, openTask: setOpenTaskId, closeTask: () => setOpenTaskId(null) } },
    children
  );
}

function useTaskModal() {
  const ctx = useContext(TaskModalContext);
  if (!ctx) throw new Error('useTaskModal must be used within TaskModalProvider');
  return ctx;
}

/* ---------------------- Theme hook ---------------------- */

function useTheme() {
  const [theme, setTheme] = useState(() => loadTheme());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return { theme, setTheme, toggleTheme };
}

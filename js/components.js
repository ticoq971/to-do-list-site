/* =========================================================================
   TaskFlow — components.js
   Reusable UI components: Sidebar, TaskTree/TaskItem (with drag & drop),
   TaskModal, ProjectModal, QuickAddTask, SearchBar, Filters, StatCard, etc.
   Written in JSX — transpiled live in the browser by Babel standalone.
   ========================================================================= */

/* Hooks are already destructured globally in store.js — reuse them directly. */

/* ---------------------- Small presentational bits ---------------------- */

function PriorityBadge({ priority, compact }) {
  if (priority === 'low' && compact) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium"
      style={{ color: PRIORITY_COLOR[priority], backgroundColor: `${PRIORITY_COLOR[priority]}18` }}
    >
      <span className="text-[10px]">{PRIORITY_ICON[priority]}</span>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

function TagPill({ tag, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      #{tag}
      {onRemove && (
        <button onClick={onRemove} className="text-slate-400 hover:text-red-500">×</button>
      )}
    </span>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
        style={{ backgroundColor: `${accent || '#6366f1'}18`, color: accent || '#6366f1' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</p>
      </div>
    </div>
  );
}

/* ---------------------- Search bar ---------------------- */

function SearchBar({ onNavigateSearch }) {
  const { search, setSearch } = useFilters();
  return (
    <div className="relative w-full max-w-md">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
      <input
        id="global-search-input"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          if (e.target.value.trim()) onNavigateSearch();
        }}
        placeholder="Rechercher des tâches, descriptions, tags…"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none ring-accent-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      />
      {search && (
        <button
          onClick={() => setSearch('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/* ---------------------- Filters bar ---------------------- */

function Filters({ hideProject }) {
  const { filters, setFilters, resetFilters, filtersActive } = useFilters();
  const { state } = useTaskStore();

  const allTags = React.useMemo(() => {
    const set = new Set();
    state.tasks.forEach((t) => t.tags.forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [state.tasks]);

  const selectClass =
    'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={selectClass} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
        <option value="all">Tous les statuts</option>
        <option value="active">Non terminées</option>
        <option value="completed">Terminées</option>
      </select>

      <select className={selectClass} value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}>
        <option value="all">Toutes priorités</option>
        {['urgent', 'high', 'medium', 'low'].map((p) => (
          <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
        ))}
      </select>

      {!hideProject && (
        <select className={selectClass} value={filters.projectId} onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value }))}>
          <option value="all">Tous les projets</option>
          {state.projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      <select className={selectClass} value={filters.tag} onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}>
        <option value="all">Tous les tags</option>
        {allTags.map((tag) => (
          <option key={tag} value={tag}>#{tag}</option>
        ))}
      </select>

      <select className={selectClass} value={filters.dateRange} onChange={(e) => setFilters((f) => ({ ...f, dateRange: e.target.value }))}>
        <option value="all">Toutes les dates</option>
        <option value="overdue">En retard</option>
        <option value="today">Aujourd'hui</option>
        <option value="week">Cette semaine</option>
        <option value="none">Sans échéance</option>
      </select>

      {filtersActive && (
        <button onClick={resetFilters} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-600/10">
          Réinitialiser
        </button>
      )}
    </div>
  );
}

/* ---------------------- Quick add task ---------------------- */

function QuickAddTask({ projectId, parentId = null, onCreated, placeholder, autoFocus }) {
  const { addTask } = useTaskStore();
  const [value, setValue] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;
    const id = addTask(projectId, parentId, title);
    setValue('');
    if (onCreated) onCreated(id);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-2 hover:border-slate-200 dark:hover:border-slate-700">
      <span className="text-accent-500">+</span>
      <input
        id="quick-add-input"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder || 'Ajouter une tâche… (Entrée pour valider)'}
        className="flex-1 border-none bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400 dark:text-slate-200"
      />
    </form>
  );
}

/* ---------------------- Project modal (create/edit) ---------------------- */

function ProjectModal({ onClose, onCreated, editingProject }) {
  const { addProject, updateProject } = useTaskStore();
  const [name, setName] = useState(editingProject ? editingProject.name : '');
  const [color, setColor] = useState(editingProject ? editingProject.color : PROJECT_COLORS[0]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editingProject) {
      updateProject(editingProject.id, { name: trimmed, color });
      onClose();
    } else {
      const id = addProject(trimmed, color);
      onClose();
      if (onCreated) onCreated(id);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn" onMouseDown={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 animate-popIn" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
          {editingProject ? 'Modifier le projet' : 'Nouveau projet'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Nom du projet</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Développement du jeu"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none ring-accent-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Couleur</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
              Annuler
            </button>
            <button type="submit" className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700">
              {editingProject ? 'Enregistrer' : 'Créer le projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------- Task modal (full editor) ---------------------- */

function TaskModal({ taskId, onClose }) {
  const { state, updateTask, deleteTask, toggleComplete, addTask } = useTaskStore();
  const task = state.tasks.find((t) => t.id === taskId);
  const [tagInput, setTagInput] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');

  if (!task) return null;

  const project = state.projects.find((p) => p.id === task.projectId);
  const subtasks = state.tasks.filter((t) => t.parentId === task.id).sort((a, b) => a.position - b.position);
  const { total } = countSubtree(state.tasks, task.id);

  function addTag(e) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const value = tagInput.trim().replace(/^#/, '');
      if (!task.tags.includes(value)) updateTask(task.id, { tags: [...task.tags, value] });
      setTagInput('');
    }
  }

  function removeTag(tag) {
    updateTask(task.id, { tags: task.tags.filter((t) => t !== tag) });
  }

  function handleAddSubtask(e) {
    e.preventDefault();
    const title = subtaskInput.trim();
    if (!title) return;
    addTask(task.projectId, task.id, title);
    setSubtaskInput('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn" onMouseDown={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900 animate-popIn" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            {project && (
              <span className="flex items-center gap-1.5 font-medium" style={{ color: project.color }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
                {project.name}
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-4 flex items-start gap-3">
            <button
              onClick={() => toggleComplete(task.id)}
              className={`checkbox-tick mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${task.completed ? 'border-accent-600 bg-accent-600 text-white' : 'border-slate-300 hover:border-accent-500 dark:border-slate-600'}`}
            >
              {task.completed && (
                <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none">
                  <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <input
              value={task.title}
              onChange={(e) => updateTask(task.id, { title: e.target.value })}
              className={`w-full flex-1 border-none bg-transparent text-xl font-semibold text-slate-800 outline-none dark:text-slate-100 ${task.completed ? 'text-slate-400 line-through dark:text-slate-500' : ''}`}
              placeholder="Titre de la tâche"
            />
          </div>

          <textarea
            value={task.description}
            onChange={(e) => updateTask(task.id, { description: e.target.value })}
            placeholder="Ajouter une description…"
            rows={3}
            className="mb-5 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 outline-none ring-accent-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          />

          <div className="mb-5 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Priorité</label>
              <select
                value={task.priority}
                onChange={(e) => updateTask(task.id, { priority: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none ring-accent-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {['low', 'medium', 'high', 'urgent'].map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Échéance</label>
              <input
                type="date"
                value={task.dueDate || ''}
                onChange={(e) => updateTask(task.id, { dueDate: e.target.value || null })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none ring-accent-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Tags</label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800">
              {task.tags.map((tag) => (
                <TagPill key={tag} tag={tag} onRemove={() => removeTag(tag)} />
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder="Ajouter un tag + Entrée"
                className="min-w-[120px] flex-1 border-none bg-transparent px-1 py-0.5 text-sm outline-none dark:text-slate-200"
              />
            </div>
          </div>

          <div className="mb-2">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Sous-tâches {total > 1 ? `(${subtasks.filter((s) => s.completed).length}/${subtasks.length})` : ''}
              </label>
            </div>
            <ul className="mb-2 flex flex-col gap-1">
              {subtasks.map((st) => (
                <li key={st.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <button
                    onClick={() => toggleComplete(st.id)}
                    className={`checkbox-tick flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${st.completed ? 'border-accent-600 bg-accent-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}
                  >
                    {st.completed && (
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                        <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${st.completed ? 'text-slate-400 line-through' : 'text-slate-600 dark:text-slate-300'}`}>{st.title}</span>
                  <button onClick={() => deleteTask(st.id)} className="text-slate-300 hover:text-red-500">🗑</button>
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddSubtask} className="flex gap-2">
              <input
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                placeholder="+ Ajouter une sous-tâche"
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none ring-accent-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </form>
          </div>

          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            Créée le {formatDateTime(task.createdAt)}
            {task.completedAt ? ` · Terminée le ${formatDateTime(task.completedAt)}` : ''}
          </p>
        </div>

        <div className="flex justify-between border-t border-slate-100 px-6 py-3 dark:border-slate-800">
          <button
            onClick={() => {
              if (confirm('Supprimer définitivement cette tâche et ses sous-tâches ?')) {
                deleteTask(task.id);
                onClose();
              }
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Supprimer la tâche
          </button>
          <button onClick={onClose} className="rounded-lg bg-accent-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-700">Fermer</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- Drag & drop context (scoped per TaskTree) ---------------------- */

const DragDropContext = createContext(null);
function useDragDrop() {
  const ctx = useContext(DragDropContext);
  if (!ctx) throw new Error('useDragDrop must be used inside TaskTree');
  return ctx;
}
function useDragDropSafe() {
  try {
    return useDragDrop();
  } catch {
    return null;
  }
}

/* ---------------------- TaskItem (recursive row) ---------------------- */

function TaskItem({ node, showProject, onOpenTask, onAddSubtask, selectedId, onSelect, draggable = true }) {
  const { toggleComplete, toggleCollapse, deleteTask, state } = useTaskStore();
  const [hovered, setHovered] = useState(false);
  const rowRef = useRef(null);
  const dragCtxRaw = useDragDropSafe();
  const dragCtx = draggable ? dragCtxRaw : null;

  const project = state.projects.find((p) => p.id === node.projectId);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;
  const isDragging = dragCtx && dragCtx.drag.draggedId === node.id;
  const isOver = dragCtx && dragCtx.drag.overId === node.id;
  const overZone = isOver ? dragCtx.drag.overZone : null;

  function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', node.id);
    if (dragCtx) dragCtx.startDrag(node.id);
  }
  function handleDragOver(e) {
    e.preventDefault();
    if (!rowRef.current || !dragCtx) return;
    const rect = rowRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = y / rect.height;
    let zone;
    if (ratio < 0.25) zone = 'before';
    else if (ratio > 0.75) zone = 'after';
    else zone = 'inside';
    dragCtx.updateOver(node.id, zone);
  }
  function handleDrop(e) {
    e.preventDefault();
    if (dragCtx) dragCtx.handleDrop();
  }
  function handleDragEnd() {
    if (dragCtx) dragCtx.endDrag();
  }

  return (
    <li className="task-enter">
      <div
        ref={rowRef}
        data-task-id={node.id}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragOver={draggable ? handleDragOver : undefined}
        onDrop={draggable ? handleDrop : undefined}
        onDragEnd={handleDragEnd}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onSelect && onSelect(node.id)}
        style={{ paddingLeft: `${node.depth * 22 + 8}px` }}
        className={`task-row group relative flex items-center gap-2 rounded-lg py-2 pr-2 ${isSelected ? 'bg-accent-50 dark:bg-accent-600/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'} ${isDragging ? 'opacity-40' : ''} ${overZone === 'inside' ? 'ring-2 ring-accent-400 ring-inset' : ''}`}
      >
        {overZone === 'before' && <div className="drop-indicator absolute left-2 right-2 top-0" />}
        {overZone === 'after' && <div className="drop-indicator absolute left-2 right-2 bottom-0" />}

        <button
          onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition-transform hover:bg-slate-100 dark:hover:bg-slate-700 ${hasChildren ? '' : 'invisible'} ${node.collapsed ? '' : 'rotate-90'}`}
        >
          ▶
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); toggleComplete(node.id); }}
          className={`checkbox-tick flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${node.completed ? 'border-accent-600 bg-accent-600 text-white' : 'border-slate-300 hover:border-accent-500 dark:border-slate-600'}`}
          aria-label={node.completed ? 'Marquer comme non terminée' : 'Marquer comme terminée'}
        >
          {node.completed && (
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
              <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onOpenTask(node.id)}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`truncate text-sm font-medium ${node.completed ? 'strike-anim text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
              {node.title}
            </span>
            {showProject && project && (
              <span className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium" style={{ color: project.color, backgroundColor: `${project.color}18` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                {project.name}
              </span>
            )}
            {node.priority !== 'low' && <PriorityBadge priority={node.priority} compact />}
            {node.dueDate && <span className="text-xs text-slate-400 dark:text-slate-500">📅 {formatDate(node.dueDate)}</span>}
            {node.tags.slice(0, 3).map((tag) => <TagPill key={tag} tag={tag} />)}
            {hasChildren && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {node.children.filter((c) => c.completed).length}/{node.children.length}
              </span>
            )}
          </div>
        </div>

        <div className={`flex shrink-0 items-center gap-1 ${hovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
          <button
            title="Ajouter une sous-tâche"
            onClick={(e) => { e.stopPropagation(); onAddSubtask(node); }}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-accent-600 dark:hover:bg-slate-700"
          >
            +
          </button>
          <button
            title="Supprimer"
            onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer cette tâche et ses sous-tâches ?')) deleteTask(node.id); }}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
          >
            🗑
          </button>
        </div>
      </div>

      {!node.collapsed && hasChildren && (
        <ul className="flex flex-col gap-0.5">
          {node.children.map((child) => (
            <TaskItem
              key={child.id}
              node={child}
              showProject={showProject}
              onOpenTask={onOpenTask}
              onAddSubtask={onAddSubtask}
              selectedId={selectedId}
              onSelect={onSelect}
              draggable={draggable}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ---------------------- TaskTree (root list + drag & drop orchestration) ---------------------- */

function TaskTree({ tasks, showProject, onOpenTask, onAddSubtask, selectedId, onSelect, emptyMessage }) {
  const { moveTask, reorderSiblings } = useTaskStore();
  const [drag, setDrag] = useState({ draggedId: null, overId: null, overZone: null });
  const selection = useSelectionSafe();

  const visibleTree = buildTree(tasks, null);

  const effectiveSelectedId = selectedId !== undefined ? selectedId : (selection ? selection.selectedId : null);
  const effectiveOnSelect = onSelect || (selection ? selection.setSelectedId : undefined);

  useEffect(() => {
    if (selection) {
      const flatIds = flattenVisible(visibleTree).map((n) => n.id);
      selection.setVisibleIds(flatIds);
    }
    // eslint-disable-next-line
  }, [tasks]);

  function startDrag(id) { setDrag({ draggedId: id, overId: null, overZone: null }); }
  function updateOver(id, zone) { setDrag((d) => ({ ...d, overId: id, overZone: zone })); }
  function endDrag() { setDrag({ draggedId: null, overId: null, overZone: null }); }
  function handleDrop() {
    const { draggedId, overId, overZone } = drag;
    if (!draggedId || !overId || draggedId === overId || !overZone) { endDrag(); return; }
    const draggedTask = tasks.find((t) => t.id === draggedId);
    const overTask = tasks.find((t) => t.id === overId);
    if (!draggedTask || !overTask) { endDrag(); return; }

    if (overZone === 'inside') {
      moveTask(draggedId, overTask.id, overTask.projectId);
    } else {
      const newParentId = overTask.parentId;
      const newProjectId = overTask.projectId;
      moveTask(draggedId, newParentId, newProjectId);
      const siblings = getSiblings(tasks, newProjectId, newParentId).filter((s) => s.id !== draggedId);
      const overIndex = siblings.findIndex((s) => s.id === overTask.id);
      const insertIndex = overZone === 'before' ? overIndex : overIndex + 1;
      const orderedIds = siblings.map((s) => s.id);
      orderedIds.splice(insertIndex, 0, draggedId);
      reorderSiblings(newProjectId, newParentId, orderedIds);
    }
    endDrag();
  }

  const ctxValue = { drag, startDrag, updateOver, endDrag, handleDrop };

  if (visibleTree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-800">
        <span className="text-3xl">🗂️</span>
        <p className="text-sm text-slate-400 dark:text-slate-500">{emptyMessage || 'Aucune tâche pour le moment'}</p>
      </div>
    );
  }

  return (
    <DragDropContext.Provider value={ctxValue}>
      <ul className="flex flex-col gap-0.5">
        {visibleTree.map((node) => (
          <TaskItem
            key={node.id}
            node={node}
            showProject={showProject}
            onOpenTask={onOpenTask}
            onAddSubtask={onAddSubtask}
            selectedId={effectiveSelectedId}
            onSelect={effectiveOnSelect}
          />
        ))}
      </ul>
    </DragDropContext.Provider>
  );
}

/* ---------------------- Sidebar ---------------------- */

const NAV_ITEMS = [
  { to: 'dashboard', icon: '🏠', label: 'Tableau de bord' },
  { to: 'today', icon: '📅', label: "Aujourd'hui" },
  { to: 'upcoming', icon: '📆', label: 'À venir' },
  { to: 'projects', icon: '📁', label: 'Projets' },
  { to: 'completed', icon: '✓', label: 'Terminées' },
  { to: 'settings', icon: '⚙', label: 'Paramètres' },
];

function Sidebar({ route, navigate, onNavigate }) {
  const { state, importData } = useTaskStore();
  const [showModal, setShowModal] = useState(false);
  const importRef = useRef(null);

  function exportNow() {
    const blob = new Blob([JSON.stringify({ projects: state.projects, tasks: state.tasks }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function onImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.tasks)) throw new Error('invalid');
        const merge = confirm('OK = fusionner avec les données actuelles.\nAnnuler = remplacer toutes les données.');
        importData(parsed, merge);
      } catch (err) {
        alert('Fichier JSON invalide');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const activeProjects = state.projects.filter((p) => !p.archived);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-white font-bold">T</div>
        <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">TaskFlow</span>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = route.name === item.to;
          return (
            <button
              key={item.to}
              onClick={() => { navigate(item.to); if (onNavigate) onNavigate(); }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left ${isActive ? 'bg-accent-50 text-accent-700 dark:bg-accent-600/15 dark:text-accent-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 flex items-center justify-between px-5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Projets</span>
        <button onClick={() => setShowModal(true)} title="Nouveau projet" className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-accent-600 dark:hover:bg-slate-800">+</button>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto px-3 pb-4">
        {activeProjects.length === 0 && <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">Aucun projet</p>}
        {activeProjects.map((project) => {
          const projectTasks = state.tasks.filter((t) => t.projectId === project.id && t.parentId === null);
          const totals = projectTasks.reduce((acc, t) => {
            const sub = countSubtree(state.tasks, t.id);
            acc.total += sub.total;
            acc.completed += sub.completed;
            return acc;
          }, { total: 0, completed: 0 });
          const pct = totals.total ? Math.round((totals.completed / totals.total) * 100) : 0;
          const isActive = route.name === 'project' && route.params.projectId === project.id;
          return (
            <button
              key={project.id}
              onClick={() => { navigate('project', { projectId: project.id }); if (onNavigate) onNavigate(); }}
              className={`group flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-sm text-left transition-colors ${isActive ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                <span className="flex-1 truncate font-medium text-slate-700 dark:text-slate-200">{project.name}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{pct}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="progress-bar-fill h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: project.color }} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
        <div className="flex gap-2">
          <button type="button" onClick={exportNow} className="flex-1 rounded-lg bg-accent-600 px-2 py-2 text-xs font-medium text-white hover:bg-accent-700">Exporter</button>
          <button type="button" onClick={() => importRef.current && importRef.current.click()} className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Importer</button>
        </div>
      </div>

      {showModal && (
        <ProjectModal
          onClose={() => setShowModal(false)}
          onCreated={(id) => { setShowModal(false); navigate('project', { projectId: id }); }}
        />
      )}
    </aside>
  );
}

/* ---------------------- App layout (header + sidebar + main) ---------------------- */

function Layout({ route, navigate, children }) {
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  useKeyboardShortcuts(navigate);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="hidden md:block">
        <Sidebar route={route} navigate={navigate} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 animate-slideDown">
            <Sidebar route={route} navigate={navigate} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:px-6">
          <button onClick={() => setMobileOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden">☰</button>
          <SearchBar onNavigateSearch={() => navigate('search')} />
          <button onClick={toggleTheme} title="Basculer le thème" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

/* ---------------------- Keyboard shortcuts ---------------------- */

function isTypingTarget(el) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

function useKeyboardShortcuts() {
  const { toggleComplete, indentTask, outdentTask } = useTaskStore();
  const { selectedId, setSelectedId, visibleIds } = useSelection();
  const { openTask } = useTaskModal();

  useEffect(() => {
    function handleKeyDown(e) {
      const typing = isTypingTarget(e.target);

      if (!typing && (e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const input = document.getElementById('quick-add-input');
        if (input) { e.preventDefault(); input.focus(); }
        return;
      }

      if (typing) return;

      if (e.key === ' ') {
        if (selectedId) { e.preventDefault(); toggleComplete(selectedId); }
        return;
      }

      if (e.key === 'Tab') {
        if (selectedId) {
          e.preventDefault();
          if (e.shiftKey) outdentTask(selectedId);
          else indentTask(selectedId);
        }
        return;
      }

      if (e.key === 'Enter') {
        if (selectedId) { e.preventDefault(); openTask(selectedId); }
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (visibleIds.length === 0) return;
        e.preventDefault();
        const idx = selectedId ? visibleIds.indexOf(selectedId) : -1;
        let nextIdx;
        if (e.key === 'ArrowDown') nextIdx = idx < 0 ? 0 : Math.min(idx + 1, visibleIds.length - 1);
        else nextIdx = idx < 0 ? 0 : Math.max(idx - 1, 0);
        setSelectedId(visibleIds[nextIdx]);
        const el = document.querySelector(`[data-task-id="${visibleIds[nextIdx]}"]`);
        if (el) el.scrollIntoView({ block: 'nearest' });
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, visibleIds, toggleComplete, indentTask, outdentTask, setSelectedId, openTask]);
}

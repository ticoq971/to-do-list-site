/* =========================================================================
   TaskFlow — pages.js
   Top-level views rendered by the router in app.js: Dashboard, Today,
   Upcoming, Projects, ProjectPage, Completed, Search, Settings.
   ========================================================================= */

/* Hooks are already destructured globally in store.js — reuse them directly
   (kept as plain useState/useRef/useMemo, no aliasing needed). */
const usePagesState = useState;
const usePagesRef = useRef;

/* ---------------------- Dashboard ---------------------- */

function DashboardPage({ navigate }) {
  const { state } = useTaskStore();

  const stats = useMemo(() => {
    const total = state.tasks.length;
    const completed = state.tasks.filter((t) => t.completed).length;
    const remaining = total - completed;
    const overdue = state.tasks.filter((t) => isOverdue(t.dueDate, t.completed)).length;
    const dueToday = state.tasks.filter((t) => isToday(t.dueDate) && !t.completed).length;
    return { total, completed, remaining, overdue, dueToday };
  }, [state.tasks]);

  const activeProjects = state.projects.filter((p) => !p.archived);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-400">Vue d'ensemble de votre productivité</p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon="📋" label="Total des tâches" value={stats.total} accent="#6366f1" />
        <StatCard icon="✅" label="Terminées" value={stats.completed} accent="#10b981" />
        <StatCard icon="⏳" label="Restantes" value={stats.remaining} accent="#3b82f6" />
        <StatCard icon="⚠️" label="En retard" value={stats.overdue} accent="#ef4444" />
        <StatCard icon="📅" label="Pour aujourd'hui" value={stats.dueToday} accent="#f59e0b" />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Progression des projets</h2>
        {activeProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-slate-800">
            Créez votre premier projet pour voir sa progression ici.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeProjects.map((project) => {
              const projectTasks = state.tasks.filter((t) => t.projectId === project.id);
              const total = projectTasks.length;
              const completed = projectTasks.filter((t) => t.completed).length;
              const pct = total ? Math.round((completed / total) * 100) : 0;
              return (
                <button
                  key={project.id}
                  onClick={() => navigate('project', { projectId: project.id })}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                      {project.name}
                    </span>
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{pct}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="progress-bar-fill h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: project.color }} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">{completed} / {total} tâches terminées</p>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------------- Today ---------------------- */

function TodayPage() {
  const { state, addTask } = useTaskStore();
  const { filters } = useFilters();
  const { openTaskId, openTask, closeTask } = useTaskModal();

  const matched = useMemo(
    () => applyFilters(state.tasks.filter((t) => isToday(t.dueDate) || isOverdue(t.dueDate, t.completed)), filters),
    [state.tasks, filters]
  );
  const withAncestorsSet = useMemo(() => withAncestors(state.tasks, matched), [state.tasks, matched]);

  const overdueCount = matched.filter((t) => isOverdue(t.dueDate, t.completed)).length;
  const todayCount = matched.filter((t) => isToday(t.dueDate)).length;

  function handleAddSubtask(parent) {
    const id = addTask(parent.projectId, parent.id, 'Nouvelle sous-tâche');
    openTask(id);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Aujourd'hui</h1>
        <p className="mt-1 text-sm text-slate-400">
          {todayCount} tâche(s) pour aujourd'hui{overdueCount > 0 ? ` · ${overdueCount} en retard` : ''}
        </p>
      </header>
      <div className="mb-4"><Filters /></div>
      <TaskTree tasks={withAncestorsSet} showProject onOpenTask={openTask} onAddSubtask={handleAddSubtask} emptyMessage="Aucune tâche pour aujourd'hui 🎉" />
      {openTaskId && <TaskModal taskId={openTaskId} onClose={closeTask} />}
    </div>
  );
}

/* ---------------------- Upcoming ---------------------- */

function UpcomingPage() {
  const { state, addTask } = useTaskStore();
  const { filters } = useFilters();
  const { openTaskId, openTask, closeTask } = useTaskModal();

  const upcomingTasks = useMemo(() => state.tasks.filter((t) => isUpcoming(t.dueDate)), [state.tasks]);
  const matched = useMemo(() => applyFilters(upcomingTasks, filters), [upcomingTasks, filters]);
  const withAncestorsSet = useMemo(() => withAncestors(state.tasks, matched), [state.tasks, matched]);

  function handleAddSubtask(parent) {
    const id = addTask(parent.projectId, parent.id, 'Nouvelle sous-tâche');
    openTask(id);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">À venir</h1>
        <p className="mt-1 text-sm text-slate-400">{matched.length} tâche(s) planifiée(s)</p>
      </header>
      <div className="mb-4"><Filters /></div>
      <TaskTree tasks={withAncestorsSet} showProject onOpenTask={openTask} onAddSubtask={handleAddSubtask} emptyMessage="Aucune tâche à venir" />
      {openTaskId && <TaskModal taskId={openTaskId} onClose={closeTask} />}
    </div>
  );
}

/* ---------------------- Completed ---------------------- */

function CompletedPage() {
  const { state, addTask } = useTaskStore();
  const { filters } = useFilters();
  const { openTaskId, openTask, closeTask } = useTaskModal();

  const completedTasks = useMemo(() => state.tasks.filter((t) => t.completed), [state.tasks]);
  const matched = useMemo(() => applyFilters(completedTasks, { ...filters, status: 'all' }), [completedTasks, filters]);
  const withAncestorsSet = useMemo(() => withAncestors(state.tasks, matched), [state.tasks, matched]);

  function handleAddSubtask(parent) {
    const id = addTask(parent.projectId, parent.id, 'Nouvelle sous-tâche');
    openTask(id);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Terminées</h1>
        <p className="mt-1 text-sm text-slate-400">{completedTasks.length} tâche(s) terminée(s)</p>
      </header>
      <div className="mb-4"><Filters /></div>
      <TaskTree tasks={withAncestorsSet} showProject onOpenTask={openTask} onAddSubtask={handleAddSubtask} emptyMessage="Aucune tâche terminée pour le moment" />
      {openTaskId && <TaskModal taskId={openTaskId} onClose={closeTask} />}
    </div>
  );
}

/* ---------------------- Projects list ---------------------- */

function ProjectsPage({ navigate }) {
  const { state, archiveProject, deleteProject } = useTaskStore();
  const [showModal, setShowModal] = usePagesState(false);
  const [editing, setEditing] = usePagesState(null);
  const [showArchived, setShowArchived] = usePagesState(false);

  const list = state.projects.filter((p) => p.archived === showArchived);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Projets</h1>
          <p className="mt-1 text-sm text-slate-400">Organisez votre travail par projet</p>
        </div>
        <button onClick={() => setShowModal(true)} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700">+ Nouveau projet</button>
      </header>

      <div className="mb-4 flex gap-2">
        <button onClick={() => setShowArchived(false)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!showArchived ? 'bg-accent-50 text-accent-700 dark:bg-accent-600/15 dark:text-accent-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Actifs</button>
        <button onClick={() => setShowArchived(true)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${showArchived ? 'bg-accent-50 text-accent-700 dark:bg-accent-600/15 dark:text-accent-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Archivés</button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400 dark:border-slate-800">
          {showArchived ? 'Aucun projet archivé' : "Vous n'avez pas encore de projet. Créez-en un !"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((project) => {
            const tasks = state.tasks.filter((t) => t.projectId === project.id);
            const total = tasks.length;
            const completed = tasks.filter((t) => t.completed).length;
            const pct = total ? Math.round((completed / total) * 100) : 0;
            return (
              <div key={project.id} className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <button onClick={() => navigate('project', { projectId: project.id })} className="flex items-center gap-2 text-left font-semibold text-slate-700 dark:text-slate-200">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                    {project.name}
                  </button>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button title="Modifier" onClick={() => setEditing(project)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">✎</button>
                    <button title={project.archived ? 'Désarchiver' : 'Archiver'} onClick={() => archiveProject(project.id, !project.archived)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">🗄</button>
                    <button title="Supprimer" onClick={() => { if (confirm(`Supprimer le projet "${project.name}" et toutes ses tâches ?`)) deleteProject(project.id); }} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30">🗑</button>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>{completed} / {total} tâches</span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="progress-bar-fill h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: project.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <ProjectModal onClose={() => setShowModal(false)} onCreated={(id) => navigate('project', { projectId: id })} />}
      {editing && <ProjectModal editingProject={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/* ---------------------- Single project view ---------------------- */

function ProjectPage({ projectId, navigate }) {
  const { state, addTask } = useTaskStore();
  const { filters } = useFilters();
  const { openTaskId, openTask, closeTask } = useTaskModal();
  const [showEdit, setShowEdit] = usePagesState(false);

  const project = state.projects.find((p) => p.id === projectId);
  const projectTasks = useMemo(() => state.tasks.filter((t) => t.projectId === projectId), [state.tasks, projectId]);
  const matched = useMemo(() => applyFilters(projectTasks, { ...filters, projectId: 'all' }), [projectTasks, filters]);
  const withAncestorsSet = useMemo(() => withAncestors(projectTasks, matched), [projectTasks, matched]);

  const total = projectTasks.length;
  const completed = projectTasks.filter((t) => t.completed).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl text-center py-16">
        <p className="text-slate-400">Ce projet n'existe pas ou a été supprimé.</p>
        <button onClick={() => navigate('projects')} className="mt-4 text-accent-600 hover:underline">Retour aux projets</button>
      </div>
    );
  }

  function handleAddSubtask(parent) {
    const id = addTask(parent.projectId, parent.id, 'Nouvelle sous-tâche');
    openTask(id);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: project.color }} />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{project.name}</h1>
          </div>
          <button onClick={() => setShowEdit(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">✎ Modifier</button>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="progress-bar-fill h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: project.color }} />
          </div>
          <span className="text-xs font-medium text-slate-400">{completed} / {total} tâches terminées ({pct}%)</span>
        </div>
      </header>

      <div className="mb-4"><Filters hideProject /></div>

      <TaskTree tasks={withAncestorsSet} onOpenTask={openTask} onAddSubtask={handleAddSubtask} emptyMessage="Aucune tâche. Ajoutez-en une ci-dessous." />

      <div className="mt-2">
        <QuickAddTask projectId={project.id} parentId={null} />
      </div>

      {openTaskId && <TaskModal taskId={openTaskId} onClose={closeTask} />}
      {showEdit && <ProjectModal editingProject={project} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

/* ---------------------- Search ---------------------- */

function SearchPage() {
  const { state, addTask } = useTaskStore();
  const { search, filters } = useFilters();
  const { openTaskId, openTask, closeTask } = useTaskModal();

  const searched = useMemo(() => searchTasks(state.tasks, search), [state.tasks, search]);
  const matched = useMemo(() => applyFilters(searched, filters), [searched, filters]);
  const withAncestorsSet = useMemo(() => withAncestors(state.tasks, matched), [state.tasks, matched]);

  function handleAddSubtask(parent) {
    const id = addTask(parent.projectId, parent.id, 'Nouvelle sous-tâche');
    openTask(id);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Résultats de recherche</h1>
        <p className="mt-1 text-sm text-slate-400">
          {search ? `${matched.length} résultat(s) pour "${search}"` : 'Utilisez la barre de recherche en haut'}
        </p>
      </header>
      <div className="mb-4"><Filters /></div>
      <TaskTree tasks={withAncestorsSet} showProject onOpenTask={openTask} onAddSubtask={handleAddSubtask} emptyMessage="Aucun résultat" />
      {openTaskId && <TaskModal taskId={openTaskId} onClose={closeTask} />}
    </div>
  );
}

/* ---------------------- Settings ---------------------- */

function SettingsPage() {
  const { state, importData, resetData } = useTaskStore();
  const { theme, setTheme } = useTheme();
  const fileInputRef = usePagesRef(null);
  const [message, setMessage] = usePagesState('');

  function handleExport() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `taskflow-export-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage('Export réussi ✅');
    setTimeout(() => setMessage(''), 3000);
  }

  function handleImportClick() {
    if (fileInputRef.current) fileInputRef.current.click();
  }

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.tasks)) throw new Error('Format invalide');
        const merge = confirm('OK = fusionner avec les données actuelles.\nAnnuler = remplacer toutes les données.');
        importData(parsed, merge);
        setMessage(merge ? 'Import fusionné ✅' : 'Import (remplacement) réussi ✅');
      } catch (err) {
        setMessage('❌ Fichier invalide, import annulé');
      }
      setTimeout(() => setMessage(''), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleReset() {
    if (confirm('Voulez-vous vraiment réinitialiser toutes les données ? Cette action est irréversible.')) {
      resetData();
      setMessage('Données réinitialisées');
      setTimeout(() => setMessage(''), 3000);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-400">Gérez l'apparence et vos données</p>
      </header>

      {message && (
        <div className="mb-4 rounded-lg bg-accent-50 px-4 py-2 text-sm font-medium text-accent-700 dark:bg-accent-600/15 dark:text-accent-400 animate-fadeIn">{message}</div>
      )}

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Apparence</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => setTheme('light')} className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${theme === 'light' ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}>☀️ Mode clair</button>
          <button onClick={() => setTheme('dark')} className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${theme === 'dark' ? 'border-accent-500 bg-accent-600/15 text-accent-400' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'}`}>🌙 Mode sombre</button>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Données</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Toutes vos données sont stockées localement dans votre navigateur (LocalStorage). Vous pouvez les exporter, les importer ou tout réinitialiser.
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700">⬇ Exporter en JSON</button>
          <button onClick={handleImportClick} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">⬆ Importer un fichier JSON</button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
          <button onClick={handleReset} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20">⟲ Réinitialiser toutes les données</button>
        </div>
        <p className="mt-4 text-xs text-slate-400">{state.projects.length} projet(s) · {state.tasks.length} tâche(s) enregistrée(s)</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Raccourcis clavier</h2>
        <ul className="grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          <ShortcutRow keys="N" desc="Nouvelle tâche" />
          <ShortcutRow keys="Entrée" desc="Créer une tâche" />
          <ShortcutRow keys="Espace" desc="Terminer la tâche sélectionnée" />
          <ShortcutRow keys="Tab" desc="Transformer en sous-tâche" />
          <ShortcutRow keys="Shift + Tab" desc="Remonter d'un niveau" />
          <ShortcutRow keys="↑ / ↓" desc="Naviguer entre les tâches" />
        </ul>
      </section>
    </div>
  );
}

function MenuPage({ navigate }) {
  const tiles = [
    { to: 'dashboard', label: 'TABLEAU DE BORD', img: 'images/tile-dashboard.svg' },
    { to: 'today', label: "AUJOURD'HUI", img: 'images/tile-today.svg' },
    { to: 'upcoming', label: 'À VENIR', img: 'images/tile-upcoming.svg' },
    { to: 'projects', label: 'PROJETS', img: 'images/tile-projects.svg' },
    { to: 'search', label: 'RECHERCHE', img: 'images/tile-search.svg' },
    { to: 'completed', label: 'TERMINÉES', img: 'images/tile-done.svg' },
    { to: 'settings', label: 'PARAMÈTRES', img: 'images/tile-settings.svg' },
    { to: 'today', extra: 'add', label: 'NOUVELLE TÂCHE', img: 'images/tile-add.svg' },
  ];

  return (
    <div className="game-menu">
      <div className="game-menu-inner">
        <h1 className="game-title">TASKFLOW</h1>
        <div className="game-grid">
          {tiles.map((tile) => (
            <button
              key={tile.label}
              type="button"
              className="game-tile"
              onClick={() => navigate(tile.to)}
            >
              <img src={tile.img} alt="" />
              <span>{tile.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, desc }) {
  return (
    <li className="flex items-center gap-2">
      <kbd className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{keys}</kbd>
      <span>{desc}</span>
    </li>
  );
}

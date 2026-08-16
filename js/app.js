/* =========================================================================
   TaskFlow — app.js
   Entry point: a tiny hash-based router (no bundler / no ES modules needed)
   plus the provider tree, then mounts everything into #root.
   ========================================================================= */

const { useState: useAppState, useEffect: useAppEffect } = React;

/* ---------------------- Minimal hash router ---------------------- */
/* Routes look like:  #/  #/today  #/upcoming  #/projects  #/project/<id>
   #/completed  #/settings  #/search                                        */

function parseHash() {
  let hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash) return { name: 'dashboard', params: {} };
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'project' && parts[1]) return { name: 'project', params: { projectId: parts[1] } };
  const known = ['dashboard', 'today', 'upcoming', 'projects', 'completed', 'settings', 'search'];
  if (known.includes(parts[0])) return { name: parts[0], params: {} };
  return { name: 'dashboard', params: {} };
}

function useHashRoute() {
  const [route, setRoute] = useAppState(parseHash());

  useAppEffect(() => {
    function onHashChange() {
      setRoute(parseHash());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (name, params) => {
    if (name === 'project' && params && params.projectId) {
      window.location.hash = `#/project/${params.projectId}`;
    } else if (name === 'dashboard') {
      window.location.hash = '#/';
    } else {
      window.location.hash = `#/${name}`;
    }
  };

  return { route, navigate };
}

/* ---------------------- Root application component ---------------------- */

function App() {
  const { route, navigate } = useHashRoute();

  let page;
  switch (route.name) {
    case 'today':
      page = <TodayPage />;
      break;
    case 'upcoming':
      page = <UpcomingPage />;
      break;
    case 'projects':
      page = <ProjectsPage navigate={navigate} />;
      break;
    case 'project':
      page = <ProjectPage projectId={route.params.projectId} navigate={navigate} />;
      break;
    case 'completed':
      page = <CompletedPage />;
      break;
    case 'settings':
      page = <SettingsPage />;
      break;
    case 'search':
      page = <SearchPage />;
      break;
    default:
      page = <DashboardPage navigate={navigate} />;
  }

  return (
    <Layout route={route} navigate={navigate}>
      {page}
    </Layout>
  );
}

function Root() {
  return (
    <TaskStoreProvider>
      <FiltersProvider>
        <SelectionProvider>
          <TaskModalProvider>
            <App />
          </TaskModalProvider>
        </SelectionProvider>
      </FiltersProvider>
    </TaskStoreProvider>
  );
}

/* ---------------------- Mount ---------------------- */

const rootEl = document.getElementById('root');
rootEl.innerHTML = ''; // clear the "Chargement…" placeholder before mounting React
const reactRoot = ReactDOM.createRoot(rootEl);
reactRoot.render(<Root />);
rootEl.setAttribute('data-mounted', 'true');

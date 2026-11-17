import { Link, NavLink, Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          Lacuna
        </Link>
        <nav className="app-nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/news">뉴스</NavLink>
          <NavLink to="/facts">사실</NavLink>
          <NavLink to="/relations">관계</NavLink>
          <NavLink to="/hypotheses">가설</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

import { Outlet } from 'react-router-dom';
import { AppHeader } from '../widgets/AppHeader';

export function RootLayout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import './fonts.css';
import './styles.css';
import Layout from './components/Layout';
import { RefreshProvider, ToastProvider } from './components/ui';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Visits from './pages/Visits';
import Payments from './pages/Payments';
import Calendar from './pages/Calendar';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import Report from './pages/Report';
import ActivityLog from './pages/ActivityLog';
import Backup from './pages/Backup';
import Settings from './pages/Settings';

const Router = import.meta.env.VITE_DEMO ? MemoryRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <RefreshProvider>
        <Router>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="visits" element={<Visits />} />
              <Route path="payments" element={<Payments />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="messages" element={<Messages />} />
              <Route path="report" element={<Report />} />
              <Route path="activity" element={<ActivityLog />} />
              <Route path="backup" element={<Backup />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Dashboard />} />
            </Route>
          </Routes>
        </Router>
      </RefreshProvider>
    </ToastProvider>
  </StrictMode>,
);

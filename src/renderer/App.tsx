import { NavLink, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Boxes, ListPlus, FileEdit, AlertOctagon, Activity as ActivityIcon, Settings as SettingsIcon, Activity } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Compose from './pages/Compose';
import Drafts from './pages/Drafts';
import Errors from './pages/Errors';
import ActivityPage from './pages/Activity';
import AdDetail from './pages/AdDetail';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import { useState } from 'react';
import { useEvents } from './hooks/useEvents';
import { FirstRunWarning } from './components/FirstRunWarning';
import { Toaster } from './components/Toaster';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  useEvents();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  useKeyboardShortcuts(setShortcutsOpen);
  return (
    <div className="flex h-full w-full bg-bg text-fg">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/drafts" element={<Drafts />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/errors" element={<Errors />} />
          <Route path="/compose" element={<Compose />} />
          <Route path="/compose/:draftId" element={<Compose />} />
          <Route path="/ad/:id" element={<AdDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/onboarding/:platform" element={<Onboarding />} />
        </Routes>
      </main>
      <FirstRunWarning />
      <Toaster />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r border-border bg-surface px-2 py-3">
      <div className="px-3 py-2 mb-2">
        <div className="text-base font-semibold tracking-tight">Marketplace</div>
        <div className="text-[11px] text-muted">v0.1.0</div>
      </div>
      <NavItem to="/" icon={<Boxes size={16} />} label="Dashboard" end />
      <NavItem to="/compose" icon={<ListPlus size={16} />} label="Compose" />
      <NavItem to="/drafts" icon={<FileEdit size={16} />} label="Drafts" />
      <NavItem to="/activity" icon={<ActivityIcon size={16} />} label="Activity" />
      <ErrorsNavItem />
      <NavItem to="/settings" icon={<SettingsIcon size={16} />} label="Settings" />
      <div className="mt-auto px-3 py-2 text-[11px] text-muted">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-muted" />
          <span>Personal use only</span>
        </div>
      </div>
    </aside>
  );
}

function ErrorsNavItem() {
  const failQ = useQuery({
    queryKey: ['recent-failures-count'],
    queryFn: async () => (await window.marketplace.getRecentFailures(50)).length,
    refetchInterval: 60_000,
  });
  const count = failQ.data ?? 0;
  return (
    <NavLink
      to="/errors"
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive ? 'bg-surface-hover text-fg' : 'text-muted hover:bg-surface-hover hover:text-fg'
        }`
      }
    >
      <AlertOctagon size={16} />
      <span>Errors</span>
      {count > 0 && (
        <span className="ml-auto rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-medium text-white">
          {count}
        </span>
      )}
    </NavLink>
  );
}

function NavItem({ to, icon, label, end }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive ? 'bg-surface-hover text-fg' : 'text-muted hover:bg-surface-hover hover:text-fg'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, MapPin, Settings as SettingsIcon,
  LogOut, Search, Bell, Menu, BarChart3, ShieldCheck, Star,
  BookOpen, ShieldAlert,
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import type { User } from './types';
import LoginPage    from './pages/LoginPage';
import Dashboard    from './pages/Dashboard';
import VenuesView   from './pages/VenuesView';
import CalendarView from './pages/CalendarView';
import PublicAuditView from './pages/PublicAuditView';
import SettingsView from './pages/SettingsView';
import AdminPanel   from './pages/AdminPanel';
import GuidePage    from './pages/GuidePage';

// ----------------------------------------------------------------
// Error Boundary
// ----------------------------------------------------------------
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(e: Error) {
    return { hasError: true, error: e.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center p-8 max-w-sm">
            <p className="text-4xl mb-4">⚠️</p>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-500 text-sm mb-4">{this.state.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#0078D4] text-white px-6 py-2.5 rounded-xl font-semibold"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ----------------------------------------------------------------
// Nav Item
// ----------------------------------------------------------------
interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  highlight?: boolean;
}

const NavItem = ({ to, icon: Icon, label, active, highlight }: NavItemProps) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
      active
        ? 'bg-white shadow-sm text-blue-600 font-semibold'
        : highlight
        ? 'text-amber-600 hover:bg-amber-50'
        : 'text-slate-500 hover:bg-slate-100'
    }`}
  >
    <Icon
      className={`w-5 h-5 ${
        active ? 'text-blue-600' : highlight ? 'text-amber-500' : 'text-slate-400 group-hover:text-slate-600'
      }`}
    />
    <span className="text-sm">{label}</span>
    {highlight && (
      <span className="ml-auto text-[9px] font-bold uppercase bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
        VIP
      </span>
    )}
  </Link>
);

// ----------------------------------------------------------------
// App Layout (authenticated)
// ----------------------------------------------------------------
interface AppLayoutProps {
  user: User;
  onLogout: () => void;
}

const AppLayout = ({ user, onLogout }: AppLayoutProps) => {
  const location = useLocation();
  const isAdmin = user.role === 'govt_super_admin' || user.role === 'venue_manager';

  const roleLabel: Record<string, string> = {
    citizen: 'Citizen',
    vip: 'VIP Member',
    venue_manager: 'Venue Manager',
    govt_super_admin: 'Govt Admin',
    guest: 'Guest',
  };

  return (
    <div className="flex h-screen w-full bg-[#F3F3F3]">
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 h-screen fluent-sidebar border-r border-slate-200/50 p-5 z-40">
        <div className="flex items-center gap-3 mb-8 px-2">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="w-10 h-10 bg-[#0078D4] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"
          >
            <CalendarDays className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <p className="text-base font-bold text-slate-900 leading-tight uppercase tracking-tight">Eluru Connect</p>
            <p className="text-[10px] font-bold text-blue-600 tracking-widest uppercase">Municipal Portal</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5">
          <NavItem to="/"        icon={LayoutDashboard} label="Dashboard"     active={location.pathname === '/'} />
          <NavItem to="/venues"  icon={MapPin}          label="Browse Venues" active={location.pathname === '/venues'} />
          <NavItem to="/calendar"icon={CalendarDays}    label="Live Schedule" active={location.pathname === '/calendar'} />
          <NavItem to="/audit"   icon={BarChart3}       label="Public Audit"  active={location.pathname === '/audit'} />
          <NavItem to="/guide"   icon={BookOpen}        label="Feature Guide" active={location.pathname === '/guide'} />
          {isAdmin && (
            <NavItem to="/admin" icon={ShieldAlert}     label="Admin Panel"   active={location.pathname === '/admin'} highlight />
          )}
        </nav>

        <div className="pt-5 border-t border-slate-200/50 space-y-0.5">
          <NavItem to="/settings" icon={SettingsIcon} label="Settings" active={location.pathname === '/settings'} />
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>

        {/* User card */}
        <div className="mt-4 bg-slate-100/60 rounded-2xl p-3 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full border-2 border-white shadow bg-cover shrink-0"
            style={{ backgroundImage: `url(https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)})` }}
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
              {roleLabel[user.role] || user.role}
            </p>
          </div>
          {(user.role === 'vip' || user.role === 'govt_super_admin') && (
            <Star className="w-3.5 h-3.5 text-amber-400 fill-current shrink-0 ml-auto" />
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-16 flex items-center justify-between px-8 bg-white/60 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 hover:bg-slate-100 rounded-lg">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="bg-slate-100/50 border border-transparent focus:bg-white focus:border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-sm w-60 outline-none transition-all"
                placeholder="Search Eluru venues..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-white" />
            </div>
            <div className="h-7 w-px bg-slate-200" />
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden lg:block">
                <p className="text-xs font-bold text-slate-900">{user.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
                  {roleLabel[user.role]} • Eluru
                </p>
              </div>
              <div
                className="w-9 h-9 rounded-full border-2 border-white shadow bg-cover shrink-0"
                style={{ backgroundImage: `url(https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)})` }}
              />
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            <Routes key={location.pathname} location={location}>
              <Route path="/"         element={<Dashboard user={user} />} />
              <Route path="/venues"   element={<VenuesView />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/audit"    element={<PublicAuditView />} />
              <Route path="/guide"    element={<GuidePage />} />
              <Route path="/settings" element={<SettingsView user={user} />} />
              {isAdmin && (
                <Route path="/admin"  element={<AdminPanel currentUser={user} />} />
              )}
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------
// Root — auth gate
// ----------------------------------------------------------------
const Root = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return (
      <ErrorBoundary>
        <LoginPage onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <AppLayout user={user} onLogout={handleLogout} />
      </Router>
    </ErrorBoundary>
  );
};

export default Root;

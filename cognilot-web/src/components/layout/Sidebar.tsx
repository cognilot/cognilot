import { type FC } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Terminal, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

const SidebarContent: FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const navItems = [
    { label: 'welcome.md', path: '/welcome' },
    { label: 'memory.md', path: '/memory' },
  ];

  return (
    <div className="h-full flex flex-col font-mono text-[13px] bg-background border-r border-white/5">
      {/* Brand Header */}
      <div className="p-4 border-b border-white/5 flex items-center gap-3">
        <div className="w-5 h-5 flex items-center justify-center text-brand-secondary">
          <Terminal className="w-5 h-5" />
        </div>
        <span className="font-bold text-main tracking-widest text-sm uppercase">Cognilot</span>
      </div>

      <div className="p-4 flex-1">
        {/* Tree Explorer */}
        <div className="text-ghost text-[11px] font-sans font-bold uppercase tracking-widest mb-3 flex items-center gap-1 select-none">
          <ChevronDown className="w-3.5 h-3.5" /> EXPLORER
        </div>

        <div className="space-y-0.5 ml-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                  w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors group
                  ${isActive ? 'bg-white/10 text-main' : 'text-dim hover:text-main'}
                `}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`w-3.5 flex justify-center text-brand-primary ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50 transition-opacity'}`}
                  >
                    {'>'}
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Info Block */}
        <div className="mt-8">
          <div className="text-ghost text-[11px] font-sans font-bold uppercase tracking-widest mb-3 flex items-center gap-1 select-none">
            <ChevronDown className="w-3.5 h-3.5" /> SYSTEM
          </div>
          <div className="ml-2 space-y-0.5">
            <div className="px-2 py-1.5 text-dim flex flex-col">
              <span className="text-[10px] uppercase opacity-50 mb-1 font-bold">PLAN</span>
              <div className="flex items-center gap-2">
                <span
                  className={`font-bold ${user?.plan === 'pro' ? 'text-brand-primary' : 'text-dim/70'}`}
                >
                  {user?.plan?.toUpperCase() || 'FREE'}
                </span>
                <button
                  onClick={() => navigate('/plan')}
                  className="bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-[10px] text-main transition-colors"
                >
                  CHANGE
                </button>
              </div>
            </div>
            <div className="px-2 py-1.5 text-dim flex flex-col mt-2">
              <span className="text-[10px] uppercase opacity-50 mb-1 font-bold">USER</span>
              <div className="flex items-center gap-2">
                <span className="truncate text-dim/70 font-bold">ACCOUNT</span>
                <button
                  onClick={() => navigate('/settings')}
                  className="bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-[10px] text-main transition-colors"
                >
                  SETTINGS
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors group text-white/50 hover:bg-red-500/10 hover:text-error"
        >
          <span className="w-3.5 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <LogOut className="w-3.5 h-3.5" />
          </span>
          <span>logout.sh</span>
        </button>
      </div>
    </div>
  );
};

export const Sidebar: FC = () => {
  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen fixed left-0 top-0 z-50">
      <SidebarContent />
    </aside>
  );
};

export const MobileSidebar: FC = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="lg:hidden text-white hover:bg-white/10 p-2 rounded -ml-2 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 w-64 bg-background border-r border-white/10 text-white"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">Menu de Navegación</SheetTitle>
        <SheetDescription className="sr-only">
          Barra lateral de navegación principal
        </SheetDescription>
        <div className="flex flex-col h-full">
          <SidebarContent />
        </div>
      </SheetContent>
    </Sheet>
  );
};

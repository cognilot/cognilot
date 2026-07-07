import { type FC, type ReactNode } from 'react';
import { Sidebar, MobileSidebar } from './Sidebar';
import { Terminal } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-background overflow-hidden font-mono text-[13px] relative z-0">
      {/* Background Animated Orbs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none w-full h-full opacity-60 flex items-center justify-center">
        {/* Spinning container that spans more than the screen to hide edges when spinning */}
        <div className="w-[150vmax] h-[150vmax] animate-[spin_30s_linear_infinite] relative">
          <div className="absolute top-[15%] left-[15%] w-[60vmax] h-[60vmax] rounded-full bg-orange-600/10 blur-[120px] mix-blend-screen animate-blob" />
          <div
            className="absolute top-[20%] right-[15%] w-[50vmax] h-[50vmax] rounded-full bg-cyan-600/10 blur-[120px] mix-blend-screen animate-blob"
            style={{ animationDelay: '2s' }}
          />
          <div
            className="absolute bottom-[10%] left-[30%] w-[60vmax] h-[60vmax] rounded-full bg-violet-600/10 blur-[120px] mix-blend-screen animate-blob"
            style={{ animationDelay: '4s' }}
          />
        </div>
      </div>

      {/* Sidebar - Hidden on mobile, fixed on desktop */}
      <div className="z-20 h-full">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 ml-0 lg:ml-60 flex flex-col min-w-0 bg-transparent relative overflow-y-auto overflow-x-hidden z-10">
        {/* Mobile Header - Responsive: visible below lg */}
        <div className="lg:hidden flex items-center gap-4 p-4 border-b border-white/5 bg-surface sticky top-0 z-30 justify-between">
          <div className="flex items-center gap-3 font-bold text-white tracking-widest text-sm uppercase">
            <MobileSidebar />
            <Terminal className="w-4 h-4 text-brand-secondary" /> Cognilot
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full">
          <div className="animate-fade-in space-y-6">{children}</div>
        </div>
      </main>
    </div>
  );
};

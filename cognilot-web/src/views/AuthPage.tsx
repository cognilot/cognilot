import { useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { Terminal } from 'lucide-react';

export const AuthPage: FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Handle automatic redirection when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('User is authenticated, determining destination...');
      navigate('/welcome', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 sm:p-8 font-mono relative">
      <div className="w-full max-w-md bg-surface/90 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-scale-in">
        {/* macOS window controls mock */}
        <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between select-none">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          </div>
          <div className="text-white/30 text-[11px] uppercase tracking-[0.2em] font-sans font-bold flex items-center gap-2">
            <Terminal className="w-3 h-3" /> login.sh
          </div>
        </div>

        <div className="p-8 text-[13px] leading-relaxed">
          <div className="mb-8">
            <div className="text-brand-primary mb-2 leading-none font-bold">
              <pre className="text-[10px] sm:text-[12px]">
                {`   ______                      _  __      __  
  / ____/____  ____ _ ____  (_) / /____ / /_ 
 / /    / __ \\/ __ \`/ __ \\/ / / / __ \`/ / __/ 
/ /___ / /_/ / /_/ // / / / / / / /_/ // /_   
\\____/ \\____/\\__, //_/ /_/_/ /_/\\__,_/ \\__/   
            /____/                            `}
              </pre>
            </div>
            <div className="text-dim mt-6 flex gap-2">
              <span className="text-brand-secondary">$</span>
              <span className="typing-animation overflow-hidden whitespace-nowrap border-r-2 border-brand-secondary pr-1">
                ./init-session --provider google
              </span>
            </div>
            <p className="text-ghost text-[11px] mt-4 max-w-xs">
              Tu asistente de formularios ya está instalado. Inicia sesión para continuar.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-start">
              <GoogleSignInButton />
            </div>

            <div className="pt-8 border-t border-white/5">
              <p className="text-[10px] text-white/30">
                // Al continuar, aceptas nuestros{' '}
                <a
                  href="#"
                  className="text-brand-secondary/60 hover:text-brand-secondary underline underline-offset-2 transition-colors"
                >
                  Términos
                </a>
                {' y '}
                <a
                  href="#"
                  className="text-brand-secondary/60 hover:text-brand-secondary underline underline-offset-2 transition-colors"
                >
                  Privacidad
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

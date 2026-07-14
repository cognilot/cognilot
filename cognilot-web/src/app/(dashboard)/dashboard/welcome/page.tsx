'use client';

import { useRouter } from 'next/navigation';
import { OnboardingGuide } from '@/components/OnboardingGuide';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="p-8 max-w-4xl mx-auto font-mono text-[13px] animate-fade-in space-y-6">
      <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative">
        <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between select-none">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          </div>
          <div className="text-white/30 text-[11px] uppercase tracking-[0.2em] font-sans font-bold">
            welcome.md
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          <div>
            <div className="text-white/20 select-none mb-4 flex items-center gap-2">
              <span className="text-cyan-400">#</span> System_Status
            </div>
            <div className="text-green-400 font-bold flex items-center gap-2 mb-2">
              [OK] Cognilot initialized successfully.
            </div>
            <p className="text-white/60 leading-relaxed max-w-2xl">
              La extensión está activa y lista. Cuando visites cualquier formulario, detectará
              automáticamente los campos y te sugerirá las respuestas en base a tu perfil local
              configurado en la extensión o tu cuenta en la nube, manteniendo completa privacidad y
              fricción casi nula.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
            <button
              onClick={() => router.push('/dashboard/memory')}
              className="py-2.5 px-5 bg-white/5 hover:bg-white/10 text-white rounded transition-colors flex items-center gap-2 border border-white/10 cursor-pointer group"
            >
              <span className="text-accent-violet opacity-50 group-hover:opacity-100 transition-opacity font-bold">
                {'>'}
              </span>{' '}
              ./edit_memory.sh
            </button>
            <button
              className="py-2.5 px-5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded transition-colors flex items-center gap-2 border border-violet-500/20 font-bold"
              onClick={(e) => e.preventDefault()}
            >
              <span className="text-white/40">$</span> test_demo_form
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-bg-primary/90 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
          <div className="text-white/20 select-none mb-3">
            <span className="text-violet-400">##</span> ANALYTICS
          </div>
          <p className="text-white/40 text-[12px] leading-relaxed">
            Próximamente: Métricas sobre la cantidad de caracteres ahorrados y formularios
            completados.
          </p>
        </div>
        <div className="bg-bg-primary/90 border border-white/10 rounded-xl p-6 hover:border-cyan-500/30 transition-colors group">
          <div className="text-white/20 select-none mb-3 group-hover:text-cyan-400 transition-colors">
            <span className="text-cyan-400">##</span> UNLOCK_PRO
          </div>
          <p className="text-white/40 text-[12px] leading-relaxed">
            Funciones avanzadas: múltiples alias comerciales y AI-Gen Cover Letters en un click.
          </p>
        </div>
      </div>

      <OnboardingGuide />
    </div>
  );
}

import { type FC, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth.service';
import { Check, Star, Zap } from 'lucide-react';

export const PlansPage: FC = () => {
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currentPlan = user?.plan || 'free';

  const handlePlanChange = async (newPlan: string) => {
    if (newPlan === currentPlan) return;

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updatedUser = await authService.updateCurrentUser({ plan: newPlan });
      updateUser({ plan: updatedUser.plan });
      setSuccessMsg(`Plan actualizado correctamente a ${newPlan.toUpperCase()}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el plan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-main mb-2">Planes de Suscripción</h1>
        <p className="text-dim">
          Elige el plan que mejor se adapte a tus necesidades. (Modo de prueba)
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 text-error rounded">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 text-success rounded">
          {successMsg}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* FREE PLAN */}
        <div
          className={`relative p-6 rounded-xl border transition-all ${
            currentPlan === 'free'
              ? 'bg-white/5 border-white/20 shadow-lg'
              : 'bg-black/20 border-white/5 hover:border-white/10 opacity-70'
          }`}
        >
          {currentPlan === 'free' && (
            <div className="absolute -top-3 left-6 flex items-center justify-center bg-white/10 text-white/80 text-[10px] font-bold uppercase py-1 px-3 rounded-full border border-white/20 backdrop-blur-md">
              Plan Actual
            </div>
          )}

          <div className="flex items-center gap-3 mb-4 mt-2">
            <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center">
              <Star className="w-5 h-5 text-ghost" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-main">Free</h2>
              <p className="text-sm text-ghost">Para uso básico y personal</p>
            </div>
          </div>

          <div className="my-6">
            <span className="text-3xl font-bold text-main">$0</span>
            <span className="text-ghost"> / mes</span>
          </div>

          <ul className="space-y-3 mb-8 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <span>Autocompletado de campos de texto simples</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <span>Soporte limitado a inputs básicos</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <span>Gestión de perfil único</span>
            </li>
          </ul>

          <button
            disabled={isLoading || currentPlan === 'free'}
            onClick={() => handlePlanChange('free')}
            className={`w-full py-2.5 rounded font-mono text-sm font-bold uppercase transition-colors ${
              currentPlan === 'free'
                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                : 'bg-white/5 hover:bg-white/10 text-white'
            }`}
          >
            {currentPlan === 'free' ? 'Plan Actual' : 'Cambiar a Free'}
          </button>
        </div>

        {/* PRO PLAN */}
        <div
          className={`relative p-6 rounded-xl border transition-all ${
            currentPlan === 'pro'
              ? 'bg-brand-primary/10 border-brand-primary border shadow-[0_0_30px_rgba(139,92,246,0.15)]'
              : 'bg-black/20 border-white/5 hover:border-brand-primary/30'
          }`}
        >
          {currentPlan === 'pro' && (
            <div className="absolute -top-3 left-6 flex items-center justify-center bg-brand-primary text-white text-[10px] font-bold uppercase py-1 px-3 rounded-full shadow-lg">
              Plan Actual
            </div>
          )}

          <div className="flex items-center gap-3 mb-4 mt-2">
            <div className="w-10 h-10 rounded-lg bg-brand-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-main">Pro</h2>
              <p className="text-sm text-ghost">Para power users y profesionales</p>
            </div>
          </div>

          <div className="my-6">
            <span className="text-3xl font-bold text-main">$10</span>
            <span className="text-ghost"> / mes</span>
          </div>

          <ul className="space-y-3 mb-8 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
              <span>Soporte avanzado para checkboxes, radios y selects</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
              <span>Reconocimiento de formularios complejos</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
              <span>Prioridad en generación de inteligencia artificial</span>
            </li>
          </ul>

          <button
            disabled={isLoading || currentPlan === 'pro'}
            onClick={() => handlePlanChange('pro')}
            className={`w-full py-2.5 rounded font-mono text-sm font-bold uppercase transition-all ${
              currentPlan === 'pro'
                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                : 'bg-brand-primary hover:bg-brand-primary/80 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]'
            }`}
          >
            {currentPlan === 'pro' ? 'Plan Actual' : 'Cambiar a Pro'}
          </button>
        </div>
      </div>
    </div>
  );
};

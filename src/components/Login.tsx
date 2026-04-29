import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t, isRTL } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(isRTL ? "Nom d'utilisateur ou mot de passe incorrect" : "Invalid username or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
          <div className={cn("flex flex-col items-center mb-10", isRTL && "text-right")}>
            <div className="w-24 h-24 mb-6 transition-transform hover:scale-105">
              <img src="/logo.png" alt="Everest Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">{t('welcome')}</h1>
            <p className="text-slate-500 mt-2 text-center font-medium">{t('login_desc')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className={cn("p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2", isRTL && "text-right")}>
                {error}
              </div>
            )}
            <div>
              <label className={cn("block text-sm font-medium text-slate-700 mb-1", isRTL && "text-right")}>
                {isRTL ? "Nom d'utilisateur" : "Username"}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mohamed"
                className={cn(
                  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all font-bold",
                   isRTL && "text-right"
                )}
              />
            </div>

            <div>
              <label className={cn("block text-sm font-medium text-slate-700 mb-1", isRTL && "text-right")}>
                {t('password')}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all",
                   isRTL && "text-right"
                )}
              />
            </div>

            <button
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                   {t('signin')}
                   <div className={cn("transition-transform group-hover:translate-x-1", isRTL && "rotate-180 group-hover:-translate-x-1")}>
                     →
                   </div>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex justify-center gap-2">
             <div className="h-1.5 w-8 rounded-full bg-primary/20"></div>
             <div className="h-1.5 w-8 rounded-full bg-accent/20"></div>
             <div className="h-1.5 w-8 rounded-full bg-primary/20"></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../services/auth.service';
import { authService } from '../services/auth.service';
import { extensionBridge } from '../utils/extensionBridge';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async () => {
    await authService.loginWithGoogle();
  };

  const logout = () => {
    authService.logout();
    extensionBridge.clearTokens();
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  // Sync session and local user profile
  const syncUserSession = async (session: Session | null) => {
    if (session) {
      try {
        console.log('AuthContext: Session detected, fetching local profile...');
        const userData = await authService.getCurrentUser(session.access_token);
        setUser(userData);

        // Sync with extension
        extensionBridge.syncTokens(session.access_token, session.refresh_token || '', userData);
      } catch (error) {
        console.error('AuthContext: Failed to fetch user profile:', error);
        // If we can't get the profile, we might still have a session but it's unusable for our app
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // 1. Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncUserSession(session);
    });

    // 2. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      console.log('AuthContext: auth state change:', _event);
      syncUserSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Reactive Sync: Re-sync with extension whenever the tab becomes visible/focused
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user) {
        const token = await authService.getAccessToken();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (token && session?.refresh_token) {
          extensionBridge.syncTokens(token, session.refresh_token, user);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
          <div className="w-12 h-12 border-4 border-[#8b5cf6] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

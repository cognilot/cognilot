// Supabase Auth management
import { supabase } from '../lib/supabase';
import { api } from './api';
import { profileService } from './profile.service';

export interface User {
  id: string;
  email: string;
  display_name?: string;
  given_name?: string;
  family_name?: string;
  avatar_url?: string;
  onboarding_completed: boolean;
  plan: string;
}

export const authService = {
  async loginWithGoogle(): Promise<void> {
    console.log('authService: loginWithGoogle triggered via Supabase');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth',
      },
    });

    if (error) {
      console.error('authService: login error:', error.message);
      throw error;
    }
  },

  async getCurrentUser(token?: string): Promise<User> {
    // We still call our backend /profile to get the local profile data
    // The ApiClient will automatically attach the Supabase JWT
    const response = await api.get<any>('/profile', token);
    
    // Map the /profile response to the expected User interface
    return {
      id: response.user.id,
      email: response.user.email,
      plan: response.user.plan,
      onboarding_completed: response.profile.onboardingCompleted || false,
    } as User;
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();

    // Clear profile cache on logout
    profileService.clearCache();

    // Clear extension storage if available
    if ((window as any).chrome?.runtime?.id) {
      try {
        window.postMessage({ type: 'Cognilot_LOGOUT' }, '*');
      } catch (error) {
        console.warn('Failed to sync logout with extension:', error);
      }
    }
  },

  async getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  },

  async isAuthenticated(): Promise<boolean> {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  },

  async updateCurrentUser(updates: Partial<User>): Promise<User> {
    return api.patch<User>('/users/me', updates);
  },
};

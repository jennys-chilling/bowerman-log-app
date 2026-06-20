import React, { createContext, useState, useContext, useEffect } from 'react';
import { appClient } from '@/api/client';
import { appParams, hasSupabaseConfig, missingSupabaseConfig } from '@/lib/app-params';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

const getConfigurationError = () => ({
  type: 'configuration',
  message: `Missing Supabase environment variables: ${missingSupabaseConfig.join(', ')}`,
});

const withAuthTimeout = (promise) => Promise.race([
  promise,
  new Promise((_, reject) => {
    window.setTimeout(() => {
      reject(new Error('Supabase did not respond. Check VITE_SUPABASE_URL in .env.local.'));
    }, 8000);
  }),
]);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authMessage, setAuthMessage] = useState(null);

  const resetAuthState = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const loadCurrentUser = async ({ showLoader = true } = {}) => {
    if (!hasSupabaseConfig) {
      setAuthError(getConfigurationError());
      resetAuthState();
      setIsLoadingAuth(false);
      return;
    }

    if (showLoader) {
      setIsLoadingAuth(true);
    }

    try {
      const currentUser = await withAuthTimeout(appClient.auth.me());
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      if (error.status === 401) {
        resetAuthState();
        setAuthError(null);
      } else {
        setAuthError({
          type: 'unknown',
          message: error.message || 'Failed to load your account',
        });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setAuthError(getConfigurationError());
      setIsLoadingAuth(false);
      return undefined;
    }

    loadCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthMessage(null);
        loadCurrentUser({ showLoader: false });
      } else {
        resetAuthState();
        setIsLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await appClient.auth.logout();
    setAuthMessage(null);
    resetAuthState();
  };

  const navigateToLogin = () => {
    setAuthError(null);
  };

  const signInWithMagicLink = async (email) => {
    const redirectTo = appParams.appBaseUrl || window.location.origin;
    await appClient.auth.signInWithMagicLink(email, redirectTo);
    setAuthMessage(`Magic link sent to ${email}. Open the link in the same browser to sign in.`);
    setAuthError(null);
  };

  const signInWithPassword = async (email, password) => {
    await appClient.auth.signInWithPassword(email, password);
    setAuthMessage(null);
    setAuthError(null);
    await loadCurrentUser({ showLoader: false });
  };

  const signUpWithPassword = async (email, password) => {
    const redirectTo = appParams.appBaseUrl || window.location.origin;
    await appClient.auth.signUpWithPassword(email, password, redirectTo);
    setAuthMessage(`Account created for ${email}. Check your email if Supabase asks you to confirm it.`);
    setAuthError(null);
    await loadCurrentUser({ showLoader: false });
  };

  const signInWithGoogle = async () => {
    const redirectTo = appParams.appBaseUrl || window.location.origin;
    await appClient.auth.signInWithGoogle(redirectTo);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        authMessage,
        appPublicSettings: null,
        logout,
        navigateToLogin,
        checkAppState: loadCurrentUser,
        signInWithMagicLink,
        signInWithPassword,
        signUpWithPassword,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

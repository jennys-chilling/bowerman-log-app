import React, { createContext, useState, useContext, useEffect } from 'react';
import { appClient } from '@/api/client';
import { appParams, hasSupabaseConfig, missingSupabaseConfig } from '@/lib/app-params';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

const getConfigurationError = () => ({
  type: 'configuration',
  message: `Missing Supabase environment variables: ${missingSupabaseConfig.join(', ')}`,
});

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
      const currentUser = await appClient.auth.me();
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

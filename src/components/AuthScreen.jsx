import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Chrome, LogIn, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/AuthContext';
import { missingSupabaseConfig } from '@/lib/app-params';
import BrandMark from '@/components/BrandMark';

export default function AuthScreen() {
  const {
    authError,
    authMessage,
    signInWithMagicLink,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState('');
  const [localError, setLocalError] = useState('');

  const normalizedEmail = email.trim();

  const validateEmail = () => {
    if (!normalizedEmail) {
      setLocalError('Enter your email address.');
      return false;
    }
    return true;
  };

  const validatePassword = () => {
    if (!password) {
      setLocalError('Enter your password.');
      return false;
    }
    if (password.length < 6) {
      setLocalError('Passwords need to be at least 6 characters.');
      return false;
    }
    return true;
  };

  const handleMagicLink = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (!validateEmail()) {
      return;
    }

    setIsSubmitting('magic');

    try {
      await signInWithMagicLink(normalizedEmail);
    } catch (error) {
      setLocalError(error.message || 'Unable to send a magic link right now.');
    } finally {
      setIsSubmitting('');
    }
  };

  const handlePasswordAuth = async (action) => {
    setLocalError('');

    if (!validateEmail() || !validatePassword()) {
      return;
    }

    setIsSubmitting(action);

    try {
      if (action === 'signUp') {
        await signUpWithPassword(normalizedEmail, password);
      } else {
        await signInWithPassword(normalizedEmail, password);
      }
    } catch (error) {
      setLocalError(error.message || 'Unable to sign in right now.');
    } finally {
      setIsSubmitting('');
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError('');
    setIsSubmitting('google');

    try {
      await signInWithGoogle();
    } catch (error) {
      setLocalError(error.message || 'Unable to start Google sign-in.');
      setIsSubmitting('');
    }
  };

  if (authError?.type === 'configuration') {
    return (
      <div className="btc-auth-shell px-4 py-10">
        <div className="relative mx-auto max-w-2xl">
          <Card className="btc-surface shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-200">
                <AlertTriangle className="h-5 w-5" />
                Supabase Setup Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p>
                This app now uses Supabase for auth and data. Add the missing environment variables before
                running or deploying it.
              </p>
              <div className="rounded-lg bg-slate-900 p-4 font-mono text-xs text-slate-100">
                {missingSupabaseConfig.map((key) => (
                  <div key={key}>{key}=</div>
                ))}
              </div>
              <p>
                Set them in your local <code>.env.local</code> file and in the Vercel project settings, then
                redeploy.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="btc-auth-shell px-4 py-10 text-slate-900 dark:text-slate-100">
      <div className="relative mx-auto max-w-xl">
        <Card className="btc-surface overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
          <div className="btc-stripe" />
          <CardHeader className="space-y-3">
            <BrandMark title="Bowerman" subtitle="Training Log" />
            <div>
              <CardTitle className="text-xl font-medium text-slate-900 dark:text-slate-100">
                Sign in to the <strong className="font-extrabold">NEW</strong> Bowerman Training Log
              </CardTitle>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Continue with Google, email and password, or use a magic link.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!!isSubmitting}
              onClick={handleGoogleSignIn}
            >
              <Chrome className="mr-2 h-4 w-4" />
              {isSubmitting === 'google' ? 'Opening Google...' : 'Continue with Google'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-slate-500 dark:text-slate-400">or</span>
              </div>
            </div>

            <Tabs defaultValue="password">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="magic">Magic Link</TabsTrigger>
              </TabsList>

              <TabsContent value="password" className="mt-4">
                <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
                  <div className="space-y-2">
                    <Label htmlFor="password-email">Email address</Label>
                    <Input
                      id="password-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      disabled={!!isSubmitting}
                      onClick={() => handlePasswordAuth('signIn')}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      {isSubmitting === 'signIn' ? 'Signing in...' : 'Sign In'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!!isSubmitting}
                      onClick={() => handlePasswordAuth('signUp')}
                    >
                      {isSubmitting === 'signUp' ? 'Creating...' : 'Create Account'}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="magic" className="mt-4">
                <form className="space-y-4" onSubmit={handleMagicLink}>
                  <div className="space-y-2">
                    <Label htmlFor="magic-email">Email address</Label>
                    <Input
                      id="magic-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>

                  <Button className="w-full" type="submit" disabled={!!isSubmitting}>
                    <Mail className="mr-2 h-4 w-4" />
                    {isSubmitting === 'magic' ? 'Sending link...' : 'Email me a magic link'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {(localError || authError?.message) && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
                {localError || authError?.message}
              </div>
            )}

            {authMessage && (
              <div className="btc-confirmation-panel rounded-lg border px-3 py-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{authMessage}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

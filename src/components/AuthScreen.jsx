import React, { useState } from 'react';
import { Mail, LogIn, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { missingSupabaseConfig } from '@/lib/app-params';

export default function AuthScreen() {
  const { authError, authMessage, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (!email.trim()) {
      setLocalError('Enter your email address to receive a magic link.');
      return;
    }

    setIsSubmitting(true);

    try {
      await signInWithMagicLink(email.trim());
    } catch (error) {
      setLocalError(error.message || 'Unable to send a magic link right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authError?.type === 'configuration') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <Card className="border-amber-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <AlertTriangle className="h-5 w-5" />
                Supabase Setup Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-10">
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl text-slate-900">Sign in to Bowerman Training Log</CardTitle>
              <p className="mt-2 text-sm text-slate-600">
                Use a magic link email sign-in. Supabase will send you a secure link and bring you back to the
                app after you open it.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              {(localError || authError?.message) && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {localError || authError?.message}
                </div>
              )}

              {authMessage && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{authMessage}</span>
                  </div>
                </div>
              )}

              <Button className="w-full" type="submit" disabled={isSubmitting}>
                <LogIn className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Sending link...' : 'Email me a magic link'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-900 text-slate-50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">First-time setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p>Create your Supabase project, run the schema SQL in this repo, and enable Email auth.</p>
            <p>
              New users are created as <code className="text-slate-100">athlete</code> profiles by default.
              Promote your coach account to <code className="text-slate-100">admin</code> in the
              <code className="ml-1 text-slate-100">profiles</code> table when you need coach access.
            </p>
            <p>The frontend only needs the project URL and anon key after that.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

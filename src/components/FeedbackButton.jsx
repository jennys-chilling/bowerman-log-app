import React, { useState } from 'react';
import { MessageCircleQuestion, Send, Loader2 } from 'lucide-react';
import { appClient } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

const initialForm = {
  category: 'question',
  subject: '',
  message: '',
};

const saveLocalBackup = (payload) => {
  const key = 'btc-feedback-drafts';
  const existing = JSON.parse(window.localStorage.getItem(key) || '[]');
  window.localStorage.setItem(
    key,
    JSON.stringify([{ ...payload, saved_at: new Date().toISOString() }, ...existing].slice(0, 20))
  );
};

export default function FeedbackButton() {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthenticated || !user) {
    return null;
  }

  const resetForm = () => {
    setForm(initialForm);
    setError('');
  };

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const handleSubmit = async () => {
    const message = form.message.trim();
    const subject = form.subject.trim();

    if (!message) {
      setError('Add a message before sending.');
      return;
    }

    const payload = {
      user_id: user.id,
      user_email: user.email || '',
      category: form.category,
      subject: subject || null,
      message,
      page_path: `${window.location.pathname}${window.location.search}`,
      user_agent: window.navigator.userAgent,
    };

    setIsSubmitting(true);
    setError('');

    try {
      await appClient.entities.Feedback.create(payload);
      toast({
        title: 'Feedback sent',
        description: 'Thanks, this was saved for review.',
      });
      handleOpenChange(false);
    } catch {
      saveLocalBackup(payload);
      toast({
        title: 'Feedback saved locally',
        description: 'Run the latest Supabase schema so future submissions save to the database.',
      });
      handleOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        className="h-10 w-full rounded-full bg-red-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500 sm:w-auto"
        onClick={() => setOpen(true)}
        aria-label="Open questions and feedback form"
      >
        <MessageCircleQuestion className="mr-2 h-4 w-4" />
        Feedback
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Questions / Feedback</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.category}
                onValueChange={(category) => setForm((current) => ({ ...current, category }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                placeholder="Short summary"
              />
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                placeholder="What should we know?"
                rows={5}
              />
              {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

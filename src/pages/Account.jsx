import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, Save, UserCircle } from 'lucide-react';
import { appClient } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import BrandMark from '@/components/BrandMark';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/utils';

const splitFullName = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
};

const getInitials = (firstName, lastName, email) => {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.trim();
  return (initials || email?.[0] || 'B').toUpperCase();
};

export default function Account() {
  const { user, checkAppState } = useAuth();
  const nameParts = useMemo(() => splitFullName(user?.full_name), [user?.full_name]);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    profile_image_url: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData({
      first_name: user?.first_name || nameParts.firstName,
      last_name: user?.last_name || nameParts.lastName,
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      profile_image_url: user?.profile_image_url || '',
    });
  }, [nameParts.firstName, nameParts.lastName, user]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const imageUrl = previewUrl || formData.profile_image_url;
  const initials = getInitials(formData.first_name, formData.last_name, formData.email);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Choose an image file for your profile picture.');
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const handleSave = async () => {
    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    const email = formData.email.trim();
    const phoneNumber = formData.phone_number.trim();

    if (!email) {
      setError('Email is required.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      let profileImageUrl = formData.profile_image_url;

      if (selectedFile) {
        profileImageUrl = await appClient.storage.uploadProfilePicture(user.id, selectedFile);
      }

      if (email !== user.email) {
        await appClient.auth.updateEmail(email);
      }

      await appClient.entities.User.update(user.id, {
        first_name: firstName || null,
        last_name: lastName || null,
        full_name: `${firstName} ${lastName}`.trim() || null,
        email,
        phone_number: phoneNumber || null,
        profile_image_url: profileImageUrl || null,
      });

      setSelectedFile(null);
      await checkAppState({ showLoader: false });
      toast({
        title: 'Account updated',
        description: email !== user.email
          ? 'Profile saved. Check your inbox if Supabase asks you to confirm the email change.'
          : 'Your profile details were saved.',
      });
    } catch (saveError) {
      setError(saveError.message || 'Could not save account details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="btc-app-shell text-slate-900 dark:text-slate-100">
      <div className="relative mx-auto max-w-4xl px-4 py-6">
        <div className="btc-rail-card mb-6 overflow-hidden rounded-2xl border border-red-900/10 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-red-500/20 dark:bg-slate-950/90">
          <div className="flex items-center justify-between gap-4 pl-2">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('TrainingLog')}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <BrandMark title="Bowerman" subtitle="Account" compact />
            </div>
          </div>
        </div>

        <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
          <CardHeader className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCircle className="h-5 w-5 text-red-700 dark:text-red-300" />
              Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar className="h-24 w-24 border border-red-900/10 shadow-sm dark:border-red-500/20">
                <AvatarImage src={imageUrl} alt="Profile picture" className="object-cover" />
                <AvatarFallback className="bg-red-100 text-xl font-bold text-red-800 dark:bg-red-950 dark:text-red-200">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="profile-picture">Profile Picture</Label>
                </div>
                <div>
                  <Input
                    id="profile-picture"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="profile-picture" className="cursor-pointer">
                      <Camera className="mr-2 h-4 w-4" />
                      Choose Photo
                    </label>
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  value={formData.first_name}
                  onChange={(event) => updateField('first_name', event.target.value)}
                  placeholder="First name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  value={formData.last_name}
                  onChange={(event) => updateField('last_name', event.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(event) => updateField('phone_number', event.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

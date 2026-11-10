'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import {
  X,
  ArrowLeft,
  User,
  Calendar,
  Heart,
  Ruler,
  MapPin,
  Mail,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function UserProfileModal({
  isOpen,
  onClose,
  onOpenSettings,
}: UserProfileModalProps) {
  const { user, isLoaded } = useUser();

  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [place, setPlace] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Hydrate from Clerk user and localStorage
  useEffect(() => {
    if (!isOpen) return;

    // Load from localStorage cache first for immediate hydration
    try {
      const cached = localStorage.getItem('beyondlimits_user_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.name) setName(parsed.name);
        if (parsed.age) setAge(String(parsed.age));
        if (parsed.dateOfBirth) setDateOfBirth(parsed.dateOfBirth);
        if (parsed.bloodGroup) setBloodGroup(parsed.bloodGroup);
        if (parsed.height) setHeight(parsed.height);
        if (parsed.place) setPlace(parsed.place);
      }
    } catch {}

    // Hydrate from Clerk metadata
    if (isLoaded && user) {
      const meta = (user.unsafeMetadata || {}) as Record<string, string>;
      const userFullName =
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        user.fullName ||
        '';

      if (userFullName) setName(userFullName);
      if (meta.age) setAge(String(meta.age));
      if (meta.dateOfBirth) setDateOfBirth(meta.dateOfBirth);
      if (meta.bloodGroup) setBloodGroup(meta.bloodGroup);
      if (meta.height) setHeight(meta.height);
      if (meta.place) setPlace(meta.place);
    }
  }, [isOpen, isLoaded, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const profileData = {
      name: name.trim(),
      age: age.trim(),
      dateOfBirth: dateOfBirth.trim(),
      bloodGroup: bloodGroup.trim(),
      height: height.trim(),
      place: place.trim(),
    };

    // Save to localStorage immediately
    try {
      localStorage.setItem('beyondlimits_user_profile', JSON.stringify(profileData));
      window.dispatchEvent(new CustomEvent('user_profile_updated', { detail: profileData }));
    } catch {}

    // Save to Clerk user metadata
    try {
      if (user) {
        const nameParts = profileData.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        await user.update({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          unsafeMetadata: {
            ...user.unsafeMetadata,
            age: profileData.age,
            dateOfBirth: profileData.dateOfBirth,
            bloodGroup: profileData.bloodGroup,
            height: profileData.height,
            place: profileData.place,
          },
        });
      }

      // Sync to backend API (/api/profile)
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server sync failed');
      }

      setStatusMessage({
        type: 'success',
        text: 'Profile information updated and saved successfully!',
      });

      setTimeout(() => {
        setStatusMessage(null);
      }, 4000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update profile';
      setStatusMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pt-[max(env(safe-area-inset-top),20px)] pb-12"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 my-auto sm:my-8 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header with Left Back Arrow */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] -ml-1 flex items-center justify-center rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="relative w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-teal-600/30 bg-teal-50 flex items-center justify-center shrink-0">
            {user?.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={name || 'User Profile'}
                fill
                sizes="44px"
                className="object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-teal-700" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                My Profile
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
                Athlete
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate max-w-[240px]">
              {userEmail || 'Discipline Athlete'}
            </p>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold ${
              statusMessage.type === 'success'
                ? 'bg-teal-50 text-teal-800 border border-teal-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-700" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Hunter"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
            />
          </div>

          {/* Age & Date of Birth (2 Cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-700" />
                <span>Age</span>
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 21"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-700" />
                <span>Date of Birth</span>
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* Blood Group & Height (2 Cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-teal-700" />
                <span>Blood Group</span>
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-all cursor-pointer"
              >
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-teal-700" />
                <span>Height</span>
              </label>
              <input
                type="text"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g. 178 cm / 5'10&quot;"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* Place / City */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-700" />
              <span>Place / City</span>
            </label>
            <input
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="e.g. Bengaluru, Karnataka"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
            />
          </div>

          {/* Connected Email (Read only) */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Connected Google / Email</span>
            </label>
            <input
              type="email"
              disabled
              value={userEmail}
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:flex-1 min-h-[46px] rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>

            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="w-full sm:w-auto px-4 min-h-[46px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-teal-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>AI & Gemini Settings</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

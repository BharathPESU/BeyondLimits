'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import {
  X,
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
    } catch {}

    try {
      // 1. Update Clerk client user if signed in
      if (user) {
        const nameParts = profileData.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        await user.update({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          unsafeMetadata: {
            ...user.unsafeMetadata,
            ...profileData,
          },
        });
      }

      // 2. Sync to server profile API
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-cyan-900/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 my-8 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-cyan-500/40 bg-slate-800 flex items-center justify-center shrink-0">
              {user?.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={name || 'User Profile'}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-cyan-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  My Profile
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                  Athlete
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">
                {userEmail || 'Discipline Athlete'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold ${
              statusMessage.type === 'success'
                ? 'bg-teal-950/80 text-teal-300 border border-teal-800/50'
                : 'bg-red-950/80 text-red-300 border border-red-800/50'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bharath CD"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-colors"
            />
          </div>

          {/* Age & Date of Birth (2 Cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Age</span>
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 21"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Date of Birth</span>
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Blood Group & Height (2 Cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-cyan-400" />
                <span>Blood Group</span>
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-white outline-none transition-colors cursor-pointer"
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
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                <span>Height</span>
              </label>
              <input
                type="text"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g. 178 cm / 5'10&quot;"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Place / City */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Place / City</span>
            </label>
            <input
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="e.g. Bengaluru, Karnataka"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-colors"
            />
          </div>

          {/* Email (Read only) */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Connected Gmail / Email</span>
            </label>
            <input
              type="email"
              disabled
              value={userEmail}
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/60 rounded-xl text-sm text-slate-400 cursor-not-allowed"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:flex-1 min-h-[46px] rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-all cursor-pointer disabled:opacity-50"
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
                className="w-full sm:w-auto px-4 min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-900/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI & Gemini Settings</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

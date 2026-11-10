'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  ArrowLeft,
  Newspaper,
  Volume2,
  Square,
  RefreshCw,
  Clock,
  ExternalLink,
  Globe,
  Languages,
  SlidersHorizontal,
  Flame,
  Cpu,
  Briefcase,
  ShieldAlert,
  Home,
  Film,
  Landmark,
  Trophy,
  Compass,
  Sparkles,
  HeartPulse,
} from 'lucide-react';
import { DailyTechNewsRecord, TechNewsItem } from '@/lib/types';

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  newsRecord: DailyTechNewsRecord | null;
  loadingNews: boolean;
  onRefreshNews: (filters?: {
    category?: string;
    language?: string;
    country?: string;
  }) => Promise<void>;
  onSpeakText: (text: string) => Promise<void>;
  onStopVoice: () => void;
  isSpeaking: boolean;
}

const CATEGORIES = [
  { id: 'technology', label: 'Technology', icon: Cpu },
  { id: 'top', label: 'Breaking News', icon: Flame },
  { id: 'business', label: 'Business & Work', icon: Briefcase },
  { id: 'crime', label: 'Crime', icon: ShieldAlert },
  { id: 'domestic', label: 'Domestic', icon: Home },
  { id: 'entertainment', label: 'Entertainment', icon: Film },
  { id: 'politics', label: 'Politics', icon: Landmark },
  { id: 'sports', label: 'Sports', icon: Trophy },
  { id: 'tourism', label: 'Tourism', icon: Compass },
  { id: 'world', label: 'World News', icon: Globe },
  { id: 'science', label: 'Science', icon: Sparkles },
  { id: 'health', label: 'Health', icon: HeartPulse },
];

const LANGUAGES = [
  { id: 'all', label: 'All Languages' },
  { id: 'en', label: 'English' },
  { id: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { id: 'hi', label: 'Hindi (हिन्दी)' },
  { id: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { id: 'ur', label: 'Urdu (اردو)' },
  { id: 'ta', label: 'Tamil (தமிழ்)' },
  { id: 'te', label: 'Telugu (తెలుగు)' },
  { id: 'ml', label: 'Malayalam (മലയാളം)' },
  { id: 'mr', label: 'Marathi (मराठी)' },
  { id: 'bn', label: 'Bengali (বাংলা)' },
  { id: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
];

const COUNTRIES = [
  { id: 'all', label: 'All Countries (Global)' },
  { id: 'in', label: 'India' },
  { id: 'us', label: 'United States' },
  { id: 'gb', label: 'United Kingdom' },
  { id: 'ca', label: 'Canada' },
  { id: 'au', label: 'Australia' },
  { id: 'de', label: 'Germany' },
  { id: 'fr', label: 'France' },
  { id: 'jp', label: 'Japan' },
  { id: 'ae', label: 'United Arab Emirates' },
  { id: 'sg', label: 'Singapore' },
];

export default function NewsModal({
  isOpen,
  onClose,
  newsRecord,
  loadingNews,
  onRefreshNews,
  onSpeakText,
  onStopVoice,
  isSpeaking,
}: NewsModalProps) {
  const [activeReadingId, setActiveReadingId] = useState<number | 'all' | null>(
    null
  );

  // Filter states: Default category is 'technology', default country is 'all'
  const [selectedCategory, setSelectedCategory] = useState<string>('technology');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  // Sync state if newsRecord has specific category/language/country
  useEffect(() => {
    if (newsRecord?.category) {
      setSelectedCategory(newsRecord.category);
    }
    if (newsRecord?.language) {
      setSelectedLanguage(newsRecord.language);
    }
    if (newsRecord?.country) {
      setSelectedCountry(newsRecord.country);
    }
  }, [newsRecord]);

  if (!isOpen) return null;

  const items: TechNewsItem[] = newsRecord?.items || [];

  const handleCategoryChange = (newCat: string) => {
    setSelectedCategory(newCat);
    void onRefreshNews({
      category: newCat,
      language: selectedLanguage,
      country: selectedCountry,
    });
  };

  const handleLanguageChange = (newLang: string) => {
    setSelectedLanguage(newLang);
    void onRefreshNews({
      category: selectedCategory,
      language: newLang,
      country: selectedCountry,
    });
  };

  const handleCountryChange = (newCountry: string) => {
    setSelectedCountry(newCountry);
    void onRefreshNews({
      category: selectedCategory,
      language: selectedLanguage,
      country: newCountry,
    });
  };

  const handleReadSingleNews = async (item: TechNewsItem) => {
    setActiveReadingId(item.id);
    const script = `News item number ${item.id}. Category: ${item.category}. ${item.title}. ${item.summary}`;
    await onSpeakText(script);
    setActiveReadingId(null);
  };

  const handleReadAllNews = async () => {
    if (items.length === 0) return;
    setActiveReadingId('all');
    const combinedScript =
      `Here are your Top 5 News headlines for ${selectedCategory}. ` +
      items
        .map(
          (item, idx) =>
            `Number ${idx + 1}, from ${item.source}: ${item.title}. ${item.summary}`
        )
        .join(' ... ');
    await onSpeakText(combinedScript);
    setActiveReadingId(null);
  };

  const handleStop = () => {
    setActiveReadingId(null);
    onStopVoice();
  };

  const currentCategoryObj =
    CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];

  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-modal-title"
    >
      {/* Full-Screen Sticky Header with Safe Area & Left Back Arrow */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 pt-[max(env(safe-area-inset-top),16px)] pb-3.5 shrink-0">
        <div className="max-w-4xl w-full mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              handleStop();
              onClose();
            }}
            aria-label="Back to dashboard"
            className="min-h-[40px] min-w-[40px] -ml-2 inline-flex items-center justify-center rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 shrink-0">
              <Newspaper className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h2
                id="news-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 leading-tight"
              >
                Top 5 Daily News
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-xs font-mono font-semibold text-teal-800">
                <Clock className="w-3 h-3" />
                <span>Daily 8:00 AM</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-700 uppercase">
                {currentCategoryObj.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar: Category Pills + Language & Country Selectors */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0 space-y-3">
        <div className="max-w-4xl w-full mx-auto space-y-2.5">
          {/* Scrollable Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-bold shrink-0 inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Language & Country Filters + Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              {/* Language Selector */}
              <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1">
                <Languages className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <select
                  aria-label="Filter by Language"
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Country Selector (Default: All Countries) */}
              <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1">
                <Globe className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <select
                  aria-label="Filter by Country"
                  value={selectedCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  {COUNTRIES.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Read Aloud + Refresh Controls */}
            <div className="flex items-center gap-2">
              {isSpeaking ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleReadAllNews()}
                  disabled={items.length === 0 || loadingNews}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Read 5 Aloud</span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  void onRefreshNews({
                    category: selectedCategory,
                    language: selectedLanguage,
                    country: selectedCountry,
                  })
                }
                disabled={loadingNews}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-teal-700 ${
                    loadingNews ? 'animate-spin' : ''
                  }`}
                />
                <span>{loadingNews ? 'Loading...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen Scrollable News List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl w-full mx-auto space-y-3.5">
          {loadingNews && items.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-28 rounded-2xl bg-white animate-pulse border border-slate-200"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
              <Newspaper className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800">
                No articles found for this filter combination.
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try selecting &ldquo;All Languages&rdquo; or &ldquo;All Countries&rdquo; to expand the search results.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('technology');
                  setSelectedLanguage('all');
                  setSelectedCountry('all');
                  void onRefreshNews({
                    category: 'technology',
                    language: 'all',
                    country: 'all',
                  });
                }}
                className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 cursor-pointer"
              >
                Reset to Default Technology News
              </button>
            </div>
          ) : (
            items.map((item, idx) => {
              const isThisSpeaking =
                isSpeaking &&
                (activeReadingId === item.id || activeReadingId === 'all');

              return (
                <article
                  key={`${item.id}-${idx}`}
                  className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                    isThisSpeaking
                      ? 'bg-teal-50/80 border-teal-600 ring-1 ring-teal-600 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-teal-50 text-teal-700 font-mono text-xs font-bold">
                        #{idx + 1}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold uppercase tracking-wider">
                        {item.category}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {item.source} · {item.publishedAt}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        isThisSpeaking
                          ? handleStop()
                          : void handleReadSingleNews(item)
                      }
                      className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                        isThisSpeaking
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'
                      }`}
                    >
                      {isThisSpeaking ? (
                        <>
                          <Square className="w-3 h-3" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-teal-700" />
                          <span>Read</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mt-3">
                    {item.imageUrl && (
                      <div className="sm:w-36 h-28 sm:h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Hide broken image thumbnail
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>
                  </div>

                  {item.url && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                      >
                        <span>Full Source Article</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

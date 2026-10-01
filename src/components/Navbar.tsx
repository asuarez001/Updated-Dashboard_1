import React from 'react';
import { Syringe, Flame, Bot, Scale, Settings as SettingsIcon, Calendar, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { UserProfile, ShotEntry } from '../types';
import { calculateEstimatedPlasmaLevel } from '../utils/calculations';
import { formatDate } from '../utils/storage';

interface NavbarProps {
  currentTab: 'dashboard' | 'shots' | 'chat' | 'fatloss';
  setCurrentTab: (tab: 'dashboard' | 'shots' | 'chat' | 'fatloss') => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  profile: UserProfile;
  latestShot: ShotEntry | undefined;
  onOpenSettings: () => void;
  onOpenExcelImport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  selectedDate,
  setSelectedDate,
  profile,
  latestShot,
  onOpenSettings,
  onOpenExcelImport,
}) => {
  const plasma = calculateEstimatedPlasmaLevel(latestShot, new Date(selectedDate + 'T12:00:00'));

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDate(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatDate(d));
  };

  const isToday = selectedDate === formatDate(new Date());

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Flame },
    { id: 'shots', label: 'GLP-1 Weekly Shot Hub', icon: Syringe },
    { id: 'chat', label: 'Gemini AI Chatbot', icon: Bot },
    { id: 'fatloss', label: 'Pure Fat Loss Math', icon: Scale },
  ] as const;

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      {/* Top Banner with Shot Status & User Summary */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            <Syringe className="w-5 h-5 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 tracking-tight text-base sm:text-lg">GLP-1 Pulse</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-emerald-800 font-medium">
                {profile.medication} ({profile.brandName}) {profile.doseMg}mg
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Day {Math.floor(plasma.daysSinceShot)} of 7</span>
              <span>·</span>
              <span>{plasma.relativeLevelPct}% Active Level</span>
              <span>·</span>
              <span>{plasma.nextShotDueDays <= 0 ? 'Shot Due Today' : `${plasma.nextShotDueDays}d to Next Shot`}</span>
            </div>
          </div>
        </div>

        {/* Date Selector & Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Date controls */}
          <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-xs text-slate-700">
            <button
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-white hover:text-slate-900 rounded-md transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-2 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{isToday ? 'Today' : selectedDate}</span>
            </div>
            <button
              onClick={handleNextDay}
              className="p-1.5 hover:bg-white hover:text-slate-900 rounded-md transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(formatDate(new Date()))}
                className="px-2 py-1 text-emerald-700 font-medium hover:bg-emerald-50 rounded-md transition-colors"
              >
                Today
              </button>
            )}
          </div>

          {/* Import Excel button */}
          <button
            onClick={onOpenExcelImport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
            title="Import Excel document with daily burn and calories"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import Excel</span>
          </button>

          {/* Gemini AI Chatbot Action */}
          <button
            onClick={() => setCurrentTab('chat')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 transition-colors shadow-xs"
          >
            <Bot className="w-3.5 h-3.5 text-emerald-200" />
            <span>Chat with Gemini</span>
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="App & Protocol Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Tab Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 no-scrollbar" aria-label="Tabs">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

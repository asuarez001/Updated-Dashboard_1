import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, MealItem, ShotEntry, DailyActivityLog, ActivityLevel } from './types';
import {
  loadProfile,
  saveProfile,
  loadMeals,
  saveMeals,
  loadActivityData,
  saveActivityData,
  loadShots,
  saveShots,
  formatDate,
} from './utils/storage';
import { computeDailySummary, PURE_FAT_KCAL_PER_LB } from './utils/calculations';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ShotTrackerView } from './components/ShotTrackerView';
import { ChatbotView } from './components/ChatbotView';
import { FatLossAnalyticsView } from './components/FatLossAnalyticsView';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { ExcelImportModal } from './components/ExcelImportModal';

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(loadProfile);
  const [meals, setMeals] = useState<MealItem[]>(loadMeals);
  const [activityData, setActivityData] = useState<Record<string, DailyActivityLog>>(loadActivityData);
  const [shots, setShots] = useState<ShotEntry[]>(loadShots);

  const [selectedDate, setSelectedDate] = useState<string>(() => formatDate(new Date()));
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'shots' | 'chat' | 'fatloss'>('dashboard');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

  // Sync to localStorage on state changes
  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveMeals(meals);
  }, [meals]);

  useEffect(() => {
    saveActivityData(activityData);
  }, [activityData]);

  useEffect(() => {
    saveShots(shots);
  }, [shots]);

  // Handler for updating profile
  const handleUpdateProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
  };

  // Shot Handlers
  const handleAddShot = (shot: ShotEntry) => {
    const updated = [shot, ...shots].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setShots(updated);
  };

  const handleDeleteShot = (id: string) => {
    setShots(shots.filter((s) => s.id !== id));
  };

  // Excel & Manual Daily Input handlers
  const handleImportMeals = (importedMeals: MealItem[]) => {
    setMeals((prev) => [...importedMeals, ...prev]);
  };

  const handleImportActivity = (importedActivity: Record<string, DailyActivityLog>) => {
    setActivityData((prev) => ({ ...prev, ...importedActivity }));
  };

  const handleSaveDailyInput = (
    date: string,
    dailyBurn: number,
    dailyCalories: number,
    protein: number,
    weight: number,
    steps: number
  ) => {
    setActivityData((prev) => ({
      ...prev,
      [date]: {
        date,
        activityLevel: 'light',
        exerciseCalories: 0,
        explicitTdee: dailyBurn,
        steps,
      },
    }));

    const filteredMeals = meals.filter((m) => m.date !== date);
    const newMealItem: MealItem = {
      id: `manual-input-${date}`,
      date,
      mealType: 'Dinner',
      foodName: 'Manual Thermodynamic Input',
      servingSize: 'Daily Log Entry',
      calories: dailyCalories,
      protein,
      carbs: 150,
      fat: 50,
      fiber: 25,
      timestamp: `${date}T12:00:00.000Z`,
    };
    setMeals([newMealItem, ...filteredMeals]);

    if (weight > 50) {
      setProfile((prev) => ({
        ...prev,
        currentWeightLbs: weight,
      }));
    }
  };

  const handleDeleteDay = (date: string) => {
    setMeals((prev) => prev.filter((m) => m.date !== date));
    setActivityData((prev) => {
      const copy = { ...prev };
      delete copy[date];
      return copy;
    });
  };

  const handleUpdateActivityLevel = (level: ActivityLevel) => {
    setProfile((prev) => ({ ...prev, defaultActivityLevel: level }));
    setActivityData((prev) => {
      const existing = prev[selectedDate] || {
        date: selectedDate,
        activityLevel: level,
        exerciseCalories: 0,
        steps: 8000,
      };
      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          activityLevel: level,
          explicitTdee: undefined, // Clear explicit TDEE so multiplier takes effect immediately
        },
      };
    });
  };

  // Compute daily summary for selected date
  const todaySummary = useMemo(() => {
    return computeDailySummary(selectedDate, meals, activityData, profile);
  }, [selectedDate, meals, activityData, profile]);

  // Compute all daily summaries for analytics (only dates with actual user entries or current date)
  const allSummaries = useMemo(() => {
    const dateSet = new Set<string>();
    dateSet.add(selectedDate);
    meals.forEach((m) => dateSet.add(m.date));
    Object.keys(activityData).forEach((d) => dateSet.add(d));

    const dateList = Array.from(dateSet).sort();
    return dateList.map((dateStr) =>
      computeDailySummary(dateStr, meals, activityData, profile)
    );
  }, [selectedDate, meals, activityData, profile]);

  const cumulativeDeficitKcal = useMemo(() => {
    return allSummaries.reduce((acc, s) => acc + s.deficitCalories, 0);
  }, [allSummaries]);

  const cumulativeFatLossLbs = useMemo(() => {
    return cumulativeDeficitKcal / PURE_FAT_KCAL_PER_LB;
  }, [cumulativeDeficitKcal]);

  const latestShot = shots[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        profile={profile}
        latestShot={latestShot}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExcelImport={() => setIsExcelImportOpen(true)}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            summary={todaySummary}
            profile={profile}
            latestShot={latestShot}
            activityLog={activityData[selectedDate]}
            cumulativeFatLossLbs={cumulativeFatLossLbs}
            cumulativeDeficitKcal={cumulativeDeficitKcal}
            onNavigateTab={setCurrentTab}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onUpdateActivityLevel={handleUpdateActivityLevel}
          />
        )}

        {currentTab === 'shots' && (
          <ShotTrackerView
            profile={profile}
            shots={shots}
            onAddShot={handleAddShot}
            onDeleteShot={handleDeleteShot}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {currentTab === 'chat' && (
          <ChatbotView
            profile={profile}
            latestShot={latestShot}
          />
        )}

        {currentTab === 'fatloss' && (
          <FatLossAnalyticsView
            summaries={allSummaries}
            profile={profile}
            activityData={activityData}
            meals={meals}
            onSaveDailyInput={handleSaveDailyInput}
            onDeleteDay={handleDeleteDay}
          />
        )}
      </main>

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onSaveProfile={handleUpdateProfile}
      />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        profile={profile}
        onUpdateProfile={handleUpdateProfile}
        onImportMeals={handleImportMeals}
        onImportActivity={handleImportActivity}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            GLP-1 Pulse · Precision Pharmacotherapy & Energy Balance Model
          </div>
          <div>
            1 lb Pure Human Adipose Tissue = 3,500 kcal Deficit (Wishnofsky Rule)
          </div>
        </div>
      </footer>
    </div>
  );
}

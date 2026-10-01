import { UserProfile, DailyActivityLog, MealItem, ShotEntry } from '../types';

const PROFILE_KEY = 'glp1_user_profile_v3';
const MEALS_KEY = 'glp1_meals_log_v3';
const ACTIVITY_KEY = 'glp1_activity_log_v3';
const SHOTS_KEY = 'glp1_shots_log_v3';

// Clean out any legacy mock data keys from prior development sessions
export function purgeLegacyTestData(): void {
  try {
    const legacyKeys = [
      'glp1_user_profile',
      'glp1_meals_log',
      'glp1_activity_log',
      'glp1_shots_log',
      'glp1_apple_watch_data',
      'glp1_cleared_test_data',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    // Ignore in non-browser or sandbox environments
  }
}

export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPastDates(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}

export function getDefaultProfile(): UserProfile {
  return {
    name: 'Anthony Suarez',
    currentWeightLbs: 218.0,
    startingWeightLbs: 236.0,
    goalWeightLbs: 185.0,
    heightInches: 71, // 5'11"
    age: 39,
    biologicalSex: 'male',
    medication: 'Tirzepatide',
    brandName: 'Zepbound',
    doseMg: 5.0,
    shotDayOfWeek: 0, // Sunday
    targetDailyCalories: 1650,
    targetDailyProteinGrams: 140,
    defaultActivityLevel: 'light',
    unit: 'lbs',
    treatmentStartDate: formatDate(new Date()),
  };
}

export function getDefaultShots(): ShotEntry[] {
  return [];
}

export function getDefaultActivityData(): Record<string, DailyActivityLog> {
  return {};
}

export function getDefaultMeals(): MealItem[] {
  return [];
}

export function loadProfile(): UserProfile {
  purgeLegacyTestData();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.defaultActivityLevel) return parsed;
    }
  } catch (e) {
    console.error('Failed to load profile', e);
  }
  const defaultProf = getDefaultProfile();
  saveProfile(defaultProf);
  return defaultProf;
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile', e);
  }
}

export function loadMeals(): MealItem[] {
  purgeLegacyTestData();
  try {
    const raw = localStorage.getItem(MEALS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load meals', e);
  }
  return [];
}

export function saveMeals(meals: MealItem[]): void {
  try {
    localStorage.setItem(MEALS_KEY, JSON.stringify(meals));
  } catch (e) {
    console.error('Failed to save meals', e);
  }
}

export function loadActivityData(): Record<string, DailyActivityLog> {
  purgeLegacyTestData();
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load activity data', e);
  }
  return {};
}

export function saveActivityData(data: Record<string, DailyActivityLog>): void {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save activity data', e);
  }
}

export function loadShots(): ShotEntry[] {
  purgeLegacyTestData();
  try {
    const raw = localStorage.getItem(SHOTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load shots', e);
  }
  return [];
}

export function saveShots(shots: ShotEntry[]): void {
  try {
    localStorage.setItem(SHOTS_KEY, JSON.stringify(shots));
  } catch (e) {
    console.error('Failed to save shots', e);
  }
}

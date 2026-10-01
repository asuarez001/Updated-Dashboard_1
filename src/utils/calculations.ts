import { UserProfile, DailyActivityLog, MealItem, ShotEntry, DailySummary, ActivityLevel } from '../types';

export const PURE_FAT_KCAL_PER_LB = 3500;
export const PURE_FAT_KCAL_PER_KG = 7716;

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; desc: string }> = {
  sedentary: { label: 'Sedentary', desc: 'Desk job, little to no regular exercise (1.2× BMR)' },
  light: { label: 'Lightly Active', desc: 'Light daily walking, 1-3 days/week light workout (1.375× BMR)' },
  moderate: { label: 'Moderately Active', desc: 'Moderate exercise or sports 3-5 days/week (1.55× BMR)' },
  very_active: { label: 'Very Active', desc: 'Hard exercise or sports 6-7 days/week (1.725× BMR)' },
};

/**
 * Calculates Mifflin-St Jeor Basal Metabolic Rate (BMR)
 */
export function calculateMifflinStJeorBMR(
  weightLbs: number,
  heightInches: number,
  age: number,
  sex: 'male' | 'female'
): number {
  const weightKg = weightLbs * 0.45359237;
  const heightCm = heightInches * 2.54;

  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  return Math.round(bmr);
}

/**
 * Computes Total Daily Energy Expenditure (TDEE) based on BMR and Activity Level
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel,
  additionalExerciseKcal: number = 0
): {
  bmrCalories: number;
  activityBurnCalories: number;
  exerciseCalories: number;
  totalBurnCalories: number;
} {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.375;
  const baseTDEE = Math.round(bmr * multiplier);
  const activityBurnCalories = baseTDEE - bmr;
  const totalBurnCalories = baseTDEE + additionalExerciseKcal;

  return {
    bmrCalories: bmr,
    activityBurnCalories,
    exerciseCalories: additionalExerciseKcal,
    totalBurnCalories,
  };
}

/**
 * Calculate pure fat loss based on strict 3,500 kcal = 1 lb pure fat physics
 */
export function calculateFatLossFromDeficit(deficitKcal: number): {
  fatLossLbs: number;
  fatLossGrams: number;
  isSurplus: boolean;
} {
  const fatLossLbs = deficitKcal / PURE_FAT_KCAL_PER_LB;
  const fatLossGrams = fatLossLbs * 453.59237;
  return {
    fatLossLbs: parseFloat(fatLossLbs.toFixed(3)),
    fatLossGrams: Math.round(fatLossGrams),
    isSurplus: deficitKcal < 0,
  };
}

/**
 * Summarize day metrics: Intake, Burn, Deficit, and Pure Fat Burned
 */
export function computeDailySummary(
  dateStr: string,
  meals: MealItem[],
  activityLogs: Record<string, DailyActivityLog>,
  profile: UserProfile
): DailySummary {
  const dayMeals = meals.filter((m) => m.date === dateStr);
  const intakeCalories = dayMeals.reduce((acc, m) => acc + m.calories, 0);
  const proteinGrams = dayMeals.reduce((acc, m) => acc + m.protein, 0);
  const carbsGrams = dayMeals.reduce((acc, m) => acc + m.carbs, 0);
  const fatGrams = dayMeals.reduce((acc, m) => acc + m.fat, 0);
  const fiberGrams = dayMeals.reduce((acc, m) => acc + m.fiber, 0);

  const bmr = calculateMifflinStJeorBMR(
    profile.currentWeightLbs,
    profile.heightInches,
    profile.age,
    profile.biologicalSex
  );

  const dayLog = activityLogs[dateStr];
  const activityLevel = dayLog?.activityLevel || profile.defaultActivityLevel || 'light';
  const exerciseCalories = dayLog?.exerciseCalories || 0;

  const calculatedTDEE = calculateTDEE(
    bmr,
    activityLevel,
    exerciseCalories
  );

  const totalBurnCalories = dayLog?.explicitTdee !== undefined && dayLog.explicitTdee > 0
    ? dayLog.explicitTdee
    : calculatedTDEE.totalBurnCalories;

  const activityBurnCalories = dayLog?.explicitTdee !== undefined && dayLog.explicitTdee > 0
    ? Math.max(0, dayLog.explicitTdee - bmr)
    : calculatedTDEE.activityBurnCalories;

  const deficitCalories = totalBurnCalories - intakeCalories;
  const { fatLossLbs, fatLossGrams } = calculateFatLossFromDeficit(deficitCalories);

  return {
    date: dateStr,
    intakeCalories,
    proteinGrams: Math.round(proteinGrams),
    carbsGrams: Math.round(carbsGrams),
    fatGrams: Math.round(fatGrams),
    fiberGrams: Math.round(fiberGrams),
    bmrCalories: calculatedTDEE.bmrCalories,
    activityBurnCalories,
    exerciseCalories,
    totalBurnCalories,
    deficitCalories,
    fatLossLbs,
    fatLossGrams,
    mealsCount: dayMeals.length,
  };
}

/**
 * Pharmacokinetic estimation of GLP-1 active concentration
 * Semaglutide: t1/2 ~ 7 days (168h), tMax ~ 36h
 * Tirzepatide: t1/2 ~ 5 days (120h), tMax ~ 24h
 */
export function calculateEstimatedPlasmaLevel(
  latestShot: ShotEntry | undefined,
  targetDate: Date = new Date()
): {
  daysSinceShot: number;
  relativeLevelPct: number; // 0 - 100%
  phase: 'absorption' | 'peak' | 'elimination' | 'trough' | 'due';
  statusText: string;
  nextShotDueDays: number;
} {
  if (!latestShot) {
    return {
      daysSinceShot: 0,
      relativeLevelPct: 0,
      phase: 'due',
      statusText: 'No injection recorded yet',
      nextShotDueDays: 0,
    };
  }

  const shotTime = new Date(latestShot.timestamp).getTime();
  const now = targetDate.getTime();
  const diffHours = Math.max(0, (now - shotTime) / (1000 * 60 * 60));
  const daysSinceShot = parseFloat((diffHours / 24).toFixed(1));

  const isTirzepatide = latestShot.medication === 'Tirzepatide';
  const halfLifeHours = isTirzepatide ? 120 : 168; // 5 days vs 7 days
  const peakHours = isTirzepatide ? 24 : 36;

  let relativeLevelPct = 100;
  let phase: 'absorption' | 'peak' | 'elimination' | 'trough' | 'due' = 'elimination';
  let statusText = '';

  if (diffHours < peakHours) {
    phase = 'absorption';
    relativeLevelPct = Math.round(40 + (diffHours / peakHours) * 60);
    statusText = 'Rising blood concentration. Satiety increasing.';
  } else if (diffHours <= peakHours + 24) {
    phase = 'peak';
    relativeLevelPct = 100;
    statusText = 'Peak therapeutic blood concentration. Maximum appetite suppression.';
  } else if (diffHours <= 168) {
    phase = 'elimination';
    const hoursAfterPeak = diffHours - (peakHours + 24);
    const k = Math.LN2 / halfLifeHours;
    const decay = Math.exp(-k * hoursAfterPeak);
    relativeLevelPct = Math.max(20, Math.round(100 * decay));
    if (diffHours > 120) {
      statusText = 'Late cycle. Mild hunger cues may return as levels taper.';
    } else {
      statusText = 'Steady therapeutic suppression active.';
    }
  } else {
    phase = 'due';
    relativeLevelPct = Math.max(5, Math.round(45 * Math.exp(-((diffHours - 168) / 48))));
    statusText = '7+ days elapsed. Next weekly dose is due.';
  }

  const nextShotDueDays = Math.max(0, parseFloat((7 - daysSinceShot).toFixed(1)));

  return {
    daysSinceShot,
    relativeLevelPct,
    phase,
    statusText,
    nextShotDueDays,
  };
}

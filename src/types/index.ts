export type MedicationType =
  | 'Semaglutide'
  | 'Tirzepatide'
  | 'Liraglutide'
  | 'Retatrutide'
  | 'Other';

export type BrandName =
  | 'Ozempic'
  | 'Wegovy'
  | 'Mounjaro'
  | 'Zepbound'
  | 'Rybelsus'
  | 'Saxenda'
  | 'Compounded'
  | 'Other';

export type InjectionSite =
  | 'Abdomen - Left Upper'
  | 'Abdomen - Left Lower'
  | 'Abdomen - Right Upper'
  | 'Abdomen - Right Lower'
  | 'Thigh - Left'
  | 'Thigh - Right'
  | 'Arm - Left Outer'
  | 'Arm - Right Outer';

export interface ShotEntry {
  id: string;
  timestamp: string; // ISO date string
  medication: MedicationType;
  brandName: BrandName;
  doseMg: number;
  injectionSite: InjectionSite;
  satietyScore: number; // 1 to 10
  sideEffects: string[];
  notes?: string;
}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface MealItem {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodName: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  timestamp: string;
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active';

export interface DailyActivityLog {
  date: string; // YYYY-MM-DD
  activityLevel: ActivityLevel;
  exerciseCalories: number;
  explicitTdee?: number; // Exact daily burn (TDEE) entered by user
  steps?: number;
  notes?: string;
}

export interface UserProfile {
  name: string;
  currentWeightLbs: number;
  startingWeightLbs: number;
  goalWeightLbs: number;
  heightInches: number;
  age: number;
  biologicalSex: 'male' | 'female';
  medication: MedicationType;
  brandName: BrandName;
  doseMg: number;
  shotDayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  targetDailyCalories: number;
  targetDailyProteinGrams: number;
  defaultActivityLevel: ActivityLevel;
  unit: 'lbs' | 'kg';
  treatmentStartDate: string; // YYYY-MM-DD
}

export interface DailySummary {
  date: string;
  intakeCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  bmrCalories: number;
  activityBurnCalories: number;
  exerciseCalories: number;
  totalBurnCalories: number; // TDEE
  deficitCalories: number;
  fatLossLbs: number; // Deficit / 3500
  fatLossGrams: number;
  mealsCount: number;
}

export type GeminiModelId =
  | 'gemini-3.5-flash'
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.1-pro-preview'
  | 'gemini-3.8-flash';

export type ChatbotPersona =
  | 'companion'
  | 'pharmacotherapy'
  | 'gi_symptoms'
  | 'nutrition_muscle';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

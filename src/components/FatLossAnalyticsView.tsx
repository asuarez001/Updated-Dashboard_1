import React, { useState } from 'react';
import { Scale, Flame, Calculator, TrendingDown, Award, Calendar, CheckCircle2, Info, ArrowDownRight, ShieldCheck, Plus, Edit3, Trash2, X } from 'lucide-react';
import { UserProfile, DailySummary, DailyActivityLog, MealItem } from '../types';
import { PURE_FAT_KCAL_PER_LB, PURE_FAT_KCAL_PER_KG } from '../utils/calculations';
import { formatDate } from '../utils/storage';

interface FatLossAnalyticsViewProps {
  summaries: DailySummary[];
  profile: UserProfile;
  activityData: Record<string, DailyActivityLog>;
  meals: MealItem[];
  onSaveDailyInput: (
    date: string,
    dailyBurn: number,
    dailyCalories: number,
    protein: number,
    weight: number,
    steps: number
  ) => void;
  onDeleteDay: (date: string) => void;
}

export const FatLossAnalyticsView: React.FC<FatLossAnalyticsViewProps> = ({
  summaries,
  profile,
  activityData,
  meals,
  onSaveDailyInput,
  onDeleteDay,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputDate, setInputDate] = useState(formatDate(new Date()));
  const [inputBurn, setInputBurn] = useState(2400);
  const [inputCalories, setInputCalories] = useState(1650);
  const [inputProtein, setInputProtein] = useState(140);
  const [inputWeight, setInputWeight] = useState(profile.currentWeightLbs);
  const [inputSteps, setInputSteps] = useState(8500);

  // Sort summaries chronologically
  const sorted = [...summaries].sort((a, b) => a.date.localeCompare(b.date));

  const totalDeficitKcal = sorted.reduce((acc, s) => acc + s.deficitCalories, 0);
  const totalPureFatLbs = totalDeficitKcal / PURE_FAT_KCAL_PER_LB;
  const totalPureFatKg = totalPureFatLbs * 0.45359237;
  const totalPureFatGrams = Math.round(totalPureFatKg * 1000);

  const daysCount = sorted.length || 1;
  const avgDailyDeficit = Math.round(totalDeficitKcal / daysCount);
  const avgDailyFatLossLbs = avgDailyDeficit / PURE_FAT_KCAL_PER_LB;
  const weeklyFatLossLbs = avgDailyFatLossLbs * 7;

  // Actual scale weight change
  const scaleWeightLossLbs = Math.max(0, profile.startingWeightLbs - profile.currentWeightLbs);
  const waterAndGlycogenShiftLbs = Math.max(0, scaleWeightLossLbs - totalPureFatLbs);

  // Remaining to goal weight
  const remainingLbsToGoal = Math.max(0, profile.currentWeightLbs - profile.goalWeightLbs);
  const daysToGoal = avgDailyDeficit > 0 ? Math.round((remainingLbsToGoal * PURE_FAT_KCAL_PER_LB) / avgDailyDeficit) : 0;

  // Lean mass protection metric: Avg protein intake
  const avgProtein = Math.round(sorted.reduce((acc, s) => acc + s.proteinGrams, 0) / daysCount);
  const proteinPreservationScore = Math.min(100, Math.round((avgProtein / profile.targetDailyProteinGrams) * 100));

  const handleOpenEditForDate = (dateStr: string) => {
    setInputDate(dateStr);
    const existingAct = activityData[dateStr];
    if (existingAct) {
      setInputBurn(existingAct.exerciseCalories ? existingAct.exerciseCalories + 2000 : 2400);
      setInputSteps(existingAct.steps || 8500);
    }
    const dayMeals = meals.filter((m) => m.date === dateStr);
    const dayCals = dayMeals.reduce((acc, m) => acc + m.calories, 0);
    const dayProt = dayMeals.reduce((acc, m) => acc + m.protein, 0);
    if (dayCals > 0) setInputCalories(dayCals);
    if (dayProt > 0) setInputProtein(dayProt);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDailyInput(inputDate, inputBurn, inputCalories, inputProtein, inputWeight, inputSteps);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Manual Input Action */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Pure Fat Loss Mathematical Engine & Daily Ledger
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Grounded in thermodynamic energy balance: 1 lb pure human adipose tissue requires exactly 3,500 kcal caloric deficit. Make manual daily entries or delete days below.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setInputDate(formatDate(new Date()));
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-emerald-200" />
            <span>Add / Edit Daily Input</span>
          </button>
        </div>
      </div>

      {/* Hero Cards: Cumulative Deficit & Pure Fat Loss */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Pure Fat Loss */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Calculated Pure Fat Loss
              </span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="my-4">
              <div className="text-4xl font-extrabold tracking-tight text-white">
                {totalPureFatLbs >= 0 ? `-${totalPureFatLbs.toFixed(2)}` : `+${Math.abs(totalPureFatLbs).toFixed(2)}`}
                <span className="text-lg font-medium text-slate-300 ml-1.5">lbs</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {totalPureFatKg.toFixed(2)} kg ({totalPureFatGrams.toLocaleString()} grams) of pure adipose tissue
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Across {daysCount} days of monitored deficit
          </div>
        </div>

        {/* Total Cumulative Deficit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Cumulative Energy Deficit
              </span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="my-4">
              <div className="text-4xl font-extrabold tracking-tight text-slate-900">
                {totalDeficitKcal.toLocaleString()}
                <span className="text-lg font-medium text-slate-500 ml-1.5">kcal</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Average Daily Deficit: <strong>{avgDailyDeficit} kcal/day</strong>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Daily Burn minus Daily Calorie Intake
          </div>
        </div>

        {/* Weekly Burn Velocity & Goal ETA */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Fat Loss Velocity & Pace
              </span>
              <TrendingDown className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="my-4">
              <div className="text-4xl font-extrabold tracking-tight text-emerald-800">
                -{weeklyFatLossLbs.toFixed(2)}
                <span className="text-lg font-medium text-slate-600 ml-1.5">lbs/week</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Estimated Goal Arrival: <strong>~{daysToGoal} days</strong> ({Math.round(daysToGoal / 7)} weeks)
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Targeting {profile.goalWeightLbs} lbs ({remainingLbsToGoal.toFixed(1)} lbs remaining)
          </div>
        </div>
      </div>

      {/* Historical Daily Deficit & Fat Burned Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Daily Energy Deficit & Adipose Loss Ledger</h3>
            <p className="text-xs text-slate-500">Day-by-day thermodynamic calculations with edit and delete controls</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{sorted.length} days recorded</span>
            <button
              onClick={() => {
                setInputDate(formatDate(new Date()));
                setIsModalOpen(true);
              }}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-emerald-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Day</span>
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Daily Burn (TDEE)</th>
                <th className="pb-3 font-semibold">Food Intake</th>
                <th className="pb-3 font-semibold">Protein</th>
                <th className="pb-3 font-semibold">Net Deficit</th>
                <th className="pb-3 font-semibold">Pure Fat Loss (lbs)</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sorted.map((s) => {
                const isDef = s.deficitCalories >= 0;
                return (
                  <tr key={s.date} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-medium text-slate-900 whitespace-nowrap">
                      {s.date}
                    </td>
                    <td className="py-3 font-mono text-slate-800">{s.totalBurnCalories} kcal</td>
                    <td className="py-3 font-mono text-slate-800">{s.intakeCalories} kcal</td>
                    <td className="py-3 font-semibold text-emerald-800">{s.proteinGrams}g</td>
                    <td className="py-3 font-bold">
                      <span className={isDef ? 'text-emerald-700' : 'text-rose-600'}>
                        {isDef ? `+${s.deficitCalories}` : s.deficitCalories} kcal
                      </span>
                    </td>
                    <td className="py-3 font-bold text-slate-900">
                      {s.fatLossLbs >= 0 ? `-${s.fatLossLbs}` : `+${Math.abs(s.fatLossLbs)}`} lbs
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleOpenEditForDate(s.date)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1"
                          title="Edit this day's burn and calories"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete the log for ${s.date} from pure fat loss math?`)) {
                              onDeleteDay(s.date);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1"
                          title="Delete this day"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Daily Input Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Manual Daily Thermodynamic Input</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Date</label>
                <input
                  type="date"
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Daily Burn (TDEE kcal)</label>
                  <input
                    type="number"
                    value={inputBurn}
                    onChange={(e) => setInputBurn(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Daily Calories (Intake)</label>
                  <input
                    type="number"
                    value={inputCalories}
                    onChange={(e) => setInputCalories(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Protein (grams)</label>
                  <input
                    type="number"
                    value={inputProtein}
                    onChange={(e) => setInputProtein(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Scale Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputWeight}
                    onChange={(e) => setInputWeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-medium">Steps Count</label>
                <input
                  type="number"
                  value={inputSteps}
                  onChange={(e) => setInputSteps(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
                >
                  Save Daily Input
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

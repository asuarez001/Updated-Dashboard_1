import React from 'react';
import { Syringe, Scale, Info, CheckCircle2, ChevronRight, Activity, Bot, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';
import { UserProfile, ShotEntry, DailyActivityLog, DailySummary, ActivityLevel } from '../types';
import { calculateEstimatedPlasmaLevel, ACTIVITY_LABELS, ACTIVITY_MULTIPLIERS } from '../utils/calculations';

interface DashboardViewProps {
  summary: DailySummary;
  profile: UserProfile;
  latestShot: ShotEntry | undefined;
  activityLog?: DailyActivityLog;
  cumulativeFatLossLbs: number;
  cumulativeDeficitKcal: number;
  onNavigateTab: (tab: 'dashboard' | 'shots' | 'chat' | 'fatloss') => void;
  onOpenSettings: () => void;
  onUpdateActivityLevel: (level: ActivityLevel) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  profile,
  latestShot,
  activityLog,
  cumulativeFatLossLbs,
  cumulativeDeficitKcal,
  onNavigateTab,
  onOpenSettings,
  onUpdateActivityLevel,
}) => {
  const plasma = calculateEstimatedPlasmaLevel(latestShot, new Date(summary.date + 'T12:00:00'));

  const isDeficit = summary.deficitCalories >= 0;
  const currentActivityLevel = activityLog?.activityLevel || profile.defaultActivityLevel || 'light';
  const activityInfo = ACTIVITY_LABELS[currentActivityLevel];

  const quickPrompts = [
    'Why is Day 2 peak satiety the strongest?',
    'How do I hit my protein goal with reduced appetite?',
    'What should I eat to prevent nausea after injection?',
    'Explain the 3,500 kcal pure fat loss rule',
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if Shot is Due */}
      {plasma.nextShotDueDays <= 0 && latestShot && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
              <Syringe className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">Weekly Injection Due</h4>
              <p className="text-xs text-amber-700">
                It has been 7 days since your last dose of {profile.medication} ({profile.doseMg}mg). Record your injection to maintain steady therapeutic blood levels.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('shots')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors shadow-xs"
          >
            Log Shot
          </button>
        </div>
      )}

      {/* Primary Mathematical Fat Loss & Deficit Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Mathematical Fat Loss Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-500 font-medium">Thermodynamic Energy Balance Model</span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">Calorie Deficit & Pure Fat Loss</h2>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">Physics Constant</span>
                <div className="text-xs font-mono font-medium text-emerald-800">1 lb pure fat = 3,500 kcal</div>
              </div>
            </div>

            {/* Formula visualization */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 my-6 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500">Daily Burn (TDEE)</span>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                  {summary.totalBurnCalories.toLocaleString()} <span className="text-xs text-slate-500">kcal</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  BMR ({summary.bmrCalories}) + Activity ({summary.activityBurnCalories + summary.exerciseCalories})
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 relative">
                <div className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg sm:text-xl">
                  −
                </div>
                <span className="text-xs text-slate-500">Daily Calorie Target</span>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                  {profile.targetDailyCalories.toLocaleString()} <span className="text-xs text-slate-500">kcal</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Target intake
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${isDeficit ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
                <span className="text-xs font-medium text-slate-600">Net Energy Deficit</span>
                <div className={`text-xl sm:text-2xl font-extrabold mt-1 ${isDeficit ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {summary.deficitCalories.toLocaleString()} <span className="text-xs font-normal">kcal</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {isDeficit ? 'Fat burning state' : 'Surplus day'}
                </div>
              </div>
            </div>

            {/* Daily Fat Loss Output */}
            <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-300 font-medium">Expected Pure Adipose Oxidation Rate</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    -{((summary.totalBurnCalories - profile.targetDailyCalories) / 3500).toFixed(2)}
                  </span>
                  <span className="text-sm text-slate-300 font-medium">lbs pure fat / day</span>
                  <span className="text-xs text-slate-400">
                    (~{Math.round(((summary.totalBurnCalories - profile.targetDailyCalories) / 3500) * 7 * 10) / 10} lbs / week)
                  </span>
                </div>
              </div>

              <div className="sm:border-l sm:border-slate-800 sm:pl-6 text-left sm:text-right">
                <span className="text-xs text-slate-400">Total Program Target</span>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">
                  {(profile.startingWeightLbs - profile.goalWeightLbs).toFixed(1)} lbs to goal
                </div>
                <div className="text-[11px] text-slate-400">
                  Current: {profile.currentWeightLbs} lbs → Goal: {profile.goalWeightLbs} lbs
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              Calculated purely from thermodynamic energy deficit (3,500 kcal per pound of pure fat).
            </span>
            <button
              onClick={() => onNavigateTab('fatloss')}
              className="text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
            >
              <span>Detailed Science & Math</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* GLP-1 Pharmacokinetic Status & Shot Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Syringe className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-slate-900 text-sm">GLP-1 Weekly Shot Hub</h3>
              </div>
              <span className="text-xs font-mono font-medium text-emerald-700">
                {profile.doseMg} mg
              </span>
            </div>

            {!latestShot ? (
              <div className="my-4 py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-3 p-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                  <Syringe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">No Injections Logged</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Record your weekly dose to start tracking blood plasma concentration and site rotation.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('shots')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Log First Injection
                </button>
              </div>
            ) : (
              <div className="my-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Medication</span>
                  <span className="font-medium text-slate-800">{profile.medication} ({profile.brandName})</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Current Cycle</span>
                  <span className="font-medium text-slate-800">Day {Math.floor(plasma.daysSinceShot)} of 7</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Estimated Active Drug</span>
                  <span className="font-bold text-emerald-700">{plasma.relativeLevelPct}% concentration</span>
                </div>

                {/* Mini Curved Graph Showing Highs and Lows by Date */}
                {(() => {
                  const shotTime = new Date(latestShot.timestamp);
                  const peakTime = new Date(shotTime);
                  peakTime.setDate(shotTime.getDate() + 2);
                  const dueTime = new Date(shotTime);
                  dueTime.setDate(shotTime.getDate() + 7);

                  const currentDayClamped = Math.min(7, Math.max(0, plasma.daysSinceShot));
                  const currentX = 20 + currentDayClamped * (260 / 7);
                  const currentY = 55 - (plasma.relativeLevelPct / 100) * 45;

                  const peakFormatted = peakTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const dueFormatted = dueTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const shotFormatted = shotTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                  return (
                    <div className="space-y-2 pt-1">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span className="font-medium text-emerald-800">
                            ▲ High: {peakFormatted} (100%)
                          </span>
                          <span className="font-medium text-slate-600">
                            ▼ Low: {dueFormatted} (38%)
                          </span>
                        </div>

                        <svg viewBox="0 0 300 70" className="w-full h-16 overflow-visible">
                          <defs>
                            <linearGradient id="miniPlasmaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Baseline */}
                          <line x1="15" y1="58" x2="285" y2="58" stroke="#e2e8f0" strokeWidth="1" />

                          {/* Curved path: Day 0 (40%), Day 2 (100%), Day 7 (38%) */}
                          <path
                            d="M 20 40 C 45 25, 75 10, 94 10 C 130 10, 180 28, 220 42 C 250 50, 270 54, 280 55"
                            fill="none"
                            stroke="#059669"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M 20 40 C 45 25, 75 10, 94 10 C 130 10, 180 28, 220 42 C 250 50, 270 54, 280 55 L 280 58 L 20 58 Z"
                            fill="url(#miniPlasmaGrad)"
                          />

                          {/* High Point Marker */}
                          <circle cx="94" cy="10" r="3.5" fill="#047857" stroke="#ffffff" strokeWidth="1.5" />
                          <text x="94" y="6" textAnchor="middle" className="text-[7px] fill-emerald-800 font-bold">
                            HIGH
                          </text>

                          {/* Low Point Marker */}
                          <circle cx="280" cy="55" r="3.5" fill="#b91c1c" stroke="#ffffff" strokeWidth="1.5" />
                          <text x="280" y="67" textAnchor="middle" className="text-[7px] fill-rose-700 font-bold">
                            LOW
                          </text>

                          {/* Current Day Pointer */}
                          <circle cx={currentX} cy={currentY} r="4" fill="#064e3b" stroke="#ffffff" strokeWidth="1.5" className="animate-pulse" />
                        </svg>

                        <div className="flex justify-between text-[9px] text-slate-500 pt-1 font-mono">
                          <span>{shotFormatted} (Shot)</span>
                          <span className="text-emerald-800 font-semibold">{peakFormatted} (Peak)</span>
                          <span>{dueFormatted} (Due)</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                  <span className="font-medium text-slate-800">Phase Note: </span>
                  {plasma.statusText}
                </div>

                <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
                  <span>Last Injection Site:</span>
                  <span className="font-medium text-slate-700">{latestShot.injectionSite}</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('shots')}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <span>View 30-Day Ebbs & Flows Hub</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 2: Metabolic Expenditure (TDEE) Card & Gemini Chatbot Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metabolic Expenditure (TDEE) Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Metabolic Expenditure (TDEE)</h3>
              </div>
              <span className="text-[11px] text-slate-500">
                {activityInfo.label}
              </span>
            </div>

            <div className="my-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-500 font-medium">Basal Metabolic Rate</span>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {summary.bmrCalories} <span className="text-xs font-normal">kcal</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Mifflin-St Jeor</span>
                </div>

                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                  <span className="text-[11px] text-emerald-800 font-medium">Activity & Movement</span>
                  <div className="text-lg font-bold text-emerald-900 mt-0.5">
                    +{summary.activityBurnCalories + summary.exerciseCalories} <span className="text-xs font-normal">kcal</span>
                  </div>
                  <span className="text-[10px] text-emerald-600">Daily movement</span>
                </div>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Daily Burn (TDEE)</span>
                  <span className="font-bold text-slate-900">{summary.totalBurnCalories.toLocaleString()} kcal</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Activity Multiplier</span>
                  <select
                    value={currentActivityLevel}
                    onChange={(e) => onUpdateActivityLevel(e.target.value as ActivityLevel)}
                    className="px-2 py-1 border border-slate-200 rounded-lg text-slate-800 font-semibold bg-white text-xs"
                  >
                    {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {ACTIVITY_LABELS[lvl].label} ({ACTIVITY_MULTIPLIERS[lvl]}×)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Protein Target (Muscle Guard)</span>
                  <span className="font-semibold text-emerald-800">{profile.targetDailyProteinGrams}g / day</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Update Biometric Settings</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Pulse AI Gemini Chatbot Companion Hero Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-900 text-base">Pulse AI Clinical Chatbot</h3>
              </div>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Multi-Turn Gemini Assistant
              </span>
            </div>

            <div className="my-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Have questions about your <strong>{profile.medication} ({profile.brandName} {profile.doseMg}mg)</strong> protocol, managing peak nausea, muscle preservation, or why scale weight fluctuates? Ask your dedicated clinical companion.
              </p>

              {/* Quick Questions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {quickPrompts.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onNavigateTab('chat')}
                    className="p-2.5 text-left bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-200 rounded-xl text-xs text-slate-700 hover:text-emerald-900 transition-colors flex items-center justify-between group"
                  >
                    <span className="font-medium truncate mr-2">{q}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              Supports Gemini 3.5 Flash, 3.1 Flash Lite, and 3.1 Pro Preview
            </span>
            <button
              onClick={() => onNavigateTab('chat')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>Open Gemini Chatbot</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

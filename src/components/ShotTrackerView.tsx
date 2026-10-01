import React, { useState, useMemo } from 'react';
import { Syringe, Calendar, CheckCircle2, Clock, MapPin, Plus, Trash2, ShieldCheck, ChevronRight, TrendingUp, Sparkles, AlertCircle, Waves } from 'lucide-react';
import { UserProfile, ShotEntry, InjectionSite, MedicationType, BrandName } from '../types';
import { calculateEstimatedPlasmaLevel } from '../utils/calculations';
import { formatDate } from '../utils/storage';

interface ShotTrackerViewProps {
  profile: UserProfile;
  shots: ShotEntry[];
  onAddShot: (shot: ShotEntry) => void;
  onDeleteShot: (id: string) => void;
  onUpdateProfile: (profile: UserProfile) => void;
}

const INJECTION_SITES: InjectionSite[] = [
  'Abdomen - Left Lower',
  'Abdomen - Right Lower',
  'Abdomen - Left Upper',
  'Abdomen - Right Upper',
  'Thigh - Left',
  'Thigh - Right',
  'Arm - Left Outer',
  'Arm - Right Outer',
];

const SIDE_EFFECT_OPTIONS = [
  'None',
  'Mild Nausea',
  'Moderate Nausea',
  'Fatigue',
  'Constipation',
  'Acid Reflux',
  'Headache',
  'Sulfur Burps',
  'Injection Site Redness',
];

export const ShotTrackerView: React.FC<ShotTrackerViewProps> = ({
  profile,
  shots,
  onAddShot,
  onDeleteShot,
  onUpdateProfile,
}) => {
  const latestShot = shots[0];
  const plasma = calculateEstimatedPlasmaLevel(latestShot);

  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [isLoggingModalOpen, setIsLoggingModalOpen] = useState(false);
  const [doseMg, setDoseMg] = useState(profile.doseMg);
  const [shotDate, setShotDate] = useState(formatDate(new Date()));
  const [shotTime, setShotTime] = useState('09:00');
  const [selectedSite, setSelectedSite] = useState<InjectionSite>(
    latestShot?.injectionSite === 'Abdomen - Left Lower'
      ? 'Abdomen - Right Lower'
      : latestShot?.injectionSite === 'Abdomen - Right Lower'
      ? 'Thigh - Left'
      : 'Abdomen - Left Lower'
  );
  const [satietyScore, setSatietyScore] = useState(8);
  const [selectedSideEffects, setSelectedSideEffects] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const toggleSideEffect = (effect: string) => {
    if (effect === 'None') {
      setSelectedSideEffects(['None']);
      return;
    }
    const filtered = selectedSideEffects.filter((e) => e !== 'None');
    if (filtered.includes(effect)) {
      setSelectedSideEffects(filtered.filter((e) => e !== effect));
    } else {
      setSelectedSideEffects([...filtered, effect]);
    }
  };

  const handleSaveShot = (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = new Date(`${shotDate}T${shotTime}:00`).toISOString();
    const newEntry: ShotEntry = {
      id: `shot-${Date.now()}`,
      timestamp,
      medication: profile.medication,
      brandName: profile.brandName,
      doseMg,
      injectionSite: selectedSite,
      satietyScore,
      sideEffects: selectedSideEffects.length > 0 ? selectedSideEffects : ['None'],
      notes,
    };

    onAddShot(newEntry);
    setIsLoggingModalOpen(false);
    setNotes('');
  };

  // Recommend next site rotation
  const getNextRecommendedSite = (currentSite?: InjectionSite): InjectionSite => {
    if (!currentSite) return 'Abdomen - Left Lower';
    const idx = INJECTION_SITES.indexOf(currentSite);
    const nextIdx = (idx + 1) % INJECTION_SITES.length;
    return INJECTION_SITES[nextIdx];
  };

  const recommendedSite = getNextRecommendedSite(latestShot?.injectionSite);

  // Compute 30-Day continuous timeline of Ebbs and Flows by actual calendar date
  const thirtyDayData = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // 30 days: from 25 days ago through today and 4 days of projection into the next dose
    const daysArray = [];
    const totalDays = 30;
    const startOffset = -25; // 25 days in the past, 4 days in the future

    // Sort shots chronologically
    const sortedShots = [...shots].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const isTirz = profile.medication === 'Tirzepatide';
    const halfLifeDays = isTirz ? 5 : 7;
    const k = Math.LN2 / halfLifeDays;

    for (let i = 0; i < totalDays; i++) {
      const dayOffset = startOffset + i;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);

      const targetTime = targetDate.getTime();
      const isToday = dayOffset === 0;

      // Calculate drug concentration from all preceding doses
      let cumulativeConcentration = 0;
      let closestShot: ShotEntry | null = null;
      let minDiffDays = 999;
      let isShotDay = false;

      sortedShots.forEach((shot) => {
        const shotTime = new Date(shot.timestamp).setHours(12, 0, 0, 0);
        const diffDays = (targetTime - shotTime) / (1000 * 60 * 60 * 24);

        if (Math.abs(diffDays) < 0.5) {
          isShotDay = true;
        }

        if (diffDays >= 0 && diffDays < 28) {
          // Accumulation formula for this dose
          let singleDoseLevel = 0;
          if (diffDays < 2) {
            // Absorption phase
            singleDoseLevel = 40 + (diffDays / 2) * 60;
          } else {
            // Elimination decay
            singleDoseLevel = 100 * Math.exp(-k * (diffDays - 2));
          }

          // Dose weight scaling (e.g. 5mg vs 2.5mg)
          const doseScale = shot.doseMg / (profile.doseMg || 5.0);
          cumulativeConcentration += singleDoseLevel * doseScale * 0.72;

          if (diffDays < minDiffDays) {
            minDiffDays = diffDays;
            closestShot = shot;
          }
        }
      });

      // If no shots recorded, level is 0
      const finalLevel = sortedShots.length === 0 ? 0 : Math.min(100, Math.max(0, Math.round(cumulativeConcentration)));

      const weekday = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      daysArray.push({
        index: i,
        dayOffset,
        dateObj: targetDate,
        dateStr: monthDay,
        weekday,
        fullDate: `${weekday}, ${monthDay}`,
        level: finalLevel,
        isToday,
        isShotDay,
        closestShot,
        daysFromLastShot: minDiffDays < 900 ? Math.round(minDiffDays) : null,
      });
    }

    // Identify local peaks (Flows / Highs) and local troughs (Ebbs / Lows)
    const processed = daysArray.map((day, idx, arr) => {
      const prev = arr[idx - 1]?.level ?? day.level;
      const next = arr[idx + 1]?.level ?? day.level;

      const isFlowPeak = day.level >= prev && day.level >= next && day.level >= 75;
      const isEbbTrough = day.level <= prev && day.level <= next && day.level <= 55;

      return {
        ...day,
        isFlowPeak,
        isEbbTrough,
        x: 45 + idx * (790 / (totalDays - 1)),
        y: 195 - (day.level / 100) * 145,
      };
    });

    return processed;
  }, [shots, profile.medication, profile.doseMg]);

  // Construct smooth SVG path across 30 days
  const { linePath, areaPath } = useMemo(() => {
    if (thirtyDayData.length === 0) return { linePath: '', areaPath: '' };

    let d = `M ${thirtyDayData[0].x.toFixed(1)} ${thirtyDayData[0].y.toFixed(1)}`;

    for (let i = 0; i < thirtyDayData.length - 1; i++) {
      const p1 = thirtyDayData[i];
      const p2 = thirtyDayData[i + 1];
      const midX = (p1.x + p2.x) / 2;
      d += ` Q ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}, ${midX.toFixed(1)} ${((p1.y + p2.y) / 2).toFixed(1)}`;
    }

    const last = thirtyDayData[thirtyDayData.length - 1];
    d += ` T ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

    const area = `${d} L ${last.x.toFixed(1)} 195 L ${thirtyDayData[0].x.toFixed(1)} 195 Z`;

    return { linePath: d, areaPath: area };
  }, [thirtyDayData]);

  // Calculate Highs & Lows summary
  const flowPeaks = thirtyDayData.filter((d) => d.isFlowPeak);
  const ebbTroughs = thirtyDayData.filter((d) => d.isEbbTrough);
  const todayPoint = thirtyDayData.find((d) => d.isToday) || thirtyDayData[25];
  const activeHover = hoveredDayIndex !== null ? thirtyDayData[hoveredDayIndex] : todayPoint;

  return (
    <div className="space-y-6">
      {/* Top Shot Summary Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Active Protocol
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">Weekly Subcutaneous Injection</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {profile.medication} ({profile.brandName}) — {profile.doseMg} mg
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Elapsed: <strong>Day {plasma.daysSinceShot}</strong> of 7</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Next dose in <strong>{plasma.nextShotDueDays} days</strong></span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Recommended site: <strong className="text-emerald-800">{recommendedSite}</strong></span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedSite(recommendedSite);
                setIsLoggingModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs flex items-center gap-2"
            >
              <Syringe className="w-4 h-4 text-emerald-200" />
              <span>Log Weekly Shot</span>
            </button>
          </div>
        </div>
      </div>

      {/* 30-DAY EBBS & FLOWS CURVED GRAPH */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Waves className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">
                30-Day Pharmacokinetic Ebbs & Flows Timeline
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Continuous 30-day wave tracking steady-state saturation, weekly Flow peaks (maximum satiety), and Ebb troughs (dose clearance) by calendar date
            </p>
          </div>

          {/* Quick Legend Tags */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="font-bold text-emerald-900">Flow Peak (High):</span>
              <span className="text-emerald-800 font-semibold">{flowPeaks.length} recorded</span>
            </div>

            <div className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <span className="font-bold text-amber-900">Ebb Trough (Low):</span>
              <span className="text-amber-800 font-semibold">{ebbTroughs.length} recorded</span>
            </div>

            <div className="px-2.5 py-1 bg-slate-900 text-white rounded-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-bold">Today:</span>
              <span className="text-emerald-300 font-mono">{todayPoint.dateStr} ({todayPoint.level}%)</span>
            </div>
          </div>
        </div>

        {shots.length === 0 ? (
          <div className="py-12 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Waves className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">No Injections Recorded Yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Once you record your weekly GLP-1 injection, this chart will map out your exact 30-day pharmacokinetic ebbs & flows curve, peak satiety dates, and clearance troughs.
              </p>
            </div>
            <button
              onClick={() => setIsLoggingModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs inline-flex items-center gap-2"
            >
              <Syringe className="w-4 h-4 text-emerald-200" />
              <span>Log First Injection</span>
            </button>
          </div>
        ) : (
          <>
            {/* The 30-Day Continuous Curved SVG Graph */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 overflow-x-auto">
          <div className="min-w-[840px]">
            <svg viewBox="0 0 880 250" className="w-full h-64 overflow-visible">
              <defs>
                <linearGradient id="ebbsFlowsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="65%" stopColor="#10b981" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="flowingCurveStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="35%" stopColor="#10b981" />
                  <stop offset="70%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
              </defs>

              {/* Horizontal Concentration Gridlines */}
              {[
                { label: '100% Saturation', y: 50 },
                { label: '75%', y: 86.25 },
                { label: '50% (Therapeutic Satiety Baseline)', y: 122.5 },
                { label: '25%', y: 158.75 },
                { label: '0%', y: 195 },
              ].map((grid, idx) => (
                <g key={idx}>
                  <line
                    x1="45"
                    y1={grid.y}
                    x2="835"
                    y2={grid.y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray={grid.label.includes('Therapeutic') ? '5 4' : 'none'}
                  />
                  <text
                    x="40"
                    y={grid.y + 3}
                    textAnchor="end"
                    className="text-[9px] fill-slate-400 font-mono"
                  >
                    {grid.label}
                  </text>
                </g>
              ))}

              {/* Shaded Target Therapeutic Zone (&gt;50%) */}
              <rect
                x="45"
                y="50"
                width="790"
                height="72.5"
                fill="#10b981"
                opacity="0.03"
              />
              <text
                x="830"
                y="118"
                textAnchor="end"
                className="text-[9px] fill-emerald-800 font-semibold"
              >
                Target Satiety Range (&gt;50%)
              </text>

              {/* Gradient Area Fill under the 30-Day Wave */}
              <path d={areaPath} fill="url(#ebbsFlowsGradient)" />

              {/* Main Smooth Continuous Wave Line */}
              <path
                d={linePath}
                fill="none"
                stroke="url(#flowingCurveStroke)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Highs (Flow Peaks) Callout Pins */}
              {flowPeaks.map((peak, idx) => (
                <g key={`peak-${idx}`}>
                  <line x1={peak.x} y1={peak.y} x2={peak.x} y2="195" stroke="#10b981" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                  <rect
                    x={peak.x - 34}
                    y={Math.max(10, peak.y - 32)}
                    width="68"
                    height="20"
                    rx="5"
                    fill="#064e3b"
                  />
                  <text
                    x={peak.x}
                    y={Math.max(10, peak.y - 32) + 13}
                    textAnchor="middle"
                    className="text-[8px] fill-white font-extrabold tracking-tight"
                  >
                    ▲ FLOW {peak.level}%
                  </text>
                  <circle cx={peak.x} cy={peak.y} r="5" fill="#047857" stroke="#ffffff" strokeWidth="2" />
                </g>
              ))}

              {/* Lows (Ebb Troughs) Callout Pins */}
              {ebbTroughs.map((trough, idx) => (
                <g key={`trough-${idx}`}>
                  <line x1={trough.x} y1={trough.y} x2={trough.x} y2="195" stroke="#d97706" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                  <rect
                    x={trough.x - 30}
                    y={Math.min(170, trough.y + 8)}
                    width="60"
                    height="18"
                    rx="4"
                    fill="#78350f"
                  />
                  <text
                    x={trough.x}
                    y={Math.min(170, trough.y + 8) + 12}
                    textAnchor="middle"
                    className="text-[8px] fill-amber-100 font-extrabold"
                  >
                    ▼ EBB {trough.level}%
                  </text>
                  <circle cx={trough.x} cy={trough.y} r="4.5" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
                </g>
              ))}

              {/* Weekly Shot Injection Flags */}
              {thirtyDayData.filter((d) => d.isShotDay).map((shotDay, idx) => (
                <g key={`shot-${idx}`}>
                  <line x1={shotDay.x} y1="40" x2={shotDay.x} y2="195" stroke="#059669" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
                  <circle cx={shotDay.x} cy="38" r="7" fill="#059669" />
                  <text x={shotDay.x} y="41" textAnchor="middle" className="text-[8px] fill-white font-bold">
                    💉
                  </text>
                </g>
              ))}

              {/* Today "You Are Here" Marker */}
              {todayPoint && (
                <g className="cursor-pointer">
                  <line x1={todayPoint.x} y1="35" x2={todayPoint.x} y2="195" stroke="#047857" strokeWidth="2" strokeDasharray="3 3" />
                  <circle cx={todayPoint.x} cy={todayPoint.y} r="12" fill="#10b981" opacity="0.3" className="animate-pulse" />
                  <circle cx={todayPoint.x} cy={todayPoint.y} r="6.5" fill="#064e3b" stroke="#ffffff" strokeWidth="2.5" />
                  <rect
                    x={Math.max(50, Math.min(todayPoint.x - 48, 740))}
                    y={Math.max(8, todayPoint.y - 36)}
                    width="96"
                    height="22"
                    rx="6"
                    fill="#0f172a"
                  />
                  <text
                    x={Math.max(50, Math.min(todayPoint.x - 48, 740)) + 48}
                    y={Math.max(8, todayPoint.y - 36) + 15}
                    textAnchor="middle"
                    className="text-[10px] fill-white font-extrabold"
                  >
                    📍 Today ({todayPoint.level}%)
                  </text>
                </g>
              )}

              {/* 30-Day Timeline Interactive Nodes & Date Ticks */}
              {thirtyDayData.map((pt, idx) => {
                const isHovered = hoveredDayIndex === idx;
                // Show date label every 3-4 days or if it is a shot day / today / peak / trough
                const showDateTick = idx % 3 === 0 || pt.isToday || pt.isShotDay;

                return (
                  <g
                    key={pt.index}
                    onMouseEnter={() => setHoveredDayIndex(idx)}
                    onMouseLeave={() => setHoveredDayIndex(null)}
                    className="cursor-pointer"
                  >
                    {/* Invisible wider hover hit target */}
                    <rect x={pt.x - 12} y="35" width="24" height="175" fill="transparent" />

                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 7.5 : pt.isToday ? 5 : 3}
                      fill={isHovered ? '#047857' : pt.isToday ? '#064e3b' : pt.isFlowPeak ? '#059669' : pt.isEbbTrough ? '#d97706' : '#ffffff'}
                      stroke={pt.isEbbTrough ? '#b45309' : '#059669'}
                      strokeWidth="2"
                      className="transition-all"
                    />

                    {/* Date Ticks on X-Axis */}
                    {showDateTick && (
                      <g>
                        <line x1={pt.x} y1="195" x2={pt.x} y2="201" stroke="#cbd5e1" strokeWidth="1" />
                        <text
                          x={pt.x}
                          y="214"
                          textAnchor="middle"
                          className={`text-[9px] font-semibold transition-colors ${
                            pt.isToday
                              ? 'fill-emerald-800 font-extrabold'
                              : pt.isShotDay
                              ? 'fill-slate-900 font-bold'
                              : 'fill-slate-500'
                          }`}
                        >
                          {pt.dateStr}
                        </text>
                        <text
                          x={pt.x}
                          y="226"
                          textAnchor="middle"
                          className={`text-[8px] ${pt.isToday ? 'fill-emerald-700 font-bold' : 'fill-slate-400'}`}
                        >
                          {pt.weekday}
                        </text>
                        {pt.isToday && (
                          <text x={pt.x} y="238" textAnchor="middle" className="text-[8px] fill-emerald-800 font-extrabold">
                            (Today)
                          </text>
                        )}
                        {pt.isShotDay && !pt.isToday && (
                          <text x={pt.x} y="238" textAnchor="middle" className="text-[8px] fill-slate-700 font-semibold">
                            (Shot)
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Interactive 30-Day Day Inspection Card */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-slate-800 leading-relaxed flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm">
                {activeHover.fullDate}
              </span>
              <span className="text-slate-300">·</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white text-emerald-900 border border-emerald-300">
                {activeHover.level}% Blood Concentration
              </span>
              {activeHover.isFlowPeak && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white">
                  ▲ Flow Peak (High)
                </span>
              )}
              {activeHover.isEbbTrough && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-700 text-white">
                  ▼ Ebb Trough (Low)
                </span>
              )}
              {activeHover.isShotDay && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white">
                  💉 Shot Day
                </span>
              )}
            </div>

            <p className="text-slate-600 text-xs">
              {activeHover.isFlowPeak
                ? 'Weekly Flow Peak (High Saturation): Maximum appetite blockade, slowest gastric emptying. Ensure portion control and eat protein first.'
                : activeHover.isEbbTrough
                ? 'Weekly Ebb Trough (Clearance Low): Medication reaches its weekly nadir before injection. Mild appetite cues return; sustain your dietary plan.'
                : activeHover.level >= 50
                ? 'Target Therapeutic Plateau: Consistent blood concentration maintaining steady metabolic regulation.'
                : 'Initial Titration Window: Baseline concentration building progressively toward steady state.'}
            </p>
          </div>

          <div className="shrink-0 text-left sm:text-right border-t sm:border-t-0 sm:border-l sm:border-emerald-200 pt-2 sm:pt-0 sm:pl-4">
            <span className="text-[11px] text-slate-500 block">30-Day Therapeutic Health:</span>
            <span className="font-bold text-emerald-900 text-sm">
              {thirtyDayData.filter((d) => d.level >= 50).length} of 30 Days &gt;50%
            </span>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Injection Site Rotation & Tissue Health Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Site Rotation & Tissue Health</h3>
            <p className="text-xs text-slate-500">Rotate weekly to prevent lipohypertrophy and ensure consistent drug absorption</p>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
        </div>

        <div className="space-y-3">
          <span className="text-xs font-medium text-slate-700 block">Subcutaneous Injection Zones:</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {INJECTION_SITES.map((site) => {
              const isLast = latestShot?.injectionSite === site;
              const isNext = recommendedSite === site;

              return (
                <div
                  key={site}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    isLast
                      ? 'bg-slate-100 border-slate-300 text-slate-800 font-medium'
                      : isNext
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold ring-1 ring-emerald-300'
                      : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{site}</span>
                    {isLast && <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded-sm">Last used</span>}
                    {isNext && <span className="text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded-sm font-bold">Next</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800 block">Rotation Best Practice:</span>
            <p>
              Inject at least 2 inches away from your belly button. Rotate between quadrants or alternate to thigh/outer arm if you experience injection-site skin sensitivity or GI symptoms.
            </p>
          </div>
        </div>
      </div>

      {/* Shot History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">Injection History</h3>
            <p className="text-xs text-slate-500">Chronological record of all GLP-1 doses, sites, and symptoms</p>
          </div>
          <span className="text-xs text-slate-500">{shots.length} recorded shots</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">Date & Time</th>
                <th className="pb-3 font-semibold">Medication & Dose</th>
                <th className="pb-3 font-semibold">Injection Site</th>
                <th className="pb-3 font-semibold">Satiety (1-10)</th>
                <th className="pb-3 font-semibold">Side Effects</th>
                <th className="pb-3 font-semibold">Notes</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {shots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No injection records logged yet. Click &quot;Log Weekly Shot&quot; above to add your first injection.
                  </td>
                </tr>
              ) : (
                shots.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-medium text-slate-900 whitespace-nowrap">
                      {new Date(s.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      <span className="text-slate-400 font-normal">
                        {new Date(s.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-emerald-800 whitespace-nowrap">
                      {s.medication} {s.doseMg}mg
                    </td>
                    <td className="py-3 text-slate-700 whitespace-nowrap">{s.injectionSite}</td>
                    <td className="py-3 font-semibold text-slate-900">{s.satietyScore}/10</td>
                    <td className="py-3">
                      <span className="text-slate-600">
                        {s.sideEffects && s.sideEffects.length > 0 ? s.sideEffects.join(', ') : 'None'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 max-w-xs truncate">{s.notes || '—'}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onDeleteShot(s.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Shot Modal */}
      {isLoggingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Syringe className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-lg">Log Weekly Injection</h3>
              </div>
              <button
                onClick={() => setIsLoggingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveShot} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    value={shotDate}
                    onChange={(e) => setShotDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Time</label>
                  <input
                    type="time"
                    value={shotTime}
                    onChange={(e) => setShotTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Dose Strength (mg)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[2.5, 5.0, 7.5, 10.0, 12.5, 15.0].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDoseMg(d)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        doseMg === d
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d} mg
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step="0.05"
                  value={doseMg}
                  onChange={(e) => setDoseMg(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                  placeholder="Custom mg"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Injection Site</label>
                <select
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value as InjectionSite)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                >
                  {INJECTION_SITES.map((site) => (
                    <option key={site} value={site}>
                      {site} {site === recommendedSite ? ' (Recommended Rotation)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-medium text-slate-700">Anticipated / Current Satiety (1-10)</label>
                  <span className="font-bold text-emerald-800">{satietyScore}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={satietyScore}
                  onChange={(e) => setSatietyScore(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>1 (Normal Appetite)</span>
                  <span>5 (Moderate)</span>
                  <span>10 (Full Appetite Blockade)</span>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Observed Side Effects</label>
                <div className="flex flex-wrap gap-1.5">
                  {SIDE_EFFECT_OPTIONS.map((effect) => {
                    const isSelected = selectedSideEffects.includes(effect);
                    return (
                      <button
                        key={effect}
                        type="button"
                        onClick={() => toggleSideEffect(effect)}
                        className={`px-2.5 py-1 rounded-md border text-[11px] transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {effect}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Clinical Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Switched to thigh site, drinking extra electrolytes, feeling energized."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-xs h-20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLoggingModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-xs"
                >
                  Save Injection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Settings as SettingsIcon, Syringe, Scale, Activity, CheckCircle2, User } from 'lucide-react';
import { UserProfile, MedicationType, BrandName, ActivityLevel } from '../types';
import { ACTIVITY_LABELS, ACTIVITY_MULTIPLIERS } from '../utils/calculations';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

const MEDICATIONS: Array<{ med: MedicationType; brands: BrandName[] }> = [
  { med: 'Tirzepatide', brands: ['Zepbound', 'Mounjaro', 'Compounded', 'Other'] },
  { med: 'Semaglutide', brands: ['Wegovy', 'Ozempic', 'Rybelsus', 'Compounded', 'Other'] },
  { med: 'Liraglutide', brands: ['Saxenda', 'Other'] },
  { med: 'Retatrutide', brands: ['Other'] },
];

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [formData, setFormData] = useState<UserProfile>(profile);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    onClose();
  };

  const selectedMedObj = MEDICATIONS.find((m) => m.med === formData.medication) || MEDICATIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-base">User Protocol & Algorithm Settings</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* User Profile Details */}
          <div className="space-y-3 pb-3 border-b border-slate-100">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Biometric Profile</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Your Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-medium">Biological Sex (for BMR Math)</label>
                <select
                  value={formData.biologicalSex}
                  onChange={(e) => setFormData({ ...formData, biologicalSex: e.target.value as 'male' | 'female' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="male">Male (+5 kcal Mifflin baseline)</option>
                  <option value="female">Female (-161 kcal Mifflin baseline)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Current Weight (lbs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.currentWeightLbs}
                  onChange={(e) => setFormData({ ...formData, currentWeightLbs: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                  required
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Starting Weight (lbs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.startingWeightLbs}
                  onChange={(e) => setFormData({ ...formData, startingWeightLbs: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Goal Weight (lbs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.goalWeightLbs}
                  onChange={(e) => setFormData({ ...formData, goalWeightLbs: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-semibold text-emerald-800"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Height (inches, e.g. 71 = 5'11")</label>
                <input
                  type="number"
                  value={formData.heightInches}
                  onChange={(e) => setFormData({ ...formData, heightInches: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                  required
                />
              </div>
            </div>
          </div>

          {/* GLP-1 Protocol */}
          <div className="space-y-3 pb-3 border-b border-slate-100">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Syringe className="w-3.5 h-3.5 text-emerald-600" />
              <span>GLP-1 Medication Protocol</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Active Medication</label>
                <select
                  value={formData.medication}
                  onChange={(e) => {
                    const newMed = e.target.value as MedicationType;
                    const matched = MEDICATIONS.find((m) => m.med === newMed);
                    setFormData({
                      ...formData,
                      medication: newMed,
                      brandName: matched?.brands[0] || 'Other',
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                >
                  {MEDICATIONS.map((m) => (
                    <option key={m.med} value={m.med}>
                      {m.med}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-medium">Brand / Formulation</label>
                <select
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value as BrandName })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                >
                  {selectedMedObj.brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Current Dose (mg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.doseMg}
                  onChange={(e) => setFormData({ ...formData, doseMg: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-semibold text-emerald-800"
                  required
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-medium">Standard Injection Day (0=Sun...6=Sat)</label>
                <select
                  value={formData.shotDayOfWeek}
                  onChange={(e) => setFormData({ ...formData, shotDayOfWeek: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                >
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => (
                    <option key={day} value={idx}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Caloric & Protein Targets */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-blue-600" />
              <span>Thermodynamic & Protein Targets</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Target Daily Calories (Intake)</label>
                <input
                  type="number"
                  value={formData.targetDailyCalories}
                  onChange={(e) => setFormData({ ...formData, targetDailyCalories: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-medium">Target Daily Protein (grams)</label>
                <input
                  type="number"
                  value={formData.targetDailyProteinGrams}
                  onChange={(e) => setFormData({ ...formData, targetDailyProteinGrams: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-semibold text-emerald-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-slate-600 block mb-1 font-medium">Default Activity Level</label>
              <select
                value={formData.defaultActivityLevel}
                onChange={(e) => setFormData({ ...formData, defaultActivityLevel: e.target.value as ActivityLevel })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
              >
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {ACTIVITY_LABELS[lvl].label} ({ACTIVITY_MULTIPLIERS[lvl]}× BMR)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Protocol Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

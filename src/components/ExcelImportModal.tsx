import React, { useState } from 'react';
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertCircle, X, Sparkles, ArrowRight } from 'lucide-react';
import { UserProfile, MealItem, DailyActivityLog } from '../types';
import { parseExcelDataFile, generateSampleExcelTemplate, ParsedExcelImport } from '../utils/excelImport';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onImportMeals: (meals: MealItem[]) => void;
  onImportActivity: (activityData: Record<string, DailyActivityLog>) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  onImportMeals,
  onImportActivity,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedExcelImport | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsParsing(true);

    try {
      const result = await parseExcelDataFile(selected);
      setParsedResult(result);
    } catch (err: any) {
      console.error('Excel parse error:', err);
      setErrorMsg(err.message || 'Failed to parse Excel document. Ensure columns include Date, DailyBurn, and DailyCalories.');
      setParsedResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedResult) return;

    // Apply profile updates if any
    if (parsedResult.profileUpdates && Object.keys(parsedResult.profileUpdates).length > 0) {
      onUpdateProfile({
        ...profile,
        ...parsedResult.profileUpdates,
      });
    }

    // Merge meals
    if (parsedResult.meals.length > 0) {
      onImportMeals(parsedResult.meals);
    }

    // Merge activity data
    if (Object.keys(parsedResult.activityData).length > 0) {
      onImportActivity(parsedResult.activityData);
    }

    setSuccessMsg(`Successfully imported ${parsedResult.rowCount} daily burn & calorie logs!`);
    setTimeout(() => {
      onClose();
      setFile(null);
      setParsedResult(null);
      setSuccessMsg(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Import Daily Burn & Calories from Excel</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Upload an Excel document (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono">.xlsx</code> or <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">.csv</code>) containing your daily biometric info, <strong>DailyBurn</strong> (TDEE), and <strong>DailyCalories</strong> (intake).
          </p>

          {/* Sample template download button */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-semibold text-emerald-950 block">Need a sample format?</span>
              <span className="text-emerald-700 text-[11px]">Download our ready-to-fill Excel template</span>
            </div>
            <button
              onClick={generateSampleExcelTemplate}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          {/* File Upload Box */}
          <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-6 text-center transition-colors bg-slate-50 relative">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="space-y-2">
              <Upload className="w-8 h-8 text-emerald-600 mx-auto" />
              <div>
                <span className="font-semibold text-slate-800 block">Click to browse or drop Excel file here</span>
                <span className="text-slate-400 text-[11px]">Supports .xlsx, .xls, and .csv</span>
              </div>
              {file && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 mt-2">
                  <span>📄 {file.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Parsing Status / Preview */}
          {isParsing && (
            <div className="p-4 text-center text-slate-500 font-medium">
              Parsing Excel document and extracting daily burn & calories...
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {parsedResult && !isParsing && !successMsg && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
                <span>Excel Preview Summary</span>
                <span className="text-emerald-700 font-mono">{parsedResult.rowCount} rows detected</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-500 block">Daily Burn Logs:</span>
                  <strong className="text-slate-900">{Object.keys(parsedResult.activityData).length} days</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Daily Calorie Logs:</span>
                  <strong className="text-slate-900">{parsedResult.meals.length} days</strong>
                </div>
                {parsedResult.profileUpdates && Object.keys(parsedResult.profileUpdates).length > 0 && (
                  <div className="col-span-2 pt-1">
                    <span className="text-emerald-800 font-medium block">
                      ✨ Biometric updates detected (Weight / Calorie targets)
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handleConfirmImport}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2 mt-2"
              >
                <span>Confirm & Import Data</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

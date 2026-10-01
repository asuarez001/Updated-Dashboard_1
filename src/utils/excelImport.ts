import * as XLSX from 'xlsx';
import { MealItem, DailyActivityLog, UserProfile } from '../types';
import { formatDate } from './storage';

export interface ParsedExcelImport {
  meals: MealItem[];
  activityData: Record<string, DailyActivityLog>;
  profileUpdates?: Partial<UserProfile>;
  rowCount: number;
}

export async function parseExcelDataFile(file: File): Promise<ParsedExcelImport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const meals: MealItem[] = [];
        const activityData: Record<string, DailyActivityLog> = {};
        let rowCount = 0;
        const profileUpdates: Partial<UserProfile> = {};

        // Iterate through all sheets in workbook
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

          rows.forEach((row, idx) => {
            // Normalize keys to lowercase for robust matching
            const normRow: Record<string, any> = {};
            Object.keys(row).forEach((k) => {
              normRow[k.trim().toLowerCase()] = row[k];
            });

            // Check if row has profile data
            if (normRow['current_weight'] || normRow['current weight'] || normRow['weight']) {
              const w = parseFloat(normRow['current_weight'] || normRow['current weight'] || normRow['weight']);
              if (!isNaN(w) && w > 50) profileUpdates.currentWeightLbs = w;
            }
            if (normRow['target_calories'] || normRow['target calories'] || normRow['calories_target']) {
              const c = parseInt(normRow['target_calories'] || normRow['target calories'] || normRow['calories_target'], 10);
              if (!isNaN(c) && c > 500) profileUpdates.targetDailyCalories = c;
            }
            if (normRow['target_protein'] || normRow['target protein'] || normRow['protein_target']) {
              const p = parseInt(normRow['target_protein'] || normRow['target protein'] || normRow['protein_target'], 10);
              if (!isNaN(p) && p > 20) profileUpdates.targetDailyProteinGrams = p;
            }

            // Check if row has daily burn / daily calories log data
            const dateVal = normRow['date'] || normRow['day'] || normRow['timestamp'];
            const dailyBurn = parseFloat(normRow['daily burn'] || normRow['dailyburn'] || normRow['tdee'] || normRow['burn'] || 0);
            const dailyCalories = parseFloat(normRow['daily calories'] || normRow['dailycalories'] || normRow['calories'] || normRow['intake'] || 0);
            const proteinVal = parseFloat(normRow['protein'] || normRow['protein(g)'] || 0);
            const stepsVal = parseInt(normRow['steps'] || normRow['stepcount'] || 0, 10);
            const notesVal = String(normRow['notes'] || normRow['comments'] || '');

            if (dateVal || dailyBurn > 0 || dailyCalories > 0) {
              rowCount++;
              // Format date string YYYY-MM-DD
              let dateStr = formatDate(new Date());
              if (dateVal) {
                if (typeof dateVal === 'number') {
                  // Excel serial date
                  const parsedDate = XLSX.SSF.parse_date_code(dateVal);
                  if (parsedDate) {
                    dateStr = `${parsedDate.y}-${String(parsedDate.m).padStart(2, '0')}-${String(parsedDate.d).padStart(2, '0')}`;
                  }
                } else {
                  const parsed = new Date(dateVal);
                  if (!isNaN(parsed.getTime())) {
                    dateStr = formatDate(parsed);
                  }
                }
              }

              // Save Activity & Daily Burn
              if (dailyBurn > 0 || !activityData[dateStr]) {
                activityData[dateStr] = {
                  date: dateStr,
                  activityLevel: 'light',
                  exerciseCalories: 0,
                  explicitTdee: dailyBurn > 0 ? Math.round(dailyBurn) : undefined,
                  steps: isNaN(stepsVal) ? 8000 : stepsVal,
                  notes: notesVal,
                };
              }

              // If daily calories / intake was specified, add a summary meal item representing the day's intake
              if (dailyCalories > 0) {
                meals.push({
                  id: `excel-meal-${dateStr}-${idx}`,
                  date: dateStr,
                  mealType: 'Lunch',
                  foodName: 'Imported Daily Intake Log',
                  servingSize: 'Daily Log Sheet',
                  calories: Math.round(dailyCalories),
                  protein: isNaN(proteinVal) || proteinVal === 0 ? 120 : Math.round(proteinVal),
                  carbs: 150,
                  fat: 50,
                  fiber: 25,
                  timestamp: `${dateStr}T12:00:00.000Z`,
                });
              }
            }
          });
        });

        resolve({
          meals,
          activityData,
          profileUpdates,
          rowCount: Math.max(rowCount, meals.length),
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

export function generateSampleExcelTemplate(): void {
  const sampleData = [
    {
      Date: '2026-10-01',
      DailyBurn: 2450,
      DailyCalories: 1650,
      Protein: 140,
      Steps: 9500,
      Weight: 218.0,
      Notes: 'Felt great, high protein intake',
    },
    {
      Date: '2026-09-30',
      DailyBurn: 2520,
      DailyCalories: 1620,
      Protein: 135,
      Steps: 10200,
      Weight: 218.5,
      Notes: 'Post shot day 2 peak',
    },
    {
      Date: '2026-09-29',
      DailyBurn: 2380,
      DailyCalories: 1700,
      Protein: 130,
      Steps: 8400,
      Weight: 219.0,
      Notes: 'Day 1 injection',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'GLP1_Daily_Logs');
  XLSX.writeFile(wb, 'glp1_pulse_import_template.xlsx');
}

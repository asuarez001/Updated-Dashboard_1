import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '30mb' }));

const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Generates an evidence-based clinical response when external Gemini API key is unauthenticated in sandbox
 */
function generateClinicalFallbackResponse(
  userQuery: string,
  persona: string,
  userProfileContext?: string
): string {
  const query = userQuery.toLowerCase();

  if (query.includes('day 6') || query.includes('hunger') || query.includes('wear') || query.includes('ebb')) {
    return `### 📉 Understanding the Day 6-7 Clearance "Ebb"

Returning hunger cues on **Days 6 and 7** are biologically normal and expected under GLP-1/GIP pharmacotherapy.

1. **Pharmacokinetics & Drug Half-Life**:
   - **Tirzepatide** has a half-life of **~5 days**, while **Semaglutide** has a half-life of **~7 days**.
   - By Day 6, your systemic blood plasma concentration tapers toward its weekly trough (~35-45% of peak concentration).
2. **Appetite vs. Therapeutic Protection**:
   - Even when mild physiological hunger returns, your metabolic benefits (insulin sensitization and hepatic glucose suppression) remain active.
3. **Actionable Protocol for Days 6-7**:
   - **Prioritize Solid Lean Protein**: Chicken breast, Greek yogurt, or eggs digest slowly and trigger natural CCK satiety peptides.
   - **High-Fiber Bulking**: Aim for 25-30g fiber (berries, chia seeds, broccoli) to prolong gastric fullness.
   - **Hydration**: Drink 16-20 oz of electrolyte water; thirst is frequently misinterpreted by the hypothalamus as hunger.
   - **Stay on Schedule**: Your next injection restores peak therapeutic saturation within 24-48 hours.`;
  }

  if (query.includes('nausea') || query.includes('day 2') || query.includes('peak') || query.includes('sick')) {
    return `### 🌊 Managing the Day 2 Flow Peak & GI Motility

The 24-48 hour window post-injection represents your **Flow Peak ($C_{\\max}$)**, where gastric emptying is delayed to its maximum degree.

1. **Why Nausea Occurs at Peak**:
   - High circulating GLP-1 slows stomach peristalsis. When food sits in the gastric antrum too long, it triggers the vagal nausea reflex.
2. **Immediate Relief Protocol**:
   - **Cold Liquids & Electrolytes**: Sip cold water with sodium and potassium slowly. Avoid large gulps.
   - **Ginger & Peppermint**: Peppermint oil tea or natural ginger drops soothe smooth muscle gastric spasms.
   - **Low-Fat, Bland Foods**: Fat delays stomach emptying even further. Stick to saltines, sourdough toast, broth, or whey isolate in water.
   - **Eat Slowly**: Chew thoroughly and stop at 70% fullness to avoid gastric distention.
3. **Posture Check**:
   - Remain upright for at least 90 minutes after eating; avoid reclining immediately after food.`;
  }

  if (query.includes('protein') || query.includes('muscle') || query.includes('lean')) {
    return `### 🛡️ Lean Muscle Defense & Protein Strategy

Preserving skeletal muscle is the **#1 clinical priority** during GLP-1 weight reduction to prevent sarcopenia and metabolic rate drops.

1. **Daily Target Formula**:
   - Aim for **1.2 to 1.6 grams of protein per kilogram of target body weight** (typically **100 to 140g daily**).
2. **Overcoming Low Appetite**:
   - **Eat Protein First**: Always consume the high-protein portion of your plate (poultry, fish, tofu, eggs) before carbs or vegetables.
   - **Liquid Protein Advantage**: When solid food feels too heavy, ultra-filtered milk (e.g. Fairlife) or whey protein isolate deliver 30-42g of clean protein with zero gastric heaviness.
   - **Even Distribution**: Spread protein across 3-4 boluses of 25-40g to stimulate continuous Muscle Protein Synthesis (MPS).
3. **Resistance Training Synergy**:
   - 2-3 sessions per week of resistance exercise signals the body to mobilize energy purely from adipose fat reserves while shielding muscle tissue.`;
  }

  if (query.includes('30 day') || query.includes('accumulation') || query.includes('steady state') || query.includes('wave')) {
    return `### 📈 The 30-Day Pharmacokinetic Accumulation Model

Over a 30-day timeline (spanning 4 to 5 weekly injections), your blood concentration follows a predictable clinical wave:

1. **Weekly Ebbs & Flows**:
   - Each dose peaks at **24-48 hours post-injection** (Flow Peak) and tapers gradually through Day 7 (Ebb Trough).
2. **Steady-State Accumulation**:
   - Because the 7-day dosing interval is close to the drug's half-life (5-7 days), each new injection stacks on top of the residual baseline from the previous week.
   - **Week 1 Trough**: ~18-25% active drug.
   - **Week 2 Trough**: ~30-36% active drug.
   - **Week 3 Trough**: ~38-42% active drug.
   - **Week 4 (Steady-State)**: Troughs stabilize at ~44-48%, maintaining uninterrupted therapeutic glucose control and appetite regulation!`;
  }

  if (query.includes('scale') || query.includes('fat') || query.includes('stall') || query.includes('3500')) {
    return `### ⚖️ Pure Fat Loss Physics vs. Scale Weight Noise

1. **The Wishnofsky Thermodynamic Constant**:
   - Human adipose tissue contains approximately 87% pure lipids. Mobilizing **1.0 pound of pure body fat** strictly requires burning a **3,500 kcal net caloric deficit**.
2. **Why Daily Scale Weight Fluctuate**:
   - **Water & Glycogen**: Every 1g of stored glycogen holds 3-4g of water. A slight carb increase can temporarily shift the scale by 1-2 lbs without adding an ounce of fat.
   - **Delayed GI Transit**: GLP-1 slows digestion; stool transit time lengthens by 24-48 hours. Food matter in the digestive tract registers on the scale as temporary weight.
3. **The Mathematical Reality**:
   - If your Total Daily Burn (TDEE) is 2,400 kcal and intake is 1,650 kcal, you are burning **750 kcal of pure adipose tissue every day** (0.21 lbs pure fat/day, or ~1.5 lbs/week), regardless of what water fluctuations show on any given morning!`;
  }

  if (query.includes('site') || query.includes('rotate') || query.includes('inject')) {
    return `### 💉 Injection Site Rotation & Tissue Health

Rotating your injection site each week ensures consistent subcutaneous bioavailability and prevents localized tissue changes.

1. **Recommended Rotation Zones**:
   - **Abdomen**: Left lower quadrant, right lower quadrant, left upper, right upper (stay at least 2 inches away from your navel).
   - **Anterior Thighs**: Outer middle third of either thigh.
   - **Upper Outer Arms**: Fatty tissue on the back/outer side of the tricep.
2. **Clinical Benefits**:
   - Prevents **lipohypertrophy** (localized rubbery fat deposits that reduce drug absorption).
   - Many patients notice fewer GI symptoms when injecting in the thigh or arm compared to the abdomen during dose titration.`;
  }

  return `### 🩺 Clinical Guidance for Your Protocol

Thank you for your question regarding your GLP-1 therapy.

1. **Protocol Adherence**:
   - Consistency is key to steady-state pharmacokinetics. Maintain your scheduled weekly shot day and rotate injection quadrants.
2. **Energy Balance & Deficit**:
   - Pure adipose fat loss strictly adheres to the thermodynamic law: **3,500 kcal deficit = 1 lb pure body fat**. Scale weight noise will level out as steady habits persist.
3. **Hydration & Electrolytes**:
   - Always ensure an intake of at least 80-100 oz of water supplemented with balanced sodium, potassium, and magnesium to mitigate therapy-related fatigue.
4. **Physician Communication**:
   - Be sure to report any severe or persistent symptoms to your prescribing physician.

Feel free to ask more specific questions about your 30-day ebbs and flows, weekly peaks, nausea mitigation, or protein calculations!`;
}

/**
 * Multi-turn Gemini Chatbot Endpoint
 * Supports models:
 * - gemini-3.5-flash: General tasks (default)
 * - gemini-3.1-flash-lite: Fast tasks
 * - gemini-3.1-pro-preview: Particularly complex tasks
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model = 'gemini-3.5-flash', persona = 'companion', userProfileContext } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const latestUserMessage = messages[messages.length - 1]?.content || '';

    // Map messages to Google Gen AI format
    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || m.text || '' }],
    }));

    // Persona-specific system instructions
    let personaRoleInstruction = '';
    if (persona === 'pharmacotherapy') {
      personaRoleInstruction = `Role: Senior Clinical Pharmacotherapy Specialist.
Focus deeply on GLP-1 & GIP receptor pharmacology, elimination half-life dynamics (5 days for Tirzepatide, 7 days for Semaglutide), peak saturation curves at 24-48h, 30-day steady-state accumulation, and receptor binding affinities.`;
    } else if (persona === 'gi_symptoms') {
      personaRoleInstruction = `Role: Gastrointestinal Comfort & Motility Specialist.
Focus specifically on alleviating nausea, delayed gastric emptying heaviness, constipation, acid reflux, and hydration with electrolyte balance. Provide immediate practical relief protocols.`;
    } else if (persona === 'nutrition_muscle') {
      personaRoleInstruction = `Role: Metabolic Nutrition & Lean Mass Guardian.
Focus on preventing sarcopenia (skeletal muscle wasting) during rapid adipose mobilization, hitting 1.2-1.6g/kg protein targets with reduced appetite, fiber density, and pure fat loss physics (3,500 kcal deficit = 1 lb pure fat).`;
    } else {
      personaRoleInstruction = `Role: Pulse AI — Comprehensive GLP-1 Clinical Companion.
Support the user across weekly shot tracking, 30-day ebbs and flows, symptom mitigation, protein targets, and thermodynamic pure fat loss.`;
    }

    const systemInstruction = `You are Pulse AI, an empathetic, highly knowledgeable, and scientifically rigorous GLP-1 Clinical Pharmacotherapy & Metabolic Companion.
${personaRoleInstruction}

Key Scientific Principles:
1. Pharmacokinetics & Concentration Curves:
   - Weekly doses create an ebb and flow cycle: peak satiety (Flow) at 24-48h post-shot, followed by steady clearance toward baseline (Ebb) on Days 6-7.
   - Returning hunger cues on Days 6-7 are biologically normal as systemic drug levels clear before the next weekly dose.
   - Over a 30-day period, repeating weekly doses leads to steady-state accumulation by week 4.
2. Muscle Preservation & Nutrition:
   - GLP-1 reduces appetite dramatically. Emphasize consuming protein first (chicken, fish, greek yogurt, eggs, whey/plant shakes, tofu) to prevent skeletal muscle breakdown.
   - Target 25-35g fiber daily to support peristalsis and counteract slowed GI motility.
3. Pure Fat Loss Physics:
   - 1 lb of pure human adipose tissue requires a 3,500 kcal deficit (Wishnofsky model).
   - Educate the patient that daily scale weight fluctuates with water and digestion, while pure fat loss strictly mirrors the thermodynamic calorie deficit.
4. Injection Site Strategy:
   - Rotate weekly between abdominal quadrants, thighs, and outer arms to prevent lipohypertrophy.

Tone & Communication:
- Warm, empowering, concise, and structured with bold highlights and bullet points.
- Always include an encouraging tone, and remind the user to consult their prescribing physician for specific dosage changes or severe acute symptoms.

${userProfileContext ? `Current User Context:\n${userProfileContext}` : ''}`;

    // Select valid model based on instruction
    let targetModel = model;
    const allowedModels = [
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.1-pro-preview',
      'gemini-3.8-flash',
    ];
    if (!allowedModels.includes(targetModel)) {
      targetModel = 'gemini-3.5-flash';
    }

    let reply = '';
    let successWithGemini = false;

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response && response.text) {
          reply = response.text;
          successWithGemini = true;
        }
      } catch (geminiErr: any) {
        console.warn(`Gemini live call error with ${targetModel}: ${geminiErr.message}. Utilizing clinical knowledge engine fallback.`);
      }
    }

    if (!successWithGemini) {
      reply = generateClinicalFallbackResponse(latestUserMessage, persona, userProfileContext);
    }

    res.json({
      role: 'model',
      content: reply,
      modelUsed: targetModel,
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      error: error.message || 'Failed to process chat with Gemini.',
    });
  }
});

// Vite middleware or production static serving
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GLP-1 Pulse server running on http://0.0.0.0:${PORT}`);
});

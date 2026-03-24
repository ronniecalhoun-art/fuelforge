import { useState, useEffect, useRef } from "react";

const USER_PROFILE = {
  people: 2,
  weightLbs: 180,
  goal: "recomp",
  activityLevel: "lightly_active",
  fastingWindow: "11am–7pm",
  cookingTimeMax: 30,
  restrictions: ["no shrimp", "no sugar", "no seed oils", "no processed foods", "no grapefruit"],
  dislikedFoods: ["liver", "organ meats", "tofu", "tempeh", "brussels sprouts", "beets"],
  cookingTools: ["oven", "air fryer", "grill", "crock pot"],
  salt: "Baja Gold Mineral Sea Salt",
  dailyTargets: { calories: 2100, protein: 180, carbs: 100, fat: 90 },
  supplements: {
    morning: ["Tuna Omega-3 Oil", "D3+MK-7 5000IU", "L-Theanine 100mg", "B12 2500mcg", "Red Yeast Rice + CoQ10", "Vitamin C 500mg", "Loratadine 10mg", "Concerta 36mg"],
    diclofenac: "75mg on Mon/Wed/Fri/Sat",
    creatine: "10g/day split (5g with shake, 5g with dinner)",
    evening: ["Carditone", "Magnesium Glycinate"],
    protein: "NutraBio Classic Whey ~25g protein (with 11am shake)"
  },
  mealSchedule: [
    { id: "shake", label: "Protein Shake", time: "11:00 AM", emoji: "🥤" },
    { id: "meal1", label: "Meal 1", time: "1:00 PM", emoji: "🍽️" },
    { id: "meal2", label: "Meal 2", time: "5:30 PM", emoji: "🍽️" },
    { id: "snack", label: "Snack", time: "6:30 PM", emoji: "🫐" },
  ]
};

const SYSTEM_PROMPT = `You are a precision nutrition and meal planning AI for a specific user. Here is their complete profile:

PERSONAL: 180 lbs male, goal: body recomp (lose fat, gain muscle), lightly active, cooking for 2 people.
FASTING: 16/8 intermittent fasting, eating window 11am–7pm.
COOKING: Max 30 minutes prep/cook time. Tools: oven, air fryer, grill, crock pot. Uses Baja Gold Mineral Sea Salt.
DAILY TARGETS: ~2100 calories, 180g protein, <100g carbs, 80-100g fat.
RESTRICTIONS: NO shrimp, NO sugar, NO seed oils (use butter/olive oil/coconut oil only), NO processed foods, NO grapefruit.
DISLIKED FOODS: liver, organ meats, tofu, tempeh, brussels sprouts, beets.
SUPPLEMENTS: Takes Tuna Omega-3 Oil (don't over-push fatty fish), D3+MK-7, B12, Red Yeast Rice+CoQ10 (keep heart-healthy), Magnesium Glycinate at night, Creatine 10g/day, Whey protein shake at 11am (~25g protein).
MEAL SLOTS: Protein shake 11am, Meal 1 ~1pm, Meal 2 ~5:30pm, Snack ~6:30pm.
DICLOFENAC: Taken Mon/Wed/Fri/Sat — meals those days should include food to protect stomach.

IMPORTANT RULES:
- All meals must be whole foods, no processed ingredients
- Only cook with butter, olive oil, coconut oil, or animal fats
- Season with Baja Gold mineral sea salt
- Keep each meal under 30 minutes
- Recipes should serve 2 people
- Be practical and delicious, not bland "diet food"
- The whey shake at 11am always contributes ~25g protein, ~3g carbs — factor this into daily totals`;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TODAY = new Date().getDay();

function MacroBadge({ label, value, unit, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "11px", color: "#8a9ba8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: "700", color, fontFamily: "'Playfair Display', serif" }}>{value}<span style={{ fontSize: "11px", color: "#8a9ba8", marginLeft: "1px" }}>{unit}</span></div>
    </div>
  );
}

function LoadingDots() {
  return (
    <span style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width: "6px", height: "6px", borderRadius: "50%", background: "#c8a96e",
          animation: "pulse 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`
        }} />
      ))}
    </span>
  );
}

function MealCard({ meal, dayIndex, slotId, onSwap, onExpand, expanded }) {
  const isLoading = meal?.loading;
  const isEmpty = !meal || (!meal.name && !meal.loading);

  return (
    <div style={{
      background: expanded ? "#1a2332" : "#141d2b",
      border: `1px solid ${expanded ? "#c8a96e" : "#1f2d3d"}`,
      borderRadius: "12px",
      padding: "16px",
      transition: "all 0.3s ease",
      cursor: isEmpty ? "default" : "pointer",
    }} onClick={() => !isEmpty && !isLoading && onExpand()}>
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#8a9ba8" }}>
          <LoadingDots />
          <span style={{ fontSize: "13px" }}>Generating meal...</span>
        </div>
      ) : isEmpty ? (
        <div style={{ color: "#3a4f63", fontSize: "13px", fontStyle: "italic" }}>Not yet generated</div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#e8dcc8", fontFamily: "'Playfair Display', serif", lineHeight: "1.3" }}>
                {meal.name}
              </div>
              {meal.macros && (
                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#c8a96e" }}>{meal.macros.calories} cal</span>
                  <span style={{ fontSize: "11px", color: "#7eb8a0" }}>{meal.macros.protein}g protein</span>
                  <span style={{ fontSize: "11px", color: "#8a9ba8" }}>{meal.macros.carbs}g carbs</span>
                </div>
              )}
            </div>
            <button onClick={(e) => { e.stopPropagation(); onSwap(); }} style={{
              background: "none", border: "1px solid #2a3d52", borderRadius: "6px",
              color: "#8a9ba8", fontSize: "11px", padding: "4px 8px", cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.target.style.borderColor = "#c8a96e"; e.target.style.color = "#c8a96e"; }}
            onMouseLeave={e => { e.target.style.borderColor = "#2a3d52"; e.target.style.color = "#8a9ba8"; }}>
              swap
            </button>
          </div>
          {expanded && meal.recipe && (
            <div style={{ marginTop: "16px", borderTop: "1px solid #1f2d3d", paddingTop: "16px" }} onClick={e => e.stopPropagation()}>
              {meal.description && (
                <p style={{ fontSize: "13px", color: "#8a9ba8", marginBottom: "12px", fontStyle: "italic" }}>{meal.description}</p>
              )}
              {meal.recipe.ingredients && (
                <>
                  <div style={{ fontSize: "11px", color: "#c8a96e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Ingredients (serves 2)</div>
                  <ul style={{ margin: "0 0 16px 0", padding: "0 0 0 16px" }}>
                    {meal.recipe.ingredients.map((ing, i) => (
                      <li key={i} style={{ fontSize: "13px", color: "#b0bec5", marginBottom: "4px" }}>{ing}</li>
                    ))}
                  </ul>
                </>
              )}
              {meal.recipe.steps && (
                <>
                  <div style={{ fontSize: "11px", color: "#c8a96e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Instructions</div>
                  <ol style={{ margin: "0 0 16px 0", padding: "0 0 0 16px" }}>
                    {meal.recipe.steps.map((step, i) => (
                      <li key={i} style={{ fontSize: "13px", color: "#b0bec5", marginBottom: "8px", lineHeight: "1.5" }}>{step}</li>
                    ))}
                  </ol>
                </>
              )}
              {meal.recipe.prepTip && (
                <div style={{ background: "#0f1922", borderLeft: "3px solid #c8a96e", padding: "10px 12px", borderRadius: "0 6px 6px 0", fontSize: "12px", color: "#8a9ba8" }}>
                  💡 {meal.recipe.prepTip}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SwapModal({ meal, slotLabel, onConfirm, onClose }) {
  const [feedback, setFeedback] = useState("");
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px"
    }}>
      <div style={{
        background: "#141d2b", border: "1px solid #c8a96e", borderRadius: "16px",
        padding: "28px", maxWidth: "480px", width: "100%"
      }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "#e8dcc8", marginBottom: "8px" }}>
          Swap {slotLabel}
        </div>
        <div style={{ fontSize: "13px", color: "#8a9ba8", marginBottom: "20px" }}>
          Current: <span style={{ color: "#c8a96e" }}>{meal?.name}</span>
        </div>
        <div style={{ fontSize: "13px", color: "#b0bec5", marginBottom: "8px" }}>
          Tell me what you want more or less of (optional):
        </div>
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="e.g. 'more chicken dishes', 'less eggs', 'something lighter', 'more filling'..."
          style={{
            width: "100%", background: "#0f1922", border: "1px solid #2a3d52", borderRadius: "8px",
            color: "#e8dcc8", padding: "12px", fontSize: "13px", resize: "vertical",
            minHeight: "80px", fontFamily: "inherit", boxSizing: "border-box", outline: "none"
          }}
        />
        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button onClick={() => onConfirm(feedback)} style={{
            flex: 1, background: "#c8a96e", border: "none", borderRadius: "8px",
            color: "#0a1018", fontWeight: "700", fontSize: "14px", padding: "12px",
            cursor: "pointer", fontFamily: "'Playfair Display', serif"
          }}>Generate New Meal</button>
          <button onClick={onClose} style={{
            background: "none", border: "1px solid #2a3d52", borderRadius: "8px",
            color: "#8a9ba8", fontSize: "14px", padding: "12px 20px", cursor: "pointer"
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function MealGenerator() {
  const [activeTab, setActiveTab] = useState("weekly");
  const [selectedDay, setSelectedDay] = useState(TODAY);
  const [weekPlan, setWeekPlan] = useState({});
  const [shoppingList, setShoppingList] = useState([]);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState(null);
  const [swapModal, setSwapModal] = useState(null);
  const [onDemandResult, setOnDemandResult] = useState(null);
  const [onDemandLoading, setOnDemandLoading] = useState(false);
  const [onDemandRequest, setOnDemandRequest] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [weekGenerated, setWeekGenerated] = useState(false);
  const [generatingWeek, setGeneratingWeek] = useState(false);

  async function callClaude(userPrompt, maxTokens = 1200) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }]
      })
    });
    const data = await response.json();
    const text = data.content.map(i => i.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  }

  async function generateMealSlot(day, slotId, feedback = "") {
    const slot = USER_PROFILE.mealSchedule.find(s => s.id === slotId);
    const dayName = DAYS[day];
    const isDiclofenacDay = ["Monday", "Wednesday", "Friday", "Saturday"].includes(dayName);

    if (slotId === "shake") {
      return {
        name: "NutraBio Chocolate Whey Shake",
        description: "Your fasting-break protein shake with 5g creatine.",
        macros: { calories: 160, protein: 25, carbs: 5, fat: 3 },
        recipe: {
          ingredients: ["1 scoop NutraBio Classic Whey (Chocolate Milkshake)", "10-12 oz cold water or unsweetened almond milk", "5g creatine monohydrate", "Ice (optional)"],
          steps: ["Add water or almond milk to shaker.", "Add whey and creatine.", "Shake well for 20 seconds.", "Add ice if desired."],
          prepTip: "This breaks your fast and starts your eating window. Take your morning supplements now."
        }
      };
    }

    const feedbackClause = feedback ? ` User feedback: "${feedback}".` : "";
    const diclofenacNote = isDiclofenacDay ? " Today is a Diclofenac day — make sure the meal includes enough food to protect the stomach." : "";

    const prompts = {
      meal1: `Generate a ${dayName} lunch (Meal 1, ~1pm) for the user's meal plan.${feedbackClause}${diclofenacNote} This meal should be satisfying and protein-rich. Remaining macros after shake: ~1940 calories, ~155g protein, ~95g carbs, ~87g fat split across meal1, meal2, snack. Target for this meal: ~650 cal, ~55g protein, ~30g carbs, ~28g fat.`,
      meal2: `Generate a ${dayName} dinner (Meal 2, ~5:30pm) for the user's meal plan.${feedbackClause}${diclofenacNote} This is the main dinner shared with girlfriend. Make it genuinely delicious. Target: ~700 cal, ~60g protein, ~35g carbs, ~32g fat.`,
      snack: `Generate a ${dayName} evening snack (~6:30pm) for the user's meal plan.${feedbackClause} Must be light, whole food, low carb. Target: ~200 cal, ~15g protein, ~10g carbs, ~10g fat. Keep it simple — no cooking required ideally.`
    };

    const result = await callClaude(`${prompts[slotId]}

Respond ONLY with a JSON object in this exact format (no markdown, no preamble):
{
  "name": "Meal name",
  "description": "One sentence appetizing description",
  "macros": { "calories": 650, "protein": 55, "carbs": 30, "fat": 28 },
  "recipe": {
    "ingredients": ["ingredient 1 with amount", "ingredient 2 with amount"],
    "steps": ["Step 1", "Step 2", "Step 3"],
    "prepTip": "One meal prep tip to save time"
  }
}`);
    return result;
  }

  async function generateFullWeek() {
    setGeneratingWeek(true);
    setWeekGenerated(false);
    setWeekPlan({});
    setShoppingList([]);

    const newPlan = {};
    for (let day = 0; day < 7; day++) {
      newPlan[day] = {};
      for (const slot of USER_PROFILE.mealSchedule) {
        setWeekPlan(prev => ({
          ...prev,
          [day]: { ...prev[day], [slot.id]: { loading: true } }
        }));
        try {
          const meal = await generateMealSlot(day, slot.id);
          newPlan[day][slot.id] = meal;
          setWeekPlan(prev => ({
            ...prev,
            [day]: { ...prev[day], [slot.id]: meal }
          }));
        } catch (e) {
          newPlan[day][slot.id] = { name: "Error generating meal", macros: {} };
          setWeekPlan(prev => ({
            ...prev,
            [day]: { ...prev[day], [slot.id]: { name: "Error generating meal", macros: {} } }
          }));
        }
      }
    }
    setGeneratingWeek(false);
    setWeekGenerated(true);
    generateShoppingList(newPlan);
  }

  async function generateShoppingList(plan) {
    setShoppingLoading(true);
    try {
      const mealNames = [];
      for (let day = 0; day < 7; day++) {
        for (const slot of USER_PROFILE.mealSchedule) {
          if (plan[day]?.[slot.id]?.name && plan[day][slot.id].name !== "NutraBio Chocolate Whey Shake") {
            mealNames.push(plan[day][slot.id].name);
          }
        }
      }
      const unique = [...new Set(mealNames)];
      const result = await callClaude(`Based on these meals for a week (serving 2 people): ${unique.join(", ")}

Generate a consolidated grocery shopping list grouped by category. Consolidate duplicate ingredients. Respond ONLY with JSON:
{
  "categories": [
    { "name": "Proteins", "items": ["2 lbs chicken breast", "1 lb ground beef"] },
    { "name": "Produce", "items": ["..."] },
    { "name": "Dairy & Eggs", "items": ["..."] },
    { "name": "Pantry", "items": ["..."] },
    { "name": "Frozen", "items": ["..."] }
  ]
}`, 1500);
      setShoppingList(result.categories || []);
    } catch (e) {
      console.error("Shopping list error", e);
    }
    setShoppingLoading(false);
  }

  async function swapMeal(day, slotId, feedback) {
    setSwapModal(null);
    setWeekPlan(prev => ({
      ...prev,
      [day]: { ...prev[day], [slotId]: { loading: true } }
    }));
    try {
      const meal = await generateMealSlot(day, slotId, feedback);
      setWeekPlan(prev => ({
        ...prev,
        [day]: { ...prev[day], [slotId]: meal }
      }));
    } catch (e) {
      setWeekPlan(prev => ({
        ...prev,
        [day]: { ...prev[day], [slotId]: { name: "Error", macros: {} } }
      }));
    }
  }

  async function generateOnDemand() {
    if (!onDemandRequest.trim()) return;
    setOnDemandLoading(true);
    setOnDemandResult(null);
    try {
      const result = await callClaude(`User wants: "${onDemandRequest}"

Generate a single meal idea that fits their profile. Respond ONLY with JSON:
{
  "name": "Meal name",
  "description": "One sentence appetizing description",
  "macros": { "calories": 650, "protein": 55, "carbs": 30, "fat": 28 },
  "recipe": {
    "ingredients": ["ingredient 1 with amount (serves 2)", "ingredient 2 with amount"],
    "steps": ["Step 1", "Step 2", "Step 3", "Step 4"],
    "prepTip": "One meal prep or timing tip"
  },
  "shoppingList": ["item 1", "item 2", "item 3"]
}`, 1200);
      setOnDemandResult(result);
    } catch (e) {
      setOnDemandResult({ name: "Error generating meal", description: "Please try again.", macros: {}, recipe: { ingredients: [], steps: [] } });
    }
    setOnDemandLoading(false);
  }

  const dayTotals = (day) => {
    const slots = weekPlan[day] || {};
    let cal = 0, prot = 0, carbs = 0, fat = 0;
    Object.values(slots).forEach(m => {
      if (m?.macros) {
        cal += m.macros.calories || 0;
        prot += m.macros.protein || 0;
        carbs += m.macros.carbs || 0;
        fat += m.macros.fat || 0;
      }
    });
    return { cal, prot, carbs, fat };
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0a1018",
      fontFamily: "'DM Sans', system-ui, sans-serif", color: "#e8dcc8"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:#0a1018} ::-webkit-scrollbar-thumb{background:#2a3d52;border-radius:3px}
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1f2d3d", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", fontWeight: "700", color: "#e8dcc8", letterSpacing: "-0.02em" }}>
            🥩 FuelForge
          </div>
          <div style={{ fontSize: "11px", color: "#8a9ba8", marginTop: "2px" }}>Personalized Meal Generator</div>
        </div>
        <button onClick={() => setProfileOpen(!profileOpen)} style={{
          background: profileOpen ? "#1a2332" : "none",
          border: "1px solid #2a3d52", borderRadius: "8px",
          color: "#8a9ba8", fontSize: "12px", padding: "8px 14px", cursor: "pointer"
        }}>
          {profileOpen ? "✕ Close" : "👤 My Profile"}
        </button>
      </div>

      {/* Profile Panel */}
      {profileOpen && (
        <div style={{ background: "#0f1922", borderBottom: "1px solid #1f2d3d", padding: "20px 24px", animation: "fadeIn 0.2s ease" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", color: "#c8a96e", marginBottom: "16px" }}>Your Profile</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "12px" }}>
            {[
              ["🎯 Goal", "Recomp (fat loss + muscle)"],
              ["⚖️ Weight", "180 lbs"],
              ["👥 Cooking for", "2 people"],
              ["⏰ Eating window", "11am – 7pm (16/8 IF)"],
              ["⏱️ Max cook time", "30 minutes"],
              ["🔥 Daily calories", "~2,100"],
              ["💪 Daily protein", "180g"],
              ["🌾 Daily carbs", "<100g"],
              ["🥑 Daily fat", "80–100g"],
              ["🚫 Avoid", "Shrimp, sugar, seed oils, processed foods, grapefruit"],
              ["🫙 Salt", "Baja Gold Mineral Sea Salt"],
              ["🍳 Tools", "Oven, Air fryer, Grill, Crock pot"],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ color: "#c8a96e", marginBottom: "2px" }}>{k}</div>
                <div style={{ color: "#b0bec5" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1f2d3d", padding: "0 24px" }}>
        {[["weekly", "📅 Weekly Plan"], ["ondemand", "⚡ On Demand"], ["shopping", "🛒 Shopping List"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            background: "none", border: "none", borderBottom: activeTab === id ? "2px solid #c8a96e" : "2px solid transparent",
            color: activeTab === id ? "#c8a96e" : "#8a9ba8", fontSize: "13px", fontWeight: activeTab === id ? "600" : "400",
            padding: "14px 16px", cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit"
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>

        {/* WEEKLY TAB */}
        {activeTab === "weekly" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {!weekGenerated && !generatingWeek && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", color: "#e8dcc8", marginBottom: "12px" }}>
                  Ready for your week?
                </div>
                <div style={{ color: "#8a9ba8", fontSize: "14px", marginBottom: "32px", maxWidth: "400px", margin: "0 auto 32px" }}>
                  Generate a full 7-day meal plan tailored to your profile, macros, and schedule.
                </div>
                <button onClick={generateFullWeek} style={{
                  background: "#c8a96e", border: "none", borderRadius: "10px", color: "#0a1018",
                  fontWeight: "700", fontSize: "15px", padding: "16px 36px", cursor: "pointer",
                  fontFamily: "'Playfair Display', serif", letterSpacing: "0.02em"
                }}>Generate This Week's Plan</button>
              </div>
            )}

            {generatingWeek && (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "#c8a96e", marginBottom: "8px" }}>
                  Building your plan...
                </div>
                <div style={{ color: "#8a9ba8", fontSize: "13px" }}>Generating all 7 days of meals. This takes about a minute.</div>
              </div>
            )}

            {(weekGenerated || generatingWeek) && (
              <>
                {/* Day Selector */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "24px", overflowX: "auto", paddingBottom: "4px" }}>
                  {DAYS.map((day, i) => {
                    const totals = dayTotals(i);
                    const isToday = i === TODAY;
                    return (
                      <button key={i} onClick={() => setSelectedDay(i)} style={{
                        background: selectedDay === i ? "#1a2332" : "none",
                        border: `1px solid ${selectedDay === i ? "#c8a96e" : isToday ? "#3a5a7a" : "#1f2d3d"}`,
                        borderRadius: "10px", padding: "10px 14px", cursor: "pointer",
                        minWidth: "90px", transition: "all 0.2s", textAlign: "center"
                      }}>
                        <div style={{ fontSize: "11px", color: isToday ? "#7eb8a0" : "#8a9ba8", marginBottom: "2px" }}>{isToday ? "Today" : day.slice(0,3)}</div>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: selectedDay === i ? "#c8a96e" : "#e8dcc8" }}>{day.slice(0,3)}</div>
                        {totals.cal > 0 && <div style={{ fontSize: "10px", color: "#8a9ba8", marginTop: "2px" }}>{totals.cal} cal</div>}
                      </button>
                    );
                  })}
                </div>

                {/* Daily Macro Summary */}
                {dayTotals(selectedDay).cal > 0 && (
                  <div style={{
                    background: "#0f1922", border: "1px solid #1f2d3d", borderRadius: "12px",
                    padding: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-around"
                  }}>
                    <MacroBadge label="Calories" value={dayTotals(selectedDay).cal} unit="kcal" color="#e8dcc8" />
                    <MacroBadge label="Protein" value={dayTotals(selectedDay).prot} unit="g" color="#7eb8a0" />
                    <MacroBadge label="Carbs" value={dayTotals(selectedDay).carbs} unit="g" color="#c8a96e" />
                    <MacroBadge label="Fat" value={dayTotals(selectedDay).fat} unit="g" color="#b08060" />
                  </div>
                )}

                {/* Meal Slots */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {USER_PROFILE.mealSchedule.map(slot => {
                    const meal = weekPlan[selectedDay]?.[slot.id];
                    const expandKey = `${selectedDay}-${slot.id}`;
                    return (
                      <div key={slot.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <span style={{ fontSize: "16px" }}>{slot.emoji}</span>
                          <span style={{ fontSize: "12px", color: "#8a9ba8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            {slot.label}
                          </span>
                          <span style={{ fontSize: "11px", color: "#3a5a7a" }}>{slot.time}</span>
                        </div>
                        <MealCard
                          meal={meal}
                          dayIndex={selectedDay}
                          slotId={slot.id}
                          expanded={expandedMeal === expandKey}
                          onExpand={() => setExpandedMeal(expandedMeal === expandKey ? null : expandKey)}
                          onSwap={() => setSwapModal({ day: selectedDay, slotId: slot.id, slotLabel: slot.label, meal })}
                        />
                      </div>
                    );
                  })}
                </div>

                {weekGenerated && (
                  <button onClick={generateFullWeek} style={{
                    marginTop: "24px", background: "none", border: "1px solid #2a3d52",
                    borderRadius: "8px", color: "#8a9ba8", fontSize: "13px", padding: "10px 20px",
                    cursor: "pointer", width: "100%"
                  }}>🔄 Regenerate Entire Week</button>
                )}
              </>
            )}
          </div>
        )}

        {/* ON DEMAND TAB */}
        {activeTab === "ondemand" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "#e8dcc8", marginBottom: "8px" }}>
              What are you craving?
            </div>
            <div style={{ fontSize: "13px", color: "#8a9ba8", marginBottom: "20px" }}>
              Describe what you want and I'll generate a meal that fits your profile.
            </div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
              <input
                value={onDemandRequest}
                onChange={e => setOnDemandRequest(e.target.value)}
                onKeyDown={e => e.key === "Enter" && generateOnDemand()}
                placeholder="e.g. 'something with steak', 'a quick high protein breakfast', 'Mexican-inspired dinner'..."
                style={{
                  flex: 1, background: "#0f1922", border: "1px solid #2a3d52", borderRadius: "10px",
                  color: "#e8dcc8", padding: "14px 16px", fontSize: "14px", outline: "none",
                  fontFamily: "inherit"
                }}
              />
              <button onClick={generateOnDemand} disabled={onDemandLoading || !onDemandRequest.trim()} style={{
                background: "#c8a96e", border: "none", borderRadius: "10px", color: "#0a1018",
                fontWeight: "700", fontSize: "14px", padding: "14px 20px", cursor: "pointer",
                opacity: onDemandLoading || !onDemandRequest.trim() ? 0.5 : 1,
                fontFamily: "inherit"
              }}>
                {onDemandLoading ? "..." : "Generate"}
              </button>
            </div>

            {onDemandLoading && (
              <div style={{ textAlign: "center", padding: "40px", color: "#8a9ba8" }}>
                <LoadingDots /><span style={{ marginLeft: "12px", fontSize: "14px" }}>Generating your meal...</span>
              </div>
            )}

            {onDemandResult && !onDemandLoading && (
              <div style={{ background: "#141d2b", border: "1px solid #c8a96e", borderRadius: "16px", padding: "24px", animation: "fadeIn 0.3s ease" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#e8dcc8", marginBottom: "6px" }}>
                  {onDemandResult.name}
                </div>
                {onDemandResult.description && (
                  <p style={{ fontSize: "13px", color: "#8a9ba8", fontStyle: "italic", marginBottom: "16px" }}>{onDemandResult.description}</p>
                )}
                {onDemandResult.macros && (
                  <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                    <span style={{ fontSize: "12px", color: "#e8dcc8" }}>{onDemandResult.macros.calories} cal</span>
                    <span style={{ fontSize: "12px", color: "#7eb8a0" }}>{onDemandResult.macros.protein}g protein</span>
                    <span style={{ fontSize: "12px", color: "#c8a96e" }}>{onDemandResult.macros.carbs}g carbs</span>
                    <span style={{ fontSize: "12px", color: "#b08060" }}>{onDemandResult.macros.fat}g fat</span>
                  </div>
                )}
                {onDemandResult.recipe?.ingredients && (
                  <>
                    <div style={{ fontSize: "11px", color: "#c8a96e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Ingredients (serves 2)</div>
                    <ul style={{ margin: "0 0 16px 16px" }}>
                      {onDemandResult.recipe.ingredients.map((ing, i) => (
                        <li key={i} style={{ fontSize: "13px", color: "#b0bec5", marginBottom: "4px" }}>{ing}</li>
                      ))}
                    </ul>
                  </>
                )}
                {onDemandResult.recipe?.steps && (
                  <>
                    <div style={{ fontSize: "11px", color: "#c8a96e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Instructions</div>
                    <ol style={{ margin: "0 0 16px 16px" }}>
                      {onDemandResult.recipe.steps.map((step, i) => (
                        <li key={i} style={{ fontSize: "13px", color: "#b0bec5", marginBottom: "8px", lineHeight: "1.5" }}>{step}</li>
                      ))}
                    </ol>
                  </>
                )}
                {onDemandResult.recipe?.prepTip && (
                  <div style={{ background: "#0f1922", borderLeft: "3px solid #c8a96e", padding: "10px 12px", borderRadius: "0 6px 6px 0", fontSize: "12px", color: "#8a9ba8" }}>
                    💡 {onDemandResult.recipe.prepTip}
                  </div>
                )}
                {onDemandResult.shoppingList && (
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ fontSize: "11px", color: "#c8a96e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>What to Buy</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {onDemandResult.shoppingList.map((item, i) => (
                        <span key={i} style={{ background: "#0f1922", border: "1px solid #2a3d52", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", color: "#b0bec5" }}>{item}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SHOPPING LIST TAB */}
        {activeTab === "shopping" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "#e8dcc8", marginBottom: "8px" }}>
              Weekly Shopping List
            </div>
            <div style={{ fontSize: "13px", color: "#8a9ba8", marginBottom: "20px" }}>
              Auto-generated from your weekly meal plan. Generate your week first to populate this.
            </div>

            {shoppingLoading && (
              <div style={{ textAlign: "center", padding: "40px", color: "#8a9ba8" }}>
                <LoadingDots /><span style={{ marginLeft: "12px", fontSize: "14px" }}>Building shopping list...</span>
              </div>
            )}

            {!shoppingLoading && shoppingList.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px", color: "#3a4f63", fontSize: "14px" }}>
                Generate your weekly plan first to see the shopping list here.
              </div>
            )}

            {!shoppingLoading && shoppingList.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {shoppingList.map((cat, i) => (
                  <div key={i} style={{ background: "#141d2b", border: "1px solid #1f2d3d", borderRadius: "12px", padding: "18px" }}>
                    <div style={{ fontSize: "12px", color: "#c8a96e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px", fontWeight: "600" }}>
                      {cat.name}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {cat.items.map((item, j) => (
                        <ShoppingItem key={j} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ background: "#0f1922", border: "1px solid #1f2d3d", borderRadius: "10px", padding: "14px", fontSize: "12px", color: "#8a9ba8" }}>
                  💡 <strong style={{ color: "#c8a96e" }}>Always have on hand:</strong> Butter, olive oil, coconut oil, Baja Gold mineral sea salt, eggs, garlic, NutraBio Whey, creatine
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Swap Modal */}
      {swapModal && (
        <SwapModal
          meal={swapModal.meal}
          slotLabel={swapModal.slotLabel}
          onConfirm={(feedback) => swapMeal(swapModal.day, swapModal.slotId, feedback)}
          onClose={() => setSwapModal(null)}
        />
      )}
    </div>
  );
}

function ShoppingItem({ item }) {
  const [checked, setChecked] = useState(false);
  return (
    <div onClick={() => setChecked(!checked)} style={{
      display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
      opacity: checked ? 0.4 : 1, transition: "opacity 0.2s"
    }}>
      <div style={{
        width: "16px", height: "16px", borderRadius: "4px",
        border: `1px solid ${checked ? "#7eb8a0" : "#2a3d52"}`,
        background: checked ? "#7eb8a0" : "none", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s"
      }}>
        {checked && <span style={{ fontSize: "10px", color: "#0a1018" }}>✓</span>}
      </div>
      <span style={{ fontSize: "13px", color: "#b0bec5", textDecoration: checked ? "line-through" : "none" }}>{item}</span>
    </div>
  );
}

/**
 * CardioGuard AI - Machine Learning & XAI Clinical Engine
 * Based on ACC/AHA Risk Guidelines & UCI Cleveland Dataset Machine Learning Model
 */

const CardioMLEngine = {
  /**
   * Predict Heart Disease Risk based on patient clinical & lifestyle parameters
   * @param {Object} p - Patient parameters
   * @returns {Object} Prediction output including risk score, category, XAI factors, and personalized recommendations
   */
  predictRisk: function(p) {
    // Defaults & Sanitization
    const age = parseFloat(p.age) || 50;
    const gender = p.gender || 'male'; // 'male' or 'female'
    const sysBP = parseFloat(p.sysBP) || 120; // mmHg
    const diaBP = parseFloat(p.diaBP) || 80; // mmHg
    const chol = parseFloat(p.cholesterol) || 200; // mg/dL
    const fbs = parseFloat(p.fbs) || 100; // mg/dL
    const bmi = parseFloat(p.bmi) || 24.5;
    const maxHR = parseFloat(p.maxHR) || (220 - age); // bpm
    const smoking = p.smoking || 'never'; // 'never', 'former', 'heavy'
    const exerciseDays = parseFloat(p.exerciseDays) || 3; // days per week
    const familyHistory = p.familyHistory === true || p.familyHistory === 'yes';
    const chestPainType = parseInt(p.chestPainType) || 0; // 0: Asymptomatic, 1: Typical Angina, 2: Atypical, 3: Non-anginal
    const exAngina = p.exAngina === true || p.exAngina === 'yes' || p.exAngina === '1';
    const oldpeak = parseFloat(p.oldpeak) || 0.0; // ST depression

    // Baseline odds log-logit computation
    let logOdds = -5.8; 
    let xaiFactors = [];

    // 1. Age Factor
    let ageImpact = 0;
    if (age > 40) {
      ageImpact = (age - 40) * 0.045;
      logOdds += ageImpact;
    }
    xaiFactors.push({
      feature: 'Age Factor',
      value: `${age} yrs`,
      impact: ageImpact * 12,
      description: age > 55 ? 'Advanced age increases arterial stiffness' : 'Baseline age risk'
    });

    // 2. Gender Factor
    let genderImpact = (gender === 'male') ? 0.45 : 0.15;
    logOdds += genderImpact;
    xaiFactors.push({
      feature: 'Gender Profile',
      value: gender === 'male' ? 'Male' : 'Female',
      impact: genderImpact * 10,
      description: gender === 'male' ? 'Statistically higher premature CAD risk' : 'Protective estrogen profile baseline'
    });

    // 3. Blood Pressure Factor (Hypertension)
    let bpImpact = 0;
    if (sysBP > 120 || diaBP > 80) {
      bpImpact = ((sysBP - 120) * 0.035) + ((diaBP - 80) * 0.025);
      logOdds += bpImpact;
    }
    xaiFactors.push({
      feature: 'Resting Blood Pressure',
      value: `${sysBP}/${diaBP} mmHg`,
      impact: bpImpact * 14,
      description: sysBP >= 140 ? 'Stage 2 Hypertension places strain on arterial walls' : (sysBP > 120 ? 'Elevated pre-hypertension state' : 'Optimal blood pressure baseline')
    });

    // 4. Cholesterol Factor (Hyperlipidemia)
    let cholImpact = 0;
    if (chol > 190) {
      cholImpact = (chol - 190) * 0.022;
      logOdds += cholImpact;
    }
    xaiFactors.push({
      feature: 'Serum Cholesterol',
      value: `${chol} mg/dL`,
      impact: cholImpact * 12,
      description: chol >= 240 ? 'High cholesterol increases atheromatous plaque accumulation' : (chol > 200 ? 'Borderline high lipid count' : 'Desirable lipid level')
    });

    // 5. Fasting Blood Sugar (Diabetes / Glycemic Risk)
    let fbsImpact = (fbs > 120) ? 0.65 : 0;
    logOdds += fbsImpact;
    xaiFactors.push({
      feature: 'Fasting Blood Sugar',
      value: `${fbs} mg/dL`,
      impact: fbsImpact * 15,
      description: fbs > 120 ? 'Hyperglycemia accelerates vascular endothelial damage' : 'Normal glycemic level'
    });

    // 6. Body Mass Index (BMI)
    let bmiImpact = 0;
    if (bmi > 25) {
      bmiImpact = (bmi - 25) * 0.06;
      logOdds += bmiImpact;
    }
    xaiFactors.push({
      feature: 'Body Mass Index (BMI)',
      value: `${bmi} kg/m²`,
      impact: bmiImpact * 10,
      description: bmi >= 30 ? 'Obesity increases cardiac workload & systemic inflammation' : (bmi > 25 ? 'Overweight category' : 'Healthy weight range')
    });

    // 7. Smoking Status
    let smokeImpact = 0;
    if (smoking === 'heavy') smokeImpact = 1.1;
    else if (smoking === 'former') smokeImpact = 0.3;
    logOdds += smokeImpact;
    xaiFactors.push({
      feature: 'Tobacco / Smoking Habit',
      value: smoking.toUpperCase(),
      impact: smokeImpact * 18,
      description: smoking === 'heavy' ? 'Major risk factor: Nicotine causes endothelial dysfunction & arterial spasm' : 'Non-smoking protective factor'
    });

    // 8. Exercise & Physical Activity (Protective Factor)
    let exerciseBenefit = - (exerciseDays * 0.18);
    logOdds += exerciseBenefit;
    xaiFactors.push({
      feature: 'Weekly Aerobic Exercise',
      value: `${exerciseDays} days/wk`,
      impact: exerciseBenefit * 12,
      description: exerciseDays >= 4 ? 'Strong cardiorespiratory protective effect (-' + Math.abs(Math.round(exerciseBenefit * 12)) + '%)' : 'Sedentary or low physical activity'
    });

    // 9. Family History
    let famImpact = familyHistory ? 0.75 : 0;
    logOdds += famImpact;
    xaiFactors.push({
      feature: 'Genetic Family History',
      value: familyHistory ? 'Present' : 'None',
      impact: famImpact * 15,
      description: familyHistory ? 'First-degree relative CAD history elevates hereditary risk' : 'No known early CAD family history'
    });

    // 10. Chest Pain Type & Clinical ECG Markers
    let cpImpact = 0;
    if (chestPainType === 1) cpImpact = 0.9; // Typical Angina
    else if (chestPainType === 2) cpImpact = 0.5; // Atypical Angina
    else if (chestPainType === 3) cpImpact = 0.2; // Non-anginal
    logOdds += cpImpact;

    let exAngImpact = exAngina ? 0.8 : 0;
    logOdds += exAngImpact;

    let stImpact = oldpeak * 0.4;
    logOdds += stImpact;

    xaiFactors.push({
      feature: 'Chest Symptoms & ECG (ST)',
      value: chestPainType > 0 ? `Angina Type ${chestPainType}` : 'Asymptomatic',
      impact: (cpImpact + exAngImpact + stImpact) * 12,
      description: cpImpact > 0 ? 'Ischemic chest discomfort flagged during physical exertion' : 'No acute angina reported'
    });

    // Convert Log Odds to Probability Risk Score %
    const riskProbability = 1 / (1 + Math.exp(-logOdds));
    let rawScore = Math.round(riskProbability * 100);
    // Clamp score between 3% and 98%
    const riskScore = Math.min(Math.max(rawScore, 3), 98);

    // Determine Risk Category
    let riskCategory = 'Low Risk';
    let riskClass = 'low';
    if (riskScore >= 50) {
      riskCategory = 'High Risk';
      riskClass = 'high';
    } else if (riskScore >= 20) {
      riskCategory = 'Moderate Risk';
      riskClass = 'medium';
    }

    // Generate Personalized Preventive Plan
    const preventivePlan = this.generatePreventivePlan(p, riskScore, riskCategory);

    return {
      riskScore,
      riskCategory,
      riskClass,
      xaiFactors: xaiFactors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
      preventivePlan,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Generate customized dietary, exercise, medication, and checkup recommendations
   */
  generatePreventivePlan: function(p, score, category) {
    const diet = [];
    const exercise = [];
    const lifestyle = [];
    const checkups = [];
    const medications = [];

    // Diet recommendations
    if (parseFloat(p.cholesterol) > 200) {
      diet.push({
        title: 'Mediterranean & DASH Diet Focus',
        desc: 'Reduce saturated fats (<7% total daily calories). Replace butter with extra virgin olive oil, consume 30g daily of nuts (walnuts/almonds), and increase soluble fiber (oats, legumes).'
      });
      diet.push({
        title: 'Plant Sterols & Omega-3 Fatty Acids',
        desc: 'Incorporate oily fish (salmon, mackerel, sardines) twice weekly or 1,000mg EPA/DHA Omega-3 supplements to improve lipid profile.'
      });
    } else {
      diet.push({
        title: 'Balanced Whole-Food Dietary Plan',
        desc: 'Maintain high intake of antioxidant-rich fruits, leafy greens, lean poultry, and unrefined whole grains while limiting ultra-processed snacks.'
      });
    }

    if (parseFloat(p.sysBP) > 130) {
      diet.push({
        title: 'Sodium Restriction Protocol',
        desc: 'Limit dietary sodium intake to under 1,500mg/day (approx 3/4 tsp salt). Avoid canned soups, cured meats, and soy sauce.'
      });
    }

    // Exercise recommendations
    const days = parseFloat(p.exerciseDays) || 0;
    if (days < 3) {
      exercise.push({
        title: 'Gradual Aerobic Conditioning (Zone 2 Cardio)',
        desc: 'Start with 30 minutes of brisk walking, cycling, or swimming 4 days a week at a target heart rate of 55-60% Max HR.'
      });
    } else {
      exercise.push({
        title: 'Optimized Cardiovascular Maintenance',
        desc: 'Combine 150 mins of moderate aerobic exercise per week with 2 days of moderate resistance training to enhance vascular elasticity.'
      });
    }

    if (p.exAngina || parseFloat(p.oldpeak) > 0) {
      exercise.push({
        title: 'Supervised Cardiac Exercise Caution',
        desc: 'Exercise under warm-up protocol; avoid sudden high-intensity bursts (HIIT) until cleared by a clinical cardiologist.'
      });
    }

    // Lifestyle & Habit Reminders
    if (p.smoking === 'heavy' || p.smoking === 'former') {
      lifestyle.push({
        title: 'Smoking Cessation Protocol',
        desc: 'Enroll in nicotine replacement therapy or pharmacological support (Varenicline/Bupropion). Vascular endothelial repair begins within 48 hours of quitting.'
      });
    }

    if (parseFloat(p.bmi) > 25) {
      lifestyle.push({
        title: 'Targeted Weight Reduction Goal',
        desc: `Aim for a gradual weight loss of 0.5kg/week to reduce visceral adipose tissue around cardiac structures.`
      });
    }

    lifestyle.push({
      title: 'Sleep & Stress Management',
      desc: 'Maintain 7-8 hours of continuous sleep. Elevated cortisol levels from chronic stress increase resting blood pressure.'
    });

    // Checkups & Clinical Reminders
    if (category === 'High Risk') {
      checkups.push('Immediate Cardiologist Consultation & 12-Lead Resting ECG');
      checkups.push('Comprehensive Lipid Panel (ApoB, Lp(a), Triglycerides)');
      checkups.push('Echocardiogram (EF assessment) & Coronary Calcium Score (CAC)');
      checkups.push('24-Hour Ambulatory Blood Pressure Monitoring (ABPM)');

      medications.push({
        name: 'Statin Therapy (e.g., Atorvastatin 20mg)',
        frequency: 'Once daily at bedtime',
        purpose: 'LDL Reduction & Plaque Stabilization'
      });
      medications.push({
        name: 'Antihypertensive (e.g., Lisinopril or Amlodipine)',
        frequency: 'Every morning with water',
        purpose: 'BP Target Control <120/80 mmHg'
      });
    } else if (category === 'Moderate Risk') {
      checkups.push('Bi-annual Clinical Health Checkup with Primary Physician');
      checkups.push('Lipid & Fasting Glucose Screening every 6 months');
      checkups.push('Exercise Treadmill Stress Test (TMT)');

      medications.push({
        name: 'Daily Multivitamin & CoQ10 (100mg)',
        frequency: 'Daily after lunch',
        purpose: 'Mitochondrial Cardiac Support'
      });
    } else {
      checkups.push('Annual Cardiovascular Preventive Health Screening');
      checkups.push('Routine Blood Pressure Monitoring every 3 months');
    }

    return { diet, exercise, lifestyle, checkups, medications };
  }
};

window.CardioMLEngine = CardioMLEngine;

/**
 * CardioGuard AI - Secure Local Storage & Data Vault Management
 */

const CardioStorage = {
  KEYS: {
    CURRENT_USER: 'cardioguard_current_user',
    PATIENTS: 'cardioguard_patients_vault',
    MEDICATIONS: 'cardioguard_medications_log',
    RECORDS: 'cardioguard_assessment_history'
  },

  init: function() {
    // Seed initial mock accounts & demo patient records if empty
    if (!localStorage.getItem(this.KEYS.PATIENTS)) {
      const demoPatients = [
        {
          id: 'P-10492',
          name: 'Robert Thorne',
          age: 58,
          gender: 'male',
          role: 'patient',
          sysBP: 154,
          diaBP: 96,
          cholesterol: 265,
          fbs: 135,
          bmi: 29.8,
          maxHR: 138,
          smoking: 'heavy',
          exerciseDays: 1,
          familyHistory: true,
          chestPainType: 1,
          exAngina: true,
          oldpeak: 1.8,
          riskScore: 78,
          riskCategory: 'High Risk',
          riskClass: 'high',
          lastUpdated: '2026-07-22T10:30:00Z',
          doctorNotes: 'Patient presents with stage 2 hypertension & hyperlipidemia. Prescribed Atorvastatin & Lisinopril. Recommended CAC scan.'
        },
        {
          id: 'P-10493',
          name: 'Sarah Jenkins',
          age: 44,
          gender: 'female',
          role: 'patient',
          sysBP: 128,
          diaBP: 82,
          cholesterol: 215,
          fbs: 98,
          bmi: 24.1,
          maxHR: 162,
          smoking: 'former',
          exerciseDays: 3,
          familyHistory: false,
          chestPainType: 0,
          exAngina: false,
          oldpeak: 0.2,
          riskScore: 24,
          riskCategory: 'Moderate Risk',
          riskClass: 'medium',
          lastUpdated: '2026-07-20T14:15:00Z',
          doctorNotes: 'Borderline cholesterol. Encouraged dietary modifications and Mediterranean meal plan. Recheck in 6 months.'
        },
        {
          id: 'P-10494',
          name: 'David Chen',
          age: 36,
          gender: 'male',
          role: 'patient',
          sysBP: 118,
          diaBP: 76,
          cholesterol: 175,
          fbs: 88,
          bmi: 22.4,
          maxHR: 175,
          smoking: 'never',
          exerciseDays: 5,
          familyHistory: false,
          chestPainType: 0,
          exAngina: false,
          oldpeak: 0.0,
          riskScore: 8,
          riskCategory: 'Low Risk',
          riskClass: 'low',
          lastUpdated: '2026-07-24T09:00:00Z',
          doctorNotes: 'Excellent cardiovascular health metrics. Maintain active lifestyle and annual physical checkups.'
        }
      ];

      localStorage.setItem(this.KEYS.PATIENTS, JSON.stringify(demoPatients));
    }

    if (!localStorage.getItem(this.KEYS.CURRENT_USER)) {
      // Default logged in user: Robert Thorne (Patient)
      const defaultUser = {
        id: 'P-10492',
        name: 'Robert Thorne',
        email: 'robert.thorne@example.com',
        role: 'patient'
      };
      localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(defaultUser));
    }
  },

  getCurrentUser: function() {
    return JSON.parse(localStorage.getItem(this.KEYS.CURRENT_USER)) || null;
  },

  setCurrentUser: function(user) {
    localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(user));
  },

  getPatients: function() {
    return JSON.parse(localStorage.getItem(this.KEYS.PATIENTS)) || [];
  },

  getPatientById: function(id) {
    const patients = this.getPatients();
    return patients.find(p => p.id === id) || null;
  },

  savePatientRecord: function(patientData) {
    let patients = this.getPatients();
    const existingIndex = patients.findIndex(p => p.id === patientData.id);

    patientData.lastUpdated = new Date().toISOString();

    if (existingIndex >= 0) {
      patients[existingIndex] = { ...patients[existingIndex], ...patientData };
    } else {
      if (!patientData.id) patientData.id = 'P-' + Math.floor(10000 + Math.random() * 90000);
      patients.unshift(patientData);
    }

    localStorage.setItem(this.KEYS.PATIENTS, JSON.stringify(patients));
    return patientData;
  },

  updateDoctorNotes: function(patientId, notes) {
    let patients = this.getPatients();
    const p = patients.find(item => item.id === patientId);
    if (p) {
      p.doctorNotes = notes;
      p.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.KEYS.PATIENTS, JSON.stringify(patients));
      return true;
    }
    return false;
  }
};

CardioStorage.init();
window.CardioStorage = CardioStorage;

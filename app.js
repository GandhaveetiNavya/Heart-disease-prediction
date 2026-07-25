/**
 * CardioGuard AI - Application State & UI Navigation Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  CardioApp.init();
});

const CardioApp = {
  activeView: 'dashboard',
  charts: {},

  init: function() {
    this.bindEvents();
    this.renderUserContext();
    this.switchView('dashboard');
  },

  bindEvents: function() {
    // Navigation items
    document.querySelectorAll('.nav-item button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetView = e.currentTarget.getAttribute('data-view');
        this.switchView(targetView);
      });
    });

    // Role switcher
    const roleSelect = document.getElementById('user-role-select');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        const newRole = e.target.value;
        let currentUser = CardioStorage.getCurrentUser();
        if (newRole === 'doctor') {
          currentUser = {
            id: 'DOC-8801',
            name: 'Dr. Evelyn Vance',
            email: 'dr.vance@cardioguard.med',
            role: 'doctor'
          };
        } else {
          currentUser = CardioStorage.getPatientById('P-10492') || {
            id: 'P-10492',
            name: 'Robert Thorne',
            email: 'robert.thorne@example.com',
            role: 'patient'
          };
        }
        CardioStorage.setCurrentUser(currentUser);
        this.renderUserContext();
        this.switchView(this.activeView);
        this.showToast(`Switched view to ${newRole === 'doctor' ? 'Healthcare Professional (Doctor)' : 'Patient Portal'}`);
      });
    }

    // Assessment Form Submission
    const assessmentForm = document.getElementById('risk-assessment-form');
    if (assessmentForm) {
      assessmentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAssessmentSubmit();
      });
    }

    // What-If Simulator Sliders
    ['sim-bp', 'sim-chol', 'sim-smoke', 'sim-exercise', 'sim-bmi'].forEach(id => {
      const slider = document.getElementById(id);
      if (slider) {
        slider.addEventListener('input', () => this.updateWhatIfSimulation());
      }
    });
  },

  renderUserContext: function() {
    const currentUser = CardioStorage.getCurrentUser();
    if (!currentUser) return;

    document.getElementById('current-user-name').textContent = currentUser.name;
    document.getElementById('current-user-role').textContent = currentUser.role === 'doctor' ? 'Cardiologist / MD' : 'Patient';

    const roleBadge = document.getElementById('role-badge');
    if (roleBadge) {
      roleBadge.textContent = currentUser.role === 'doctor' ? 'Clinical Doctor Portal' : 'Patient Access';
      roleBadge.className = `badge ${currentUser.role === 'doctor' ? 'badge-doctor' : 'badge-patient'}`;
    }

    // Hide/Show Doctor Roster Nav link
    const doctorNavItem = document.getElementById('nav-doctor-roster');
    if (doctorNavItem) {
      doctorNavItem.style.display = currentUser.role === 'doctor' ? 'block' : 'none';
    }
  },

  switchView: function(viewName) {
    this.activeView = viewName;

    // Update active nav button
    document.querySelectorAll('.nav-item button').forEach(btn => {
      if (btn.getAttribute('data-view') === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Hide all view containers
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.style.display = 'none';
    });

    // Show target container
    const targetPanel = document.getElementById(`view-${viewName}`);
    if (targetPanel) {
      targetPanel.style.display = 'block';
    }

    // Update page title
    const titles = {
      dashboard: 'Cardiovascular Health Dashboard',
      assessment: 'AI Cardiovascular Assessment & Risk Form',
      xai: 'Explainable AI (XAI) Risk Factors & Feature Attribution',
      simulator: 'Interactive "What-If" Risk Factor Simulator',
      prevention: 'Personalized Preventive Health & Care Plan',
      roster: 'Patient Roster & Risk Stratification (Doctor View)',
      medications: 'Medication Schedule & Daily Health Reminders'
    };
    document.getElementById('header-title').textContent = titles[viewName] || 'CardioGuard AI';

    // Render specific view data
    if (viewName === 'dashboard') this.renderDashboard();
    else if (viewName === 'xai') this.renderXAIView();
    else if (viewName === 'simulator') this.initWhatIfSimulator();
    else if (viewName === 'prevention') this.renderPreventionView();
    else if (viewName === 'roster') this.renderDoctorRoster();
    else if (viewName === 'medications') this.renderMedicationTracker();
  },

  renderDashboard: function() {
    const currentUser = CardioStorage.getCurrentUser();
    let patient = null;

    if (currentUser.role === 'doctor') {
      patient = CardioStorage.getPatients()[0]; // Default to first patient for preview
    } else {
      patient = CardioStorage.getPatientById(currentUser.id) || CardioStorage.getPatients()[0];
    }

    if (!patient) return;

    // Run ML prediction
    const prediction = CardioMLEngine.predictRisk(patient);

    // Update Gauge Score Circle
    const scoreCircle = document.getElementById('dash-score-circle');
    const scoreVal = document.getElementById('dash-score-val');
    const riskBadge = document.getElementById('dash-risk-badge');
    const patientNameHeader = document.getElementById('dash-patient-name');

    if (patientNameHeader) patientNameHeader.textContent = patient.name;
    if (scoreVal) scoreVal.textContent = `${prediction.riskScore}%`;

    if (scoreCircle) {
      scoreCircle.className = `risk-score-circle ${prediction.riskClass}`;
    }

    if (riskBadge) {
      riskBadge.textContent = `${prediction.riskCategory} (${prediction.riskScore}%)`;
      riskBadge.className = `risk-badge-large ${prediction.riskClass}`;
    }

    // Render Metrics Cards
    document.getElementById('metric-bp').textContent = `${patient.sysBP}/${patient.diaBP} mmHg`;
    document.getElementById('metric-chol').textContent = `${patient.cholesterol} mg/dL`;
    document.getElementById('metric-bmi').textContent = `${patient.bmi} kg/m²`;
    document.getElementById('metric-hr').textContent = `${patient.maxHR} bpm`;

    // Render Charts
    this.renderRiskTrajectoryChart(patient);
    this.renderTopRiskDriversChart(prediction.xaiFactors);
  },

  renderRiskTrajectoryChart: function(patient) {
    const ctx = document.getElementById('chart-risk-history');
    if (!ctx) return;

    if (this.charts.trajectory) this.charts.trajectory.destroy();

    this.charts.trajectory = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['6 Months Ago', '4 Months Ago', '2 Months Ago', 'Current Scan'],
        datasets: [{
          label: 'Cardiovascular Risk %',
          data: [
            Math.min(95, patient.riskScore + 8),
            Math.min(92, patient.riskScore + 4),
            Math.min(90, patient.riskScore + 2),
            patient.riskScore
          ],
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointBackgroundColor: '#f43f5e'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8' } }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { min: 0, max: 100, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  },

  renderTopRiskDriversChart: function(xaiFactors) {
    const ctx = document.getElementById('chart-top-drivers');
    if (!ctx) return;

    if (this.charts.drivers) this.charts.drivers.destroy();

    const topFactors = xaiFactors.slice(0, 5);
    const labels = topFactors.map(f => f.feature);
    const data = topFactors.map(f => Math.round(f.impact));
    const bgColors = topFactors.map(f => f.impact > 0 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)');

    this.charts.drivers = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Risk Contribution Index (+/- %)',
          data: data,
          backgroundColor: bgColors,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
        }
      }
    });
  },

  renderXAIView: function() {
    const currentUser = CardioStorage.getCurrentUser();
    const patient = CardioStorage.getPatientById(currentUser.id) || CardioStorage.getPatients()[0];
    const prediction = CardioMLEngine.predictRisk(patient);

    const listContainer = document.getElementById('xai-factors-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    prediction.xaiFactors.forEach(factor => {
      const isPositive = factor.impact >= 0;
      const absVal = Math.abs(Math.round(factor.impact));
      const widthPct = Math.min(100, absVal * 4 + 10);

      const itemHtml = `
        <div class="xai-item">
          <div class="xai-factor-name">${factor.feature}</div>
          <div class="xai-bar-container">
            <div class="xai-bar-fill ${isPositive ? 'positive' : 'negative'}" style="width: ${widthPct}%"></div>
          </div>
          <div class="xai-score-impact ${isPositive ? 'impact-high' : 'impact-low'}">
            ${isPositive ? '+' : '-'}${absVal}%
          </div>
        </div>
        <div style="font-size:0.78rem; color:#64748b; margin:-0.4rem 0 0.4rem 1rem;">
          ${factor.value} • ${factor.description}
        </div>
      `;
      listContainer.insertAdjacentHTML('beforeend', itemHtml);
    });
  },

  initWhatIfSimulator: function() {
    const currentUser = CardioStorage.getCurrentUser();
    const patient = CardioStorage.getPatientById(currentUser.id) || CardioStorage.getPatients()[0];

    document.getElementById('sim-bp').value = patient.sysBP;
    document.getElementById('sim-chol').value = patient.cholesterol;
    document.getElementById('sim-smoke').value = patient.smoking;
    document.getElementById('sim-exercise').value = patient.exerciseDays;
    document.getElementById('sim-bmi').value = patient.bmi;

    this.updateWhatIfSimulation();
  },

  updateWhatIfSimulation: function() {
    const currentUser = CardioStorage.getCurrentUser();
    const baselinePatient = CardioStorage.getPatientById(currentUser.id) || CardioStorage.getPatients()[0];
    const baselinePrediction = CardioMLEngine.predictRisk(baselinePatient);

    const simBp = parseFloat(document.getElementById('sim-bp').value);
    const simChol = parseFloat(document.getElementById('sim-chol').value);
    const simSmoke = document.getElementById('sim-smoke').value;
    const simExercise = parseFloat(document.getElementById('sim-exercise').value);
    const simBmi = parseFloat(document.getElementById('sim-bmi').value);

    // Update labels
    document.getElementById('val-sim-bp').textContent = `${simBp} mmHg`;
    document.getElementById('val-sim-chol').textContent = `${simChol} mg/dL`;
    document.getElementById('val-sim-smoke').textContent = simSmoke.toUpperCase();
    document.getElementById('val-sim-exercise').textContent = `${simExercise} days/wk`;
    document.getElementById('val-sim-bmi').textContent = `${simBmi} kg/m²`;

    const modifiedPatient = {
      ...baselinePatient,
      sysBP: simBp,
      cholesterol: simChol,
      smoking: simSmoke,
      exerciseDays: simExercise,
      bmi: simBmi
    };

    const newPrediction = CardioMLEngine.predictRisk(modifiedPatient);

    const baseScoreEl = document.getElementById('sim-base-score');
    const newScoreEl = document.getElementById('sim-new-score');
    const deltaEl = document.getElementById('sim-delta');

    if (baseScoreEl) baseScoreEl.textContent = `${baselinePrediction.riskScore}%`;
    if (newScoreEl) newScoreEl.textContent = `${newPrediction.riskScore}%`;

    const delta = baselinePrediction.riskScore - newPrediction.riskScore;
    if (deltaEl) {
      if (delta > 0) {
        deltaEl.textContent = `-${delta}% Risk Reduction!`;
        deltaEl.style.color = '#10b981';
      } else if (delta < 0) {
        deltaEl.textContent = `+${Math.abs(delta)}% Risk Increase`;
        deltaEl.style.color = '#ef4444';
      } else {
        deltaEl.textContent = 'No Change';
        deltaEl.style.color = '#94a3b8';
      }
    }
  },

  renderPreventionView: function() {
    const currentUser = CardioStorage.getCurrentUser();
    const patient = CardioStorage.getPatientById(currentUser.id) || CardioStorage.getPatients()[0];
    const prediction = CardioMLEngine.predictRisk(patient);
    const plan = prediction.preventivePlan;

    // Diet container
    const dietBox = document.getElementById('plan-diet-list');
    if (dietBox) {
      dietBox.innerHTML = plan.diet.map(item => `
        <div style="margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid rgba(255,255,255,0.05);">
          <div style="font-weight:600; color:#14b8a6;">🍎 ${item.title}</div>
          <div style="font-size:0.85rem; color:#94a3b8; margin-top:0.25rem;">${item.desc}</div>
        </div>
      `).join('');
    }

    // Exercise container
    const exBox = document.getElementById('plan-exercise-list');
    if (exBox) {
      exBox.innerHTML = plan.exercise.map(item => `
        <div style="margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid rgba(255,255,255,0.05);">
          <div style="font-weight:600; color:#f59e0b;">🏃 ${item.title}</div>
          <div style="font-size:0.85rem; color:#94a3b8; margin-top:0.25rem;">${item.desc}</div>
        </div>
      `).join('');
    }

    // Checkups list
    const checkupBox = document.getElementById('plan-checkups-list');
    if (checkupBox) {
      checkupBox.innerHTML = plan.checkups.map(c => `
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem; font-size:0.9rem; color:#f1f5f9;">
          <span style="color:#f43f5e;">✔</span> ${c}
        </div>
      `).join('');
    }
  },

  renderDoctorRoster: function() {
    const patients = CardioStorage.getPatients();
    const tbody = document.getElementById('doctor-patient-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    patients.forEach(p => {
      const pred = CardioMLEngine.predictRisk(p);
      const row = `
        <tr>
          <td style="font-weight:600;">${p.name} <div style="font-size:0.75rem; color:#64748b;">${p.id}</div></td>
          <td>${p.age} / ${p.gender === 'male' ? 'M' : 'F'}</td>
          <td>${p.sysBP}/${p.diaBP} mmHg</td>
          <td>${p.cholesterol} mg/dL</td>
          <td><span class="badge ${pred.riskClass === 'high' ? 'badge-primary' : (pred.riskClass === 'medium' ? 'badge-patient' : 'badge-doctor')}">${pred.riskCategory} (${pred.riskScore}%)</span></td>
          <td>
            <button class="btn btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="CardioApp.openDoctorModal('${p.id}')">
              📝 Edit Clinical Notes
            </button>
          </td>
        </tr>
      `;
      tbody.insertAdjacentHTML('beforeend', row);
    });
  },

  openDoctorModal: function(patientId) {
    const patient = CardioStorage.getPatientById(patientId);
    if (!patient) return;

    document.getElementById('modal-patient-id').value = patient.id;
    document.getElementById('modal-patient-name').textContent = patient.name;
    document.getElementById('modal-notes-textarea').value = patient.doctorNotes || '';

    const modal = document.getElementById('doctor-notes-modal');
    if (modal) modal.classList.add('active');
  },

  closeDoctorModal: function() {
    const modal = document.getElementById('doctor-notes-modal');
    if (modal) modal.classList.remove('active');
  },

  saveDoctorNotes: function() {
    const patientId = document.getElementById('modal-patient-id').value;
    const notes = document.getElementById('modal-notes-textarea').value;

    CardioStorage.updateDoctorNotes(patientId, notes);
    this.closeDoctorModal();
    this.renderDoctorRoster();
    this.showToast('Clinical notes updated successfully!');
  },

  renderMedicationTracker: function() {
    const currentUser = CardioStorage.getCurrentUser();
    const patient = CardioStorage.getPatientById(currentUser.id) || CardioStorage.getPatients()[0];
    const pred = CardioMLEngine.predictRisk(patient);
    const meds = pred.preventivePlan.medications;

    const medContainer = document.getElementById('medication-list');
    if (!medContainer) return;

    if (meds.length === 0) {
      medContainer.innerHTML = '<div style="color:#94a3b8;">No chronic medications prescribed at this risk level. Maintain healthy diet & exercise!</div>';
      return;
    }

    medContainer.innerHTML = meds.map((m, idx) => `
      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--bg-card-border); padding:1rem; border-radius:var(--radius-sm); margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-weight:600; font-size:1rem; color:#f1f5f9;">💊 ${m.name}</div>
          <div style="font-size:0.85rem; color:#14b8a6; margin-top:0.2rem;">${m.frequency}</div>
          <div style="font-size:0.8rem; color:#64748b;">Target: ${m.purpose}</div>
        </div>
        <button class="btn btn-outline-teal" onclick="CardioApp.showToast('Medication dose logged for today!')">
          Take Dose
        </button>
      </div>
    `).join('');
  },

  handleAssessmentSubmit: function() {
    const currentUser = CardioStorage.getCurrentUser();

    const newRecord = {
      id: currentUser.role === 'patient' ? currentUser.id : 'P-' + Math.floor(10000 + Math.random() * 90000),
      name: document.getElementById('input-name').value || currentUser.name,
      age: parseFloat(document.getElementById('input-age').value),
      gender: document.getElementById('input-gender').value,
      sysBP: parseFloat(document.getElementById('input-sys-bp').value),
      diaBP: parseFloat(document.getElementById('input-dia-bp').value),
      cholesterol: parseFloat(document.getElementById('input-cholesterol').value),
      fbs: parseFloat(document.getElementById('input-fbs').value),
      bmi: parseFloat(document.getElementById('input-bmi').value),
      maxHR: parseFloat(document.getElementById('input-max-hr').value),
      smoking: document.getElementById('input-smoking').value,
      exerciseDays: parseFloat(document.getElementById('input-exercise').value),
      familyHistory: document.getElementById('input-family-history').value === 'yes',
      chestPainType: parseInt(document.getElementById('input-chest-pain').value),
      exAngina: document.getElementById('input-ex-angina').value === 'yes',
      oldpeak: parseFloat(document.getElementById('input-oldpeak').value) || 0.0
    };

    const pred = CardioMLEngine.predictRisk(newRecord);
    newRecord.riskScore = pred.riskScore;
    newRecord.riskCategory = pred.riskCategory;
    newRecord.riskClass = pred.riskClass;

    CardioStorage.savePatientRecord(newRecord);
    this.showToast('Cardiovascular Health Assessment calculated & saved!');
    this.switchView('dashboard');
  },

  printClinicalReport: function() {
    window.print();
  },

  showToast: function(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>💓</span> <span>${msg}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 4000);
  }
};

window.CardioApp = CardioApp;

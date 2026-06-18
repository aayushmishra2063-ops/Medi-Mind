
// ============================================================
//  STATE
// ============================================================
const state = {
  contact: '',
  otpCode: '',
  password: '',
  profile: null,
  mode: 'login', // 'login' | 'signup'
};

let timerInterval = null;
let backendAvailable = false;
let pendingSaveTimer = null;

// ============================================================
//  NAVIGATION
// ============================================================
function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) { target.classList.add('active'); target.scrollIntoView({behavior:'smooth',block:'start'}); }
}

// ============================================================
//  TOAST
// ============================================================
let toastTimer;
function toast(msg, type = 'green', duration = 3200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, duration);
}

// ============================================================
//  TABS
// ============================================================
function switchTab(tab) {
  state.mode = tab;
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('form-login').style.display  = tab === 'login'  ? 'block' : 'none';
  document.getElementById('form-signup').style.display = tab === 'signup' ? 'block' : 'none';
  clearErr('login-error'); clearErr('signup-contact-error');
}

// ============================================================
//  UTILITIES
// ============================================================
function showErr(id, msg) { const el = document.getElementById(id); if(el){el.textContent=msg; el.style.display='block';} }
function clearErr(id)     { const el = document.getElementById(id); if(el){ el.style.display='none'; el.textContent=''; } }
function val(id)          { return document.getElementById(id)?.value.trim() ?? ''; }

function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const showing = inp.type === 'text';
  inp.type = showing ? 'password' : 'text';
  btn.innerHTML = showing
    ? `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`
    : `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7 1.274-4.057 5.065-7 9.542-7"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4l16 16"/></svg>`;
}

function isValidContact(s) {
  return /^[\w.+-]+@[\w-]+\.\w{2,}$/.test(s) || /^\+?\d{7,15}$/.test(s);
}

function saveLocal(key, val) { try { localStorage.setItem('mm_'+key, JSON.stringify(val)); } catch(e){} }
function loadLocal(key)      { try { return JSON.parse(localStorage.getItem('mm_'+key)); } catch(e){ return null; } }

async function apiRequest(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || 'Database request failed.');
  }
  backendAvailable = true;
  return data;
}

function applyWellnessData(user) {
  const todayStr = new Date().toISOString().split('T')[0];
  state.prescriptions = user.prescriptions || [];
  state.meals = (user.mealsByDate || {})[todayStr] || [];
  state.waterIntake = (user.waterByDate || {})[todayStr] || 0;
  state.workouts = (user.workoutsByDate || {})[todayStr] || [];
  state.labTests = user.labTests || [];
  state.medicationReminders = user.medicationReminders || [];
}

function currentWellnessData() {
  const todayStr = new Date().toISOString().split('T')[0];
  const storedUsers = loadLocal('users') || {};
  const user = storedUsers[state.contact] || {};
  if (!user.mealsByDate) user.mealsByDate = {};
  if (!user.waterByDate) user.waterByDate = {};
  if (!user.workoutsByDate) user.workoutsByDate = {};

  user.prescriptions = state.prescriptions || [];
  user.labTests = state.labTests || [];
  user.medicationReminders = state.medicationReminders || [];
  user.mealsByDate[todayStr] = state.meals || [];
  user.waterByDate[todayStr] = state.waterIntake || 0;
  user.workoutsByDate[todayStr] = state.workouts || [];
  return user;
}

function renderWellnessInterfaces() {
  renderPrescriptions();
  renderDietSummary();
  renderMeals();
  renderNutritionScore();
  renderWorkouts();
  renderExerciseRecommendations();
  renderLabTests();
  renderMedicationReminders();
  checkLabTestReminders();
}

let labTestRemindersChecked = false;

function checkLabTestReminders() {
  if (labTestRemindersChecked) return;
  if (!state.labTests || state.labTests.length === 0) return;
  const today = new Date().toISOString().split('T')[0];
  const todayTests = state.labTests.filter(t => !t.completed && t.date === today);
  if (todayTests.length > 0) {
    const listNames = todayTests.map(t => t.name).join(', ');
    toast(`⚠️ Scheduled Lab Test today: ${listNames}`, 'yellow', 5000);
    labTestRemindersChecked = true;
  }
}

// ============================================================
//  OTP TIMER
// ============================================================
function startTimer() {
  clearInterval(timerInterval);
  let secs = 60;
  const el = document.getElementById('timer-count');
  const btn = document.getElementById('resend-btn');
  if(btn) btn.disabled = true;
  document.getElementById('timer-text').style.display = 'block';
  timerInterval = setInterval(() => {
    secs--;
    if(el) el.textContent = secs;
    if(secs <= 0) {
      clearInterval(timerInterval);
      document.getElementById('timer-text').style.display = 'none';
      if(btn) btn.disabled = false;
    }
  }, 1000);
}

// ============================================================
//  PASSWORD STRENGTH
// ============================================================
function checkStrength(pw) {
  const fill  = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');
  if (!fill || !label) return;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  const levels = [
    { w: '0%', bg: '#e5e7eb', txt: 'Enter password' },
    { w: '25%', bg: '#ef4444', txt: 'Weak' },
    { w: '50%', bg: '#f59e0b', txt: 'Fair' },
    { w: '75%', bg: '#3b82f6', txt: 'Good' },
    { w: '100%', bg: '#10b981', txt: 'Strong ✓' },
  ];
  const lvl = pw.length === 0 ? levels[0] : levels[score];
  fill.style.width = lvl.w;
  fill.style.background = lvl.bg;
  label.textContent = lvl.txt;
  label.style.color = lvl.bg;
}

// ============================================================
//  OTP BOXES — auto-advance & backspace
// ============================================================
document.querySelectorAll('.otp-box').forEach((box, i, boxes) => {
  box.addEventListener('input', e => {
    const v = e.target.value.replace(/\D/g,'');
    e.target.value = v.slice(-1);
    clearErr('otp-error');
    if (v && i < boxes.length - 1) boxes[i+1].focus();
  });
  box.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !box.value && i > 0) boxes[i-1].focus();
  });
  box.addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g,'');
    [...text.slice(0,6)].forEach((ch,j) => { if(boxes[i+j]) boxes[i+j].value = ch; });
    if(boxes[Math.min(i+text.length, 5)]) boxes[Math.min(i+text.length, 5)].focus();
  });
});

function getOtpValue() {
  return [...document.querySelectorAll('.otp-box')].map(b => b.value).join('');
}
function clearOtpBoxes() {
  document.querySelectorAll('.otp-box').forEach(b => b.value = '');
  document.querySelectorAll('.otp-box')[0]?.focus();
}

// ============================================================
//  FLOW: LOGIN
// ============================================================
async function handleLogin() {
  clearErr('login-error');
  const contact  = val('login-contact');
  const password = val('login-password');
  if (!contact || !password) { showErr('login-error','Please fill in all fields.'); return; }
  if (!isValidContact(contact)) { showErr('login-error','Enter a valid email or phone.'); return; }

  try {
    const data = await apiRequest('/api/login/', {
      method: 'POST',
      body: JSON.stringify({ contact, password })
    });
    state.contact = contact;
    state.profile = data.profile || null;
    localStorage.setItem('mm_user_id', data.user_id || '');

    const storedUsers = loadLocal('users') || {};
    storedUsers[contact] = {
      ...(storedUsers[contact] || {}),
      password: btoa(password),
      profile: state.profile,
      ...(data.wellness || {})
    };
    saveLocal('users', storedUsers);
  } catch(e) {
    const storedUsers = loadLocal('users') || {};
    const user = storedUsers[contact];
    if (!user) { showErr('login-error','No account found. Please sign up.'); return; }
    if (user.password !== btoa(password)) { showErr('login-error','Incorrect password.'); return; }
    backendAvailable = false;
    state.contact = contact;
    state.profile = user.profile || null;
  }

  toast(backendAvailable ? 'Login successful! Database connected.' : 'Login successful! Offline mode.', 'green');

  if (state.profile) {
    showDashboard();
  } else {
    goTo('screen-profile');
  }
}

// ============================================================
//  FLOW: SIGNUP — send code
// ============================================================
function handleSendCode() {
  clearErr('signup-contact-error');
  const contact = val('signup-contact');
  if (!isValidContact(contact)) { showErr('signup-contact-error','Enter a valid email or phone number.'); return; }
  state.contact = contact;
  state.otpCode = String(Math.floor(100000 + Math.random() * 900000));

  document.getElementById('otp-contact-label').textContent = contact;
  document.getElementById('otp-code-display').textContent  = state.otpCode;
  document.getElementById('otp-hint').style.display = 'block';
  clearOtpBoxes();
  clearErr('otp-error');
  startTimer();
  goTo('screen-otp');
  toast('Code sent! (shown above for demo)', 'green');
}

// ============================================================
//  FLOW: OTP VERIFY
// ============================================================
function handleVerifyOtp() {
  clearErr('otp-error');
  const entered = getOtpValue();
  if (entered.length < 6) { showErr('otp-error','Enter all 6 digits.'); return; }
  if (entered !== state.otpCode) { showErr('otp-error','Incorrect code — try again.'); clearOtpBoxes(); return; }

  clearInterval(timerInterval);
  toast('Verified! ✓', 'green');
  goTo('screen-password');
}

// ============================================================
//  FLOW: RESEND
// ============================================================
function handleResend() {
  state.otpCode = String(Math.floor(100000 + Math.random() * 900000));
  document.getElementById('otp-code-display').textContent = state.otpCode;
  document.getElementById('otp-hint').style.display = 'block';
  clearOtpBoxes(); clearErr('otp-error');
  startTimer();
  toast('New code generated!', 'yellow');
}

// ============================================================
//  FLOW: SET PASSWORD
// ============================================================
function handleSetPassword() {
  clearErr('pw-error');
  const pw  = val('new-password');
  const cpw = val('confirm-password');
  if (pw.length < 8) { showErr('pw-error','Password must be at least 8 characters.'); return; }
  if (pw !== cpw)    { showErr('pw-error','Passwords do not match.'); return; }
  state.password = pw;
  toast('Password set!', 'green');
  goTo('screen-profile');
}

// ============================================================
//  FLOW: SAVE PROFILE
// ============================================================
async function handleSaveProfile() {
  clearErr('profile-error');
  const first  = val('p-first');
  const last   = val('p-last');
  const age    = val('p-age');
  const height = val('p-height');
  const weight = val('p-weight');
  const blood  = val('p-blood');

  if (!first||!last||!age||!height||!weight||!blood) {
    showErr('profile-error','Please fill in all fields.'); return;
  }

  const profile = { firstName:first, lastName:last, age:parseInt(age), height:parseFloat(height), weight:parseFloat(weight), bloodGroup:blood };
  state.profile = profile;

  const storedUsers = loadLocal('users') || {};
  storedUsers[state.contact] = {
    ...(storedUsers[state.contact] || {}),
    password: state.password ? btoa(state.password) : (storedUsers[state.contact]?.password || ''),
    profile
  };
  saveLocal('users', storedUsers);

  if (state.password) {
    try {
      const data = await apiRequest('/api/signup/', {
        method: 'POST',
        body: JSON.stringify({ contact: state.contact, password: state.password, profile })
      });
      localStorage.setItem('mm_user_id', data.user_id || '');
      backendAvailable = true;
    } catch(e) {
      backendAvailable = false;
    }
  } else if (backendAvailable) {
    try {
      await apiRequest('/api/profile/', {
        method: 'POST',
        body: JSON.stringify({ contact: state.contact, profile })
      });
    } catch(e) {
      backendAvailable = false;
    }
  }

  toast(backendAvailable ? 'Profile saved to database!' : 'Profile saved locally.', 'green');
  showDashboard();
}

// ============================================================
//  SHOW DASHBOARD
// ============================================================
// ============================================================
//  SHOW DASHBOARD & LOAD WELLNESS DATA
// ============================================================
function showDashboard() {
  const p = state.profile;
  if (p) {
    document.getElementById('welcome-badge').textContent = `👋 Hi, ${p.firstName}!`;
    document.getElementById('sum-age').textContent    = p.age;
    document.getElementById('sum-height').textContent = p.height;
    document.getElementById('sum-weight').textContent = p.weight;
    document.getElementById('sum-blood').textContent  = p.bloodGroup;
    document.getElementById('profile-summary').style.display = 'grid';
    
    // Load wellness data for active user
    loadUserData();
  }
  goTo('screen-home');
}

// ============================================================
//  USER DATA STORES (LOCALSTORAGE SYNC BY DATE)
// ============================================================
function loadUserData() {
  if (!state.contact) return;
  const storedUsers = loadLocal('users') || {};
  const user = storedUsers[state.contact] || {};
  applyWellnessData(user);
  renderWellnessInterfaces();

  apiRequest(`/api/wellness/?contact=${encodeURIComponent(state.contact)}`)
    .then(data => {
      const stored = loadLocal('users') || {};
      stored[state.contact] = {
        ...(stored[state.contact] || {}),
        password: stored[state.contact]?.password || '',
        profile: state.profile,
        ...(data.wellness || {})
      };
      saveLocal('users', stored);
      applyWellnessData(stored[state.contact]);
      renderWellnessInterfaces();
    })
    .catch(() => { backendAvailable = false; });
}

function saveUserData() {
  if (!state.contact) return;
  const storedUsers = loadLocal('users') || {};
  const user = currentWellnessData();
  storedUsers[state.contact] = {
    ...(storedUsers[state.contact] || {}),
    password: storedUsers[state.contact]?.password || (state.password ? btoa(state.password) : ''),
    profile: state.profile,
    ...user
  };
  saveLocal('users', storedUsers);

  clearTimeout(pendingSaveTimer);
  pendingSaveTimer = setTimeout(() => {
    apiRequest('/api/wellness/', {
      method: 'POST',
      body: JSON.stringify({ contact: state.contact, data: currentWellnessData() })
    }).catch(() => { backendAvailable = false; });
  }, 250);
}

// ============================================================
//  PRESCRIPTION MANAGER LOGIC
// ============================================================
function renderPrescriptions() {
  const container = document.getElementById('prescription-list-container');
  if (!container) return;
  container.innerHTML = '';
  
  if (!state.prescriptions || state.prescriptions.length === 0) {
    container.innerHTML = `<p style="color: var(--gray-400); font-size: 0.85rem; text-align: center; margin-top: 2rem;">No prescriptions saved yet.</p>`;
    return;
  }
  
  state.prescriptions.forEach(p => {
    const listHtml = p.medications.map((m, idx) => `
      <li>
        <input type="checkbox" id="med-${p.id}-${idx}" ${m.taken ? 'checked' : ''} onchange="toggleMedicationTaken('${p.id}', ${idx})">
        <label for="med-${p.id}-${idx}" style="display:inline; font-weight:normal; margin-bottom:0; cursor:pointer; text-decoration: ${m.taken ? 'line-through' : 'none'}; color: ${m.taken ? 'var(--gray-400)' : 'var(--gray-600)'}">
          ${m.details}
        </label>
      </li>
    `).join('');

    const item = document.createElement('div');
    item.className = 'prescription-item';
    item.innerHTML = `
      <div class="prescription-header">
        <div>
          <div class="presc-doc">👨‍⚕️ ${p.doctorName}</div>
          <div class="presc-date">Saved: ${p.date}</div>
        </div>
        <button class="presc-delete-btn" onclick="deletePrescription('${p.id}')" aria-label="Delete prescription">🗑</button>
      </div>
      <ul class="prescription-meds">
        ${listHtml}
      </ul>
    `;
    container.appendChild(item);
  });
}

function handleAddPrescriptionManual() {
  const docName = val('presc-doc-name');
  const medName = val('presc-med-name');
  
  if (!docName || !medName) {
    toast('Please fill in doctor and medication details.', 'red');
    return;
  }
  
  const dateStr = new Date().toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
  
  const newPresc = {
    id: 'presc-' + Date.now(),
    doctorName: docName,
    date: dateStr,
    medications: [{details: medName, taken: false}]
  };
  
  if (!state.prescriptions) state.prescriptions = [];
  state.prescriptions.unshift(newPresc);
  saveUserData();
  renderPrescriptions();
  toast('Prescription saved!', 'green');
  
  document.getElementById('presc-doc-name').value = '';
  document.getElementById('presc-med-name').value = '';
}

function toggleMedicationTaken(prescId, medIdx) {
  const p = state.prescriptions.find(presc => presc.id === prescId);
  if (p && p.medications[medIdx]) {
    p.medications[medIdx].taken = !p.medications[medIdx].taken;
    saveUserData();
    renderPrescriptions();
    renderNutritionScore();
  }
}

function deletePrescription(id) {
  state.prescriptions = state.prescriptions.filter(p => p.id !== id);
  saveUserData();
  renderPrescriptions();
  toast('Prescription deleted.', 'yellow');
}

// ============================================================
//  DIET MANAGER LOGIC
// ============================================================
function getDailyCalorieTarget() {
  const p = state.profile;
  if (!p || !p.weight || !p.height || !p.age) {
    return 2000;
  }
  // Mifflin-St Jeor formula for baseline BMR
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + 5;
  // standard activity multiplier (light active)
  return Math.round(bmr * 1.35);
}

function renderDietSummary() {
  const baseTarget = getDailyCalorieTarget();
  
  // Sum logged meals
  const totalLogged = state.meals ? state.meals.reduce((sum, m) => sum + m.calories, 0) : 0;
  
  // Sum burned workouts
  const totalBurned = state.workouts ? state.workouts.reduce((sum, w) => sum + w.caloriesBurned, 0) : 0;
  
  // Adjusted target allowance
  const adjustedTarget = baseTarget + totalBurned;
  const remaining = adjustedTarget - totalLogged;
  
  // Update text
  const dietTargetEl = document.getElementById('diet-cal-target');
  const dietLoggedEl = document.getElementById('diet-cal-logged');
  const dietBurnedEl = document.getElementById('diet-cal-burned');
  const dietRemainingEl = document.getElementById('diet-cal-remaining');
  
  if (dietTargetEl) dietTargetEl.textContent = adjustedTarget;
  if (dietLoggedEl) dietLoggedEl.textContent = totalLogged;
  if (dietBurnedEl) dietBurnedEl.textContent = totalBurned;
  
  if (dietRemainingEl) {
    dietRemainingEl.textContent = Math.abs(remaining);
    const circle = dietRemainingEl.parentElement;
    const label = circle.querySelector('.calorie-label');
    if (remaining >= 0) {
      label.textContent = 'kcal left';
      circle.style.borderColor = 'var(--green-main)';
      dietRemainingEl.style.color = 'var(--green-dark)';
    } else {
      label.textContent = 'kcal over';
      circle.style.borderColor = 'var(--red)';
      dietRemainingEl.style.color = 'var(--red)';
    }
  }
  
  // Macros details
  const pWeight = (state.profile && state.profile.weight) ? state.profile.weight : 70;
  const targetProtein = Math.round(pWeight * 1.6); // 1.6g per kg of weight
  const targetCarbs = Math.round((adjustedTarget * 0.50) / 4); // 50% carbs
  const targetFats = Math.round((adjustedTarget * 0.25) / 9); // 25% fats
  
  const loggedProtein = state.meals ? state.meals.reduce((sum, m) => sum + m.protein, 0) : 0;
  const loggedCarbs = state.meals ? state.meals.reduce((sum, m) => sum + m.carbs, 0) : 0;
  const loggedFats = state.meals ? state.meals.reduce((sum, m) => sum + m.fats, 0) : 0;
  
  // Update macro labels and bars
  const pLbl = document.getElementById('diet-macro-protein-label');
  const pBar = document.getElementById('diet-macro-protein-bar');
  if (pLbl && pBar) {
    pLbl.textContent = `${loggedProtein}g / ${targetProtein}g`;
    pBar.style.width = Math.min((loggedProtein / targetProtein) * 100, 100) + '%';
  }
  
  const cLbl = document.getElementById('diet-macro-carbs-label');
  const cBar = document.getElementById('diet-macro-carbs-bar');
  if (cLbl && cBar) {
    cLbl.textContent = `${loggedCarbs}g / ${targetCarbs}g`;
    cBar.style.width = Math.min((loggedCarbs / targetCarbs) * 100, 100) + '%';
  }
  
  const fLbl = document.getElementById('diet-macro-fats-label');
  const fBar = document.getElementById('diet-macro-fats-bar');
  if (fLbl && fBar) {
    fLbl.textContent = `${loggedFats}g / ${targetFats}g`;
    fBar.style.width = Math.min((loggedFats / targetFats) * 100, 100) + '%';
  }
  
  // Hydration summary
  const waterTextEl = document.getElementById('water-intake-text');
  if (waterTextEl) {
    waterTextEl.textContent = `Logged: ${state.waterIntake || 0} / 2500 ml`;
  }

  const recommendationEl = document.getElementById('diet-recommendation-text');
  if (recommendationEl) {
    if (totalLogged === 0) {
      recommendationEl.textContent = 'Start with a balanced meal: protein, fiber-rich carbs, healthy fats, and water.';
    } else if ((state.waterIntake || 0) < 1500) {
      recommendationEl.textContent = 'Hydration is behind today. Add 2-4 glasses of water before your next meal.';
    } else if (loggedProtein < targetProtein * 0.7) {
      recommendationEl.textContent = `Protein is low for your goal. Add curd, paneer, dal, eggs, tofu, fish, or chicken to your next meal.`;
    } else if (remaining < 0) {
      recommendationEl.textContent = 'You are over your calorie target. Keep dinner lighter and choose a walk or gentle cardio.';
    } else {
      recommendationEl.textContent = 'Good balance so far. Keep your next meal colorful with vegetables and a steady protein source.';
    }
  }
}

function renderMeals() {
  const container = document.getElementById('diet-meal-log-container');
  if (!container) return;
  container.innerHTML = '';
  
  if (!state.meals || state.meals.length === 0) {
    container.innerHTML = `<p style="color: var(--gray-400); font-size: 0.85rem; text-align: center; margin-top: 1rem;">No meals logged today.</p>`;
    return;
  }
  
  state.meals.forEach(m => {
    const item = document.createElement('div');
    item.className = 'prescription-item';
    item.style.padding = '0.75rem';
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color: var(--green-dark); font-size:0.9rem">${m.name}</strong>
          <span style="font-size:0.7rem; color:var(--gray-400); text-transform:capitalize; margin-left:0.4rem;">(${m.mealType})</span>
          <div style="font-size:0.72rem; color:var(--gray-600); margin-top:0.15rem;">
            P: ${m.protein}g · C: ${m.carbs}g · F: ${m.fats}g
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <strong style="color: var(--green-main); font-size:0.9rem;">${m.calories} kcal</strong>
          <button class="presc-delete-btn" onclick="deleteMeal('${m.id}')" aria-label="Delete meal">🗑</button>
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

function handleAddMealManual() {
  const name = val('diet-food-name');
  const mealType = document.getElementById('diet-food-meal').value;
  const cals = parseInt(val('diet-food-cals'));
  const protein = parseInt(val('diet-food-protein') || '0');
  const carbs = parseInt(val('diet-food-carbs') || '0');
  const fats = parseInt(val('diet-food-fats') || '0');
  
  if (!name || isNaN(cals)) {
    toast('Please fill in food item and calories.', 'red');
    return;
  }
  
  const newMeal = {
    id: 'meal-' + Date.now(),
    name,
    mealType,
    calories: cals,
    protein,
    carbs,
    fats
  };
  
  if (!state.meals) state.meals = [];
  state.meals.push(newMeal);
  saveUserData();
  renderMeals();
  renderDietSummary();
  renderNutritionScore();
  toast('Food logged!', 'green');
  
  document.getElementById('diet-food-name').value = '';
  document.getElementById('diet-food-cals').value = '';
  document.getElementById('diet-food-protein').value = '';
  document.getElementById('diet-food-carbs').value = '';
  document.getElementById('diet-food-fats').value = '';
}

function handleQuickAddMeal(name, calories, protein, carbs, fats, mealType) {
  const newMeal = {
    id: 'meal-' + Date.now(),
    name,
    mealType,
    calories,
    protein,
    carbs,
    fats
  };
  
  if (!state.meals) state.meals = [];
  state.meals.push(newMeal);
  saveUserData();
  renderMeals();
  renderDietSummary();
  renderNutritionScore();
  toast(`${name} added!`, 'green');
}

function deleteMeal(id) {
  state.meals = state.meals.filter(m => m.id !== id);
  saveUserData();
  renderMeals();
  renderDietSummary();
  renderNutritionScore();
  toast('Meal entry removed.', 'yellow');
}

function handleAddWater() {
  state.waterIntake = (state.waterIntake || 0) + 250;
  saveUserData();
  renderDietSummary();
  renderNutritionScore();
  if (state.waterIntake >= 2500) {
    toast('Hydration goal met! Outstanding hydration today! 💧', 'green');
  } else {
    toast('+250ml logged. Keep drinking water!', 'green');
  }
}

// ============================================================
//  NUTRITION SCORE LOGIC
// ============================================================
function renderNutritionScore() {
  const scoreNumEl = document.getElementById('nutrition-score-num');
  const scoreGradeEl = document.getElementById('nutrition-score-grade');
  const gaugeFillEl = document.getElementById('nutrition-gauge-fill');
  const container = document.getElementById('nutrition-status-container');
  
  if (!scoreNumEl || !container) return;
  
  let score = 100;
  const advices = [];
  
  const baseTarget = getDailyCalorieTarget();
  const totalLogged = state.meals ? state.meals.reduce((sum, m) => sum + m.calories, 0) : 0;
  const totalBurned = state.workouts ? state.workouts.reduce((sum, w) => sum + w.caloriesBurned, 0) : 0;
  const adjustedTarget = baseTarget + totalBurned;
  
  const pWeight = (state.profile && state.profile.weight) ? state.profile.weight : 70;
  const targetProtein = Math.round(pWeight * 1.6);
  const loggedProtein = state.meals ? state.meals.reduce((sum, m) => sum + m.protein, 0) : 0;
  
  // 1. Water Intake Deductions
  if (!state.waterIntake || state.waterIntake < 2500) {
    const missing = 2500 - (state.waterIntake || 0);
    const penalty = Math.round((missing / 2500) * 30);
    score -= penalty;
    advices.push({
      type: 'warn',
      icon: '💧',
      title: 'Water Hydration Deficit',
      desc: `You need ${missing}ml more water to reach your 2.5L daily target. Keep drinking water.`
    });
  } else {
    advices.push({
      type: 'good',
      icon: '✓',
      title: 'Hydration Target Achieved',
      desc: `Fantastic work logging ${state.waterIntake}ml water today. Your body is well-hydrated.`
    });
  }
  
  // 2. Calories Deductions
  if (totalLogged > adjustedTarget) {
    const surplus = totalLogged - adjustedTarget;
    const penalty = Math.min(30, Math.round((surplus / adjustedTarget) * 100));
    score -= penalty;
    advices.push({
      type: 'warn',
      icon: '🍎',
      title: 'Calorie Limit Surpassed',
      desc: `Logged ${totalLogged} kcal against a target of ${adjustedTarget} kcal (+${surplus} kcal). Log exercises to expand your calorie target.`
    });
  } else if (totalLogged > 0 && totalLogged < adjustedTarget * 0.6) {
    score -= 15;
    advices.push({
      type: 'warn',
      icon: '⚠️',
      title: 'Caloric Intake Too Low',
      desc: `Logged only ${totalLogged} kcal. Eating too little can decelerate your metabolism. Ensure you reach at least 60% of target.`
    });
  } else if (totalLogged > 0) {
    advices.push({
      type: 'good',
      icon: '✓',
      title: 'Calorie Budget Maintained',
      desc: `You have consumed ${totalLogged} kcal today. Great control within your target budget.`
    });
  }
  
  // 3. Protein Deductions
  if (totalLogged > 0) {
    if (loggedProtein < targetProtein * 0.7) {
      score -= 15;
      advices.push({
        type: 'warn',
        icon: '🥩',
        title: 'Protein Intake Deficit',
        desc: `Logged ${loggedProtein}g of protein (Target: ${targetProtein}g). Add protein sources like milk, tofu, paneer, eggs, or chicken.`
      });
    } else {
      advices.push({
        type: 'good',
        icon: '✓',
        title: 'Protein Intake Excellent',
        desc: `Protein levels at ${loggedProtein}g. Great support for muscle synthesis and metabolic health.`
      });
    }
  }
  
  // 4. Workout Bonus
  if (state.workouts && state.workouts.length > 0) {
    score += 10;
    advices.push({
      type: 'good',
      icon: '🏃‍♂️',
      title: 'Active Workout Bonus',
      desc: `Bonus +10 score for logging active workouts today. Keep up the high physical momentum!`
    });
  }
  
  // 5. Prescription Taken Compliance Bonus
  if (state.prescriptions && state.prescriptions.length > 0) {
    const totalMeds = state.prescriptions.reduce((sum, p) => sum + p.medications.length, 0);
    const takenMeds = state.prescriptions.reduce((sum, p) => sum + p.medications.filter(m => m.taken).length, 0);
    if (totalMeds > 0 && takenMeds === totalMeds) {
      score += 5;
      advices.push({
        type: 'good',
        icon: '💊',
        title: 'Perfect Meds Compliance',
        desc: `Logged all scheduled prescription medication dosages. Excellent discipline!`
      });
    }
  }
  
  // Bound score
  score = Math.max(0, Math.min(score, 100));
  
  // Determine Grade
  let grade = 'A+';
  if (score < 60) grade = 'F';
  else if (score < 70) grade = 'D';
  else if (score < 80) grade = 'C';
  else if (score < 90) grade = 'B';
  else if (score < 95) grade = 'A';
  
  scoreNumEl.textContent = score;
  scoreGradeEl.textContent = grade;
  
  // Gauge SVG circular fill
  if (gaugeFillEl) {
    // 440 circumference
    const offset = 440 - (score / 100) * 440;
    gaugeFillEl.style.strokeDashoffset = offset;
    // color shifts based on score
    if (score >= 90) gaugeFillEl.style.stroke = 'var(--teal)';
    else if (score >= 75) gaugeFillEl.style.stroke = 'var(--green-main)';
    else if (score >= 60) gaugeFillEl.style.stroke = '#f59e0b';
    else gaugeFillEl.style.stroke = 'var(--red)';
  }
  
  // Render status items
  container.innerHTML = '';
  if (advices.length === 0) {
    container.innerHTML = `
      <div class="nutrition-status-item good">
        <div class="nutrition-status-icon">✓</div>
        <div>
          <div class="nutrition-status-title">System Ready</div>
          <div class="nutrition-status-desc">Start logging your meals, water intake, and workouts to calculate your live wellness score.</div>
        </div>
      </div>
    `;
    return;
  }
  
  advices.forEach(adv => {
    const div = document.createElement('div');
    div.className = `nutrition-status-item ${adv.type}`;
    div.innerHTML = `
      <div class="nutrition-status-icon">${adv.icon}</div>
      <div>
        <div class="nutrition-status-title">${adv.title}</div>
        <div class="nutrition-status-desc">${adv.desc}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

// ============================================================
//  EXERCISE TRACKER LOGIC
// ============================================================
const MET_VALUES = {
  walking: 3.5,
  running: 8.0,
  cycling: 6.0,
  swimming: 7.0,
  weightlifting: 4.0,
  yoga: 2.5
};

function renderWorkouts() {
  const container = document.getElementById('exercise-log-container');
  if (!container) return;
  container.innerHTML = '';
  
  if (!state.workouts || state.workouts.length === 0) {
    container.innerHTML = `<p style="color: var(--gray-400); font-size: 0.85rem; text-align: center; margin-top: 1.5rem;">No exercises logged today.</p>`;
    return;
  }
  
  state.workouts.forEach(w => {
    const item = document.createElement('div');
    item.className = 'exercise-log-item';
    item.innerHTML = `
      <div>
        <div class="exercise-log-name" style="text-transform:capitalize">🏃‍♂️ ${w.type}</div>
        <div class="exercise-log-details">${w.duration} minutes logged</div>
      </div>
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span class="exercise-log-burn">-${w.caloriesBurned} kcal</span>
        <button class="presc-delete-btn" onclick="deleteWorkout('${w.id}')" aria-label="Delete workout">🗑</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function handleAddWorkout() {
  const type = document.getElementById('exercise-type').value;
  const duration = parseInt(val('exercise-duration'));
  
  if (isNaN(duration) || duration <= 0) {
    toast('Please enter a valid duration in minutes.', 'red');
    return;
  }
  
  const userWeight = (state.profile && state.profile.weight) ? state.profile.weight : 70;
  const met = MET_VALUES[type] || 3.0;
  
  // Formula: kcal = MET * weight(kg) * (duration / 60)
  const kcalBurned = Math.round(met * userWeight * (duration / 60));
  
  const newWorkout = {
    id: 'workout-' + Date.now(),
    type,
    duration,
    caloriesBurned: kcalBurned
  };
  
  if (!state.workouts) state.workouts = [];
  state.workouts.push(newWorkout);
  saveUserData();
  renderWorkouts();
  renderDietSummary();
  renderNutritionScore();
  toast(`${type.charAt(0).toUpperCase() + type.slice(1)} logged successfully!`, 'green');
  
  document.getElementById('exercise-duration').value = '';
}

function deleteWorkout(id) {
  state.workouts = state.workouts.filter(w => w.id !== id);
  saveUserData();
  renderWorkouts();
  renderDietSummary();
  renderNutritionScore();
  toast('Workout entry removed.', 'yellow');
}

function getBMI() {
  const p = state.profile;
  if (!p || !p.weight || !p.height) return 22.0; // standard healthy fallback
  const hMeters = p.height / 100;
  return p.weight / (hMeters * hMeters);
}

function renderExerciseRecommendations() {
  const container = document.getElementById('exercise-routines-container');
  const descEl = document.getElementById('exercise-rec-desc');
  if (!container) return;
  
  const bmi = getBMI();
  let categoryTitle = 'Fitness Balance Routine';
  let routines = [];
  
  if (bmi >= 25) {
    categoryTitle = 'Joint-Friendly Fat Burn';
    if (descEl) descEl.textContent = `Recommended for BMI: ${bmi.toFixed(1)} (Overweight / Obese) — focuses on low impact cardio.`;
    routines = [
      { name: 'Cardio Walking', desc: 'Brisk walk at 5 km/h. Easy on knees, stimulates metabolism.', icon: '🚶‍♂️', duration: '30 mins' },
      { name: 'Knee Push-Ups', desc: 'Chest & core builder. 3 sets of 12 reps, rest 60 seconds.', icon: '💪', duration: '15 mins' },
      { name: 'Water Swimming', desc: 'Low stress resistance cardio. 20 mins laps.', icon: '🏊‍♂️', duration: '20 mins' }
    ];
  } else if (bmi < 18.5) {
    categoryTitle = 'Muscle Building & Strength';
    if (descEl) descEl.textContent = `Recommended for BMI: ${bmi.toFixed(1)} (Underweight) — focuses on safe progressive overload.`;
    routines = [
      { name: 'Dumbbell Squats', desc: 'Quadriceps strength. 3 sets of 8 reps. Control descent.', icon: '🏋️‍♂️', duration: '20 mins' },
      { name: 'Dumbbell Rows', desc: 'Back & pull strength. 3 sets of 10 reps per side.', icon: '💪', duration: '15 mins' },
      { name: 'Core Plank Holds', desc: 'Midsection stability. 3 holds of 45 seconds.', icon: '🧘‍♂️', duration: '10 mins' }
    ];
  } else {
    categoryTitle = 'High Energy Cardio & Strength';
    if (descEl) descEl.textContent = `Recommended for BMI: ${bmi.toFixed(1)} (Normal Range) — focuses on endurance & functional strength.`;
    routines = [
      { name: 'HIIT Interval Running', desc: '1 min brisk jog, 30 sec sprint. Repeat 10 cycles.', icon: '🏃‍♂️', duration: '20 mins' },
      { name: 'Bodyweight Dips & Pullups', desc: 'Upper body strength circuit. 4 rounds.', icon: '🏋️‍♂️', duration: '15 mins' },
      { name: 'Vinyasa Yoga Flow', desc: 'Strength, balance, & active stretching.', icon: '🧘‍♂️', duration: '30 mins' }
    ];
  }
  
  container.innerHTML = '';
  routines.forEach(r => {
    const card = document.createElement('div');
    card.className = 'exercise-routine-card';
    card.innerHTML = `
      <div class="routine-icon">${r.icon}</div>
      <div class="routine-info">
        <h5>${r.name} (${r.duration})</h5>
        <p>${r.desc}</p>
      </div>
    `;
    container.appendChild(card);
  });
}

// ============================================================
//  LAB TEST SCHEDULE LOGIC
// ============================================================
function formatScheduleDate(dateValue) {
  if (!dateValue) return 'Date not set';
  const date = new Date(dateValue + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getLabStatus(test) {
  if (test.completed) return 'completed';
  if (!test.date) return 'upcoming';
  const today = new Date().toISOString().split('T')[0];
  return test.date === today ? 'today' : 'upcoming';
}

function renderLabTests() {
  const container = document.getElementById('lab-test-list-container');
  if (!container) return;
  container.innerHTML = '';

  const tests = [...(state.labTests || [])].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`);
  });

  if (tests.length === 0) {
    container.innerHTML = `<p style="color: var(--gray-400); font-size: 0.85rem; text-align: center; margin-top: 2rem;">No lab tests scheduled yet.</p>`;
    return;
  }

  tests.forEach(test => {
    const status = getLabStatus(test);
    const item = document.createElement('div');
    item.className = `prescription-item ${test.completed ? 'lab-completed-item' : ''}`;
    item.innerHTML = `
      <div class="prescription-header">
        <div>
          <div class="presc-doc">${test.name}</div>
          <div class="presc-date">${formatScheduleDate(test.date)}${test.time ? ` at ${test.time}` : ''}</div>
        </div>
        <span class="lab-reminder-badge ${status}">${status}</span>
      </div>
      <div class="schedule-meta">
        <span class="schedule-pill">${test.location || 'Location not added'}</span>
      </div>
      ${test.prep ? `<div class="lab-prep-note">${test.prep}</div>` : ''}
      <div class="item-action-row">
        <button class="mini-action-btn" onclick="toggleLabTestComplete('${test.id}')">${test.completed ? 'Reopen' : 'Mark Complete'}</button>
        <button class="presc-delete-btn" onclick="deleteLabTest('${test.id}')" aria-label="Delete lab test">Delete</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function handleAddLabTest() {
  const name = val('lab-test-name');
  const date = val('lab-test-date');
  const time = val('lab-test-time');
  const location = val('lab-test-location');
  const prep = val('lab-test-prep');

  if (!name || !date) {
    toast('Please add the test name and date.', 'red');
    return;
  }

  if (!state.labTests) state.labTests = [];
  state.labTests.push({
    id: 'lab-' + Date.now(),
    name,
    date,
    time,
    location,
    prep,
    completed: false
  });

  saveUserData();
  renderLabTests();
  toast('Lab test scheduled.', 'green');

  ['lab-test-name', 'lab-test-date', 'lab-test-time', 'lab-test-location', 'lab-test-prep'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function toggleLabTestComplete(id) {
  const test = (state.labTests || []).find(item => item.id === id);
  if (!test) return;
  test.completed = !test.completed;
  saveUserData();
  renderLabTests();
  toast(test.completed ? 'Lab test marked complete.' : 'Lab test reopened.', 'yellow');
}

function deleteLabTest(id) {
  state.labTests = (state.labTests || []).filter(test => test.id !== id);
  saveUserData();
  renderLabTests();
  toast('Lab test removed.', 'yellow');
}

// ============================================================
//  MEDICATION REMINDER LOGIC
// ============================================================
function renderMedicationReminders() {
  const container = document.getElementById('med-reminder-list-container');
  if (!container) return;
  container.innerHTML = '';

  const reminders = [...(state.medicationReminders || [])].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  if (reminders.length === 0) {
    container.innerHTML = `<p style="color: var(--gray-400); font-size: 0.85rem; text-align: center; margin-top: 2rem;">No medication reminders yet.</p>`;
    return;
  }

  reminders.forEach(reminder => {
    const item = document.createElement('div');
    item.className = `prescription-item ${reminder.takenToday ? 'lab-completed-item' : ''}`;
    item.innerHTML = `
      <div class="prescription-header">
        <div>
          <div class="presc-doc">${reminder.name} ${reminder.dose ? `- ${reminder.dose}` : ''}</div>
          <div class="presc-date">${reminder.time || 'Time not set'} - ${reminder.frequency}</div>
        </div>
        <span class="lab-reminder-badge ${reminder.takenToday ? 'completed' : 'today'}">${reminder.takenToday ? 'taken' : 'due'}</span>
      </div>
      <div class="item-action-row">
        <button class="mini-action-btn" onclick="toggleMedicationReminderTaken('${reminder.id}')">${reminder.takenToday ? 'Undo Taken' : 'Mark Taken'}</button>
        <button class="presc-delete-btn" onclick="deleteMedicationReminder('${reminder.id}')" aria-label="Delete reminder">Delete</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function handleAddMedicationReminder() {
  const name = val('med-reminder-name');
  const dose = val('med-reminder-dose');
  const time = val('med-reminder-time');
  const frequency = document.getElementById('med-reminder-frequency')?.value || 'Daily';

  if (!name || !time) {
    toast('Please add the medicine name and reminder time.', 'red');
    return;
  }

  if (!state.medicationReminders) state.medicationReminders = [];
  state.medicationReminders.push({
    id: 'reminder-' + Date.now(),
    name,
    dose,
    time,
    frequency,
    takenToday: false
  });

  saveUserData();
  renderMedicationReminders();
  toast('Medication reminder saved.', 'green');

  ['med-reminder-name', 'med-reminder-dose', 'med-reminder-time'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function toggleMedicationReminderTaken(id) {
  const reminder = (state.medicationReminders || []).find(item => item.id === id);
  if (!reminder) return;
  reminder.takenToday = !reminder.takenToday;
  saveUserData();
  renderMedicationReminders();
  toast(reminder.takenToday ? 'Medicine marked taken.' : 'Reminder reset.', 'yellow');
}

function deleteMedicationReminder(id) {
  state.medicationReminders = (state.medicationReminders || []).filter(reminder => reminder.id !== id);
  saveUserData();
  renderMedicationReminders();
  toast('Medication reminder removed.', 'yellow');
}

// ============================================================
//  LOGOUT
// ============================================================
function handleLogout() {
  state.contact = '';
  state.profile = null;
  state.password = '';
  localStorage.removeItem('mm_session_token');
  labTestRemindersChecked = false;
  toast('Logged out.', 'yellow');
  switchTab('login');
  document.getElementById('login-contact').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('profile-summary').style.display = 'none';
  
  // Reset fields on screens
  ['prescription-list-container', 'diet-meal-log-container', 'exercise-log-container', 'lab-test-list-container', 'med-reminder-list-container'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
  
  goTo('screen-auth');
}

// ============================================================
//  INIT
// ============================================================
document.getElementById('year').textContent = new Date().getFullYear();
switchTab('login');

// ── Dismiss splash after animation completes ──
setTimeout(() => {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('hidden');
    // Remove from DOM after fade completes
    setTimeout(() => splash.remove(), 750);
  }
}, 2600);

// Check for existing session
const existingUserId = localStorage.getItem('mm_user_id');
const existingContact = loadLocal('users');
// Don't auto-login — keep it clean on page load

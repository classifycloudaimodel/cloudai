// -------------------- FAQ expand/collapse (first) --------------------
document.addEventListener('DOMContentLoaded', () => {
  const scope = document.querySelector('.about-section');
  if (!scope) return;

  const faqButtons = Array.from(scope.querySelectorAll('.faq-question'));

  // Ensure every faq-question has aria-controls pointing to an element
  faqButtons.forEach((btn, i) => {
    const controls = btn.getAttribute('aria-controls');
    if (!controls) {
      const id = `faq-auto-${i + 1}`;
      btn.setAttribute('aria-controls', id);
      const panel = btn.nextElementSibling;
      if (panel) panel.id = id;
    }
  });

  function collapsePanel(panel) {
    panel.style.maxHeight = panel.scrollHeight + 'px';
    panel.offsetHeight; // force reflow
    panel.style.maxHeight = '0px';
    panel.classList.remove('visible');
    panel.addEventListener(
      'transitionend',
      function handler(e) {
        if (e.propertyName === 'max-height') {
          panel.hidden = true;
          panel.removeEventListener('transitionend', handler);
        }
      }
    );
  }

  function expandPanel(panel) {
    panel.hidden = false;
    panel.classList.add('visible');
    const height = panel.scrollHeight;
    panel.style.maxHeight = height + 'px';
    panel.addEventListener(
      'transitionend',
      function handler(e) {
        if (e.propertyName === 'max-height') {
          panel.style.maxHeight = 'none';
          panel.removeEventListener('transitionend', handler);
        }
      }
    );
  }

  faqButtons.forEach(btn => {
    const panel = scope.querySelector('#' + btn.getAttribute('aria-controls'));
    if (!panel) return;

    // initialize collapsed state
    panel.hidden = true;
    panel.style.maxHeight = '0px';
    panel.classList.remove('visible');
    btn.setAttribute('aria-expanded', 'false');

    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const willExpand = !expanded;

      btn.setAttribute('aria-expanded', String(willExpand));
      if (willExpand) {
        expandPanel(panel);
      } else {
        collapsePanel(panel);
      }
    });
  });

  // Recompute open panel heights on resize so expanded panels keep correct height
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      scope.querySelectorAll('.faq-answer.visible').forEach(panel => {
        panel.style.maxHeight = panel.scrollHeight + 'px';
        setTimeout(() => {
          panel.style.maxHeight = 'none';
        }, 320);
      });
    }, 120);
  });
});

// -------------------- Cloud library (second) --------------------
document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.querySelector(".cloud-library");
  if (!wrapper) return;

  const scrollEl = wrapper.querySelector("#cloud_scroll");
  const scrollContainer = wrapper.querySelector("#scroll_container");
  const sceneStrip = wrapper.querySelector("#scene_strip");
  const hudPct = wrapper.querySelector("#hud_pct");
  const progFill = wrapper.querySelector("#prog_fill");

  let sections = Array.from(scrollContainer.querySelectorAll("section"));
  const N = sections.length;

  // Build scene dots (if the strip exists)
  if (sceneStrip) {
    sceneStrip.innerHTML = "";
    for (let i = 0; i < N; i++) {
      const btn = document.createElement("button");
      btn.className = i === 0 ? "scene-dot active" : "scene-dot";
      btn.type = "button";
      btn.dataset.index = i;
      sceneStrip.appendChild(btn);
    }
  }
  const sceneDots = sceneStrip ? Array.from(sceneStrip.querySelectorAll(".scene-dot")) : [];

  // IntersectionObserver inside the scroll container to detect which section is most visible
  let currentIndex = 0;
  const visibility = new Map();

  function updateActiveFromVisibility() {
    let bestIdx = 0;
    let bestRatio = 0;
    sections.forEach((sec, idx) => {
      const r = visibility.get(sec) || 0;
      if (r > bestRatio) { bestRatio = r; bestIdx = idx; }
    });
    if (bestIdx !== currentIndex) {
      currentIndex = bestIdx;
      setActiveIndex(bestIdx);
    }
  }

  function setActiveIndex(idx) {
    // toggle dots
    if (sceneDots.length) sceneDots.forEach((d, i) => d.classList.toggle("active", i === idx));
    // toggle is-active class on the section image for subtle lift
    sections.forEach((s, i) => {
      const img = s.querySelector(".image-wrap");
      if (!img) return;
      img.classList.toggle("is-active", i === idx);
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => visibility.set(entry.target, entry.intersectionRatio));
    updateActiveFromVisibility();
  }, {
    root: scrollEl,
    rootMargin: "-35% 0px -35% 0px",
    threshold: Array.from({length:31}, (_,i) => i/30)
  });

  sections.forEach(s => observer.observe(s));

  // HUD progress
  function updateHUD() {
    const maxScroll = Math.max(1, scrollEl.scrollHeight - scrollEl.clientHeight);
    const s = Math.max(0, Math.min(1, scrollEl.scrollTop / maxScroll));
    if (hudPct) hudPct.textContent = String(Math.round(s * 100)).padStart(3,"0") + "%";
    if (progFill) progFill.style.width = `${Math.round(s * 100)}%`;
  }

  scrollEl.addEventListener("scroll", updateHUD, { passive: true });

  // scene-dot click -> scroll to section (and immediate dot feedback)
  if (sceneStrip) {
    sceneStrip.addEventListener("click", (e) => {
      const btn = e.target.closest(".scene-dot");
      if (!btn) return;
      const idx = Number(btn.dataset.index);
      if (Number.isNaN(idx)) return;
      const target = sections[idx];
      if (!target) return;
      setActiveIndex(idx); // immediate feedback
      scrollEl.scrollTo({ top: target.offsetTop, behavior: "smooth" });
    });
  }

  // anchor links inside: smooth scroll + immediate dot update
  wrapper.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#s"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    const target = scrollContainer.querySelector(`#${id}`);
    if (!target) return;
    e.preventDefault();
    const idx = sections.indexOf(target);
    if (idx >= 0) setActiveIndex(idx);
    scrollEl.scrollTo({ top: target.offsetTop, behavior: "smooth" });
  });

  // initial
  updateHUD();
  setActiveIndex(0);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { setTimeout(updateHUD, 80); });
  }
  window.addEventListener("resize", () => { setTimeout(updateHUD, 60); });
});

// -------------------- Model + Webcam code (third) --------------------
// script.js — robust fallback labels + camera/upload + model loading

// Model URLs (your Teachable Machine model)
const MODEL_JSON_URL = 'https://storage.googleapis.com/tm-model/vQIXdQwvp/model.json';
const METADATA_JSON_URL = 'https://teachablemachine.withgoogle.com/models/vQIXdQwvp/metadata.json';

// ---------- REPLACEMENT: model + webcam (native fallback, robust upload & capture) ----------
let tmModel = null;
let webcam = null; // { video: HTMLVideoElement, stream: MediaStream }
let isCameraOn = false;
const fallbackLabels = [
  'Cirrus','Cumulus','Stratus','Cumulonimbus','Altocumulus','Altostratus',
  'Nimbostratus','Stratocumulus','Cirrocumulus','Cirrostratus'
];

function buildLabelUI(labelsArray) {
  const lc = document.getElementById('label-container');
  if (!lc) return;
  lc.innerHTML = '';
  labelsArray.forEach(lbl => {
    const wrapper = document.createElement('div');
    wrapper.className = 'label-container';
    const left = document.createElement('div');
    left.className = 'label-text';
    left.textContent = lbl;
    const right = document.createElement('div');
    right.className = 'label-bar-container';
    const prob = document.createElement('p');
    prob.className = 'label-probability';
    prob.textContent = '0.0%';
    const fill = document.createElement('div');
    fill.className = 'label-bar-fill';
    fill.style.width = '0%';
    right.appendChild(prob);
    right.appendChild(fill);
    wrapper.appendChild(left);
    wrapper.appendChild(right);
    lc.appendChild(wrapper);
  });
}

// ---- Compatibility wrapper: ensureFallbackLabelsNow (used earlier in this script) ----
function ensureFallbackLabelsNow() {
  const labels = (typeof fallbackLabels !== 'undefined' && Array.isArray(fallbackLabels))
    ? fallbackLabels.slice()
    : [
      'Cirrus','Cumulus','Stratus','Cumulonimbus','Altocumulus','Altostratus',
      'Nimbostratus','Stratocumulus','Cirrocumulus','Cirrostratus','Contrails',
      'Orographic','Mammatus','Lenticular'
    ];

  const lc = document.getElementById('label-container');
  if (!lc) return;

  const empty = !lc.children || lc.children.length === 0;
  const mismatchOnDesktop = window.innerWidth >= 760 && (lc.querySelector('.label-text')?.textContent || '') !== labels[0];

  if (!empty && !mismatchOnDesktop) return;

  // Prefer buildLabelUI if available
  if (typeof buildLabelUI === 'function') {
    try {
      buildLabelUI(labels);
      return;
    } catch (e) {
      // fall through to manual build below
      console.warn('buildLabelUI failed in ensureFallbackLabelsNow, falling back to manual build', e);
    }
  }

  // Manual build fallback
  lc.innerHTML = '';
  labels.forEach(lbl => {
    const wrapper = document.createElement('div');
    wrapper.className = 'label-container';

    const labelText = document.createElement('div');
    labelText.className = 'label-text';
    labelText.textContent = lbl;

    const barContainer = document.createElement('div');
    barContainer.className = 'label-bar-container';

    const prob = document.createElement('p');
    prob.className = 'label-probability';
    prob.textContent = '0.0%';

    const fill = document.createElement('div');
    fill.className = 'label-bar-fill';
    fill.style.width = '0%';

    barContainer.appendChild(prob);
    barContainer.appendChild(fill);
    wrapper.appendChild(labelText);
    wrapper.appendChild(barContainer);
    lc.appendChild(wrapper);
  });
}

// Replace ensureFileInput / attachControls / handleImageUpload with robust versions

function ensureFileInput() {
  let input = document.getElementById('image-input');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.id = 'image-input';
    input.accept = 'image/*';
    try { input.setAttribute('capture', 'environment'); } catch (e) {}
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', handleImageUpload);
    input._hasChangeBound = true;
  } else {
    if (!input._hasChangeBound) {
      input.addEventListener('change', handleImageUpload);
      input._hasChangeBound = true;
    }
  }
  return input;
}

function onUploadClickSafe(e) { e && e.preventDefault(); ensureFileInput().click(); }
function onStartClick(e) { e && e.preventDefault(); startWebcam(); }
function onStopClick(e) { e && e.preventDefault(); stopWebcam(); }
function onCaptureClick(e) { e && e.preventDefault(); capturePhoto(); }

function attachControls() {
  ensureFileInput();
  const uploadBtn = document.getElementById('upload-btn');
  const startBtn = document.getElementById('start-camera');
  const stopBtn = document.getElementById('stop-camera');
  const captureBtn = document.getElementById('capture-btn');

  if (uploadBtn) {
    uploadBtn.removeEventListener('click', onUploadClickSafe);
    uploadBtn.addEventListener('click', onUploadClickSafe);
  }
  if (startBtn) {
    startBtn.removeEventListener('click', onStartClick);
    startBtn.addEventListener('click', onStartClick);
  }
  if (stopBtn) {
    stopBtn.removeEventListener('click', onStopClick);
    stopBtn.addEventListener('click', onStopClick);
  }
  if (captureBtn) {
    captureBtn.removeEventListener('click', onCaptureClick);
    captureBtn.addEventListener('click', onCaptureClick);
  }
}

// Upload handler using FileReader fallback and stopping camera first
async function handleImageUpload(evt) {
  const input = evt.target || document.getElementById('image-input');
  const file = input && input.files && input.files[0];
  if (!file) {
    console.debug('handleImageUpload: no file selected');
    return;
  }
  console.debug('handleImageUpload:', file.type, file.size);

  // Stop any running camera to avoid video overlay/black screen
  try { await stopWebcam(); } catch (e) { console.debug('stopWebcam error', e); }

  const container = document.getElementById('webcam-container');
  if (!container) {
    console.warn('handleImageUpload: #webcam-container not found');
    return;
  }
  container.innerHTML = ''; // clear preview area
  // defensive container styling in case CSS hides it
  container.style.background = container.style.background || 'transparent';
  container.style.minHeight = container.style.minHeight || '120px';

  // Try object URL first (fast). If it fails to load, fall back to FileReader.
  const img = new Image();
  img.decoding = 'async';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';

  let objectUrl = null;
  let usedFileReader = false;

  const finalize = async (src) => {
    img.onload = async () => {
      try { if (objectUrl) URL.revokeObjectURL(objectUrl); } catch (e) {}
      container.innerHTML = '';
      container.appendChild(img);
      console.debug('handleImageUpload: image appended, running prediction');
      try { await predictFromElement(img); } catch (e) { console.error('predictFromElement error', e); }
      // clear input so same file can be selected again
      try { input.value = ''; } catch (e) { /* ignore */ }
    };
    img.onerror = () => {
      console.warn('handleImageUpload: image load failed for src', src);
      if (!usedFileReader) {
        // fallback to FileReader
        usedFileReader = true;
        const reader = new FileReader();
        reader.onload = (ev) => finalize(ev.target.result);
        reader.onerror = () => { alert('Unable to read that file as an image.'); try { input.value = ''; } catch(e){}; };
        reader.readAsDataURL(file);
      } else {
        alert('Unable to load the image file.');
        try { input.value = ''; } catch (e) {}
      }
    };
    img.src = src;
  };

  try {
    objectUrl = URL.createObjectURL(file);
    await finalize(objectUrl);
  } catch (err) {
    console.debug('handleImageUpload: createObjectURL failed, falling back to FileReader', err);
    usedFileReader = true;
    const reader = new FileReader();
    reader.onload = (ev) => finalize(ev.target.result);
    reader.onerror = () => alert('Unable to read that file as an image.');
    reader.readAsDataURL(file);
  }
}

// Start webcam using native getUserMedia (more reliable than tmImage.Webcam across devices)
async function startWebcam() {
  const container = document.getElementById('webcam-container');
  if (!container) return;
  // If already running, do nothing
  if (isCameraOn && webcam && webcam.video) return;

  // Clean previous content
  container.innerHTML = '';

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    container.innerHTML = '<div class="placeholder">Camera not supported</div>';
    return;
  }

  try {
    const constraints = { video: { facingMode: { ideal: 'environment' } }, audio: false };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.srcObject = stream;

    container.appendChild(video);
    // Wait for metadata so we have videoWidth/videoHeight
    await new Promise((resolve) => {
      if (video.readyState >= 1) return resolve();
      const onMeta = () => { video.removeEventListener('loadedmetadata', onMeta); resolve(); };
      video.addEventListener('loadedmetadata', onMeta);
      // safety timeout
      setTimeout(resolve, 1200);
    });

    // Some browsers require explicit play() user gesture; call play() and ignore rejections
    try { await video.play(); } catch (e) {}

    webcam = { video, stream };
    isCameraOn = true;
    // start prediction loop
    window.requestAnimationFrame(cameraLoop);
  } catch (err) {
    console.error('startWebcam error', err);
    container.innerHTML = '<div class="placeholder">Unable to access camera.</div>';
  }
}

// Stop webcam and free tracks
async function stopWebcam() {
  isCameraOn = false;
  if (webcam) {
    try {
      if (webcam.stream && webcam.stream.getTracks) {
        webcam.stream.getTracks().forEach(t => { try { t.stop(); } catch(e){} });
      }
    } catch (e) { /* ignore */ }
    if (webcam.video) {
      try { webcam.video.pause(); } catch(e) {}
      try { webcam.video.srcObject = null; } catch(e) {}
    }
  }
  webcam = null;
  const container = document.getElementById('webcam-container');
  if (container) container.innerHTML = '<div class="placeholder">Camera is off — click "Start Camera" or Upload an image</div>';
}

// Loop to predict from live video
async function cameraLoop() {
  if (!isCameraOn || !webcam || !webcam.video) return;
  try { await predictFromElement(webcam.video); } catch(e) { /* swallow */ }
  window.requestAnimationFrame(cameraLoop);
}

// Capture a still from the current video and put it in container before predicting
async function capturePhoto() {
  const container = document.getElementById('webcam-container');
  if (!container) return;
  if (!webcam || !webcam.video) return;

  const video = webcam.video;
  // Ensure dimensions
  let w = video.videoWidth || video.clientWidth || 450;
  let h = video.videoHeight || video.clientHeight || w;
  if (w === 0 || h === 0) {
    // wait briefly for loadedmetadata
    await new Promise(res => {
      const onMeta = () => { video.removeEventListener('loadedmetadata', onMeta); res(); };
      video.addEventListener('loadedmetadata', onMeta);
      setTimeout(res, 1200);
    });
    w = video.videoWidth || video.clientWidth || 450;
    h = video.videoHeight || video.clientHeight || w;
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  } catch (err) {
    console.warn('capturePhoto drawImage failed', err);
    return;
  }

  const dataUrl = canvas.toDataURL('image/png');
  const img = new Image();
  img.onload = async () => {
    container.innerHTML = '';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    container.appendChild(img);
    await predictFromElement(img);
  };
  img.onerror = () => alert('Unable to capture photo.');
  img.src = dataUrl;
}

// Predict and update labels safely
async function predictFromElement(element) {
  const lc = document.getElementById('label-container');
  if (!lc) return null;

  if (!tmModel) {
    // zero out UI
    Array.from(lc.children).forEach(wrapper => {
      const p = wrapper.querySelector('.label-probability'); if (p) p.textContent = '0.0%';
      const f = wrapper.querySelector('.label-bar-fill'); if (f) f.style.width = '0%';
    });
    return null;
  }

  let prediction;
  try {
    prediction = await tmModel.predict(element);
  } catch (e) {
    console.error('prediction error', e);
    return null;
  }

  if (prediction && prediction.length && lc.children.length !== prediction.length) {
    const names = prediction.map(p => p.className || 'Class');
    buildLabelUI(names);
  }

  if (prediction && prediction.length) {
    for (let i = 0; i < prediction.length; i++) {
      const wrapper = lc.children[i];
      if (!wrapper) continue;
      const probEl = wrapper.querySelector('.label-probability');
      const fillEl = wrapper.querySelector('.label-bar-fill');
      const v = prediction[i].probability ?? 0;
      const pct = (v * 100).toFixed(1) + '%';
      if (probEl) probEl.textContent = pct;
      if (fillEl) fillEl.style.width = (v * 100).toFixed(1) + '%';
    }
  }
  return prediction && prediction.length ? { className: prediction[0].className, probability: prediction[0].probability } : null;
}

// Load the Teachable Machine model (unchanged)
async function tryLoadModel() {
  try {
    if (typeof tmImage === 'undefined') throw new Error('tmImage library not loaded');
    tmModel = await tmImage.load(MODEL_JSON_URL, METADATA_JSON_URL);

    let classNames = [];
    if (typeof tmModel.getClassName === 'function') {
      const total = typeof tmModel.getTotalClasses === 'function' ? tmModel.getTotalClasses() : 0;
      for (let i = 0; i < total; i++) classNames.push(tmModel.getClassName(i));
    } else if (tmModel.getClassNames && Array.isArray(tmModel.getClassNames())) {
      classNames = tmModel.getClassNames();
    } else if (tmModel.meta && Array.isArray(tmModel.meta.labels)) {
      classNames = tmModel.meta.labels;
    }

    if (classNames.length) buildLabelUI(classNames);
    else buildLabelUI(fallbackLabels);
  } catch (err) {
    console.warn('Model load skipped/failed — using fallback', err);
    buildLabelUI(fallbackLabels);
  }
}

// -------------------- end replacement --------------------

// FAQ expand/collapse setup (make answers visible toggleable)
function initFAQ() {
  const scope = document.querySelector('.about-section');
  if (!scope) return;
  const faqButtons = Array.from(scope.querySelectorAll('.faq-question'));
  faqButtons.forEach(btn => {
    const panel = scope.querySelector('#' + btn.getAttribute('aria-controls'));
    if (!panel) return;
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded; // if it was expanded, hide; else show
    });
  });
}

// DOM ready initialization
document.addEventListener('DOMContentLoaded', () => {
  // Build fallback immediately
  buildLabelUI(fallbackLabels);

  // Attach controls and FAQ
  attachControls();
  initFAQ();

  // small re-check after microtask to handle other scripts
  setTimeout(() => { ensureFallbackLabelsNow(); attachControls(); }, 70);
});

// After full load, attempt to load model (non-blocking)
window.addEventListener('load', () => {
  ensureFallbackLabelsNow();
  tryLoadModel();
  // watch for any accidental clearing of label container and restore fallback if emptied
  setInterval(() => {
    const lc = document.getElementById('label-container');
    if (lc && (!lc.children || lc.children.length === 0)) buildLabelUI(fallbackLabels);
  }, 1200);
});

// expose functions for inline onclick attributes compatibility
window.startWebcam = startWebcam;
window.stopWebcam = stopWebcam;
window.handleImageUpload = handleImageUpload;
window.capturePhoto = capturePhoto;

/* ================== QUIZ (initialization after DOM ready) ================== */
document.addEventListener('DOMContentLoaded', () => {
  const questions = [
    {
      question: 'Which of the following cloud types can produce precipitation?',
      answers: [
        { text: 'Cumulonimbus', correct: true },
        { text: 'Cirrus', correct: false },
        { text: 'Nimbostratus', correct: true },
        { text: 'Cumulus', correct: false },
      ]
    },
    {
      question: 'What prefix is used for mid-level clouds?',
      answers: [
        { text: 'cirrus', correct: false },
        { text: 'alto', correct: true },
        { text: 'cirro', correct: false },
        { text: 'strato', correct: false },
      ]
    },
    {
      question: 'Which cloud type is typically white, fluffy, and has a flat base, often seen on sunny days?',
      answers: [
        { text: 'stratus', correct: false },
        { text: 'cumulus', correct: true },
        { text: 'cirrostratus', correct: false },
        { text: 'nimbostratus', correct: false },
      ]
    },
    {
      question: 'Which cloud types are generally associated with fair weather?',
      answers: [
        { text: 'cumulus', correct: true },
        { text: 'cirrus', correct: true },
        { text: 'cumulonimbus', correct: false },
        { text: 'nimbostratus', correct: false },
      ]
    }
  ];

  const questionElement = document.getElementById('question');
  const answerButtons = document.getElementById('answer-buttons');
  const nextButton = document.getElementById('next-btn');

  let currentQuestionIndex = 0;
  let score = 0;

  function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    nextButton.innerText = 'Next';
    showQuestion();
  }

  function showQuestion() {
    resetState();
    const currentQuestion = questions[currentQuestionIndex];
    const questionNo = currentQuestionIndex + 1;
    questionElement.innerText = `${questionNo}. ${currentQuestion.question}`;

    currentQuestion.answers.forEach(answer => {
      const button = document.createElement('button');
      button.innerText = answer.text;
      button.classList.add('btn');
      button.dataset.correct = answer.correct ? 'true' : 'false';
      button.addEventListener('click', selectAnswer);
      answerButtons.appendChild(button);
    });
  }

  function resetState() {
    nextButton.style.display = 'none';
    while (answerButtons.firstChild) {
      answerButtons.removeChild(answerButtons.firstChild);
    }
  }

  function selectAnswer(e) {
    const selectedBtn = e.target;
    const isCorrect = selectedBtn.dataset.correct === 'true';
    if (isCorrect) {
      selectedBtn.classList.add('correct');
      score++;
    } else {
      selectedBtn.classList.add('incorrect');
    }

    Array.from(answerButtons.children).forEach(button => {
      if (button.dataset.correct === 'true') {
        button.classList.add('correct');
      }
      button.disabled = true;
    });

    nextButton.style.display = 'block';
  }

  function showScore() {
    resetState();
    questionElement.innerText = `You scored ${score} out of ${questions.length}`;
    nextButton.innerText = 'Play Again';
    nextButton.style.display = 'block';
  }

  function handleNextButton() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      showQuestion();
    } else {
      showScore();
    }
  }

  nextButton.addEventListener('click', () => {
    if (currentQuestionIndex < questions.length) {
      handleNextButton();
    } else {
      startQuiz();
    }
  });

  // start
  startQuiz();
});

/* ================== Defensive fallback-label injector ==================
   Ensures fallbackLabels appear on desktop (>=760px) and mobile when the
   #label-container is empty or mismatched. Uses existing fallbackLabels
   where present; otherwise falls back to internal list.
*/
(function ensureFallbackLabelsVisible() {
  const labels = (typeof fallbackLabels !== 'undefined' && Array.isArray(fallbackLabels))
    ? fallbackLabels.slice()
    : [
      'Cirrus','Cumulus','Stratus','Cumulonimbus','Altocumulus','Altostratus',
      'Nimbostratus','Stratocumulus','Cirrocumulus','Cirrostratus','Contrails',
      'Orographic','Mammatus','Lenticular'
    ];

  function manualBuild(labelsArray) {
    const lc = document.getElementById('label-container');
    if (!lc) return;
    lc.innerHTML = '';
    labelsArray.forEach(lbl => {
      const wrapper = document.createElement('div');
      wrapper.className = 'label-container';
      const labelText = document.createElement('div');
      labelText.className = 'label-text';
      labelText.textContent = lbl;
      const barContainer = document.createElement('div');
      barContainer.className = 'label-bar-container';
      const prob = document.createElement('p');
      prob.className = 'label-probability';
      prob.textContent = '0.0%';
      const fill = document.createElement('div');
      fill.className = 'label-bar-fill';
      fill.style.width = '0%';
      barContainer.appendChild(prob);
      barContainer.appendChild(fill);
      wrapper.appendChild(labelText);
      wrapper.appendChild(barContainer);
      lc.appendChild(wrapper);
    });
  }

  function ensureNow() {
    const lc = document.getElementById('label-container');
    if (!lc) return;
    const empty = !lc.children || lc.children.length === 0;
    const mismatchOnDesktop = window.innerWidth >= 760 && (lc.querySelector('.label-text')?.textContent || '') !== labels[0];
    if (empty || mismatchOnDesktop) {
      // if your code exposes a buildLabelUI function, call it; otherwise manual build
      if (typeof buildLabelUI === 'function') {
        try {
          buildLabelUI(labels);
          return;
        } catch (e) {
          // fallback to manual
        }
      }
      manualBuild(labels);
    }
  }

  document.addEventListener('DOMContentLoaded', ensureNow);
  window.addEventListener('load', () => { setTimeout(ensureNow, 60); });
  setTimeout(ensureNow, 80);

  let t = null;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (window.innerWidth >= 760) ensureNow();
    }, 160);
  });
})();

// Robust FAQ expand/collapse: safe to call multiple times, cancels in-flight animations
(function initFAQ() {
  const DURATION = 260; // must match CSS transition (ms)
  const scope = document.querySelector('.about-section');
  if (!scope) return;

  const faqButtons = Array.from(scope.querySelectorAll('.faq-question'));

  // Ensure aria-controls exists
  faqButtons.forEach((btn, i) => {
    if (!btn.getAttribute('aria-controls')) {
      const id = `faq-auto-${i + 1}`;
      btn.setAttribute('aria-controls', id);
      const panel = btn.nextElementSibling;
      if (panel) panel.id = id;
    }
  });

  function clearState(panel) {
    if (panel._faqTimer) { clearTimeout(panel._faqTimer); panel._faqTimer = null; }
    panel._animating = false;
  }

  function finalizeOpen(panel, btn) {
    panel.style.maxHeight = 'none';
    panel.style.overflow = '';
    panel._animating = false;
    panel._open = true;
    panel._faqTimer = null;
    btn.setAttribute('aria-expanded', 'true');
  }

  function finalizeClose(panel, btn) {
    panel.style.display = ''; // allow stylesheet/default to apply
    panel.style.overflow = '';
    panel._animating = false;
    panel._open = false;
    panel._faqTimer = null;
    btn.setAttribute('aria-expanded', 'false');
  }

  function openPanel(panel, btn) {
    clearState(panel);

    // Make visible for measurement
    panel.style.display = 'block';
    panel.style.overflow = 'hidden';

    // Start from 0 to ensure transition runs
    panel.style.maxHeight = '0px';
    // force reflow
    panel.offsetHeight;

    const target = panel.scrollHeight;
    panel._animating = true;
    panel.classList.add('open'); // for color styling
    // set to measured height
    panel.style.maxHeight = target + 'px';

    // finalize after animation
    panel._faqTimer = setTimeout(() => finalizeOpen(panel, btn), DURATION + 30);
  }

  function closePanel(panel, btn) {
    clearState(panel);

    // If maxHeight is 'none', set it to current scrollHeight so we can animate to 0
    if (!panel.style.maxHeight || panel.style.maxHeight === 'none') {
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }

    // force reflow
    panel.offsetHeight;

    panel._animating = true;
    panel.style.overflow = 'hidden';
    panel.style.maxHeight = '0px';
    // remove open class when fully closed (after animation)
    panel._faqTimer = setTimeout(() => {
      panel.classList.remove('open');
      finalizeClose(panel, btn);
    }, DURATION + 30);
  }

  // Initialize each FAQ button/panel
  faqButtons.forEach(btn => {
    const panel = scope.querySelector('#' + btn.getAttribute('aria-controls'));
    if (!panel) return;

    // initialize state
    clearState(panel);
    panel._open = false;
    panel.classList.remove('open');
    panel.style.maxHeight = '0px';
    panel.style.overflow = 'hidden';
    panel.style.display = ''; // let CSS handle initial display
    btn.setAttribute('aria-expanded', 'false');

    btn.addEventListener('click', () => {
      // If an animation is in flight, reverse it deterministically
      if (panel._animating) {
        // cancel pending timer and invert desired state
        clearState(panel);
        // Determine current visual state from computed maxHeight
        const computed = getComputedStyle(panel).maxHeight;
        const isEffectivelyOpen = panel._open || (computed !== '0px' && computed !== 'none');
        if (isEffectivelyOpen) {
          // currently opening/visible -> close
          closePanel(panel, btn);
        } else {
          // currently closing/hidden -> open
          openPanel(panel, btn);
        }
        return;
      }

      // normal toggle
      if (panel._open) {
        closePanel(panel, btn);
      } else {
        openPanel(panel, btn);
      }
    });
  });

  // expose for debugging
  window._faq_init = initFAQ;
})();

/* ================== Mobile & small-screen enhancements (APPENDED) ==================
   Adds:
   - slide-in mobile nav toggled by #menu-open-button
   - backdrop for tapping outside to close
   - closes on ESC and resize -> desktop
   - ensures quiz Next button visible
   Note: CSS additions (slide-in panel + backdrop visuals) should be appended to style.css
*/
(function setupMobileNavAndSmallTweaks() {
  // run after DOM ready if possible
  function init() {
    const menuBtn = document.getElementById('menu-open-button');
    const navMenu = document.querySelector('.nav-menu');

    if (!menuBtn || !navMenu) {
      // nothing to do if nav/menu button absent
      // still ensure next button is visible
      const nb = document.getElementById('next-btn');
      if (nb) nb.style.display = 'block';
      return;
    }

    // Create backdrop if missing
    let navBackdrop = document.querySelector('.nav-backdrop');
    if (!navBackdrop) {
      navBackdrop = document.createElement('div');
      navBackdrop.className = 'nav-backdrop';
      // minimal inline style; most visual styling should come from CSS
      navBackdrop.style.display = 'none';
      navBackdrop.style.pointerEvents = 'auto';
      document.body.appendChild(navBackdrop);
    }

    function openMenu() {
      navMenu.classList.add('open');
      menuBtn.setAttribute('aria-expanded', 'true');
      navBackdrop.style.display = '';
    }
    function closeMenu() {
      navMenu.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
      navBackdrop.style.display = 'none';
    }

    // Toggle on menu button click
    menuBtn.addEventListener('click', (e) => {
      const willOpen = !navMenu.classList.contains('open');
      if (willOpen) {
        openMenu();
      } else {
        closeMenu();
      }
      e.stopPropagation();
    });

    // Close when clicking a nav link (improves mobile UX)
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    // Close when tapping backdrop
    navBackdrop.addEventListener('click', closeMenu);

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });

    // Close when resizing to desktop width to avoid stuck open state
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth > 880) closeMenu();
      }, 120);
    });

    // Ensure the quiz Next button is visible (CSS had it hidden)
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.style.display = 'block';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ==========================================================================
   app.js — UI wiring: tabs, profile form, conversational assistant flow,
   college comparison, Prompt Lab, saved shortlist / history, settings.
   Vanilla JS, no build step, no external dependencies.
   ========================================================================== */

// ------------------------------------------------------------------ STORE --
const STORE = (() => {
  const K = { profile: "pac_profile", key: "pac_api_key", shortlist: "pac_shortlist", history: "pac_history" };
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  return {
    getProfile: () => get(K.profile, {}),
    setProfile: (p) => set(K.profile, p),
    getApiKey: () => { try { return localStorage.getItem(K.key) || ""; } catch { return ""; } },
    setApiKey: (k) => localStorage.setItem(K.key, k || ""),
    getShortlist: () => get(K.shortlist, []),
    addShortlist: (id) => { const s = get(K.shortlist, []); if (!s.includes(id)) { s.push(id); set(K.shortlist, s); } },
    removeShortlist: (id) => set(K.shortlist, get(K.shortlist, []).filter(x => x !== id)),
    getHistory: () => get(K.history, []),
    addHistory: (entry) => { const h = get(K.history, []); h.unshift({ ...entry, ts: new Date().toISOString() }); set(K.history, h.slice(0, 100)); },
  };
})();

// ------------------------------------------------------------------ utils --
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function humanize(key) {
  return escapeHtml(String(key).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
}
function prettyRender(value) {
  if (Array.isArray(value)) {
    if (!value.length) return "<em class='muted'>None</em>";
    return `<ul class="pretty-list">${value.map(v => `<li>${prettyRender(v)}</li>`).join("")}</ul>`;
  }
  if (value && typeof value === "object") {
    return `<dl class="pretty-dl">${Object.entries(value).map(([k, v]) => `<dt>${humanize(k)}</dt><dd>${prettyRender(v)}</dd>`).join("")}</dl>`;
  }
  if (typeof value === "boolean") return value ? "✅ Yes" : "❌ No";
  return escapeHtml(String(value));
}
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
function csvToArr(s) { return (s || "").split(",").map(x => x.trim()).filter(Boolean); }

// ------------------------------------------------------------ mode badge --
function refreshModeBadge() {
  const badge = document.getElementById("mode-badge");
  const live = !!STORE.getApiKey();
  badge.textContent = live ? "● Live (Claude API)" : "● Offline demo mode";
  badge.className = "mode-badge " + (live ? "mode-live" : "mode-offline");
}

// ------------------------------------------------------------- tab system --
const TABS = ["profile", "assistant", "colleges", "promptlab", "saved", "settings"];
function showTab(id) {
  TABS.forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle("active", t === id);
    document.getElementById(`panel-${t}`).classList.toggle("active", t === id);
  });
  // Drives hero visibility in CSS — the 3D hero shows only on the first tab.
  document.body.dataset.tab = id;
  if (id === "assistant") renderAssistantTab();
  if (id === "colleges") renderCollegesTab();
  if (id === "saved") renderSavedTab();
  if (id === "promptlab") renderPromptLabTab();
}

// ----------------------------------------------------------- Profile tab --
function renderProfileTab() {
  const p = STORE.getProfile();
  const panel = document.getElementById("panel-profile");
  panel.innerHTML = `
    <h2>Your Profile</h2>
    <p class="muted">This stays in your browser only (localStorage). If you enable Live mode, only what's sent to the assistant during that stage goes to Anthropic's API — never anything else.</p>
    <form id="profile-form" class="form-grid">
      <label>Name (optional)<input name="name" value="${escapeHtml(p.name || "")}"></label>
      <label>Class 12 / pre-board % <input name="academicPercentage" type="number" min="0" max="100" value="${p.academicPercentage ?? ""}" required></label>
      <label>Strongest subject
        <select name="strongSubject">
          ${["", "Physics", "Maths", "Chemistry", "Biology", "Other"].map(o => `<option ${p.strongSubject === o ? "selected" : ""}>${o}</option>`).join("")}
        </select>
      </label>
      <label class="span2">Interests (comma separated — e.g. coding, circuits, design)
        <input name="interests" value="${escapeHtml((p.interests || []).join(", "))}" required></label>
      <label>Entrance exam already taken (if any)
        <select name="entranceExam">
          <option value="">Not yet / undecided</option>
          ${ENTRANCE_EXAMS.map(e => `<option value="${e.code}" ${p.entranceExam === e.code ? "selected" : ""}>${e.name}</option>`).join("")}
        </select>
      </label>
      <label>Score / percentile on that exam (optional)<input name="examScore" value="${escapeHtml(p.examScore || "")}"></label>
      <fieldset class="span2">
        <legend>Target college types</legend>
        ${["IIT", "NIT", "IIIT", "State Govt.", "Private"].map(t => `
          <label class="inline"><input type="checkbox" name="collegeTypes" value="${t}" ${(p.collegeTypes || []).includes(t) ? "checked" : ""}> ${t}</label>`).join("")}
      </fieldset>
      <label>Home state<input name="homeState" value="${escapeHtml(p.homeState || "")}"></label>
      <label>Preferred states to study in (comma separated, or leave blank for "any")
        <input name="preferredStates" value="${escapeHtml((p.preferredStates || []).join(", "))}"></label>
      <label>Budget per year (₹)<input name="budgetPerYear" type="number" value="${p.budgetPerYear ?? ""}"></label>
      <label>Current month (for roadmap)<input name="currentMonth" value="${escapeHtml(p.currentMonth || "Aug 2026")}"></label>
      <details class="span2">
        <summary>Optional — for scholarship matching only (never required, never shared beyond that one stage)</summary>
        <div class="form-grid">
          <label>Gender <select name="gender"><option value="">Prefer not to say</option>${["female", "male", "other"].map(g => `<option ${p.gender === g ? "selected" : ""}>${g}</option>`).join("")}</select></label>
          <label>Category <select name="category"><option value="">Prefer not to say</option>${["General", "OBC", "SC", "ST", "EWS"].map(c => `<option ${p.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
          <label>Family income band <select name="incomeBand"><option value="">Prefer not to say</option>${["<2.5L", "2.5L-8L", "8L-20L", ">20L"].map(c => `<option ${p.incomeBand === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
          <label class="inline"><input type="checkbox" name="disability" ${p.disability ? "checked" : ""}> Person with disability</label>
        </div>
      </details>
      <div class="span2 actions">
        <button type="submit" class="primary">Save profile & start guidance</button>
      </div>
    </form>
    <div id="profile-feedback"></div>
  `;
  document.getElementById("profile-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const profile = {
      name: fd.get("name"), academicPercentage: Number(fd.get("academicPercentage")) || undefined,
      strongSubject: fd.get("strongSubject") || undefined,
      interests: csvToArr(fd.get("interests")),
      entranceExam: fd.get("entranceExam") || undefined,
      examIntent: !fd.get("entranceExam"),
      examScore: fd.get("examScore") || undefined,
      collegeTypes: fd.getAll("collegeTypes"),
      homeState: fd.get("homeState") || undefined,
      preferredStates: csvToArr(fd.get("preferredStates")),
      budgetPerYear: fd.get("budgetPerYear") ? Number(fd.get("budgetPerYear")) : undefined,
      currentMonth: fd.get("currentMonth") || undefined,
      gender: fd.get("gender") || undefined,
      category: fd.get("category") || undefined,
      incomeBand: fd.get("incomeBand") || undefined,
      disability: !!fd.get("disability"),
    };
    STORE.setProfile(profile);
    assistantState.results = {};
    assistantState.full = {};
    assistantState.stepIndex = 0;
    document.getElementById("profile-feedback").innerHTML = `<p class="ok">Profile saved. Opening the Assistant…</p>`;
    showTab("assistant");
  });
}

// --------------------------------------------------------- Assistant tab --
const STAGE_ORDER = ["intake_clarify", "career_assessment", "college_comparison", "exam_recommendation", "admission_roadmap", "scholarship_finder", "counselling_guidance", "career_prospects"];
const assistantState = { stepIndex: 0, results: {}, full: {} };

function stageCtx(stageId) {
  const profile = STORE.getProfile();
  switch (stageId) {
    case "college_comparison": return { profile, data: COLLEGES };
    case "exam_recommendation": return { profile, data: ENTRANCE_EXAMS };
    case "admission_roadmap": return {
      profile,
      // Chained context: prefer the real prior stage output, but never pass
      // undefined into the prompt — fall back to the recommended exam list.
      extra: assistantState.results.exam_recommendation
        || { recommended_exams: [], note: "exam stage not run yet", reference_exams: ENTRANCE_EXAMS },
    };
    case "scholarship_finder": return { profile, data: SCHOLARSHIPS };
    case "counselling_guidance": return { profile: { ...profile, primaryExam: assistantState.results.exam_recommendation?.recommended_exams?.[0]?.code } };
    case "career_prospects": {
      const branch = BRANCHES.find(b => b.code === profile.branch) || BRANCHES[0];
      return { profile: { ...profile, branch: branch.code }, data: branch };
    }
    default: return { profile };
  }
}

async function renderAssistantTab() {
  const panel = document.getElementById("panel-assistant");
  const profile = STORE.getProfile();
  if (!profile.academicPercentage) {
    panel.innerHTML = `<h2>Assistant</h2><p class="muted">Please fill in your profile first.</p><button class="primary" id="go-profile">Go to Profile</button>`;
    document.getElementById("go-profile").onclick = () => showTab("profile");
    return;
  }
  panel.innerHTML = `<h2>Guided Assistant</h2><div id="stage-list"></div>`;
  await runUpTo(assistantState.stepIndex);
}

async function runUpTo(idx) {
  const list = document.getElementById("stage-list");
  if (!list) return;
  for (let i = 0; i <= idx && i < STAGE_ORDER.length; i++) {
    const stageId = STAGE_ORDER[i];
    if (document.getElementById(`stage-${stageId}`)) continue; // already rendered, don't duplicate
    const spec = PROMPTS[stageId];
    const card = el(`<div class="stage-card" id="stage-${stageId}"><h3>${escapeHtml(spec.label)}</h3><p class="technique">Technique: ${escapeHtml(spec.technique)}</p><div class="stage-body"><span class="spinner"></span> Thinking…</div></div>`);
    list.appendChild(card);
    if (assistantState.full[stageId]) {
      renderStageResult(card, stageId, spec, assistantState.full[stageId]);
    } else {
      await runAndRenderStage(stageId, card, spec);
    }
  }
}

async function runAndRenderStage(stageId, card, spec) {
  const ctx = stageCtx(stageId);
  let result;
  try {
    result = await ENGINE.runStage(stageId, ctx, { version: "v2" });
  } catch (err) {
    card.querySelector(".stage-body").innerHTML = `<p class="error">Error: ${escapeHtml(err.message)}. Falling back to offline mode — clear your API key in Settings if this persists.</p>`;
    return;
  }
  assistantState.results[stageId] = result.output;
  assistantState.full[stageId] = result;
  STORE.addHistory({ stage: stageId, label: spec.label, mode: result.mode, summary: JSON.stringify(result.output).slice(0, 200) });
  renderStageResult(card, stageId, spec, result);
}

function renderStageResult(card, stageId, spec, result) {
  const body = card.querySelector(".stage-body");
  const modeTag = `<span class="mode-tag ${result.mode}">${result.mode === "live" ? "Live" : "Offline sim"}</span>`;
  const ctx = { profile: STORE.getProfile(), shortlist: STORE.getShortlist() };

  body.innerHTML = `
    ${modeTag}
    ${renderStageOutput(stageId, result.output, ctx)}
    <details class="prompt-view">
      <summary>View prompt used (${result.version})</summary>
      <p><strong>System:</strong></p><pre>${escapeHtml(result.prompt.system)}</pre>
      <p><strong>User:</strong></p><pre>${escapeHtml(result.prompt.user)}</pre>
    </details>
    <div class="refine-box">
      <input type="text" placeholder="Not quite right? Tell the assistant what to change…" class="refine-input">
      <button class="refine-btn secondary">Refine</button>
    </div>
    <div class="refine-result"></div>
    <div class="stage-actions">
      <button class="regen secondary">Regenerate</button>
      <button class="next primary">Continue →</button>
    </div>
  `;

  card.querySelectorAll("[data-branch]").forEach(btn => btn.addEventListener("click", () => {
    const p = STORE.getProfile(); p.branch = btn.dataset.branch; STORE.setProfile(p);
    card.querySelectorAll("[data-branch]").forEach(b => {
      const isThis = b === btn;
      b.classList.toggle("selected", isThis);
      b.closest(".branch-row")?.classList.toggle("is-selected", isThis);
      b.textContent = isThis ? "✓ Selected as target branch" : "Select this branch";
    });
  }));
  card.querySelectorAll("[data-save]").forEach(btn => btn.addEventListener("click", () => {
    STORE.addShortlist(btn.dataset.save); btn.textContent = "★ Saved"; btn.disabled = true; btn.classList.add("selected");
  }));
  card.querySelector(".regen")?.addEventListener("click", async () => {
    delete assistantState.results[stageId];
    delete assistantState.full[stageId];
    card.querySelector(".stage-body").innerHTML = `<span class="spinner"></span> Thinking…`;
    await runAndRenderStage(stageId, card, spec);
  });
  card.querySelector(".refine-btn")?.addEventListener("click", async () => {
    const input = card.querySelector(".refine-input");
    const feedback = input.value.trim();
    if (!feedback) return;
    const box = card.querySelector(".refine-result");
    box.innerHTML = `<span class="spinner"></span> Revising…`;
    const rev = await ENGINE.runRefine(spec.label, result.output, feedback);
    const revisedHtml = rev.output.revised ? renderStageOutput(stageId, rev.output.revised, ctx) : prettyRender(rev.output);
    const whatChanged = (rev.output.what_changed || []).length
      ? `<div class="verify-box"><strong>What changed:</strong> ${chipList(rev.output.what_changed)}${rev.output.why ? `<p class="muted">${escapeHtml(rev.output.why)}</p>` : ""}</div>` : "";
    box.innerHTML = `<div class="mode-tag ${rev.mode}">${rev.mode === "live" ? "Live" : "Offline sim"}</div>${whatChanged}${revisedHtml}
      <details class="prompt-view"><summary>View refine prompt</summary><pre>${escapeHtml(rev.prompt.system)}\n\n${escapeHtml(rev.prompt.user)}</pre></details>`;
  });
  card.querySelector(".next")?.addEventListener("click", async () => {
    assistantState.stepIndex = Math.min(STAGE_ORDER.indexOf(stageId) + 1, STAGE_ORDER.length - 1);
    await runUpTo(assistantState.stepIndex);
    card.querySelector(".next").scrollIntoView({ behavior: "smooth" });
  });
}

// ---------------------------------------------------------- Colleges tab --
function renderCollegesTab() {
  const panel = document.getElementById("panel-colleges");
  const shortlist = STORE.getShortlist();
  panel.innerHTML = `
    <h2>College Directory</h2>
    <p class="muted">⚠️ Illustrative sample dataset for demo purposes — verify all figures against NIRF, AICTE/UGC/NBA/NAAC records, and official college websites before relying on them.</p>
    <div class="table-wrap"><table class="colleges-table">
      <thead><tr><th>College</th><th>Type</th><th>NIRF</th><th>Fees/yr</th><th>Avg Package</th><th>Placement %</th><th>Hostel</th><th>Reviews</th><th></th></tr></thead>
      <tbody>${COLLEGES.map(c => `
        <tr>
          <td>${escapeHtml(c.name)}<br><span class="muted small">${escapeHtml(c.state)} · ${escapeHtml(c.accreditation)}</span></td>
          <td>${escapeHtml(c.type)}</td>
          <td>#${c.nirfRank}</td>
          <td>₹${c.feesPerYearINR.toLocaleString("en-IN")}</td>
          <td>₹${c.avgPackageLPA} LPA</td>
          <td>${c.placementRate}%</td>
          <td>${escapeHtml(c.hostel)}</td>
          <td>${c.studentReviewScore}/5</td>
          <td><button class="chip" data-toggle="${c.id}">${shortlist.includes(c.id) ? "★ Saved" : "☆ Save"}</button></td>
        </tr>`).join("")}</tbody>
    </table></div>
  `;
  panel.querySelectorAll("[data-toggle]").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.toggle;
    if (STORE.getShortlist().includes(id)) { STORE.removeShortlist(id); btn.textContent = "☆ Save"; }
    else { STORE.addShortlist(id); btn.textContent = "★ Saved"; }
  }));
}

// --------------------------------------------------------------- Saved tab
function renderSavedTab() {
  const panel = document.getElementById("panel-saved");
  const shortlist = STORE.getShortlist().map(id => COLLEGES.find(c => c.id === id)).filter(Boolean);
  const history = STORE.getHistory();
  panel.innerHTML = `
    <h2>Saved Shortlist & Counselling History</h2>
    <h3>Shortlisted colleges</h3>
    ${shortlist.length ? `<ul class="pretty-list">${shortlist.map(c => `<li>${escapeHtml(c.name)} — ₹${c.feesPerYearINR.toLocaleString("en-IN")}/yr, ${c.placementRate}% placement <button class="chip small" data-remove="${c.id}">Remove</button></li>`).join("")}</ul>` : `<p class="muted">No colleges saved yet — save some from the Colleges tab or Assistant results.</p>`}
    <div class="actions"><button id="download-report" class="primary">Download personalized report</button></div>
    <h3>Counselling history</h3>
    ${history.length ? `<ul class="pretty-list">${history.slice(0, 20).map(h => `<li><strong>${escapeHtml(h.label)}</strong> <span class="mode-tag ${h.mode}">${h.mode}</span> — ${new Date(h.ts).toLocaleString()}</li>`).join("")}</ul>` : `<p class="muted">No activity yet.</p>`}
  `;
  panel.querySelectorAll("[data-remove]").forEach(btn => btn.addEventListener("click", () => { STORE.removeShortlist(btn.dataset.remove); renderSavedTab(); }));
  document.getElementById("download-report").addEventListener("click", downloadReport);
}

function downloadReport() {
  const p = STORE.getProfile();
  const shortlist = STORE.getShortlist().map(id => COLLEGES.find(c => c.id === id)).filter(Boolean);
  const r = assistantState.results;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Career Report — ${escapeHtml(p.name || "Student")}</title>
    <style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;color:#1a1a1a}h1{color:#2A5CAA}h2{color:#2A5CAA;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:2rem}dt{font-weight:600;margin-top:6px}dd{margin:0 0 4px 0}.muted{color:#666;font-size:0.9em}</style>
    </head><body>
    <h1>Personalized Engineering Career &amp; Admission Report</h1>
    <p class="muted">Generated ${new Date().toLocaleString()} · Illustrative demo data — verify all facts against official sources (NIRF/AICTE/JoSAA/CSAB/college websites) before acting.</p>
    <h2>Profile summary</h2>${prettyRender(p)}
    ${r.career_assessment ? `<h2>Branch recommendations</h2>${prettyRender(r.career_assessment)}` : ""}
    ${r.college_comparison ? `<h2>College comparison</h2>${prettyRender(r.college_comparison)}` : ""}
    ${r.exam_recommendation ? `<h2>Recommended exams</h2>${prettyRender(r.exam_recommendation)}` : ""}
    ${r.admission_roadmap ? `<h2>Admission roadmap</h2>${prettyRender(r.admission_roadmap)}` : ""}
    ${r.scholarship_finder ? `<h2>Scholarship matches</h2>${prettyRender(r.scholarship_finder)}` : ""}
    ${r.counselling_guidance ? `<h2>Counselling guidance</h2>${prettyRender(r.counselling_guidance)}` : ""}
    ${r.career_prospects ? `<h2>Career prospects</h2>${prettyRender(r.career_prospects)}` : ""}
    <h2>Shortlisted colleges</h2>${prettyRender(shortlist)}
    </body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `career-report-${(p.name || "student").replace(/\s+/g, "_")}.html`;
  document.body.appendChild(a); a.click(); a.remove();
}

// ------------------------------------------------------------ Prompt Lab --
function renderPromptLabTab() {
  const panel = document.getElementById("panel-promptlab");
  const stageId = panel.dataset.stage || STAGE_ORDER[1];
  panel.innerHTML = `
    <h2>Prompt Lab</h2>
    <p class="muted">Compare a minimal zero-shot prompt (V1) against the engineered prompt (V2 — role + structured schema + few-shot + template). Edit either template and re-run.</p>
    <label>Stage
      <select id="lab-stage">${STAGE_ORDER.map(s => `<option value="${s}" ${s === stageId ? "selected" : ""}>${PROMPTS[s].label}</option>`).join("")}</select>
    </label>
    <div class="lab-grid">
      <div class="lab-col"><h3>V1 — Baseline (zero-shot)</h3><textarea id="lab-v1"></textarea><button class="secondary" id="run-v1">Run V1</button><div id="out-v1" class="lab-out"></div></div>
      <div class="lab-col"><h3>V2 — Engineered</h3><textarea id="lab-v2"></textarea><button class="primary" id="run-v2">Run V2</button><div id="out-v2" class="lab-out"></div></div>
    </div>
  `;
  const fillTemplates = () => {
    const spec = PROMPTS[stageId];
    const ctx = stageCtx(stageId);
    document.getElementById("lab-v1").value = spec.buildV1(ctx.profile, ctx.data ?? ctx.extra);
    document.getElementById("lab-v2").value = spec.buildV2(ctx.profile, ctx.data ?? ctx.extra);
  };
  fillTemplates();
  document.getElementById("lab-stage").addEventListener("change", (e) => { panel.dataset.stage = e.target.value; renderPromptLabTab(); });

  const run = async (version) => {
    const out = document.getElementById(`out-${version}`);
    out.innerHTML = `<span class="spinner"></span> Running…`;
    const spec = PROMPTS[stageId];
    const apiKey = STORE.getApiKey();
    const editedUser = document.getElementById(`lab-${version}`).value;
    try {
      let result;
      if (apiKey) {
        const output = await ENGINE.callClaudeLive(spec.system, editedUser, apiKey);
        result = { mode: "live", output };
      } else {
        result = await ENGINE.runStage(stageId, stageCtx(stageId), { version });
      }
      const ctx = { profile: STORE.getProfile(), shortlist: STORE.getShortlist(), readOnly: true };
      out.innerHTML = `<div class="mode-tag ${result.mode}">${result.mode}</div>${renderStageOutput(stageId, result.output, ctx)}`;
    } catch (err) {
      out.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  };
  document.getElementById("run-v1").addEventListener("click", () => run("v1"));
  document.getElementById("run-v2").addEventListener("click", () => run("v2"));
}

// -------------------------------------------------------------- Settings --
function renderSettingsTab() {
  const panel = document.getElementById("panel-settings");
  panel.innerHTML = `
    <h2>Settings</h2>
    <p class="muted">Enter an Anthropic API key to switch from offline simulation to live Claude responses. The key is stored only in this browser's localStorage and sent only to <code>api.anthropic.com</code> when you run a stage.</p>
    <label>Anthropic API key<input type="password" id="api-key-input" value="${escapeHtml(STORE.getApiKey())}" placeholder="sk-ant-..."></label>
    <div class="actions">
      <button class="primary" id="save-key">Save</button>
      <button class="secondary" id="clear-key">Clear (use offline mode)</button>
    </div>
    <p id="key-status" class="muted"></p>
    <h3>Data & privacy</h3>
    <ul class="pretty-list">
      <li>Profile, shortlist, and history are stored only in this browser (localStorage) — nothing is sent to any server unless you set an API key.</li>
      <li>Optional fields (gender, category, income band, disability) are used only for scholarship matching and can be left blank.</li>
      <li>Use "Clear all data" below to wipe everything from this browser.</li>
    </ul>
    <button class="danger" id="clear-all">Clear all data</button>
  `;
  document.getElementById("save-key").addEventListener("click", () => {
    STORE.setApiKey(document.getElementById("api-key-input").value.trim());
    refreshModeBadge();
    document.getElementById("key-status").textContent = "Saved.";
  });
  document.getElementById("clear-key").addEventListener("click", () => {
    STORE.setApiKey(""); document.getElementById("api-key-input").value = "";
    refreshModeBadge();
    document.getElementById("key-status").textContent = "Cleared — using offline simulation.";
  });
  document.getElementById("clear-all").addEventListener("click", () => {
    if (confirm("Clear all locally stored data (profile, shortlist, history, API key)?")) {
      localStorage.clear(); location.reload();
    }
  });
}

// ------------------------------------------------------------------- init
document.addEventListener("DOMContentLoaded", () => {
  TABS.forEach(t => document.getElementById(`tab-${t}`).addEventListener("click", () => showTab(t)));
  refreshModeBadge();
  renderProfileTab();
  renderSettingsTab();
  showTab(STORE.getProfile().academicPercentage ? "assistant" : "profile");
});

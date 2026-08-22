/* ==========================================================================
   renderers.js — Stage-specific result renderers.

   Replaces the earlier generic JSON-to-<dl> dump with real UI: resolved
   names (not raw ids/codes), progress bars for scores, color-coded
   strength/tradeoff lists, timelines, stat callouts. Each function takes
   a stage's structured output object and returns an HTML string.
   ========================================================================== */

function fmtINR(n) { return "₹" + Number(n).toLocaleString("en-IN"); }
function scoreTier(score) { return score >= 60 ? "high" : score >= 30 ? "mid" : "low"; }
function chipList(items, cls = "chip static") {
  return items.length ? `<div class="chip-row">${items.map(i => `<span class="${cls}">${escapeHtml(i)}</span>`).join("")}</div>` : "";
}
function banner(kind, title, bodyHtml) {
  const icon = { success: "✅", warning: "⚠️", info: "ℹ️" }[kind] || "";
  return `<div class="banner banner-${kind}"><div class="banner-title">${icon} ${escapeHtml(title)}</div>${bodyHtml || ""}</div>`;
}

const STAGE_RENDERERS = {

  intake_clarify(output) {
    if (output.profile_complete) {
      return banner("success", "Your profile has everything needed to continue.",
        output.reasoning ? `<p class="muted">${escapeHtml(output.reasoning)}</p>` : "");
    }
    return banner("warning", "A few things would help before I recommend branches:",
      `<ul class="pretty-list">${(output.clarifying_questions || []).map(q => `<li>${escapeHtml(q)}</li>`).join("")}</ul>
       ${output.reasoning ? `<p class="muted">${escapeHtml(output.reasoning)}</p>` : ""}`);
  },

  career_assessment(output, ctx = {}) {
    if (output.needs_clarification) {
      return banner("warning", "I need a bit more information first:",
        `<ul class="pretty-list">${(output.questions || []).map(q => `<li>${escapeHtml(q)}</li>`).join("")}</ul>`);
    }
    const selected = ctx.profile?.branch;
    const rows = (output.recommendations || []).map(r => {
      const b = BRANCHES.find(x => x.code === r.branch);
      const tier = scoreTier(r.fitScore);
      const isSel = r.branch === selected;
      return `
        <div class="branch-row ${isSel ? "is-selected" : ""}">
          <div class="branch-row-head">
            <span class="branch-name">${escapeHtml(b ? b.name : r.branch)}</span>
            <span class="badge badge-code">${escapeHtml(r.branch)}</span>
          </div>
          <div class="score-bar"><div class="score-fill tier-${tier}" style="width:${Math.max(4, r.fitScore)}%"></div></div>
          <div class="score-label">${r.fitScore}% fit</div>
          <p class="branch-reason">${escapeHtml(r.reasoning)}</p>
          ${ctx.readOnly ? "" : `<button class="chip select-btn ${isSel ? "selected" : ""}" data-branch="${escapeHtml(r.branch)}">${isSel ? "✓ Selected as target branch" : "Select this branch"}</button>`}
        </div>`;
    }).join("");
    return `<div class="branch-list">${rows}</div>`;
  },

  college_comparison(output, ctx = {}) {
    const shortlist = ctx.shortlist || [];
    const cards = (output.ranked || []).map((r, i) => {
      const c = COLLEGES.find(x => x.id === r.collegeId);
      const name = c ? c.name : r.collegeId;
      const sub = c ? `${c.type} · ${c.state} · ${c.accreditation}` : "";
      const overBudget = (output.budget_flags || []).includes(r.collegeId);
      const saved = shortlist.includes(r.collegeId);
      return `
        <div class="college-card">
          <div class="college-card-head">
            <span class="rank-badge">#${i + 1}</span>
            <div class="college-id-block">
              <div class="college-name">${escapeHtml(name)}</div>
              ${sub ? `<div class="muted small">${escapeHtml(sub)}</div>` : ""}
            </div>
            <div class="fit-ring tier-${scoreTier(r.overallFit)}">${r.overallFit}</div>
          </div>
          ${overBudget ? `<span class="badge badge-warn">Over stated budget</span>` : ""}
          ${(r.strengths || []).length ? `<ul class="check-list">${r.strengths.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>` : ""}
          ${(r.tradeoffs || []).length ? `<ul class="warn-list">${r.tradeoffs.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : ""}
          ${ctx.readOnly ? "" : `<button class="chip save-btn ${saved ? "selected" : ""}" data-save="${escapeHtml(r.collegeId)}" ${saved ? "disabled" : ""}>${saved ? "★ Saved" : "☆ Save to shortlist"}</button>`}
        </div>`;
    }).join("");
    const verify = (output.verify_before_deciding || []);
    return `<div class="college-list">${cards}</div>
      ${verify.length ? `<div class="verify-box"><strong>🔍 Verify before deciding:</strong> ${chipList(verify)}</div>` : ""}`;
  },

  exam_recommendation(output) {
    const cards = (output.recommended_exams || []).map(e => {
      const ex = ENTRANCE_EXAMS.find(x => x.code === e.code);
      return `
        <div class="exam-card">
          <div class="exam-card-head">
            <span class="badge ${e.priority === "primary" ? "badge-live" : "badge-code"}">${escapeHtml(e.priority)}</span>
            <span class="exam-name">${escapeHtml(ex ? ex.name : e.code)}</span>
          </div>
          <p class="muted">${escapeHtml(e.why_relevant)}</p>
        </div>`;
    }).join("");
    return `<div class="exam-list">${cards}</div>`;
  },

  admission_roadmap(output) {
    const steps = (output.timeline || []).map(t => `
      <div class="tl-step">
        <div class="tl-dot"></div>
        <div class="tl-body">
          <div class="tl-period">${escapeHtml(t.period)}</div>
          <div class="tl-milestone">${escapeHtml(t.milestone)}</div>
          ${(t.action_items || []).length ? `<ul class="pretty-list">${t.action_items.map(a => `<li>${escapeHtml(a)}</li>`).join("")}</ul>` : ""}
        </div>
      </div>`).join("");
    const docs = (output.document_checklist || []).map(d => `<li>☐ ${escapeHtml(d)}</li>`).join("");
    const notes = (output.contingency_notes || []).map(n => `<li>💡 ${escapeHtml(n)}</li>`).join("");
    return `
      <div class="timeline">${steps}</div>
      <div class="roadmap-extra">
        ${docs ? `<div class="side-box"><strong>Document checklist</strong><ul class="pretty-list">${docs}</ul></div>` : ""}
        ${notes ? `<div class="side-box"><strong>Contingency notes</strong><ul class="pretty-list">${notes}</ul></div>` : ""}
      </div>`;
  },

  scholarship_finder(output) {
    const likelihoodClass = { likely: "badge-live", possible: "badge-code", "check details": "badge-warn" };
    const cards = (output.matches || []).map(m => `
      <div class="scholarship-card">
        <div class="scholarship-head">
          <span class="scholarship-name">${escapeHtml(m.name)}</span>
          <span class="badge ${likelihoodClass[m.likelihood] || "badge-code"}">${escapeHtml(m.likelihood)}</span>
        </div>
        <p class="muted">${escapeHtml(m.reasoning)}</p>
        <p class="scholarship-action">→ ${escapeHtml(m.action)}</p>
      </div>`).join("");
    return `<div class="scholarship-list">${cards}</div>`;
  },

  counselling_guidance(output) {
    const steps = (output.steps || []).map((s, i) => `
      <li><strong>${escapeHtml(s.step)}</strong> — ${escapeHtml(s.explanation)}</li>`).join("");
    const terms = (output.key_terms || []).map(t => `
      <div class="term-row"><span class="term-name">${escapeHtml(t.term)}</span><span class="muted">${escapeHtml(t.meaning)}</span></div>`).join("");
    const sources = output.official_sources || [];
    return `
      <ol class="counsel-steps">${steps}</ol>
      ${terms ? `<div class="term-grid">${terms}</div>` : ""}
      ${sources.length ? `<div class="verify-box"><strong>📌 Official sources:</strong> ${chipList(sources)}</div>` : ""}`;
  },

  career_prospects(output) {
    const [low, high] = output.salary_range_lpa || [];
    return `
      <div class="stat-callout">
        <div class="stat-value">${fmtINR(low)}–${fmtINR(high)} <span class="stat-unit">LPA</span></div>
        <div class="stat-label">Typical salary range</div>
      </div>
      <p>${escapeHtml(output.outlook_summary || "")}</p>
      ${chipList(output.higher_education_paths || [])}
      ${(output.caveats || []).length ? `<p class="muted small">⚠️ ${output.caveats.map(escapeHtml).join(" ")}</p>` : ""}`;
  },
};

function renderStageOutput(stageId, output, ctx) {
  if (output && output.parse_error) {
    return banner("warning", "Couldn't read the model's response as structured data — showing it raw. Try Regenerate.",
      `<pre style="white-space:pre-wrap">${escapeHtml(output.raw || "")}</pre>`);
  }
  const fn = STAGE_RENDERERS[stageId];
  return fn ? fn(output, ctx) : prettyRender(output);
}

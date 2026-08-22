/* ==========================================================================
   renderers.js — Stage-specific result renderers.

   Replaces the earlier generic JSON-to-<dl> dump with real UI: resolved
   names (not raw ids/codes), progress bars for scores, color-coded
   strength/tradeoff lists, timelines, stat callouts. Each function takes
   a stage's structured output object and returns an HTML string.
   ========================================================================== */

function fmtINR(n) { return "₹" + Number(n).toLocaleString("en-IN"); }
/** First defined, non-empty value among the given keys. Live models
 *  occasionally rename schema fields (exam/code, reason/why_relevant, …);
 *  this keeps a renamed key from rendering as "undefined". */
function pick(obj, ...keys) {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}
/** Coerce a value the schema expects to be an array into one. */
function asArray(v) { return Array.isArray(v) ? v : (v === undefined || v === null || v === "" ? [] : [v]); }
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
    const list = asArray(pick(output, "recommended_exams", "exams", "recommendations"));
    const cards = list.map(e => {
      const code = pick(e, "code", "exam", "exam_code", "name");
      const ex = ENTRANCE_EXAMS.find(x => x.code === code || x.name === code);
      const priority = pick(e, "priority", "rank", "tier");
      const why = pick(e, "why_relevant", "reasoning", "reason", "explanation", "why");
      const label = ex ? ex.name : code;
      if (!label && !why) return "";
      return `
        <div class="exam-card">
          <div class="exam-card-head">
            ${priority ? `<span class="badge ${String(priority).toLowerCase() === "primary" ? "badge-live" : "badge-code"}">${escapeHtml(priority)}</span>` : ""}
            <span class="exam-name">${escapeHtml(label || "Exam")}</span>
          </div>
          ${why ? `<p class="muted">${escapeHtml(why)}</p>` : ""}
          ${ex ? `<p class="muted small">${escapeHtml(ex.scope)} · Typically: ${escapeHtml(ex.typicalWindow)}</p>` : ""}
        </div>`;
    }).join("");
    return `<div class="exam-list">${cards}</div>`;
  },

  admission_roadmap(output) {
    const timeline = asArray(pick(output, "timeline", "roadmap", "steps", "phases"));
    const steps = timeline.map(t => {
      const period = pick(t, "period", "month", "timeframe", "when", "date");
      const milestone = pick(t, "milestone", "goal", "task", "title", "step");
      const actions = asArray(pick(t, "action_items", "actions", "tasks", "todo"));
      if (!period && !milestone && !actions.length) return "";
      return `
      <div class="tl-step">
        <div class="tl-dot"></div>
        <div class="tl-body">
          ${period ? `<div class="tl-period">${escapeHtml(period)}</div>` : ""}
          ${milestone ? `<div class="tl-milestone">${escapeHtml(milestone)}</div>` : ""}
          ${actions.length ? `<ul class="pretty-list">${actions.map(a => `<li>${escapeHtml(a)}</li>`).join("")}</ul>` : ""}
        </div>
      </div>`;
    }).join("");
    const docs = asArray(pick(output, "document_checklist", "documents", "checklist")).map(d => `<li>☐ ${escapeHtml(d)}</li>`).join("");
    const notes = asArray(pick(output, "contingency_notes", "contingencies", "notes")).map(n => `<li>💡 ${escapeHtml(n)}</li>`).join("");
    return `
      <div class="timeline">${steps}</div>
      <div class="roadmap-extra">
        ${docs ? `<div class="side-box"><strong>Document checklist</strong><ul class="pretty-list">${docs}</ul></div>` : ""}
        ${notes ? `<div class="side-box"><strong>Contingency notes</strong><ul class="pretty-list">${notes}</ul></div>` : ""}
      </div>`;
  },

  scholarship_finder(output) {
    const likelihoodClass = { likely: "badge-live", possible: "badge-code", "check details": "badge-warn" };
    const list = asArray(pick(output, "matches", "scholarships", "recommendations"));
    const cards = list.map(m => {
      const name = pick(m, "name", "scheme", "scholarship", "title");
      const likelihood = pick(m, "likelihood", "eligibility", "confidence", "status");
      const why = pick(m, "reasoning", "reason", "why", "explanation");
      const action = pick(m, "action", "how_to_apply", "next_step", "apply");
      if (!name && !why) return "";
      return `
      <div class="scholarship-card">
        <div class="scholarship-head">
          <span class="scholarship-name">${escapeHtml(name || "Scholarship")}</span>
          ${likelihood ? `<span class="badge ${likelihoodClass[String(likelihood).toLowerCase()] || "badge-code"}">${escapeHtml(likelihood)}</span>` : ""}
        </div>
        ${why ? `<p class="muted">${escapeHtml(why)}</p>` : ""}
        ${action ? `<p class="scholarship-action">→ ${escapeHtml(action)}</p>` : ""}
      </div>`;
    }).join("");
    return `<div class="scholarship-list">${cards}</div>`;
  },

  counselling_guidance(output) {
    const steps = asArray(pick(output, "steps", "process", "stages")).map(s => {
      const label = pick(s, "step", "name", "title", "stage");
      const explanation = pick(s, "explanation", "reasoning", "detail", "description", "why");
      if (!label && !explanation) return "";
      return `<li>${label ? `<strong>${escapeHtml(label)}</strong>` : ""}${label && explanation ? " — " : ""}${explanation ? escapeHtml(explanation) : ""}</li>`;
    }).join("");
    const terms = asArray(pick(output, "key_terms", "terms", "glossary")).map(t => {
      const term = pick(t, "term", "name", "word");
      const meaning = pick(t, "meaning", "definition", "explanation", "description");
      if (!term && !meaning) return "";
      return `<div class="term-row">${term ? `<span class="term-name">${escapeHtml(term)}</span>` : ""}${meaning ? `<span class="muted">${escapeHtml(meaning)}</span>` : ""}</div>`;
    }).join("");
    const sources = asArray(pick(output, "official_sources", "sources", "references"));
    return `
      <ol class="counsel-steps">${steps}</ol>
      ${terms ? `<div class="term-grid">${terms}</div>` : ""}
      ${sources.length ? `<div class="verify-box"><strong>📌 Official sources:</strong> ${chipList(sources)}</div>` : ""}`;
  },

  career_prospects(output) {
    const range = asArray(pick(output, "salary_range_lpa", "salary_range", "salaryRange"));
    const [low, high] = range;
    const validRange = Number.isFinite(Number(low)) && Number.isFinite(Number(high));
    const summary = pick(output, "outlook_summary", "outlook", "summary", "reasoning") || "";
    const paths = asArray(pick(output, "higher_education_paths", "higher_education", "further_study"));
    const caveats = asArray(pick(output, "caveats", "notes", "disclaimers"));
    return `
      ${validRange ? `<div class="stat-callout">
        <div class="stat-value">${fmtINR(low)}–${fmtINR(high)} <span class="stat-unit">LPA</span></div>
        <div class="stat-label">Typical salary range</div>
      </div>` : ""}
      ${summary ? `<p>${escapeHtml(summary)}</p>` : ""}
      ${chipList(paths)}
      ${caveats.length ? `<p class="muted small">⚠️ ${caveats.map(escapeHtml).join(" ")}</p>` : ""}`;
  },
};

function renderStageOutput(stageId, output, ctx) {
  if (output && output.parse_error) {
    const title = output.truncated
      ? "The model's response was cut off before it finished (ran out of output tokens) — try Regenerate."
      : "Couldn't read the model's response as structured data — showing it raw. Try Regenerate.";
    return banner("warning", title,
      `<pre style="white-space:pre-wrap">${escapeHtml(output.raw || "")}</pre>`);
  }
  const fn = STAGE_RENDERERS[stageId];
  const html = fn ? fn(output, ctx) : prettyRender(output);
  const visibleText = html.replace(/<[^>]*>/g, "").trim();
  if (!visibleText) {
    return banner("info", "The model's answer didn't quite match the expected layout — showing the raw data instead.",
      prettyRender(output));
  }
  return html;
}

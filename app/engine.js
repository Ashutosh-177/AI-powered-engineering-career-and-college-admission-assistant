/* ==========================================================================
   engine.js — Execution layer for prompt stages.

   Two execution modes, selected automatically by whether the user has
   entered an Anthropic API key in Settings:

     LIVE MODE     -> sends the engineered (V2) prompt to the real Claude
                       API from the browser (api.anthropic.com/v1/messages).
     OFFLINE MODE  -> runs a deterministic, rule-based simulator that
                       mimics what a well-engineered prompt should produce,
                       so the whole app is demoable without an API key.

   In BOTH modes, the UI is shown exactly which prompt (system + user,
   V1 or V2) generated the response, satisfying the transparency /
   explainability requirement of the brief.
   ========================================================================== */

const ENGINE = (() => {

  const CLAUDE_MODEL = "claude-sonnet-5";

  // ---------------------------------------------------------------- LIVE --
  async function callClaudeLive(system, userMsg, apiKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1200,
        system,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Claude API error ${res.status}: ${errText}`);
    }
    const data = await res.json();
    const text = (data.content || []).map(b => b.text || "").join("");
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text, parse_error: true };
    }
  }

  // ------------------------------------------------------------- helpers --
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /** Simulate the quality gap between a zero-shot (V1) and engineered (V2)
   *  prompt: strip grounded reasoning fields, replace with generic filler.
   *  This is only used offline, purely to make the V1-vs-V2 comparison in
   *  the Prompt Lab visible without needing two real API calls. */
  function degradeToV1(output) {
    const GENERIC = "General recommendation (baseline prompt had no structured schema, few-shot example, or reasoning requirement).";
    const walk = (node) => {
      if (Array.isArray(node)) return node.slice(0, Math.max(1, Math.ceil(node.length / 2))).map(walk);
      if (node && typeof node === "object") {
        const out = {};
        for (const [k, v] of Object.entries(node)) {
          if (["reasoning", "why_relevant", "why", "explanation"].includes(k)) out[k] = GENERIC;
          else if (["strengths", "tradeoffs", "caveats", "action_items", "key_terms"].includes(k)) out[k] = [];
          else out[k] = walk(v);
        }
        return out;
      }
      return node;
    };
    return walk(clone(output));
  }

  // ---------------------------------------------------- offline simulators
  function scoreBranches(profile) {
    const interests = (profile.interests || []).map(s => s.toLowerCase());
    const subjectBoost = {
      Physics: ["ECE", "EEE", "MECH"], Maths: ["CSE", "AIDS", "EEE"],
      Chemistry: ["CHEM", "BIOTECH"], Biology: ["BIOTECH"],
    }[profile.strongSubject] || [];

    return BRANCHES.map(b => {
      const matched = b.keywords.filter(k => interests.some(i => i.includes(k) || k.includes(i)));
      let score = matched.length * 22;
      if (subjectBoost.includes(b.code)) score += 15;
      score = Math.max(5, Math.min(97, score || 10));
      const reasonParts = [];
      if (matched.length) reasonParts.push(`matches stated interest(s) "${matched.join('", "')}"`);
      if (subjectBoost.includes(b.code)) reasonParts.push(`aligns with strongest subject (${profile.strongSubject})`);
      if (!reasonParts.length) reasonParts.push("weak signal from current profile — worth exploring if other options don't fit");
      return { branch: b.code, fitScore: score, reasoning: `${b.name}: ${reasonParts.join("; ")}.` };
    }).sort((a, b) => b.fitScore - a.fitScore).slice(0, 5);
  }

  function simulate_intake_clarify(profile) {
    const missing = [];
    if (!profile.academicPercentage) missing.push("academicPercentage");
    if (!profile.entranceExam && !profile.examIntent) missing.push("entranceExam/examIntent");
    if (!profile.interests || !profile.interests.length) missing.push("interests");
    if (!profile.preferredStates) missing.push("preferredStates (or 'any')");
    if (!profile.budgetPerYear && profile.budgetPerYear !== 0) missing.push("budgetPerYear (or 'not sure')");
    const qMap = {
      academicPercentage: "What's your latest Class 12 (or pre-board) percentage?",
      "entranceExam/examIntent": "Which entrance exam(s) are you targeting or already appeared for?",
      interests: "What subjects or activities genuinely interest you (e.g. coding, circuits, building things)?",
      "preferredStates (or 'any')": "Do you have a preferred state/city to study in, or are you open to anywhere in India?",
      "budgetPerYear (or 'not sure')": "What's your rough yearly budget for fees (or should I assume no strict limit)?",
    };
    return {
      profile_complete: missing.length === 0,
      missing_or_ambiguous: missing,
      clarifying_questions: missing.slice(0, 3).map(m => qMap[m]),
      reasoning: missing.length
        ? "These fields directly drive branch-fit scoring and college shortlisting, so guessing them would produce unreliable recommendations."
        : "All required fields are present; proceeding to career assessment.",
    };
  }

  function simulate_career_assessment(profile) {
    if (!profile.interests || !profile.interests.length) {
      return { needs_clarification: true, questions: ["What subjects or activities genuinely interest you?"], recommendations: [] };
    }
    return { needs_clarification: false, questions: [], recommendations: scoreBranches(profile) };
  }

  function simulate_college_comparison(profile, colleges) {
    const budget = profile.budgetPerYear;
    const ranked = colleges.map(c => {
      let score = 0;
      score += Math.min(30, c.placementRate * 0.3);
      score += Math.min(25, (c.avgPackageLPA / 25) * 25);
      score += Math.min(20, (c.studentReviewScore / 5) * 20);
      score += c.accreditation.includes("NBA") ? 10 : 5;
      const overBudget = budget && c.feesPerYearINR > budget;
      score += overBudget ? -15 : 15;
      score = Math.max(5, Math.min(99, Math.round(score)));
      const strengths = [];
      if (c.placementRate >= 90) strengths.push(`High placement rate (${c.placementRate}%)`);
      if (c.avgPackageLPA >= 15) strengths.push(`Strong average package (~₹${c.avgPackageLPA} LPA)`);
      if (c.research === "Very High" || c.research === "High") strengths.push(`${c.research} research activity`);
      if (c.studentReviewScore >= 4.4) strengths.push(`Strong student review score (${c.studentReviewScore}/5)`);
      const tradeoffs = [];
      if (overBudget) tradeoffs.push(`Fees (₹${c.feesPerYearINR}/yr) exceed stated budget (₹${budget}/yr)`);
      if (c.placementRate < 85) tradeoffs.push(`Lower placement rate (${c.placementRate}%) than top options`);
      return {
        collegeId: c.id, overallFit: score, strengths, tradeoffs,
        reasoning: `Scored on placement rate, average package, student reviews, accreditation, and budget fit against this student's stated budget.`,
      };
    }).sort((a, b) => b.overallFit - a.overallFit);
    return {
      ranked,
      budget_flags: ranked.filter(r => r.tradeoffs.some(t => t.includes("exceed"))).map(r => r.collegeId),
      verify_before_deciding: ["current NIRF ranking", "latest official placement report", "AICTE/UGC approval status for the current academic year"],
    };
  }

  function simulate_exam_recommendation(profile) {
    const types = (profile.collegeTypes || []).map(t => t.toUpperCase());
    const wants = (code) => {
      if (!types.length) return true;
      if (types.includes("IIT")) return code === "JEE_ADV" || code === "JEE_MAIN";
      if (types.includes("NIT") || types.includes("IIIT")) return code === "JEE_MAIN";
      return true;
    };
    const recs = ENTRANCE_EXAMS.filter(e => wants(e.code)).map((e, i) => ({
      code: e.code,
      why_relevant: `Covers: ${e.scope}.`,
      priority: i === 0 ? "primary" : "backup",
    }));
    return { recommended_exams: recs };
  }

  function simulate_admission_roadmap(profile, chainedContext) {
    const start = profile.currentMonth || "Aug 2026";
    const examCode = chainedContext?.recommended_exams?.[0]?.code;
    const exam = ENTRANCE_EXAMS.find(e => e.code === examCode);
    return {
      timeline: [
        { period: start, milestone: "Finalize target branches & exams; build a study schedule", action_items: ["Confirm shortlist from career assessment", "Register for chosen entrance exam(s)"] },
        { period: "Next 2-3 months", milestone: "Core exam preparation", action_items: ["Daily practice tests", "Track weak topics weekly"] },
        { period: exam?.typicalWindow || "Exam window", milestone: `Appear for ${exam?.name || "target exam"}`, action_items: ["Carry admit card + valid ID", "Reach center early"] },
        { period: "Post-results", milestone: "Choice filling & counselling registration", action_items: ["Register on JoSAA/CSAB/state portal", "Prepare document set", "Rank colleges realistically using saved comparisons"] },
        { period: "Counselling rounds", milestone: "Seat allotment, freeze/float/slide decisions, reporting", action_items: ["Track each round's deadline", "Pay confirmation fee on time"] },
      ],
      document_checklist: ["Class 10 & 12 marksheets", "Entrance exam scorecard/admit card", "Category/income certificate (if applicable)", "Passport-size photos", "Address & ID proof"],
      contingency_notes: [
        "If score is below expectation, revisit the state CET / private-college backup track rather than waiting only on JEE Advanced.",
        "Keep 2-3 backup colleges from the saved shortlist ready before counselling rounds open.",
      ],
    };
  }

  function simulate_scholarship_finder(profile) {
    const matches = [];
    for (const s of SCHOLARSHIPS) {
      if (s.name.includes("Pragati") && profile.gender === "female") matches.push({ name: s.name, likelihood: "likely", reasoning: "Matches gender criterion; confirm income cutoff.", action: "Apply via National Scholarship Portal (NSP)." });
      else if (s.name.includes("Saksham") && profile.disability) matches.push({ name: s.name, likelihood: "likely", reasoning: "Matches disability criterion; confirm certification.", action: "Apply via NSP with disability certificate." });
      else if (s.name.includes("Post-Matric") && profile.category && profile.category !== "General") matches.push({ name: s.name, likelihood: "possible", reasoning: `Category (${profile.category}) often qualifies for state EBC/post-matric schemes.`, action: "Check your state's scholarship portal." });
      else if (s.name.includes("Institute Merit")) matches.push({ name: s.name, likelihood: "check details", reasoning: "Depends on final admitted college's own policy.", action: "Ask the college's financial aid office after admission." });
    }
    if (!matches.length) matches.push({ name: "Institute Merit-cum-Means Scholarships", likelihood: "check details", reasoning: "Generic fallback — most institutes offer some merit/means aid.", action: "Check with the admitted college's financial aid office." });
    return { matches };
  }

  function simulate_counselling_guidance(profile) {
    const exam = ENTRANCE_EXAMS.find(e => e.code === profile.primaryExam);
    const isCentral = exam && (exam.code === "JEE_MAIN" || exam.code === "JEE_ADV");
    return {
      steps: [
        { step: "Registration", explanation: "Register on the relevant counselling portal after results are declared." },
        { step: "Choice filling", explanation: "List colleges/branches in your true order of preference — order matters more than caution." },
        { step: "Seat allotment", explanation: "An algorithm allots the best possible seat from your list based on rank and seat availability." },
        { step: "Freeze / Float / Slide", explanation: "Freeze locks your seat; float keeps you eligible for a better one in later rounds; slide keeps you within the same institute for a better branch." },
        { step: "Reporting & fee payment", explanation: "Complete document verification and pay the confirmation fee within the deadline or lose the seat." },
      ],
      key_terms: [
        { term: "Freeze", meaning: "Accept and lock the current allotted seat; you exit further rounds." },
        { term: "Float", meaning: "Stay open to a better college/branch in the next round; risk losing current allotment if you don't respond in time." },
        { term: "Slide", meaning: "Stay in the same institute but remain open to a better branch." },
      ],
      official_sources: isCentral ? ["JoSAA official website", "CSAB official website"] : ["Relevant State CET counselling portal", "State admission committee website"],
    };
  }

  function simulate_career_prospects(branchCode) {
    const b = BRANCHES.find(x => x.code === branchCode) || BRANCHES[0];
    return {
      outlook_summary: b.outlook,
      salary_range_lpa: b.avgSalaryRangeLPA,
      caveats: ["Figures are broad industry ranges and vary heavily by college tier, individual skills, internships, and market cycle — not a guarantee."],
      higher_education_paths: b.higherStudy,
    };
  }

  // -------------------------------------------------------------- runners
  /** Run a stage in whichever mode is active, always returning both the
   * prompt actually used and the output, for full transparency. */
  async function runStage(stageId, ctx, opts = {}) {
    const spec = PROMPTS[stageId];
    const apiKey = (typeof STORE !== "undefined") ? STORE.getApiKey() : null;
    const version = opts.version || "v2"; // 'v1' | 'v2'
    const buildFn = version === "v1" ? spec.buildV1 : spec.buildV2;
    const userMsg = buildFn(ctx.profile, ctx.data ?? ctx.extra);

    if (apiKey) {
      const output = await callClaudeLive(spec.system, userMsg, apiKey);
      return { mode: "live", version, prompt: { system: spec.system, user: userMsg }, output, technique: spec.technique };
    }

    // Offline simulation path
    let output;
    switch (stageId) {
      case "intake_clarify": output = simulate_intake_clarify(ctx.profile); break;
      case "career_assessment": output = simulate_career_assessment(ctx.profile); break;
      case "college_comparison": output = simulate_college_comparison(ctx.profile, ctx.data ?? COLLEGES); break;
      case "exam_recommendation": output = simulate_exam_recommendation(ctx.profile); break;
      case "admission_roadmap": output = simulate_admission_roadmap(ctx.profile, ctx.extra); break;
      case "scholarship_finder": output = simulate_scholarship_finder(ctx.profile); break;
      case "counselling_guidance": output = simulate_counselling_guidance(ctx.profile); break;
      case "career_prospects": output = simulate_career_prospects(ctx.profile.branch); break;
      default: output = { error: "unknown stage" };
    }
    if (version === "v1") output = degradeToV1(output);
    return { mode: "offline", version, prompt: { system: spec.system, user: userMsg }, output, technique: spec.technique };
  }

  async function runRefine(stageLabel, priorOutput, feedback) {
    const p = buildRefinePrompt(stageLabel, JSON.stringify(priorOutput, null, 2), feedback);
    const apiKey = (typeof STORE !== "undefined") ? STORE.getApiKey() : null;
    if (apiKey) {
      const output = await callClaudeLive(p.system, p.user, apiKey);
      return { mode: "live", prompt: p, output };
    }
    // Offline: a light, deterministic "revision" — re-emphasize feedback keywords.
    const output = {
      revised: priorOutput,
      what_changed: ["(Offline simulation) No live model call — showing prior output unchanged; in Live mode this would be genuinely revised."],
      why: `Feedback noted: "${feedback}". Add an API key in Settings to get a real revised recommendation.`,
    };
    return { mode: "offline", prompt: p, output };
  }

  return { runStage, runRefine, callClaudeLive };
})();

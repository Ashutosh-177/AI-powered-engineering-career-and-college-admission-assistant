/* ==========================================================================
   data.js — Illustrative reference data for the Career & College Admission
   Assistant prototype.

   IMPORTANT: The figures below (fees, packages, cutoffs, ratings) are
   approximate, illustrative placeholders for demo purposes only. They are
   NOT live data and must be verified against AICTE, UGC, NBA, NAAC, NIRF,
   JoSAA/CSAB, and official college websites before any real advising use.
   The app surfaces this disclaimer in the UI wherever this data is shown.
   ========================================================================== */

const BRANCHES = [
  { code: "CSE", name: "Computer Science & Engineering",
    keywords: ["coding", "programming", "software", "app", "web", "algorithms", "computer", "ai", "machine learning", "data structures"],
    outlook: "Highest demand branch; strong campus placement rates across tiers; core skills transfer well to IT, product, and research roles.",
    avgSalaryRangeLPA: [4.5, 30], higherStudy: ["M.Tech CSE/AI", "MS abroad (CS)", "MBA (Tech mgmt)"] },
  { code: "ECE", name: "Electronics & Communication Engineering",
    keywords: ["electronics", "circuits", "communication", "signal", "embedded", "vlsi", "chips", "hardware"],
    outlook: "Strong core-sector demand (semiconductors, telecom) plus large crossover into software roles.",
    avgSalaryRangeLPA: [4, 22], higherStudy: ["M.Tech VLSI/Comm", "MS (EE)", "PSU exams (via GATE)"] },
  { code: "EEE", name: "Electrical & Electronics Engineering",
    keywords: ["electrical", "power", "energy", "grid", "motors", "renewable"],
    outlook: "Steady demand from power, energy, and renewables sectors; strong PSU/GATE pathway.",
    avgSalaryRangeLPA: [3.5, 18], higherStudy: ["M.Tech Power Systems", "PSU via GATE", "MS (Power/Energy)"] },
  { code: "MECH", name: "Mechanical Engineering",
    keywords: ["mechanics", "machines", "design", "manufacturing", "automobile", "thermal", "robotics"],
    outlook: "Core manufacturing/automotive demand plus growing robotics/automation overlap.",
    avgSalaryRangeLPA: [3.5, 16], higherStudy: ["M.Tech Design/Thermal", "MS (Mech/Robotics)", "PSU via GATE"] },
  { code: "CIVIL", name: "Civil Engineering",
    keywords: ["construction", "buildings", "infrastructure", "structures", "urban planning", "architecture"],
    outlook: "Stable demand from infrastructure and construction sectors; strong government/PSU pathway.",
    avgSalaryRangeLPA: [3, 14], higherStudy: ["M.Tech Structural/Transportation", "PSU via GATE"] },
  { code: "CHEM", name: "Chemical Engineering",
    keywords: ["chemicals", "process", "petrochemical", "materials", "reactions"],
    outlook: "Niche but stable demand from process, petrochemical, and materials industries.",
    avgSalaryRangeLPA: [3.5, 16], higherStudy: ["M.Tech Process/Materials", "MS (ChemE)"] },
  { code: "BIOTECH", name: "Biotechnology / Bioengineering",
    keywords: ["biology", "biotech", "genetics", "medicine", "pharma", "life sciences"],
    outlook: "Growing demand in pharma, biotech research, and healthcare-tech; strong research pathway.",
    avgSalaryRangeLPA: [3, 12], higherStudy: ["M.Tech/MS Biotech", "MS abroad", "PhD research track"] },
  { code: "AIDS", name: "AI & Data Science",
    keywords: ["ai", "data science", "machine learning", "analytics", "statistics", "deep learning"],
    outlook: "Fast-growing specialization branch; high early-career demand, evolving curricula across colleges — check accreditation/track record carefully.",
    avgSalaryRangeLPA: [4.5, 28], higherStudy: ["M.Tech AI/ML", "MS (Data Science)"] },
];

const ENTRANCE_EXAMS = [
  { code: "JEE_MAIN", name: "JEE Main", scope: "NITs, IIITs, state/private colleges; qualifies for JEE Advanced", typicalWindow: "Jan & Apr sessions" },
  { code: "JEE_ADV", name: "JEE Advanced", scope: "IITs only; requires JEE Main qualification", typicalWindow: "May" },
  { code: "BITSAT", name: "BITSAT", scope: "BITS Pilani, Goa, Hyderabad campuses", typicalWindow: "May–June" },
  { code: "VITEEE", name: "VITEEE", scope: "VIT Vellore, Chennai, AP, Bhopal campuses", typicalWindow: "Apr" },
  { code: "SRMJEEE", name: "SRMJEEE", scope: "SRM Institute of Science & Technology campuses", typicalWindow: "Apr" },
  { code: "STATE_CET", name: "State CET (e.g., MHT-CET, KCET, WBJEE)", scope: "State government & private colleges within that state, home-state quota", typicalWindow: "Apr–May, state-specific" },
  { code: "COMEDK", name: "COMEDK UGET", scope: "Private engineering colleges in Karnataka", typicalWindow: "May" },
];

const COLLEGES = [
  { id: "iit-b", name: "IIT Bombay", type: "IIT", state: "Maharashtra", nirfRank: 3,
    accreditation: "NBA + NAAC A++", entryExam: "JEE_ADV",
    feesPerYearINR: 230000, avgPackageLPA: 21, placementRate: 95,
    hostel: "Compulsory, on-campus", research: "Very High (top-tier labs, strong PhD pipeline)",
    industryCollab: "Extensive (global tech + core industry MoUs)", studentReviewScore: 4.6 },
  { id: "iit-d", name: "IIT Delhi", type: "IIT", state: "Delhi", nirfRank: 2,
    accreditation: "NBA + NAAC A++", entryExam: "JEE_ADV",
    feesPerYearINR: 230000, avgPackageLPA: 22, placementRate: 95,
    hostel: "Compulsory, on-campus", research: "Very High", industryCollab: "Extensive",
    studentReviewScore: 4.6 },
  { id: "nit-t", name: "NIT Tiruchirappalli", type: "NIT", state: "Tamil Nadu", nirfRank: 9,
    accreditation: "NBA + NAAC A++", entryExam: "JEE_MAIN",
    feesPerYearINR: 155000, avgPackageLPA: 12, placementRate: 90,
    hostel: "Compulsory, on-campus", research: "High", industryCollab: "Strong regional + national",
    studentReviewScore: 4.4 },
  { id: "nit-w", name: "NIT Warangal", type: "NIT", state: "Telangana", nirfRank: 21,
    accreditation: "NBA + NAAC A++", entryExam: "JEE_MAIN",
    feesPerYearINR: 150000, avgPackageLPA: 11.5, placementRate: 88,
    hostel: "Compulsory, on-campus", research: "High", industryCollab: "Strong",
    studentReviewScore: 4.4 },
  { id: "bits-p", name: "BITS Pilani", type: "Private (Deemed)", state: "Rajasthan", nirfRank: 25,
    accreditation: "NAAC A", entryExam: "BITSAT",
    feesPerYearINR: 520000, avgPackageLPA: 18, placementRate: 92,
    hostel: "Compulsory, on-campus", research: "High", industryCollab: "Strong (dual-degree, industry tie-ups)",
    studentReviewScore: 4.5 },
  { id: "vit-v", name: "VIT Vellore", type: "Private (Deemed)", state: "Tamil Nadu", nirfRank: 11,
    accreditation: "NBA + NAAC A++", entryExam: "VITEEE",
    feesPerYearINR: 220000, avgPackageLPA: 8, placementRate: 85,
    hostel: "Optional, on-campus available", research: "Moderate–High", industryCollab: "Strong (large recruiter base)",
    studentReviewScore: 4.2 },
  { id: "coep", name: "COEP Technological University, Pune", type: "State Govt.", state: "Maharashtra", nirfRank: 95,
    accreditation: "NBA + NAAC A", entryExam: "STATE_CET",
    feesPerYearINR: 100000, avgPackageLPA: 9, placementRate: 82,
    hostel: "Available, limited seats", research: "Moderate", industryCollab: "Good (regional industry)",
    studentReviewScore: 4.3 },
  { id: "manipal", name: "Manipal Institute of Technology", type: "Private (Deemed)", state: "Karnataka", nirfRank: 44,
    accreditation: "NBA + NAAC A++", entryExam: "STATE_CET",
    feesPerYearINR: 480000, avgPackageLPA: 9.5, placementRate: 83,
    hostel: "Compulsory, on-campus", research: "Moderate", industryCollab: "Good",
    studentReviewScore: 4.1 },
];

const SCHOLARSHIPS = [
  { name: "AICTE Pragati Scholarship (for girl students)", eligibility: "Family income ≤ ₹8 LPA, girl students in AICTE-approved colleges", amount: "₹50,000/year" },
  { name: "AICTE Saksham Scholarship (for specially-abled students)", eligibility: "≥40% disability, family income ≤ ₹8 LPA", amount: "₹50,000/year" },
  { name: "National Means-cum-Merit Scholarship (NMMSS)", eligibility: "Merit + family income criteria, continuing through UG in some states", amount: "Varies by state" },
  { name: "State Post-Matric / EBC Scholarships", eligibility: "State-domicile, income-based, category-based", amount: "Varies by state" },
  { name: "Institute Merit-cum-Means Scholarships", eligibility: "College-specific, based on rank + family income", amount: "Varies by institute (fee waiver, partial-full)" },
  { name: "Private/Corporate CSR Scholarships (e.g., sector foundations)", eligibility: "Varies — merit, income, sometimes domicile/community", amount: "Varies" },
];

if (typeof module !== "undefined") {
  module.exports = { BRANCHES, ENTRANCE_EXAMS, COLLEGES, SCHOLARSHIPS };
}

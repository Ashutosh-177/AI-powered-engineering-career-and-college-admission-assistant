# PAC — PathFinder: GenAI Career & College Admission Assistant

Practical Assessment Component for *Prompt Engineering for Generative AI*. No manual/rubric was supplied for this component, so both the prototype's scope and the report's structure were designed directly from the assignment brief (see `report/PAC_Report.tex`, intro note).

## What's here

```
PAC/
  app/                  Working prototype — open app/index.html directly in a browser,
                         or serve statically (e.g. `python -m http.server` from app/).
    index.html / style.css / app.js
    data.js              Reference datasets (colleges, exams, scholarships, branches) —
                          illustrative sample data, NOT verified live figures.
    prompts.js            The prompt engineering portfolio: system/V1/V2 prompt builders
                          for all 8 guidance stages.
    engine.js             Stage runner — calls the real Claude API if an API key is set
                          in Settings, otherwise runs a deterministic offline simulator
                          of the same prompt logic so the app is demoable with zero setup.
    renderers.js          Per-stage UI components (score bars, ranked cards, timelines).
                          Tolerates field-name drift in live model output and never
                          renders a blank card.
    hero3d.js             WebGL hero scene (Three.js). Procedural geometry — no model
                          files to fetch. Degrades safely without WebGL, honours
                          prefers-reduced-motion, pauses when off-screen.
  report/
    PAC_Report.tex / .pdf  The write-up: prompt portfolio, chaining design, V1-vs-V2
                          comparison, evaluation, hallucination/privacy strategy,
                          validation-against-official-sources plan, limitations.
    figures/               Screenshots of the running app (captured via Playwright).
    samples/               Raw JSON outputs from each stage, used as report evidence.
```

## Running the app

No build step. Either:
- Open `app/index.html` directly in a browser, or
- `cd app && python -m http.server 8000` then visit `http://localhost:8000`

By default it runs in **offline demo mode** — no API key needed. To try **live mode**, get an Anthropic API key and paste it into the Settings tab; the app then calls the Claude API directly from the browser (key stays in `localStorage`, never sent anywhere else).

## Rebuilding the report

```
cd report
pdflatex PAC_Report.tex
pdflatex PAC_Report.tex   # second pass for cross-references/TOC-style refs
```

## Key disclaimers (also stated inside the app and the report)

- College/exam/scholarship data is a small **illustrative** sample — not a live feed. Verify against AICTE, UGC, NBA, NAAC, NIRF, JoSAA/CSAB, and official college sites before real use.
- Salary and placement figures are ranges with caveats, never guarantees.
- This is a course prototype, not a production system — see the report's Limitations section for the honest gap list.

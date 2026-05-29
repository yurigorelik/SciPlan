// Definitions for the research-planning wizard steps.

export interface StepDef {
  id: string;
  title: string;
  short: string;
  /** What the student is working on in this step. */
  blurb: string;
  /** Prompts/fields shown to the student. */
  fields: { key: string; label: string; placeholder?: string; rows?: number }[];
  /** Suggested AI assistance prompt shown as a button. */
  aiSuggestion: string;
}

export const STEPS: StepDef[] = [
  {
    id: "question",
    title: "Research question",
    short: "Question",
    blurb:
      "Start with a focused, answerable question. A good question is specific about the population, what you are comparing or measuring, and the outcome. Frameworks like PICO (Population, Intervention/exposure, Comparison, Outcome) or FINER (Feasible, Interesting, Novel, Ethical, Relevant) help.",
    fields: [
      {
        key: "topic",
        label: "Topic / area of interest",
        placeholder: "e.g. sleep and academic performance in undergraduates",
        rows: 2,
      },
      {
        key: "question",
        label: "Draft research question",
        placeholder:
          "e.g. Does a 4-week sleep-hygiene program improve GPA in first-year students compared with no intervention?",
        rows: 3,
      },
      {
        key: "hypothesis",
        label: "Hypothesis (optional)",
        placeholder: "Your expected answer and direction of effect.",
        rows: 2,
      },
    ],
    aiSuggestion:
      "Critique my research question using PICO and FINER, and suggest 2-3 sharper versions.",
  },
  {
    id: "design",
    title: "Study design",
    short: "Design",
    blurb:
      "Choose a design that fits your question and your data. Key fork: are you analyzing data you already have (or routinely collected) or planning new data collection? Then decide experimental vs observational, and the time structure (cross-sectional, cohort, case-control, RCT, etc.).",
    fields: [
      {
        key: "dataSource",
        label: "Data: existing or newly collected?",
        placeholder:
          "e.g. We will recruit and randomize new participants / We will use an existing registry.",
        rows: 2,
      },
      {
        key: "design",
        label: "Proposed design",
        placeholder: "e.g. parallel-group randomized controlled trial",
        rows: 2,
      },
      {
        key: "designRationale",
        label: "Why this design? Constraints?",
        placeholder: "Feasibility, ethics, time, cost, ability to randomize…",
        rows: 3,
      },
    ],
    aiSuggestion:
      "Given my question and data availability, what study designs fit? Compare their strengths, weaknesses, and main biases.",
  },
  {
    id: "definitions",
    title: "Variables & definitions",
    short: "Definitions",
    blurb:
      "Define every key variable operationally — exactly how it will be measured. Specify your exposure/intervention, primary and secondary outcomes, and important confounders. State the variable type (continuous, binary, categorical, count, time-to-event) because it drives both sample size and statistics.",
    fields: [
      {
        key: "exposure",
        label: "Exposure / intervention",
        placeholder: "How is it defined and measured? Levels/doses?",
        rows: 2,
      },
      {
        key: "primaryOutcome",
        label: "Primary outcome",
        placeholder: "Operational definition + variable type + measurement tool.",
        rows: 2,
      },
      {
        key: "otherVariables",
        label: "Secondary outcomes & confounders",
        placeholder: "List with types (continuous/binary/categorical/…).",
        rows: 3,
      },
    ],
    aiSuggestion:
      "Review my variables and operational definitions. Flag ambiguity, measurement issues, and confounders I may have missed.",
  },
  {
    id: "sampleSize",
    title: "Sample size",
    short: "Sample size",
    blurb:
      "Estimate how many participants you need. Use the calculator on the right for a first-pass estimate, then capture your assumptions (effect size, variability, alpha, power, expected dropout) here. Justify every number.",
    fields: [
      {
        key: "assumptions",
        label: "Assumptions & justification",
        placeholder:
          "Where do your effect size and variability estimates come from (pilot data, literature)?",
        rows: 3,
      },
      {
        key: "result",
        label: "Calculated sample size",
        placeholder: "Paste the calculator result and your final target N.",
        rows: 2,
      },
    ],
    aiSuggestion:
      "Check my sample-size assumptions. Is the effect size realistic? What inflates or reduces the required N?",
  },
  {
    id: "resources",
    title: "Resources & feasibility",
    short: "Resources",
    blurb:
      "Translate the plan into time, money, people, and materials. A study that is statistically sound but infeasible will not happen. Map recruitment rate against your target N and timeline.",
    fields: [
      {
        key: "timeline",
        label: "Timeline",
        placeholder: "Recruitment window, data collection, analysis, write-up.",
        rows: 2,
      },
      {
        key: "budget",
        label: "Budget & materials",
        placeholder: "Equipment, incentives, software, assay costs…",
        rows: 2,
      },
      {
        key: "personnel",
        label: "People & approvals",
        placeholder: "Team roles, supervision, ethics/IRB approval needed.",
        rows: 2,
      },
    ],
    aiSuggestion:
      "Given my target sample size and timeline, is recruitment feasible? Help me build a resource checklist and spot risks.",
  },
  {
    id: "analysis",
    title: "Statistical methods",
    short: "Analysis",
    blurb:
      "Pre-specify how you will analyze the primary outcome before collecting data. The right test follows from your design and your variable types. Plan for missing data, multiple comparisons, and assumption checks.",
    fields: [
      {
        key: "primaryAnalysis",
        label: "Primary analysis",
        placeholder: "e.g. independent t-test / logistic regression adjusting for X.",
        rows: 2,
      },
      {
        key: "secondaryAnalysis",
        label: "Secondary & sensitivity analyses",
        placeholder: "Subgroups, adjustments, robustness checks.",
        rows: 2,
      },
      {
        key: "analysisNotes",
        label: "Assumptions, missing data, software",
        placeholder: "How you'll handle dropout, multiplicity, and check assumptions.",
        rows: 3,
      },
    ],
    aiSuggestion:
      "Based on my design and variable types, what statistical test(s) should I use? Explain the assumptions and how to check them.",
  },
];

export type PlanData = {
  title: string;
  answers: Record<string, Record<string, string>>; // stepId -> fieldKey -> value
  aiNotes: Record<string, string>; // stepId -> latest AI response (saved)
};

export function emptyPlan(): PlanData {
  return { title: "Untitled research plan", answers: {}, aiNotes: {} };
}

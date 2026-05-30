// Definitions for the research-planning wizard steps.
//
// The wizard is deliberately structured: most inputs are dropdowns (select /
// multi-select) so students pick from sound, named options rather than writing
// free text. A few short text fields remain for things that are inherently
// specific (the question, variable names). After the steps, the whole plan is
// sent to the AI once to review, correct, and finalize the study.

export type FieldType = "select" | "multiselect" | "text" | "textarea";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  /** Options for select / multiselect fields. */
  options?: string[];
  placeholder?: string;
  rows?: number;
  /** Short helper text under the label. */
  help?: string;
}

export interface StepDef {
  id: string;
  title: string;
  short: string;
  /** What the student is working on in this step. */
  blurb: string;
  fields: FieldDef[];
}

export const STEPS: StepDef[] = [
  {
    id: "question",
    title: "Research question",
    short: "Question",
    blurb:
      "Frame a focused, answerable question. Pick the building blocks (PICO) and the kind of question you are asking. Keep free text to the essentials.",
    fields: [
      {
        key: "field",
        label: "Field / discipline",
        type: "select",
        options: [
          "Medicine / clinical",
          "Public health / epidemiology",
          "Psychology / behavioural",
          "Biology / life sciences",
          "Nursing / allied health",
          "Education",
          "Social sciences",
          "Engineering / physical sciences",
          "Other",
        ],
      },
      {
        key: "questionType",
        label: "Type of question",
        type: "select",
        options: [
          "Descriptive (what is happening?)",
          "Associational / correlational",
          "Causal / interventional (does X change Y?)",
          "Predictive / prognostic",
          "Diagnostic (test accuracy)",
        ],
      },
      {
        key: "population",
        label: "Population (P)",
        type: "text",
        placeholder: "e.g. first-year undergraduates",
      },
      {
        key: "intervention",
        label: "Intervention / exposure (I)",
        type: "text",
        placeholder: "e.g. a 4-week sleep-hygiene program",
      },
      {
        key: "comparator",
        label: "Comparator (C)",
        type: "text",
        placeholder: "e.g. no intervention / usual routine",
      },
      {
        key: "outcome",
        label: "Outcome (O)",
        type: "text",
        placeholder: "e.g. end-of-term GPA",
      },
      {
        key: "question",
        label: "Draft research question (one sentence)",
        type: "textarea",
        rows: 2,
        placeholder:
          "e.g. Does a 4-week sleep-hygiene program improve GPA in first-year students compared with no intervention?",
      },
      {
        key: "direction",
        label: "Hypothesis framing",
        type: "select",
        options: [
          "Superiority (expect a difference)",
          "Non-inferiority (no worse than)",
          "Equivalence (about the same)",
          "Exploratory (no specific direction)",
        ],
      },
    ],
  },
  {
    id: "literature",
    title: "Literature search",
    short: "Literature",
    blurb:
      "Ground your study in what's already known. Record where you searched and add the key papers — paste links/DOIs and any abstracts or full text you want the AI to take into account when finalizing.",
    fields: [
      {
        key: "databases",
        label: "Where did you search?",
        type: "multiselect",
        options: [
          "PubMed / MEDLINE",
          "Embase",
          "Scopus",
          "Web of Science",
          "Google Scholar",
          "Cochrane Library",
          "PsycINFO",
          "CINAHL",
          "Preprint servers (bioRxiv/medRxiv)",
          "Other",
        ],
      },
      {
        key: "links",
        label: "Key papers — links / DOIs (one per line)",
        type: "textarea",
        rows: 4,
        placeholder:
          "https://doi.org/10.xxxx/xxxxx\nhttps://pubmed.ncbi.nlm.nih.gov/00000000/",
      },
      {
        key: "evidence",
        label: "Abstracts / full text (paste here)",
        type: "textarea",
        rows: 8,
        placeholder:
          "Paste the abstracts or full text of the most relevant papers. The AI uses this when reviewing and finalizing your study.",
      },
      {
        key: "gap",
        label: "What gap does your study address? (brief)",
        type: "textarea",
        rows: 2,
        placeholder: "What is still unknown or unresolved that your study tackles?",
      },
    ],
  },
  {
    id: "design",
    title: "Study design",
    short: "Design",
    blurb:
      "Choose a design that fits your question and data. Start with whether the data is new or existing, then the nature and structure of the study.",
    fields: [
      {
        key: "dataSource",
        label: "Data source",
        type: "select",
        options: [
          "Collecting new primary data",
          "Using existing / secondary data (registry, records)",
          "Both new and existing data",
        ],
      },
      {
        key: "nature",
        label: "Nature of the study",
        type: "select",
        options: [
          "Experimental (randomized)",
          "Quasi-experimental (intervention, not randomized)",
          "Observational (no intervention)",
        ],
      },
      {
        key: "design",
        label: "Specific design",
        type: "select",
        options: [
          "Randomized controlled trial — parallel groups",
          "Randomized controlled trial — crossover",
          "Cluster randomized trial",
          "Cohort study — prospective",
          "Cohort study — retrospective",
          "Case-control study",
          "Cross-sectional study / survey",
          "Case series / case report",
          "Diagnostic accuracy study",
          "Systematic review / meta-analysis",
          "Qualitative study",
        ],
      },
      {
        key: "timeStructure",
        label: "Time structure",
        type: "select",
        options: [
          "Cross-sectional (single time point)",
          "Longitudinal — single follow-up",
          "Longitudinal — repeated measures",
        ],
      },
      {
        key: "allocationUnit",
        label: "Unit of allocation / sampling",
        type: "select",
        options: ["Individual", "Cluster / group", "Not applicable"],
      },
      {
        key: "blinding",
        label: "Blinding",
        type: "select",
        options: [
          "Open-label (no blinding)",
          "Single-blind",
          "Double-blind",
          "Not applicable",
        ],
      },
      {
        key: "constraints",
        label: "Key constraints (optional)",
        type: "textarea",
        rows: 2,
        placeholder: "Feasibility, ethics, time, cost, ability to randomize…",
      },
    ],
  },
  {
    id: "definitions",
    title: "Variables & definitions",
    short: "Variables",
    blurb:
      "Define your key variables and — crucially — their types, because the variable type drives both sample size and the right statistical test.",
    fields: [
      {
        key: "exposureName",
        label: "Exposure / intervention name",
        type: "text",
        placeholder: "e.g. sleep-hygiene program",
      },
      {
        key: "exposureType",
        label: "Exposure / intervention type",
        type: "select",
        options: [
          "Binary (two levels)",
          "Categorical (>2 levels)",
          "Ordinal",
          "Continuous",
          "Count",
          "Not applicable",
        ],
      },
      {
        key: "primaryOutcomeName",
        label: "Primary outcome name",
        type: "text",
        placeholder: "e.g. end-of-term GPA",
      },
      {
        key: "primaryOutcomeType",
        label: "Primary outcome type",
        type: "select",
        options: [
          "Continuous",
          "Binary",
          "Categorical",
          "Ordinal",
          "Count / rate",
          "Time-to-event (survival)",
        ],
      },
      {
        key: "measurement",
        label: "How the primary outcome is measured",
        type: "select",
        options: [
          "Validated instrument / scale",
          "Lab value / biomarker",
          "Clinical assessment / exam",
          "Self-report questionnaire",
          "Administrative / registry data",
          "Direct physical measurement",
          "Observation / coding",
          "Other",
        ],
      },
      {
        key: "confounders",
        label: "Main confounders to account for",
        type: "multiselect",
        options: [
          "Age",
          "Sex / gender",
          "Socioeconomic status",
          "Baseline value of the outcome",
          "Comorbidities / health status",
          "Lifestyle (diet, exercise, smoking)",
          "Site / cluster",
          "Time / season",
          "None anticipated",
        ],
      },
      {
        key: "otherVariables",
        label: "Secondary outcomes (optional)",
        type: "textarea",
        rows: 2,
        placeholder: "List any secondary outcomes and their types.",
      },
    ],
  },
  {
    id: "sampleSize",
    title: "Sample size",
    short: "Sample size",
    blurb:
      "Estimate how many participants you need. Use the calculator on the right, then record your assumptions here. Every dropdown below feeds the final review.",
    fields: [
      {
        key: "analysisGoal",
        label: "What the sample size is powered for",
        type: "select",
        options: [
          "Compare two means",
          "Compare two proportions",
          "Paired / within-subject comparison",
          "One mean vs a reference",
          "One proportion vs a reference",
          "Correlation",
          "ANOVA (more than two groups)",
          "Regression model",
          "Survival / time-to-event",
          "Estimate a mean (precision)",
          "Estimate a proportion (precision)",
          "Non-inferiority / equivalence",
        ],
      },
      {
        key: "effectBasis",
        label: "Where the assumed effect size comes from",
        type: "select",
        options: [
          "Pilot / preliminary data",
          "Published literature",
          "Minimal clinically important difference (MCID)",
          "Conventional small/medium/large (Cohen)",
          "Expert opinion / best guess",
        ],
      },
      {
        key: "alpha",
        label: "Significance level (alpha)",
        type: "select",
        options: ["0.05", "0.01", "0.025", "0.10"],
      },
      {
        key: "power",
        label: "Power (1 − beta)",
        type: "select",
        options: ["0.80", "0.85", "0.90", "0.95", "0.99"],
      },
      {
        key: "tail",
        label: "Test sidedness",
        type: "select",
        options: ["Two-sided", "One-sided"],
      },
      {
        key: "allocationRatio",
        label: "Allocation ratio (groups)",
        type: "select",
        options: ["1:1", "2:1", "3:1", "1:2", "Not applicable"],
      },
      {
        key: "dropout",
        label: "Expected dropout / non-response",
        type: "select",
        options: ["0%", "5%", "10%", "15%", "20%", "25%", "30%", "More than 30%"],
      },
      {
        key: "targetN",
        label: "Final target sample size (from the calculator)",
        type: "text",
        placeholder: "e.g. 128 total (64 per group)",
      },
      {
        key: "assumptions",
        label: "Assumptions & justification (brief)",
        type: "textarea",
        rows: 2,
        placeholder: "Effect size and variability values and their source.",
      },
    ],
  },
  {
    id: "analysis",
    title: "Statistical methods",
    short: "Analysis",
    blurb:
      "Pre-specify how you will analyze the primary outcome. The right test follows from your design and variable types — pick from the menus.",
    fields: [
      {
        key: "primaryTest",
        label: "Primary analysis / test",
        type: "select",
        options: [
          "Independent-samples t-test",
          "Paired t-test",
          "One-way ANOVA",
          "Repeated-measures ANOVA",
          "Mann–Whitney U / Wilcoxon",
          "Chi-square test",
          "Fisher's exact test",
          "Linear regression",
          "Logistic regression",
          "Poisson / negative binomial regression",
          "Cox proportional-hazards regression",
          "Kaplan–Meier / log-rank",
          "Mixed-effects model",
          "Correlation (Pearson / Spearman)",
        ],
      },
      {
        key: "adjustment",
        label: "Confounder handling",
        type: "select",
        options: [
          "Unadjusted (simple comparison)",
          "Multivariable regression adjustment",
          "Stratified analysis",
          "Propensity-score methods",
          "Matching",
          "Not applicable",
        ],
      },
      {
        key: "missingData",
        label: "Missing-data strategy",
        type: "select",
        options: [
          "Complete-case analysis",
          "Multiple imputation",
          "Mixed model (uses all available data)",
          "Last observation carried forward",
          "Not anticipated",
        ],
      },
      {
        key: "multiplicity",
        label: "Multiple-comparisons control",
        type: "select",
        options: [
          "Single primary outcome — none needed",
          "Bonferroni",
          "Holm",
          "Benjamini–Hochberg (FDR)",
          "Hierarchical / gatekeeping",
          "None planned",
        ],
      },
      {
        key: "software",
        label: "Analysis software",
        type: "select",
        options: [
          "R",
          "Python",
          "SPSS",
          "Stata",
          "SAS",
          "GraphPad Prism",
          "JASP / jamovi",
          "Excel",
          "Other",
        ],
      },
      {
        key: "analysisNotes",
        label: "Assumption checks & sensitivity analyses (optional)",
        type: "textarea",
        rows: 2,
        placeholder: "How you'll check assumptions and test robustness.",
      },
    ],
  },
];

// Step shown after the six content steps: the AI review / finalization.
export const REVIEW_STEP = {
  id: "review",
  title: "Review & finalize",
  short: "Finalize",
  blurb:
    "Submit your plan. SciPlan sends every selected option and note to the AI, which reviews the choices, corrects anything inconsistent, and returns a finalized study with a summary.",
};

export type FieldValue = string | string[];

export type FinalizeStatus = "idle" | "processing" | "done" | "error";

export type PlanData = {
  title: string;
  // stepId -> fieldKey -> value (string or, for multiselect, string[])
  answers: Record<string, Record<string, FieldValue>>;
  // The AI-finalized study + summary, produced in the background at review.
  summary?: string;
  finalizedAt?: string;
  // Tracks the background finalization job.
  finalizeStatus?: FinalizeStatus;
  finalizeError?: string;
};

export function emptyPlan(): PlanData {
  return { title: "Untitled research plan", answers: {} };
}

/** Render the whole plan as readable text for the AI review. */
export function buildPlanText(data: PlanData): string {
  const lines: string[] = [`Working title: ${data.title}`];
  for (const step of STEPS) {
    const answers = data.answers[step.id] || {};
    const filled = step.fields
      .map((f) => {
        const raw = answers[f.key];
        const value = Array.isArray(raw) ? raw.join(", ") : (raw ?? "").trim();
        return value ? `  - ${f.label}: ${value}` : null;
      })
      .filter(Boolean) as string[];
    if (filled.length) {
      lines.push(`\n${step.title}:`);
      lines.push(...filled);
    }
  }
  return lines.join("\n");
}

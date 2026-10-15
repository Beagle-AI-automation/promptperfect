/**
 * Curated production-ready prompt templates, one per app category.
 * Static catalog — works offline and without a backend. Users fork a template
 * into the optimizer ("Use in optimizer") and optionally save it to their
 * library. Placeholders use {{UPPER_SNAKE}} so they are easy to spot and fill.
 */

import type { OptimizationMode, Provider } from '@/lib/types';

export interface PromptTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  description: string;
  mode: OptimizationMode;
  provider: Provider;
  /** Short starter the template was built from (shown as "from"). */
  original_prompt: string;
  /** The production-ready template. Fill {{PLACEHOLDERS}} before running. */
  optimized_prompt: string;
  explanation: string;
}

export const TEMPLATE_CATEGORIES = [
  'SaaS',
  'E-commerce',
  'Fintech',
  'Health',
  'EdTech',
  'Mobile',
  'AI Agent',
  'API Backend',
  'Landing Page',
  'Dashboard',
  'DevTools',
  'Data & Analytics',
  'Legal',
  'Sales',
  'Support',
  'HR',
  'Code Review',
  'Testing',
  'Documentation',
  'SEO',
  'Email',
  'Research',
  'Translation',
  'Security',
  'Consulting',
  'Hiring',
  'Project Management',
  'Design',
  'Customer Success',
  'Operations',
  'Personal Finance',
  'Real Estate',
  'Travel',
  'Restaurant',
  'Fitness',
  'Course Design',
  'Social Media',
  'PR & Communications',
  'UX Research',
  'Grant Writing',
  'Event Planning',
  'Game Design',
  'Logistics',
  'Insurance',
  'Hospitality',
  'Go-to-Market',
  'API Docs',
  'Podcast',
  'Newsletter',
  'Video Script',
  'Journalism',
  'Nonprofit',
  'Procurement',
  'Partnerships',
  'Executive Memo',
  'Resume Review',
  'Community',
  'Sports Coaching',
  'Architecture',
  'Customer Onboarding',
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'saas-onboarding',
    title: 'SaaS Onboarding Flow',
    category: 'SaaS',
    description: 'Design a self-serve onboarding flow that activates new users fast.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Design onboarding for my SaaS.',
    optimized_prompt:
      'You are a senior product designer specializing in SaaS activation. Design a self-serve onboarding flow for {{PRODUCT_NAME}}, a {{PRODUCT_CATEGORY}} tool for {{TARGET_USER}}.\n\n' +
      'Context: pricing is {{PRICING_MODEL}}, time-to-value must be under {{TTV_MINUTES}} minutes, and signup is {{SIGNUP_FRICTION}}.\n\n' +
      'Deliver: (1) the 3–5 activation steps in order with the user intent behind each; (2) what to ask vs. what to infer, and what to defer; ' +
      '(3) empty states, progress cues, and the aha-moment trigger; (4) instrumentation — the activation event, funnel metrics, and experiment ideas; ' +
      '(5) edge cases: invited teammates, returning users, failed payments.\n\n' +
      'Constraints: no more than one blocking modal; every step skippable except {{REQUIRED_STEP}}; copy in {{TONE}} tone. ' +
      'Success looks like: {{SUCCESS_METRIC}} improves from {{BASELINE}} to {{TARGET}} within {{TIMEFRAME}}.',
    explanation:
      'Adds product context, time-to-value budget, ordered deliverables, instrumentation, and measurable success criteria.',
  },
  {
    id: 'ecommerce-pdp',
    title: 'E-commerce Product Page',
    category: 'E-commerce',
    description: 'High-converting product detail page copy and structure.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Write copy for my product page.',
    optimized_prompt:
      'You are a conversion copywriter for e-commerce. Write the complete product detail page for {{PRODUCT_NAME}} ({{CATEGORY}}, price {{PRICE}}, audience {{AUDIENCE}}).\n\n' +
      'Include in order: SEO title (≤60 chars) + meta description (≤155), H1, 3-bullet value hook, long description with objection handling ' +
      '({{OBJECTION_1}}, {{OBJECTION_2}}), specification table, shipping/returns block, 3 FAQ entries, and 2 review-request prompts.\n\n' +
      'Tone: {{TONE}}. Reading level: grade 8. Every claim must be verifiable from: {{SOURCE_FACTS}}. ' +
      'Avoid superlatives without proof, fake urgency, and dark patterns. Success: add-to-cart rate and return rate move in the right direction over {{TIMEFRAME}}.',
    explanation:
      'Specifies page anatomy, SEO limits, objection handling, verifiable-claims rule, and banned patterns.',
  },
  {
    id: 'fintech-risk',
    title: 'Fintech Risk Review',
    category: 'Fintech',
    description: 'Structured risk review for a payments or lending feature.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Review risks of our payments feature.',
    optimized_prompt:
      'You are a fintech risk officer reviewing {{FEATURE_NAME}} for {{COMPANY}} operating in {{JURISDICTIONS}}.\n\n' +
      'Analyze across: (1) regulatory — licenses, KYC/AML touchpoints, reporting duties; (2) fraud — attack vectors, velocity/abuse scenarios, controls; ' +
      '(3) credit/liquidity — exposure caps, settlement timing, failure cascades; (4) operational — reconciliation, dispute handling, incident runbook gaps.\n\n' +
      'For each risk give: likelihood (low/med/high), impact, existing control, residual gap, and a concrete mitigation with owner {{OWNER_ROLE}}. ' +
      'Flag anything that needs external counsel before {{LAUNCH_DATE}}. Output a go/no-go recommendation with conditions. ' +
      'Do not give legal advice; frame findings as issues for counsel review.',
    explanation:
      'Frames four risk pillars, forces likelihood/impact/mitigation structure, and adds the legal-advice guardrail.',
  },
  {
    id: 'health-content',
    title: 'Health Content Brief',
    category: 'Health',
    description: 'Evidence-based patient content brief with safety guardrails.',
    mode: 'specific',
    provider: 'gemini',
    original_prompt: 'Write about managing hypertension.',
    optimized_prompt:
      'You are a medical writer drafting a patient-education brief on {{CONDITION}} for {{AUDIENCE}} at {{READING_LEVEL}} reading level.\n\n' +
      'Cover: what it is, common causes/risk factors, evidence-based management (lifestyle first, then {{TREATMENT_CLASSES}}), ' +
      'red-flag symptoms requiring urgent care, and 5 FAQs. Cite guideline sources ({{GUIDELINES}}) inline.\n\n' +
      'Hard rules: no diagnosis of the reader, no dosage instructions, no absolute safety/efficacy claims, ' +
      'always close with "talk to your clinician". Flag any statement you cannot support for human review. ' +
      'Length: {{WORD_COUNT}} words max.',
    explanation:
      'Adds audience/reading level, citation duty, red-flag section, and hard medical-safety rules.',
  },
  {
    id: 'edtech-lesson',
    title: 'EdTech Lesson Plan',
    category: 'EdTech',
    description: 'Adaptive lesson plan with checks for understanding.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Create a lesson on fractions.',
    optimized_prompt:
      'You are an instructional designer. Create a {{DURATION_MINUTES}}-minute lesson on {{TOPIC}} for {{GRADE_LEVEL}} students at {{PROFICIENCY}} level.\n\n' +
      'Structure: hook (real-world), direct instruction with 2 worked examples, guided practice, independent practice, exit ticket. ' +
      'After each block include a check-for-understanding with the misconception it catches and the reteach move if >30% miss it.\n\n' +
      'Differentiation: one scaffold for struggling learners, one extension for advanced. ' +
      'Align objectives to {{STANDARD}} and state the observable success criterion per objective. Provide an answer key with worked reasoning.',
    explanation:
      'Imposes lesson anatomy, misconception-driven checks, differentiation, and standards alignment.',
  },
  {
    id: 'mobile-release',
    title: 'Mobile Release Checklist',
    category: 'Mobile',
    description: 'Ship-or-hold release review for iOS/Android.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Checklist for releasing our app update.',
    optimized_prompt:
      'You are a mobile release manager for {{APP_NAME}} (iOS {{IOS_MIN}}+, Android API {{ANDROID_MIN}}+). Build the ship-or-hold checklist for version {{VERSION}}.\n\n' +
      'Cover: staged rollout plan (% waves, halt criteria), crash-free threshold {{CRASH_FREE_TARGET}}, ANR/app-hang budget, ' +
      'battery/data regression checks, store listing + screenshots, deep-link and push regression, offline-mode pass, ' +
      'accessibility sweep (VoiceOver/TalkBack), privacy manifest + data-safety form accuracy, and rollback procedure.\n\n' +
      'Output a table: check | owner {{OWNER_ROLE}} | evidence required | blocker if red. End with an explicit SHIP or HOLD verdict and the top 3 risks.',
    explanation:
      'Turns a vague ask into an owned, evidenced gate with rollout waves and a verdict.',
  },
  {
    id: 'ai-agent-spec',
    title: 'AI Agent Spec',
    category: 'AI Agent',
    description: 'Full build spec for a tool-using support agent.',
    mode: 'developer',
    provider: 'gemini',
    original_prompt: 'Spec out a support chatbot.',
    optimized_prompt:
      'You are an AI systems architect. Write the build spec for {{AGENT_NAME}}, a support agent for {{PRODUCT}} serving {{AUDIENCE}}.\n\n' +
      'Define: role + non-goals, tools ({{TOOL_1}}, {{TOOL_2}}) with input/output schemas and failure modes, ' +
      'retrieval strategy over {{KNOWLEDGE_SOURCES}} (chunking, freshness, citation rule), guardrails (PII redaction, refund caps {{REFUND_CAP}}, ' +
      'escalation triggers to {{HUMAN_QUEUE}}), eval set (20 cases: happy path, adversarial, out-of-scope), and latency/cost budgets.\n\n' +
      'Include the system prompt skeleton, the refusal template, and the logging schema (session, tool calls, citations, feedback). ' +
      'Non-negotiable: never invent order/account facts; every factual claim cites a tool result or doc chunk.',
    explanation:
      'Specifies tools, retrieval, guardrails, evals, budgets, and the no-hallucination invariant.',
  },
  {
    id: 'api-backend',
    title: 'REST API Design',
    category: 'API Backend',
    description: 'Consistent, versioned REST API design for a resource.',
    mode: 'developer',
    provider: 'gemini',
    original_prompt: 'Design an API for orders.',
    optimized_prompt:
      'You are a backend architect. Design the REST API for the {{RESOURCE}} resource in {{STACK}} for {{APP_CONTEXT}}.\n\n' +
      'Specify: resource model with field types + validation rules, endpoints (CRUD + {{CUSTOM_ACTIONS}}) with methods/paths, ' +
      'status codes per outcome, error envelope `{code, message, details, requestId}`, pagination (cursor, limit default/max {{PAGE_DEFAULT}}/{{PAGE_MAX}}), ' +
      'filtering/sorting params, idempotency strategy, auth ({{AUTH_SCHEME}}) + per-endpoint scopes, rate limits, versioning ({{VERSIONING}}), and webhook events if any.\n\n' +
      'Provide one OpenAPI-style YAML sketch for the two most complex endpoints plus 5 edge cases (concurrency, partial failure, large payloads). ' +
      'Consistency rule: every list endpoint paginates; every mutation is idempotent or documented why not.',
    explanation:
      'Enforces envelope, pagination, idempotency, scopes, and versioning conventions up front.',
  },
  {
    id: 'landing-hero',
    title: 'Landing Page Hero',
    category: 'Landing Page',
    description: 'Hero section variants with messaging hierarchy.',
    mode: 'marketing',
    provider: 'gemini',
    original_prompt: 'Write hero copy for our landing page.',
    optimized_prompt:
      'You are a landing-page strategist. Write 3 hero variants for {{PRODUCT_NAME}} ({{ONE_LINER}}, audience {{AUDIENCE}}, primary CTA {{CTA}}).\n\n' +
      'Each variant: eyebrow, H1 (≤10 words, outcome-led), subhead (≤25 words, mechanism + proof {{PROOF_POINT}}), CTA pair, and microcopy under the CTA ' +
      'handling {{TOP_OBJECTION}}. Then rank the 3 with reasoning tied to {{TRAFFIC_SOURCE}} intent, and propose the A/B test (hypothesis, primary metric {{METRIC}}, runtime).\n\n' +
      'Voice: {{TONE}}. Banned: "revolutionize", "supercharge", "unlock", feature lists without outcomes.',
    explanation:
      'Demands variants + ranking + test plan, with word budgets and a banned-words list.',
  },
  {
    id: 'dashboard-kpi',
    title: 'KPI Dashboard Spec',
    category: 'Dashboard',
    description: 'Executive dashboard: metrics, thresholds, drill-downs.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Spec a dashboard for our KPIs.',
    optimized_prompt:
      'You are a BI designer. Spec the {{CADENCE}} {{AUDIENCE}} dashboard for {{BUSINESS}} tracking {{NORTH_STAR}}.\n\n' +
      'Define max {{MAX_METRICS}} metrics: each with definition, SQL-grain, owner {{OWNER_ROLE}}, target + red/amber/green thresholds, and the drill-down path. ' +
      'Layout: top row (north star + 2 inputs), middle (trends with annotations for {{KNOWN_EVENTS}}), bottom (segment table).\n\n' +
      'Data rules: refresh cadence {{REFRESH}}, late-data policy, null-handling, and the "what changed and why" annotation workflow. ' +
      'Exclude vanity metrics explicitly with reasons. Deliver wireframe-ready section specs plus the metric dictionary.',
    explanation:
      'Caps metric count, demands definitions/thresholds/owners, and bans vanity metrics.',
  },
  {
    id: 'devtools-cli',
    title: 'CLI Design Spec',
    category: 'DevTools',
    description: 'DX-first command-line interface design.',
    mode: 'developer',
    provider: 'gemini',
    original_prompt: 'Design a CLI for our deploy tool.',
    optimized_prompt:
      'You are a DX engineer. Design the CLI for {{TOOL_NAME}} ({{RUNTIME}}, users: {{AUDIENCE}}).\n\n' +
      'Specify: command tree (nouns as subcommands, flags vs. args convention), global flags (--json, --quiet, --dry-run, --config), ' +
      'config file resolution order, auth ({{AUTH_METHOD}}) with keychain storage, output design (human tables + machine JSON, exit codes table), ' +
      'error taxonomy with actionable hints and docs links, progress/spinner rules, shell completions, and `{{TOOL_NAME}} doctor` diagnostics.\n\n' +
      'Provide 5 golden-path examples and 5 failure transcripts. Rules: no destructive default without --force + confirmation; ' +
      'every error prints the exact next command to run.',
    explanation:
      'Bakes in --dry-run, exit codes, error taxonomy, and the destructive-action safety rule.',
  },
  {
    id: 'data-pipeline',
    title: 'Data Pipeline Review',
    category: 'Data & Analytics',
    description: 'Batch pipeline reliability and cost review.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Review our ETL pipeline.',
    optimized_prompt:
      'You are a data platform engineer reviewing the {{PIPELINE_NAME}} pipeline (source {{SOURCE}} → warehouse {{WAREHOUSE}}, cadence {{CADENCE}}, volume {{VOLUME}}).\n\n' +
      'Audit: ingestion (schema drift handling, late/duplicate events, exactly-once vs at-least-once claim), ' +
      'transformation (test coverage with {{TEST_FRAMEWORK}}, data contracts), orchestration (retries with backoff, SLA {{SLA}} + paging policy), ' +
      'cost (top 3 spend drivers + 2 cuts), and lineage/docs.\n\n' +
      'Deliver: findings table (severity, evidence query, fix, owner {{OWNER_ROLE}}), the 3 highest-leverage fixes for this quarter, ' +
      'and a backfill procedure. Require every table to state its freshness SLA and on-call runbook link.',
    explanation:
      'Structures the audit by pipeline stage with evidence queries, owners, and SLA demands.',
  },
  {
    id: 'legal-nda',
    title: 'NDA Clause Review',
    category: 'Legal',
    description: 'Plain-language review of NDA clauses before signing.',
    mode: 'specific',
    provider: 'gemini',
    original_prompt: 'Review this NDA for me.',
    optimized_prompt:
      'You are a contracts assistant helping {{ROLE}} at {{COMPANY}} review a {{NDA_TYPE}} NDA with {{COUNTERPARTY}} under {{JURISDICTION}} law.\n\n' +
      'For each clause, explain in plain language: what it obliges us to do, the worst reasonable case, and whether it is market-standard, founder-friendly, or a red flag. ' +
      'Pay special attention to: definition of confidential information, exclusions, term + survival period {{SURVIVAL_YEARS}} years, ' +
      'residual knowledge carve-out, non-solicitation scope, injunctive relief, and governing law.\n\n' +
      'Deliver: clause-by-clause table (verdict, risk, suggested fallback language) plus the top 3 negotiation asks ranked by leverage. ' +
      'This is not legal advice — end with "have counsel review before signing" and flag anything you cannot assess from the text: {{CLAUSE_TEXT}}.',
    explanation:
      'Forces clause-by-clause verdicts, fallback language, ranked asks, and the not-legal-advice guardrail.',
  },
  {
    id: 'sales-discovery',
    title: 'Sales Discovery Call',
    category: 'Sales',
    description: 'Discovery plan that surfaces budget, pain, and decision process.',
    mode: 'specific',
    provider: 'gemini',
    original_prompt: 'Prepare discovery questions for a sales call.',
    optimized_prompt:
      'You are a sales coach preparing {{REP_NAME}} for a {{DURATION_MINUTES}}-minute discovery call with {{PROSPECT_TITLE}} at {{COMPANY}} ({{INDUSTRY}}, ~{{COMPANY_SIZE}} people).\n\n' +
      'Known context: {{KNOWN_CONTEXT}}. Our product {{PRODUCT_NAME}} helps with {{VALUE_PROP}}.\n\n' +
      'Deliver: (1) 3 rapport openers tied to {{RESEARCH_HOOK}}; (2) 8 questions sequenced pain → impact → decision process, each with what a good vs. evasive answer sounds like; ' +
      '(3) budget and timeline qualifiers that do not sound interrogative; (4) objection handling for {{TOP_OBJECTIONS}}; ' +
      '(5) a crisp next-step close with calendar language.\n\n' +
      'Rules: no feature pitches before pain is confirmed; every question earns the next. Success: a second meeting with {{NEXT_ATTENDEES}} booked.',
    explanation:
      'Sequences questions by intent, scripts answer-reading, and bans premature pitching.',
  },
  {
    id: 'support-macro',
    title: 'Support Reply Macro',
    category: 'Support',
    description: 'Empathetic, resolutive support replies with escalation paths.',
    mode: 'better',
    provider: 'gemini',
    original_prompt: 'Write a reply to an angry customer.',
    optimized_prompt:
      'You are a senior support agent at {{COMPANY}} replying about {{ISSUE_SUMMARY}} (ticket {{TICKET_ID}}, plan {{PLAN}}, customer since {{SINCE}}).\n\n' +
      'Structure: (1) acknowledge the specific impact in one sentence — no generic apologies; (2) state what you found: {{ROOT_CAUSE}}; ' +
      '(3) the fix with exact steps or the workaround with its limits; (4) what we will do so it does not recur; (5) compensation per policy {{POLICY}} if warranted.\n\n' +
      'Tone: {{TONE}}. If the fix needs engineering, give the tracking reference {{TRACKING_REF}} and a follow-up date — never "soon". ' +
      'Close with one clear question if anything is still blocked. If the request exceeds policy, escalate to {{ESCALATION_QUEUE}} with a summary instead of refusing flatly.',
    explanation:
      'Bans generic apologies and "soon", demands specifics, dates, and an escalation path.',
  },
  {
    id: 'hr-feedback',
    title: 'Performance Feedback',
    category: 'HR',
    description: 'SBI-format feedback that is honest and actionable.',
    mode: 'better',
    provider: 'gemini',
    original_prompt: 'Help me give feedback to my report.',
    optimized_prompt:
      'You are an engineering manager coach. Draft performance feedback for {{REPORT_NAME}} ({{ROLE}}, level {{LEVEL}}) covering {{PERIOD}}.\n\n' +
      'Use SBI format per point — Situation, Behavior (observable facts from {{EVIDENCE}}), Impact on {{TEAM_OR_BUSINESS}}. ' +
      'Cover: 2 strengths to double down on, 2 growth areas with concrete next actions and a 30/60/90-day check-in plan.\n\n' +
      'Rules: no personality labels, no surprises (only topics raised in 1:1s per {{ONE_ON_ONE_NOTES}}), separate praise from critique, ' +
      'end with a growth question, not a verdict. Tone: direct, warm, peer-respectful. Calibrate to level {{LEVEL}} expectations: {{LEVEL_RUBRIC}}.',
    explanation:
      'Enforces observable-behavior format, no-surprises rule, and a dated follow-up plan.',
  },
  {
    id: 'code-review',
    title: 'Code Review Pass',
    category: 'Code Review',
    description: 'Thorough, prioritized review of a pull request diff.',
    mode: 'developer',
    provider: 'gemini',
    original_prompt: 'Review my PR.',
    optimized_prompt:
      'You are a staff engineer reviewing PR "{{PR_TITLE}}" in {{REPO}} ({{STACK}}). The diff: {{DIFF}}.\n\n' +
      'Review in severity order — blockers, correctness, security, performance, readability: ' +
      'for each finding cite file:line, explain the failure mode with a concrete trigger, and propose the fix (code sketch when short). ' +
      'Check: auth boundaries, input validation, error paths, N+1 queries, unbounded loops, secret handling, and test coverage of new branches.\n\n' +
      'Also list what is good (prevents rubber-stamping). Verdict: APPROVE, COMMENT, or REQUEST_CHANGES with the single most important issue first. ' +
      'Match repo conventions in {{STYLE_GUIDE}}; do not nitpick formatting the linter covers.',
    explanation:
      'Severity-ordered findings with triggers and fixes, plus an explicit verdict and no-linter-nit rule.',
  },
  {
    id: 'testing-plan',
    title: 'Test Plan',
    category: 'Testing',
    description: 'Risk-based test plan for a feature release.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Write a test plan for checkout.',
    optimized_prompt:
      'You are a QA lead writing the test plan for {{FEATURE}} in {{APP}} ({{STACK}}), releasing {{RELEASE_DATE}}.\n\n' +
      'Define: scope in/out, risk-ranked areas (payment, inventory race, discounts, taxes {{TAX_REGIONS}}), ' +
      'test types per area (unit/integration/contract/E2E with {{FRAMEWORKS}}), environments + seed data, ' +
      'and entry/exit criteria (coverage {{COVERAGE_TARGET}} on new code, zero open blockers, perf budget {{PERF_BUDGET}}).\n\n' +
      'Include: 10 critical test cases as Given/When/Then, exploratory charters (2), chaos/latency checks, and rollback verification. ' +
      'Out of scope is explicit. End with the sign-off checklist and owner {{OWNER_ROLE}}.',
    explanation:
      'Risk-ranks areas, sets entry/exit gates, and makes out-of-scope explicit.',
  },
  {
    id: 'docs-runbook',
    title: 'Runbook / Docs Page',
    category: 'Documentation',
    description: 'Incident runbook or guide page that works at 3am.',
    mode: 'better',
    provider: 'gemini',
    original_prompt: 'Document how to restart the service.',
    optimized_prompt:
      'You are a technical writer documenting {{PROCEDURE}} for {{SYSTEM}} (audience: {{AUDIENCE}}, on-call engineers).\n\n' +
      'Structure: purpose + blast radius, prerequisites (access, tools, {{REQUIRED_PERMISSIONS}}), numbered steps where each step states ' +
      'the exact command, expected output, and how to verify — then rollback steps in reverse order.\n\n' +
      'Add: failure table (symptom → diagnosis → fix), escalation contacts {{CONTACTS}}, and related dashboards {{DASHBOARD_LINKS}}. ' +
      'Rules: commands copy-pasteable, no "simply" or "just", every placeholder like {{HOST}} called out. ' +
      'A tired on-call engineer must succeed without paging anyone.',
    explanation:
      'Optimizes for 3am execution: verifiable steps, reverse rollback, and failure table.',
  },
  {
    id: 'seo-brief',
    title: 'SEO Content Brief',
    category: 'SEO',
    description: 'Search brief engineered to rank and convert.',
    mode: 'marketing',
    provider: 'gemini',
    original_prompt: 'Brief an article about project management software.',
    optimized_prompt:
      'You are an SEO strategist briefing "{{TARGET_KEYWORD}}" (intent: {{INTENT}}, difficulty {{DIFFICULTY}}, audience {{AUDIENCE}}).\n\n' +
      'Deliver: title options (≤60 chars, keyword-fronted), meta description (≤155, with CTA), H2/H3 outline mapped to PAA questions {{PAA_QUESTIONS}}, ' +
      'word-count target {{WORDS}} with rationale vs. top 3 competitors {{COMPETITORS}}, internal links ({{INTERNAL_PAGES}}), ' +
      'E-E-A-T elements (author bio, first-hand evidence, updated date policy), and the conversion block (CTA {{CTA}} after section {{CTA_SECTION}}).\n\n' +
      'Rules: one H1, search intent over cleverness, no keyword stuffing (density ≤ {{MAX_DENSITY}}%). Success: top-{{RANK_TARGET}} within {{TIMEFRAME}} with CTR ≥ {{CTR_TARGET}}.',
    explanation:
      'Maps outline to PAA intent, sets E-E-A-T and density rules, and defines rank success.',
  },
  {
    id: 'email-launch',
    title: 'Launch Email',
    category: 'Email',
    description: 'Launch email with subject variants and plain-text fallback.',
    mode: 'marketing',
    provider: 'gemini',
    original_prompt: 'Write a launch email for our feature.',
    optimized_prompt:
      'You are an email copywriter for {{COMPANY}} announcing {{FEATURE}} to {{SEGMENT}} (list size {{LIST_SIZE}}).\n\n' +
      'Deliver: 3 subject lines (≤45 chars, no clickbait) + matching preview text (≤90), body under {{WORD_COUNT}} words in {{TONE}} tone, ' +
      'single CTA "{{CTA_TEXT}}" linking {{CTA_URL}} (repeat once as text link), P.S. line restating the offer {{OFFER}}, ' +
      'and a plain-text version. Personalize with {{PERSONALIZATION_FIELDS}} only.\n\n' +
      'Compliance: physical address {{ADDRESS}}, one-click unsubscribe, no misleading "Re:" prefixes. ' +
      'Success: open ≥ {{OPEN_TARGET}}, CTR ≥ {{CTR_TARGET}}, spam complaints < 0.1%.',
    explanation:
      'Specifies subject/preview budgets, single-CTA discipline, and compliance footer.',
  },
  {
    id: 'research-synthesis',
    title: 'Research Synthesis',
    category: 'Research',
    description: 'Multi-source synthesis with uncertainty handling.',
    mode: 'research',
    provider: 'gemini',
    original_prompt: 'Summarize research on remote work productivity.',
    optimized_prompt:
      'You are a research analyst synthesizing {{SOURCE_COUNT}} sources on {{TOPIC}} for {{AUDIENCE}} deciding {{DECISION}}.\n\n' +
      'Method: extract each source\'s claim, method/sample, and funding/conflicts into a comparison table; then synthesize where they converge, ' +
      'where they conflict (with your adjudication and confidence: high/med/low), and what remains unknown.\n\n' +
      'Deliver: 5-line executive takeaway, findings with inline citations [1..n], a "what would change my mind" section, and recommended next study. ' +
      'Rules: distinguish correlation from causation explicitly, date every statistic, never overclaim beyond samples. Sources: {{SOURCES}}.',
    explanation:
      'Forces claim/method/conflict extraction, confidence labels, and unknowns.',
  },
  {
    id: 'translation-glossary',
    title: 'Translation with Glossary',
    category: 'Translation',
    description: 'Terminology-consistent EN→ES translation.',
    mode: 'specific',
    provider: 'gemini',
    original_prompt: 'Translate this to Spanish.',
    optimized_prompt:
      'You are a professional EN→{{TARGET_LOCALE}} translator for {{DOMAIN}} content. Translate: {{SOURCE_TEXT}}.\n\n' +
      'Glossary (do not translate, adapt only case/gender): {{GLOSSARY_TERMS}}. Tone: {{TONE}}; register {{REGISTER}}. ' +
      'Rules: preserve markdown/links/placeholders like {{PLACEHOLDER_EXAMPLE}} byte-identical; keep UI strings under {{CHAR_LIMIT}} chars; ' +
      'flag untranslatable puns with 2 alternatives each.\n\n' +
      'Deliver: the translation, then a term table (source → chosen → rejected alternative + why), then 3 QA notes (agreement, anglicisms, locale pitfalls).',
    explanation:
      'Locks terminology, protects placeholders/markup, and demands a QA pass.',
  },
  {
    id: 'security-review',
    title: 'Security Self-Review',
    category: 'Security',
    description: 'OWASP-grounded self-review before external audit.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Check our app for security issues.',
    optimized_prompt:
      'You are an AppSec engineer self-reviewing {{APP_NAME}} ({{STACK}}, auth {{AUTH_MODEL}}, hosts {{HOSTING}}) before an external audit on {{AUDIT_DATE}}.\n\n' +
      'Walk OWASP Top 10 (2021): for each category give verdict (pass/gap), evidence (file:line or config {{EVIDENCE}}), and exploit sketch where a gap exists. ' +
      'Additionally: secret inventory (where keys live, rotation), dependency audit focus ({{CRITICAL_DEPS}}), CORS/CSP/header review, ' +
      'rate-limit coverage per route, PII flow map (collect → store → delete), and backup/restore test status.\n\n' +
      'Deliver: findings ranked P0–P3 with fix + owner {{OWNER_ROLE}} + effort, plus the exact evidence pack to hand auditors. ' +
      'No theoretical lists — every finding needs a location in this codebase.',
    explanation:
      'Demands located evidence per OWASP item, P0–P3 ranking, and an auditor-ready pack.',
  },
  {
    id: 'consulting-proposal',
    title: 'Consulting Proposal',
    category: 'Consulting',
    description: 'Scoped proposal with pricing options and terms.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Write a proposal for a consulting engagement.',
    optimized_prompt:
      'You are a consulting partner drafting a proposal for {{CLIENT}} ({{INDUSTRY}}) on {{ENGAGEMENT_TOPIC}}.\n\n' +
      'Include: situation + objectives as understood, scope in/out, phased approach ({{PHASES}}) with deliverables per phase, ' +
      'timeline {{START_DATE}} → {{END_DATE}}, team ({{TEAM_ROLES}}) with time commitment, ' +
      '3 pricing options (good/better/best: {{OPTION_DETAILS}}) with payment milestones, assumptions, ' +
      'out-of-scope handling and change-order rate {{CHANGE_RATE}}, and terms (IP, confidentiality, termination {{NOTICE_DAYS}} days).\n\n' +
      'Tone: confident, peer-level. Success: signed SOW within {{CLOSE_TIMEFRAME}} with no scope renegotiation in phase 1.',
    explanation:
      'Forces phased deliverables, 3-tier pricing, and change-order terms up front.',
  },
  {
    id: 'hiring-scorecard',
    title: 'Hiring Scorecard',
    category: 'Hiring',
    description: 'Structured interview scorecard that reduces bias.',
    mode: 'specific',
    provider: 'gemini',
    original_prompt: 'Create interview questions for a backend engineer.',
    optimized_prompt:
      'You are a hiring manager building a structured interview for {{ROLE}} (level {{LEVEL}}, team {{TEAM}}).\n\n' +
      'Define 4 competencies from {{JOB_DESCRIPTION}} (e.g. systems design, coding, collaboration, ownership). ' +
      'For each: 2 behavioral + 1 situational question, what "strong" vs "weak" answers contain, and red flags. ' +
      'Add a 45-minute coding exercise ({{EXERCISE_CONSTRAINTS}}) with evaluation rubric, not just pass/fail.\n\n' +
      'Rules: same questions for every candidate, score 1–4 independently before discussion, no culture-fit veto without evidence. ' +
      'Deliver the scorecard table plus the debrief agenda. Success: hire/no-hire decision in {{DECISION_TIMEFRAME}} with documented rationale.',
    explanation:
      'Standardizes questions, rubrics, and independent scoring to cut bias.',
  },
  {
    id: 'project-kickoff',
    title: 'Project Kickoff Plan',
    category: 'Project Management',
    description: 'Kickoff that aligns scope, risks, and cadence.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Plan a project kickoff meeting.',
    optimized_prompt:
      'You are a PM kicking off {{PROJECT_NAME}} (goal: {{GOAL}}, deadline {{DEADLINE}}, team {{TEAM_SIZE}} across {{TIMEZONES}}).\n\n' +
      'Deliver the kickoff pack: (1) one-page brief (why, what, non-goals); (2) RACI for {{KEY_DECISIONS}}; ' +
      '(3) milestone plan with owners and demo dates; (4) risk register starter (top 5 with probability × impact + mitigations); ' +
      '(5) operating cadence (standups {{STANDUP_CADENCE}}, demos, async updates in {{TOOL}}); (6) definition of done.\n\n' +
      'Include the 60-minute agenda with timeboxes and pre-read ({{PREREAD_LINK}}). ' +
      'Success: every attendee can state the goal, their role, and the first milestone unprompted afterward.',
    explanation:
      'Turns a meeting into an alignment pack with RACI, risks, and done criteria.',
  },
  {
    id: 'design-brief',
    title: 'Design Brief',
    category: 'Design',
    description: 'Brief that gets the right first draft from designers.',
    mode: 'specific',
    provider: 'gemini',
    original_prompt: 'Brief a redesign of our pricing page.',
    optimized_prompt:
      'You are a design lead briefing the {{PROJECT}} {{ASSET_TYPE}} redesign for {{AUDIENCE}}.\n\n' +
      'Specify: objective tied to metric {{METRIC}} (baseline {{BASELINE}}, target {{TARGET}}), brand constraints ({{BRAND_GUIDE}}, ' +
      'type scale, palette {{PALETTE}}, motion {{MOTION_RULES}}), content inventory ({{CONTENT_SOURCE}}), ' +
      'responsive breakpoints {{BREAKPOINTS}}, accessibility bar (contrast {{CONTRAST_RATIO}}, focus states, reduced motion), ' +
      'and 3 references ({{REF_1}}, {{REF_2}}, {{REF_3}}) with what to borrow from each.\n\n' +
      'Deliverables + rounds: {{DELIVERABLES}}, max {{REVISION_ROUNDS}} revision rounds, approval chain {{APPROVERS}}. ' +
      'Out of scope explicitly. Success: approved design with zero "make the logo bigger" rounds.',
    explanation:
      'Binds design to metrics, constraints, references, and round limits.',
  },
  {
    id: 'cs-qbr',
    title: 'Customer QBR Deck',
    category: 'Customer Success',
    description: 'Quarterly business review that proves and expands value.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Outline a QBR for our enterprise account.',
    optimized_prompt:
      'You are a CSM preparing the Q{{QUARTER}} business review for {{ACCOUNT}} (ARR {{ARR}}, health {{HEALTH}}, sponsor {{SPONSOR_TITLE}}).\n\n' +
      'Outline 8 slides: (1) outcomes vs. the goals set last QBR; (2) adoption trends ({{KEY_METRICS}}) with benchmarks; ' +
      '(3) support themes + resolutions; (4) ROI math (time saved {{HOURS_SAVED}}, revenue influenced {{REVENUE}}); ' +
      '(5) roadmap items they asked for — shipped vs. planned; (6) risks (champion departure? {{RISK_FLAGS}}) with mitigations; ' +
      '(7) expansion proposal ({{EXPANSION_OFFER}}) with pricing; (8) joint success plan for next quarter with owners.\n\n' +
      'Rules: every claim has a number, every risk has an owner, no roadmap promises without dates. Success: renewal confidence + expansion verbals.',
    explanation:
      'Structures proof-then-ask flow with ROI math and risk ownership.',
  },
  {
    id: 'ops-sop',
    title: 'Standard Operating Procedure',
    category: 'Operations',
    description: 'SOP anyone can execute without tribal knowledge.',
    mode: 'better',
    provider: 'gemini',
    original_prompt: 'Document our refund process.',
    optimized_prompt:
      'You are an operations lead documenting the {{PROCESS_NAME}} SOP for {{TEAM}} (operators: {{OPERATOR_ROLES}}).\n\n' +
      'Structure: purpose + scope, trigger conditions, prerequisites (access {{SYSTEMS_ACCESS}}, tools), ' +
      'numbered steps where each states the action, the system clicks/commands, expected result, and how to verify — ' +
      'then the exception paths ({{EXCEPTION_1}}, {{EXCEPTION_2}}) with escalation to {{ESCALATION}} and SLA {{ESCALATION_SLA}}.\n\n' +
      'Add: quality checklist, common mistakes with corrections, audit fields to log ({{AUDIT_FIELDS}}), ' +
      'review cadence {{REVIEW_CADENCE}} and owner {{OWNER_ROLE}}. A new hire must execute it solo on day one.',
    explanation:
      'Makes tribal knowledge executable: verifiable steps, exceptions, audit trail.',
  },
  {
    id: 'personal-budget',
    title: 'Personal Budget Plan',
    category: 'Personal Finance',
    description: 'Zero-based budget with guardrails, not lectures.',
    mode: 'better',
    provider: 'gemini',
    original_prompt: 'Help me budget my money.',
    optimized_prompt:
      'You are a pragmatic money coach building a monthly plan for {{PERSON}} (take-home {{INCOME}}, location {{LOCATION}}, goal: {{GOAL}}).\n\n' +
      'Allocate zero-based buckets: fixed ({{FIXED_COSTS}}), variable caps (food {{FOOD_CAP}}, transport {{TRANSPORT_CAP}}, fun {{FUN_CAP}}), ' +
      'savings {{SAVINGS_TARGET}} + emergency fund status {{EMERGENCY_STATUS}}, debt payoff order ({{DEBTS}} by rate, minimums protected).\n\n' +
      'Add: 3 likely overspend triggers + pre-commitments for each, a 15-minute weekly review ritual, and what to do with windfalls. ' +
      'No shame, no jargon, no product pitches. This is education, not financial advice — flag licensed-advisor topics. ' +
      'Success: savings rate from {{CURRENT_RATE}} to {{TARGET_RATE}} in {{TIMEFRAME}}.',
    explanation:
      'Zero-based buckets plus trigger-proofing and a review ritual, with the advice disclaimer.',
  },
  {
    id: 'real-estate-listing',
    title: 'Property Listing',
    category: 'Real Estate',
    description: 'Listing copy that filters and converts viewings.',
    mode: 'marketing',
    provider: 'gemini',
    original_prompt: 'Write a listing for a 3-bed apartment.',
    optimized_prompt:
      'You are a listing agent writing for {{PROPERTY_TYPE}} in {{NEIGHBORHOOD}}, {{CITY}} — {{BEDS}} bed / {{BATHS}} bath, {{SQM}} sqm, price {{PRICE}}.\n\n' +
      'Deliver: headline (≤70 chars, lead with the differentiator {{DIFFERENTIATOR}}), 150-word description (light, layout flow, outdoor space, commute {{COMMUTE}}), ' +
      'bullet facts (floor, orientation, heating {{HEATING}}, HOA {{HOA}}, parking, storage), viewing CTA with slots {{VIEWING_SLOTS}}, ' +
      'and 5 photo captions in shoot order.\n\n' +
      'Rules: every adjective must map to a fact below it; disclose {{DISCLOSURES}} plainly; no "cozy" for small, no "minutes from" without the number. ' +
      'Success: qualified viewings ({{QUALIFICATION}}) within {{TIMEFRAME}}.',
    explanation:
      'Ties every claim to a fact, bans weasel words, and pre-qualifies viewers.',
  },
  {
    id: 'travel-itinerary',
    title: 'Travel Itinerary',
    category: 'Travel',
    description: 'Day-by-day itinerary with bookings and backups.',
    mode: 'better',
    provider: 'gemini',
    original_prompt: 'Plan 5 days in Tokyo.',
    optimized_prompt:
      'You are a travel planner building a {{DAYS}}-day itinerary for {{TRAVELERS}} in {{DESTINATION}} ({{DATES}}, budget {{BUDGET}}, pace {{PACE}}, interests {{INTERESTS}}).\n\n' +
      'Per day: morning/afternoon/evening blocks with transit times ({{TRANSIT_MODE}}), 1 anchor + 2 optionals, ' +
      'food picks near each block ({{DIETARY}} respected), and a rain/bad-day swap. Mark must-book-ahead items ({{BOOK_AHEAD}}) with booking links guidance.\n\n' +
      'Add: arrival/departure logistics ({{AIRPORT}}, {{HOTEL_AREA}} base rationale), daily cost rollup vs. budget, ' +
      'etiquette notes ({{LOCAL_CUSTOMS}}), and emergency info ({{EMERGENCY_NUMBERS}}, embassy, insurance {{INSURANCE}}). ' +
      'Success: zero wasted half-days and no sold-out disappointments.',
    explanation:
      'Blocks with transit math, swaps, booking flags, and budget rollup.',
  },
  {
    id: 'restaurant-menu',
    title: 'Menu Description Set',
    category: 'Restaurant',
    description: 'Menu copy that sells the dish, not just lists it.',
    mode: 'marketing',
    provider: 'gemini',
    original_prompt: 'Write descriptions for our menu.',
    optimized_prompt:
      'You are a menu copywriter for {{RESTAURANT}} ({{CUISINE}}, {{PRICE_TIER}}, diners {{AUDIENCE}}).\n\n' +
      'For each dish ({{DISH_LIST}}): 1–2 lines naming the hero ingredient + technique + origin ({{PROVENANCE}}), ' +
      'sensory words over adjectives, allergens flagged ({{ALLERGENS}}), and price anchoring notes for the {{ tasting? TASTING_MENU : "" }}. ' +
      'Mark signatures (★), high-margin pushes (→), and {{DIETARY}} options.\n\n' +
      'Rules: under {{WORDS_PER_DISH}} words each, no "delicious/mouth-watering", no unpronounceable terms without gloss. ' +
      'Success: attachment rate on signatures up {{TARGET_LIFT}} within {{TIMEFRAME}}.',
    explanation:
      'Sells with provenance + technique, flags allergens, engineers attachment.',
  },
  {
    id: 'fitness-program',
    title: 'Training Program',
    category: 'Fitness',
    description: 'Progressive 8-week program with safety rails.',
    mode: 'specific',
    provider: 'gemini',
    original_prompt: 'Make me a workout plan.',
    optimized_prompt:
      'You are a certified strength coach writing an {{WEEKS}}-week program for {{PERSON}} (level {{LEVEL}}, goal {{GOAL}}, ' +
      'equipment {{EQUIPMENT}}, {{DAYS_PER_WEEK}} days × {{MINUTES}} min, injuries/limits: {{LIMITS}}).\n\n' +
      'Structure per week: session splits with exercises (sets × reps @ RPE {{RPE_RANGE}}), progression rule (add {{PROGRESSION}} when all sets hit top reps), ' +
      'deload protocol week {{DELOAD_WEEK}}, warm-up + cooldown, and conditioning finisher options.\n\n' +
      'Safety: pain-vs-discomfort rules, when to stop and see a clinician, no maxing, form cues per compound lift. ' +
      'Track: log template (lift/reps/RPE/sleep {{TRACKING_FIELDS}}). This is general fitness info, not medical advice. ' +
      'Success: {{SUCCESS_METRIC}} by week {{WEEKS}} without missed sessions from preventable soreness.',
    explanation:
      'Progression + deload + pain rules with a log template and disclaimer.',
  },
  {
    id: 'course-design',
    title: 'Online Course Outline',
    category: 'Course Design',
    description: 'Cohort course outline engineered for completion.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Outline an online course on freelancing.',
    optimized_prompt:
      'You are a course architect designing a {{WEEKS}}-week {{FORMAT}} course, "{{COURSE_TITLE}}", for {{AUDIENCE}} promising {{PROMISE}}.\n\n' +
      'Per module: outcome (observable), lessons ({{LESSON_LENGTH}} min video + transcript), one implementation assignment with rubric, ' +
      'one live element ({{LIVE_ELEMENTS}}), and the dropout-risk point with a countermeasure (accountability {{ACCOUNTABILITY}}).\n\n' +
      'Add: pricing ladder ({{TIERS}}) tied to support levels, launch assets (waitlist {{WAITLIST_SIZE}}, email angles), ' +
      'completion levers (streaks, cohort pacing, win wall), and refund policy {{REFUND_POLICY}}. ' +
      'Success: ≥{{COMPLETION_TARGET}}% completion and ≥{{NPS_TARGET}} NPS from the founding cohort.',
    explanation:
      'Designs against dropout: rubrics, live elements, pacing, and completion levers.',
  },
  {
    id: 'social-calendar',
    title: 'Social Content Calendar',
    category: 'Social Media',
    description: 'A month of platform-native posts from one idea.',
    mode: 'marketing',
    provider: 'gemini',
    original_prompt: 'Plan our social content for next month.',
    optimized_prompt:
      'You are a social media strategist for {{BRAND}} (voice: {{TONE}}, audience {{AUDIENCE}}) planning {{MONTH}} across {{PLATFORMS}}.\n\n' +
      'Build a 4-week calendar: 3 pillars ({{PILLAR_1}}, {{PILLAR_2}}, {{PILLAR_3}}) rotated so no pillar repeats back-to-back; ' +
      'per post give hook (first 8 words), format (carousel/reel/thread), CTA ({{CTA_TYPES}}), and best time ({{TIMEZONES}}).\n\n' +
      'Repurpose the hero piece "{{HERO_TOPIC}}" into 5 derivatives. Include 2 engagement prompts per week and a crisis-reply template for {{RISK_TOPICS}}. ' +
      'Rules: no engagement bait, captions under {{CAPTION_MAX}} chars, alt text every image. Success: {{METRIC}} up {{TARGET_LIFT}} with reply rate ≥ {{REPLY_TARGET}}.',
    explanation:
      'Pillar rotation, hook-first formats, repurposing chain, and guardrails.',
  },
  {
    id: 'pr-launch',
    title: 'PR Launch Kit',
    category: 'PR & Communications',
    description: 'Press release, pitches, and Q&A for a launch.',
    mode: 'marketing',
    provider: 'gemini',
    original_prompt: 'Write a press release for our launch.',
    optimized_prompt:
      'You are a comms lead packaging the {{LAUNCH_NAME}} launch for {{COMPANY}} ({{ONE_LINER}}, embargo {{EMBARGO_DATE}}).\n\n' +
      'Deliver: (1) 400-word release (headline, dateline, lede with news hook {{NEWS_HOOK}}, 2 executive quotes, boilerplate); ' +
      '(2) 3 tailored pitches (tech {{TECH_OUTLETS}}, business {{BIZ_OUTLETS}}, vertical {{VERTICAL_OUTLETS}}) each under 120 words; ' +
      '(3) hostile Q&A ({{TOUGH_QUESTIONS}}) with bridging answers; (4) spokesperson briefing ({{SPOKESPERSON}}, 3 key messages, off-limits {{OFF_LIMITS}}).\n\n' +
      'Rules: facts only from {{FACT_SHEET}}, no forward-looking revenue claims, embargo terms explicit. Success: {{COVERAGE_TARGET}} tier-1 pickups in {{TIMEFRAME}}.',
    explanation:
      'Release + tailored pitches + hostile Q&A with fact-sheet discipline.',
  },
  {
    id: 'ux-study',
    title: 'Usability Study Plan',
    category: 'UX Research',
    description: 'Moderated study that answers, not just observes.',
    mode: 'research',
    provider: 'gemini',
    original_prompt: 'Plan usability tests for our checkout.',
    optimized_prompt:
      'You are a UX researcher planning a moderated study of {{FLOW}} for {{PRODUCT}} with {{N}} {{PARTICIPANT_PROFILE}} participants.\n\n' +
      'Define: research questions (max 3, tied to decision {{DECISION}}), tasks as realistic scenarios (no leading wording), ' +
      'success metrics per task (completion, time, errors, SUS {{SUS_TARGET}}), interview probes for hesitation moments, ' +
      'and the analysis plan (affinity themes → severity ratings → clips for stakeholders).\n\n' +
      'Recruiting: screeners ({{SCREENERS}}), incentives {{INCENTIVE}}, consent + recording notice. ' +
      'Deliverable: 1-page readout (top 5 findings, severity, recommended fix, owner {{OWNER_ROLE}}) within {{TURNAROUND}} of last session. ' +
      'Success: the {{DECISION}} gets made with evidence, not opinions.',
    explanation:
      'Decision-tied questions, realistic tasks, and a readout with owners.',
  },
  {
    id: 'grant-proposal',
    title: 'Grant Proposal Draft',
    category: 'Grant Writing',
    description: 'Funder-aligned proposal skeleton that scores.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Help write a grant application.',
    optimized_prompt:
      'You are a grant writer drafting for {{ORG}} to {{FUNDER}} (program {{PROGRAM}}, award ceiling {{CEILING}}, deadline {{DEADLINE}}).\n\n' +
      'Mirror the funder\'s review criteria ({{CRITERIA}}) section by section: need (data {{NEED_DATA}}), ' +
      'approach (activities → outputs → outcomes logic model), evaluation plan ({{EVAL_METHODS}}, baselines), ' +
      'organizational capacity ({{TRACK_RECORD}}), and line-item budget ({{BUDGET_TOTAL}}) where every cost maps to an activity.\n\n' +
      'Rules: funder vocabulary throughout, no jargon without definition, every claim cited or footnoted. ' +
      'Deliver the outline with word budgets per section plus the 5 most common rejection reasons for this program — and how this draft avoids each. ' +
      'Success: submission scored above {{SCORE_THRESHOLD}} with zero compliance flags.',
    explanation:
      'Mirrors review criteria, maps budget to activities, preempts rejections.',
  },
  {
    id: 'event-runbook',
    title: 'Event Run-of-Show',
    category: 'Event Planning',
    description: 'Minute-by-minute run-of-show with contingencies.',
    mode: 'better',
    provider: 'gemini',
    original_prompt: 'Plan our company offsite.',
    optimized_prompt:
      'You are an event producer building the run-of-show for {{EVENT_NAME}} ({{ATTENDEES}} people, {{VENUE}}, {{DATES}}, budget {{BUDGET}}).\n\n' +
      'Deliver the minute-by-minute grid: setup, doors, each segment (owner, mic/cue, duration + buffer), meals ({{DIETARY}} covered), ' +
      'breakouts ({{BREAKOUT_TOPICS}} with facilitators), and teardown. Add vendor contact sheet ({{VENDORS}}), ' +
      'AV checklist, and the comms plan (attendee updates via {{CHANNEL}}).\n\n' +
      'Contingencies: speaker no-show, AV failure, overrun >10 min, medical incident (nearest {{MEDICAL}}), weather plan {{WEATHER_PLAN}}. ' +
      'Success: energy high at close (NPS {{NPS_TARGET}}) and zero fire-drills visible to attendees.',
    explanation:
      'Minute grid plus vendor sheet and invisible-to-guests contingencies.',
  },
  {
    id: 'game-design-doc',
    title: 'Game Design Doc',
    category: 'Game Design',
    description: 'One-page GDD: pillars, loop, and feel.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Write a game design doc for a puzzle game.',
    optimized_prompt:
      'You are a game designer writing the one-page GDD for "{{GAME_TITLE}}" ({{GENRE}}, platform {{PLATFORM}}, audience {{AUDIENCE}}).\n\n' +
      'Define: 3 design pillars ({{PILLAR_1}}, {{PILLAR_2}}, {{PILLAR_3}}) with what each forbids; ' +
      'core loop in one sentence + 30-second moment-to-moment description; progression ({{PROGRESSION_SYSTEM}}) and monetization ({{MONETIZATION}}) that respect the pillars; ' +
      'art direction refs ({{ART_REFS}}) and audio role ({{AUDIO_ROLE}}); scope as a vertical slice ({{SLICE_CONTENT}}) achievable in {{TIMEFRAME}} by {{TEAM_SIZE}} people.\n\n' +
      'Add: 3 comparable games and what to steal/avoid from each, plus the riskiest assumption and how to prototype it first. ' +
      'Success: any reader can pitch the game back in 30 seconds.',
    explanation:
      'Pillars with forbiddens, loop sentence, slice scope, and risk-first prototyping.',
  },
  {
    id: 'logistics-network',
    title: 'Logistics Network Review',
    category: 'Logistics',
    description: 'Warehouse and lane review for cost and SLA.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Review our distribution network.',
    optimized_prompt:
      'You are a supply-chain analyst reviewing {{COMPANY}}\u2019s network ({{DC_COUNT}} DCs at {{DC_LOCATIONS}}, {{SKU_COUNT}} SKUs, carriers {{CARRIERS}}).\n\n' +
      'Analyze: lane costs per unit (top 5 lanes + alternatives), SLA attainment vs {{SLA_TARGET}} by region, ' +
      'inventory placement (turns {{TURNS}}, stockouts {{STOCKOUT_RATE}}, safety-stock logic), peak readiness ({{PEAK_MULTIPLIER}}x volume), ' +
      'and returns flow cost ({{RETURNS_RATE}} rate).\n\n' +
      'Deliver: ranked moves (consolidate/relocate/renegotiate) with savings math, one-page network map description, ' +
      'and the data you still need ({{DATA_GAPS}}). Owner per move: {{OWNER_ROLE}}. Success: cost per order down {{TARGET_CUT}} holding SLA.',
    explanation:
      'Lane-level math, SLA splits, and ranked moves with owners.',
  },
  {
    id: 'insurance-claim-letter',
    title: 'Insurance Claim Letter',
    category: 'Insurance',
    description: 'Documented claim letter that gets answered.',
    mode: 'specific',
    provider: 'gemini',
    original_prompt: 'Help dispute a denied insurance claim.',
    optimized_prompt:
      'You are a patient advocate drafting an appeal for denied claim {{CLAIM_ID}} ({{INSURER}}, policy {{POLICY}}, service {{SERVICE}} on {{DATE}}, billed {{AMOUNT}}).\n\n' +
      'Structure: policyholder facts, denial reason quoted ({{DENIAL_TEXT}}), rebuttal mapping each reason to evidence ' +
      '(medical necessity letter {{NECESSITY_LETTER}}, codes {{CPT_CODES}}, prior auth {{AUTH_REF}}), and the explicit ask (reprocess by {{DEADLINE}}).\n\n' +
      'Attach an exhibit list (EOB, records, referral). Tone: firm, factual, zero threats. ' +
      'Add the escalation ladder if denied again (supervisor review → external review in {{STATE}} → regulator complaint). ' +
      'Success: reprocessing with written determination, not another form denial.',
    explanation:
      'Reason-by-reason rebuttal with exhibits and an escalation ladder.',
  },
  {
    id: 'hotel-guest-journey',
    title: 'Hotel Guest Journey',
    category: 'Hospitality',
    description: 'End-to-end stay design from booking to review.',
    mode: 'better',
    provider: 'gemini',
    original_prompt: 'Improve our hotel guest experience.',
    optimized_prompt:
      'You are a hospitality consultant mapping the stay at {{PROPERTY}} ({{STAR}} star, {{ROOMS}} rooms, guests {{GUEST_MIX}}).\n\n' +
      'Journey stages — dream/plan, book (friction in {{BOOKING_FLOW}}), pre-arrival, arrival (first {{ARRIVAL_MINUTES}} minutes scripted), ' +
      'in-stay (sleep quality {{SLEEP_STANDARDS}}, {{AMENITIES}}), checkout, post-stay review engine targeting {{REVIEW_SITES}}.\n\n' +
      'Per stage: guest job, emotion curve, failure modes + recovery playbook (empowerment budget {{RECOVERY_BUDGET}}), and the metric (NPS {{NPS_TARGET}}, ' +
      'direct-booking share {{DIRECT_SHARE}}). Staffing notes for {{PEAK_PERIODS}}. Success: review score {{RATING_TARGET}} with recovery stories, not complaints.',
    explanation:
      'Stage-by-stage emotion curve with recovery budgets and review engine.',
  },
  {
    id: 'gtm-launch',
    title: 'Go-to-Market Plan',
    category: 'Go-to-Market',
    description: 'Launch orchestration across product, marketing, sales.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Plan our product launch.',
    optimized_prompt:
      'You are a GTM lead orchestrating {{LAUNCH_NAME}} for {{PRODUCT}} (ICP {{ICP}}, pricing {{PRICING}}, date {{DATE}}).\n\n' +
      'Deliver: positioning (one-liner + 3 proof points {{PROOFS}}), channel plan (owned/earned/paid with owners {{CHANNEL_OWNERS}} and budgets {{BUDGETS}}), ' +
      'sales enablement (one-pager, objection cards for {{OBJECTIONS}}, demo flow), launch-day timeline (T-minus schedule), ' +
      'and instrumentation (funnel {{FUNNEL_STAGES}}, targets {{TARGETS}}, dashboard owner {{DASH_OWNER}}).\n\n' +
      'Risks: readiness gates (product/docs/support) each with a go/no-go owner. Success: {{PIPELINE_TARGET}} pipeline + {{SIGNUP_TARGET}} signups in {{TIMEFRAME}}.',
    explanation:
      'Positions, enables sales, timelines the day, and gates readiness.',
  },
  {
    id: 'api-reference',
    title: 'API Reference Page',
    category: 'API Docs',
    description: 'Endpoint reference developers actually enjoy.',
    mode: 'developer',
    provider: 'gemini',
    original_prompt: 'Document our payments endpoint.',
    optimized_prompt:
      'You are a docs engineer writing the reference for `{{METHOD}} {{PATH}}` ({{PRODUCT}} API v{{VERSION}}, auth {{AUTH_SCHEME}}).\n\n' +
      'Include: one-line purpose, auth + scopes, path/query/body params table (name, type, required, default, constraints, example), ' +
      'copy-paste cURL + {{SDK_LANG}} snippets (success AND one error), response schema with every status code ({{CODES}}), ' +
      'idempotency ({{IDEMPOTENCY}}), rate limits ({{RATE_LIMITS}}) with retry guidance, changelog note ({{CHANGELOG}}), and 3 common mistakes.\n\n' +
      'Rules: every parameter has an example, every error has a fix, no "etc." Success: time-to-first-200 under {{TTFHW_TARGET}} for a new developer.',
    explanation:
      'Params with examples, error fixes, and time-to-first-200 as the bar.',
  },
  {
    id: 'podcast-episode',
    title: 'Podcast Episode Plan',
    category: 'Podcast',
    description: 'Episode arc with hooks, questions, and clips.',
    mode: 'better',
    provider: 'gemini',
    original_prompt: 'Plan a podcast episode about remote work.',
    optimized_prompt:
      'You are a podcast producer planning "{{EPISODE_TITLE}}" for {{SHOW}} (audience {{AUDIENCE}}, length {{MINUTES}} min, guest {{GUEST}}).\n\n' +
      'Arc: cold-open hook (first {{HOOK_SECONDS}}s, Curry the conflict {{CONFLICT}}), 3 acts with turn points, ' +
      '8 questions sequenced story → insight → tactical (each with the follow-up if the answer is thin), ' +
      'ad reads ({{SPONSORS}}) placed at natural breaks, and outro CTA ({{CTA}}).\n\n' +
      'Production: 5 clip candidates with timestamps logic, title + description draft (SEO: {{KEYWORDS}}), ' +
      'and promo cuts per platform ({{PLATFORMS}}). Success: {{RETENTION_TARGET}}% avg. consumption + {{CLIP_VIEWS}} clip views.',
    explanation:
      'Hook-first arc, thin-answer follow-ups, and clip-first production.',
  },
  {
    id: 'newsletter-edition',
    title: 'Newsletter Edition',
    category: 'Newsletter',
    description: 'Weekly edition readers finish and forward.',
    mode: 'marketing',
    provider: 'gemini',
    original_prompt: 'Draft this week newsletter.',
    optimized_prompt:
      'You are the editor of {{NEWSLETTER_NAME}} ({{NICHE}}, {{SUBSCRIBERS}} subs, voice {{TONE}}) writing the {{DATE}} edition.\n\n' +
      'Structure: subject line (≤50 chars, curiosity + benefit) + preview text, 3-2-1 format (3 ideas from {{SOURCES}}, 2 quotes worth stealing, 1 question for replies), ' +
      'one deep cut ({{DEEP_DIVE_TOPIC}}, 200 words max), and a P.S. driving {{CTA}}.\n\n' +
      'Rules: skimmable in 4 minutes, every link earns its place, one idea per paragraph, reply prompt in every issue. ' +
      'Success: open ≥ {{OPEN_TARGET}}, reply rate ≥ {{REPLY_TARGET}}, unsub < {{UNSUB_MAX}}.',
    explanation:
      'Enforces the 3-2-1 skeleton, reply loops, and churn guardrails.',
  },
  {
    id: 'video-script',
    title: 'YouTube Video Script',
    category: 'Video Script',
    description: 'Retention-engineered script with chapters.',
    mode: 'better',
    provider: 'gemini',
    original_prompt: 'Script a video about budgeting.',
    optimized_prompt:
      'You are a YouTube scriptwriter for {{CHANNEL}} (audience {{AUDIENCE}}, style {{STYLE}}) on "{{TOPIC}}" ({{MINUTES}} min).\n\n' +
      'Structure: title options (3, ≤60 chars, curiosity gap without clickbait) + hook (first 30s restate the payoff {{PAYOFF}} twice), ' +
      'chapters every {{CHAPTER_MINUTES}} min with re-hooks, pattern interrupts ({{INTERRUPT_TYPES}}), and a mid-roll bridge to {{CTA}}.\n\n' +
      'Write for spoken word (contractions, {{WORDS_PER_MINUTE}} wpm pace), mark B-roll cues [B-ROLL: {{BROLL_NOTES}}], ' +
      'and end with the next-video loop ({{NEXT_VIDEO}}). Rules: no intro longer than 15s, payoff delivered before minute {{PAYOFF_MINUTE}}. ' +
      'Success: {{RETENTION_TARGET}}% avg. view duration.',
    explanation:
      'Engineers retention: hooks, re-hooks, pacing marks, and payoff timing.',
  },
  {
    id: 'journalism-feature',
    title: 'Feature Interview Plan',
    category: 'Journalism',
    description: 'Interview that gets past talking points.',
    mode: 'research',
    provider: 'gemini',
    original_prompt: 'Prepare questions for interviewing a CEO.',
    optimized_prompt:
      'You are an editor prepping {{REPORTER}} to interview {{SUBJECT}} ({{ROLE}}, {{ORG}}) for a {{WORD_COUNT}}-word feature on {{ANGLE}}.\n\n' +
      'Research dossier first: public record ({{KNOWN_FACTS}}), contradictions to probe ({{CONTRADICTIONS}}), ' +
      'and 3 people to call for background ({{BACKGROUND_SOURCES}}).\n\n' +
      'Then 12 questions: open with biography, escalate to accountability (each tough one paired with its document {{DOCUMENTS}}), ' +
      'end with forward-looking on-the-record asks. Include silence prompts and "is there anything I got wrong?" closer. ' +
      'Rules: no questions answerable by the press kit, every claim question cites its source, record + transcribe with consent ({{CONSENT}}). ' +
      'Success: 2+ on-record quotes that advance the story beyond the narrative.',
    explanation:
      'Dossier-first prep with document-backed accountability questions.',
  },
  {
    id: 'nonprofit-appeal',
    title: 'Donor Appeal',
    category: 'Nonprofit',
    description: 'Year-end appeal anchored in one story.',
    mode: 'marketing',
    provider: 'gemini',
    original_prompt: 'Write a fundraising email.',
    optimized_prompt:
      'You are a fundraising writer for {{ORG}} (mission {{MISSION}}, EIN {{EIN}}) writing the {{CAMPAIGN}} appeal to {{SEGMENT}} (avg gift {{AVG_GIFT}}).\n\n' +
      'Structure around ONE beneficiary story ({{STORY_NAME}}, consent {{CONSENT}}): open in-scene, connect to the systemic problem ({{PROBLEM_STAT}}), ' +
      'show the intervention + cost per outcome ({{COST_PER_OUTCOME}}), then 3 ask tiers ({{TIER_1}}/{{TIER_2}}/{{TIER_3}}) tied to tangible results.\n\n' +
      'Rules: donor is the hero, org is the guide; urgency honest (deadline {{DEADLINE}} real); monthly-giving nudge with match ({{MATCH_DETAILS}}). ' +
      'Compliance: opt-out, address, no guilt manipulation. Success: {{RESPONSE_TARGET}}% response at avg gift ≥ {{AVG_TARGET}}.',
    explanation:
      'One-story structure with cost-per-outcome asks and honest urgency.',
  },
  {
    id: 'procurement-rfp-score',
    title: 'Vendor Evaluation',
    category: 'Procurement',
    description: 'Weighted scorecard for vendor selection.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Help choose between vendors.',
    optimized_prompt:
      'You are a procurement lead evaluating {{VENDOR_COUNT}} vendors for {{NEED}} (budget {{BUDGET}}, timeline {{TIMELINE}}).\n\n' +
      'Build the weighted scorecard: criteria (functionality {{WEIGHT_FUNCTIONAL}}%, TCO {{WEIGHT_TCO}}%, security {{WEIGHT_SECURITY}}%, ' +
      'support SLA {{WEIGHT_SUPPORT}}%, references {{WEIGHT_REFS}}%) with 1–5 anchors per criterion. ' +
      'Add: demo script (same 5 scenarios for all, scored live), red-flag checklist ({{RED_FLAGS}}), and TCO model (license + implementation {{IMPL_COST}} + 3-yr ops).\n\n' +
      'Process: blind first scoring, then reference calls (questions {{REF_QUESTIONS}}), then negotiation levers per finalist. ' +
      'Deliver the recommendation memo with the runner-up and switching costs. Success: signed contract with SLA penalties, zero shelfware risk.',
    explanation:
      'Weighted criteria, identical demos, and TCO-first recommendation.',
  },
  {
    id: 'partnerships-onboarding',
    title: 'Partnership Proposal',
    category: 'Partnerships',
    description: 'Co-marketing partnership with mutual math.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Propose a partnership with Acme.',
    optimized_prompt:
      'You are a BD lead proposing a {{PARTNERSHIP_TYPE}} partnership between {{US}} and {{PARTNER}} (their audience {{THEIR_AUDIENCE}}, overlap {{OVERLAP_EST}}).\n\n' +
      'Show the mutual math first: what each side puts in ({{OUR_COMMIT}}, {{THEIR_COMMIT}}) and gets out (pipeline {{PIPE_EST}}, reach {{REACH_EST}}). ' +
      'Then: 90-day pilot ({{PILOT_SCOPE}}, kill criteria {{KILL_CRITERIA}}), co-marketing assets ({{ASSETS}}), ' +
      'lead-sharing + attribution rules ({{ATTRIBUTION}}), and the single-threaded owners each side ({{OUR_OWNER}}, {{THEIR_OWNER}}).\n\n' +
      'Rules: pilot before commitment, exit clause {{EXIT_TERMS}}, no exclusivity without minimums. Success: pilot hits {{PILOT_TARGET}} → annual agreement.',
    explanation:
      'Leads with mutual math, pilots with kill criteria, and attribution rules.',
  },
  {
    id: 'exec-memo',
    title: 'Executive Decision Memo',
    category: 'Executive Memo',
    description: 'One-page memo that gets a decision.',
    mode: 'specific',
    provider: 'gemini',
    original_prompt: 'Write a memo to decide on remote work policy.',
    optimized_prompt:
      'You are a chief of staff writing a one-page decision memo for {{DECIDER}} on {{DECISION}} (needed by {{DEADLINE}}).\n\n' +
      'Format: BLUF recommendation first ({{RECOMMENDATION}}), then context (3 bullets max, data {{KEY_DATA}}), ' +
      'options table ({{OPTION_A}} / {{OPTION_B}} / status quo — with cost, risk, reversibility each), ' +
      'risks + mitigations, and the explicit ask (approve {{ASK}} / choose / delegate).\n\n' +
      'Rules: one page, no appendix archaeology (link it), numbers over adjectives, state what happens if undecided by {{DEADLINE}}. ' +
      'Success: a decision in the meeting, not another meeting.',
    explanation:
      'BLUF-first with options table and the cost of indecision.',
  },
  {
    id: 'resume-review',
    title: 'Resume Review',
    category: 'Resume Review',
    description: 'Line-by-line resume upgrade for a target role.',
    mode: 'specific',
    provider: 'gemini',
    original_prompt: 'Improve my resume.',
    optimized_prompt:
      'You are a hiring-manager-turned-coach reviewing {{NAME}}\u2019s resume for {{TARGET_ROLE}} at {{TARGET_COMPANIES}}.\n\n' +
      'Audit: 6-second scan test (what lands?), bullet rewrite pass (verb + scope + outcome + metric — flag every metric-less claim), ' +
      'relevance filter vs. {{JOB_DESCRIPTION}} (cut or compress the rest), ATS check (keywords {{KEYWORDS}}, no tables/graphics/textboxes), ' +
      'and the top-third rewrite (summary that states value, not objectives).\n\n' +
      'Deliver: rewritten bullets side-by-side (before → after), 3 things to delete, and 5 likely interview questions this resume invites. ' +
      'Tone: candid coach. Success: recruiter callback rate up within {{APPLICATIONS}} tailored applications.',
    explanation:
      'Metric-per-bullet rewrite, ATS rules, and interview-question preview.',
  },
  {
    id: 'community-launch',
    title: 'Community Launch',
    category: 'Community',
    description: 'Seed a community that talks to itself.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'How do we launch a user community?',
    optimized_prompt:
      'You are a community strategist launching {{COMMUNITY_NAME}} for {{PRODUCT}} (platform {{PLATFORM}}, seed {{SEED_SIZE}} founding members).\n\n' +
      'Design: positioning (why gather here vs. {{ALTERNATIVES}}), founding-member invite + charter ({{CHARTER_RULES}}), ' +
      'weekly rituals ({{RITUALS}}: wins thread, AMA cadence {{AMA_CADENCE}}, challenges), moderation ladder (warn/mute/ban + appeals), ' +
      'and the member-to-member value loop (how a newcomer gets helped in week 1).\n\n' +
      'Metrics: WAU/post ratio {{ENGAGEMENT_TARGET}}, response time {{RESPONSE_SLA}}, and the leading indicator of death to watch ({{CHURN_SIGNAL}}). ' +
      'Founder workload capped at {{HOURS_PER_WEEK}}h/week by design. Success: 30% of threads answered by members, not staff.',
    explanation:
      'Rituals + moderation ladder + member-answered ratio as the goal.',
  },
  {
    id: 'sports-plan',
    title: 'Team Training Block',
    category: 'Sports Coaching',
    description: '4-week team block balancing load and freshness.',
    mode: 'specific',
    provider: 'gemini',
    original_prompt: 'Plan preseason training for a soccer team.',
    optimized_prompt:
      'You are a performance coach planning a {{WEEKS}}-week block for {{TEAM}} ({{SPORT}}, level {{LEVEL}}, squad {{SQUAD_SIZE}}, ages {{AGES}}).\n\n' +
      'Structure each week: pitch sessions ({{SESSIONS_PER_WEEK}}: technical/tactical/conditioning split {{SPLIT}}), ' +
      'load progression (RPE targets {{RPE_TARGETS}}, deload week {{DELOAD_WEEK}}), gym work ({{GYM_FOCUS}}), and recovery (sleep {{SLEEP_TARGET}}, nutrition {{NUTRITION_NOTES}}).\n\n' +
      'Safety: growth-plate and contact-load rules for youth ({{YOUTH_RULES}}), concussion protocol {{CONCUSSION_PROTOCOL}}, ' +
      'heat policy ({{HEAT_POLICY}}). Track: attendance, wellness scores ({{WELLNESS_ITEMS}}), sprint times. ' +
      'Success: peak at {{TARGET_DATE}} with zero preventable soft-tissue injuries.',
    explanation:
      'Load progression with youth safeguards and peak timing.',
  },
  {
    id: 'architecture-brief',
    title: 'Architecture Project Brief',
    category: 'Architecture',
    description: 'Client brief that prevents redesign loops.',
    mode: 'specific',
    provider: 'gemini',
    original_prompt: 'Brief an architecture project for a family home.',
    optimized_prompt:
      'You are an architect briefing a {{PROJECT_TYPE}} for {{CLIENT}} (site {{SITE}}, budget {{BUDGET}}, move-in {{MOVE_IN}}).\n\n' +
      'Capture: household rituals ({{RITUALS}}) driving the plan, must-have vs. nice-to-have rooms ({{ROOM_LIST}}), ' +
      'constraints (zoning {{ZONING}}, setbacks, height {{HEIGHT_LIMIT}}, heritage {{HERITAGE}}), sustainability bar ({{SUSTAINABILITY}}), ' +
      'and 3 reference projects ({{REF_1}}, {{REF_2}}, {{REF_3}}) with what to borrow.\n\n' +
      'Process: phases + fees ({{FEE_STRUCTURE}}), decision gates (who signs {{SIGN_OFF}}), and the change policy after DD. ' +
      'Success: schematic approval in {{ROUNDS}} rounds with no program re-brief.',
    explanation:
      'Ritual-driven program, constraint register, and round-capped approvals.',
  },
  {
    id: 'customer-onboarding-email',
    title: 'Customer Onboarding Sequence',
    category: 'Customer Onboarding',
    description: '5-email sequence to first value, not feature tours.',
    mode: 'production',
    provider: 'gemini',
    original_prompt: 'Write onboarding emails for new users.',
    optimized_prompt:
      'You are a lifecycle marketer writing the 5-email onboarding for {{PRODUCT}} (new user {{PERSONA}}, aha-moment {{AHA_MOMENT}}, trial {{TRIAL_DAYS}} days).\n\n' +
      'Sequence by job, not feature: email 1 (welcome + single first action {{FIRST_ACTION}}), 2 (unblock the top drop-off {{DROPOFF}}), ' +
      '3 (social proof {{PROOF}} + template {{TEMPLATE_LINK}}), 4 (advanced win {{ADVANCED_WIN}}), 5 (trial-end decision {{TRIAL_END_CTA}}).\n\n' +
      'Rules: one CTA each, plain-text feel, send-time logic ({{SEND_LOGIC}}), stop conditions on activation (event {{ACTIVATION_EVENT}}). ' +
      'Success: activation from {{BASELINE}} to {{TARGET}} within the trial window.',
    explanation:
      'Job-ordered sequence with stop-on-activation and single CTAs.',
  },
];
export function getTemplateById(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(
  category: TemplateCategory | 'All',
): PromptTemplate[] {
  if (category === 'All') return [...PROMPT_TEMPLATES];
  return PROMPT_TEMPLATES.filter((t) => t.category === category);
}

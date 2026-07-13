# Clinically Backed Mood Analysis Report

Reviewed: 2026-07-13  
Scope: Evidence-based mood analysis framework for screening, tracking, and report generation. No personal mood data was supplied, so this document does not analyze a specific person.

## Clinical Boundary

This report supports mood screening and self-monitoring. It must not diagnose depression, anxiety, bipolar disorder, suicidality, eating disorders, substance use disorders, or any other clinical condition. Output should use language such as "elevated symptom burden," "screening result," "trend," and "consider professional assessment," not "you have..."

Any self-harm ideation, suicide planning, recent suicidal behavior, psychosis, mania-like symptoms, inability to sleep with high energy, severe functional impairment, or rapid deterioration should override routine mood scoring and prompt urgent clinical or emergency assessment according to local policy.

## Executive Summary

Clinically backed mood analysis should combine validated questionnaires with daily contextual tracking. The strongest screening backbone is:

- PHQ-9 for depressive symptom burden.
- GAD-7 for anxiety symptom burden.
- WHO-5 for positive well-being.
- C-SSRS style suicide risk triage when self-harm signals appear.
- MDQ or clinician referral logic for possible bipolar-spectrum symptoms.
- Functional impairment, sleep, activity, diet, substances, medication changes, pain, stressors, and social context as modifiers rather than standalone diagnoses.

The safest product behavior is a layered report:

1. Safety screen.
2. Symptom severity screen.
3. Well-being and functioning.
4. Trend over time.
5. Contextual contributors.
6. Clear next step, including clinician referral language when scores or risk flags are elevated.

## Evidence-Backed Domains

| Domain | Recommended Measure | Clinical Role | Notes |
|---|---:|---|---|
| Depressive symptoms | PHQ-9 | Screening and severity monitoring | Strong evidence base; score changes can track treatment response. |
| Anxiety symptoms | GAD-7 | Screening and severity monitoring | Strong evidence base for generalized anxiety symptoms; also useful as broad anxiety screener. |
| Well-being | WHO-5 | Positive mood and well-being | Helpful counterweight to symptom-only tracking. |
| Suicide risk | C-SSRS style triage | Safety escalation | Use as risk routing, not as a passive score. |
| Bipolar-spectrum symptoms | MDQ plus referral logic | Detect possible mania/hypomania patterns | Positive screen requires clinical evaluation; MDQ is less sensitive for bipolar II/hypomania. |
| Function | Work, school, relationships, self-care | Severity and clinical significance | Symptom scores without impairment can mislead. |
| Sleep | Duration, continuity, timing, reduced need for sleep | Key mood modifier and mania warning sign | Reduced need for sleep plus high energy is different from insomnia with fatigue. |
| Food and nutrition | Meal regularity, alcohol, caffeine, dietary quality | Contextual contributor | Useful for pattern finding; should not be framed as causal proof for an individual. |
| Activity | Movement, sedentary time, exercise | Contextual contributor and intervention target | Exercise has supportive evidence for depression/anxiety symptoms. |
| Stress and life events | Recent load, loss, conflict, transitions | Contextual interpretation | Explains timing and relapse risk. |

## Validated Screening Scores

### PHQ-9: Depressive Symptom Burden

Use: weekly or every 2 weeks, plus baseline.  
Score range: 0-27.

| Score | Severity Band |
|---:|---|
| 0-4 | Minimal |
| 5-9 | Mild |
| 10-14 | Moderate |
| 15-19 | Moderately severe |
| 20-27 | Severe |

Interpretation:

- A score of 10 or higher is commonly used as a threshold for clinically meaningful depressive symptoms that merit further evaluation.
- Any non-zero response to the self-harm item should trigger safety follow-up rather than routine report generation.
- PHQ-9 should be paired with functional impairment and duration. Low function with moderate scores can still be clinically important.

Product wording:

> Your PHQ-9 score is in the moderate range, which suggests elevated depressive symptom burden. This is a screening result, not a diagnosis. Consider discussing it with a licensed clinician, especially if symptoms persist or impair daily life.

### GAD-7: Anxiety Symptom Burden

Use: weekly or every 2 weeks, plus baseline.  
Score range: 0-21.

| Score | Severity Band |
|---:|---|
| 0-4 | Minimal |
| 5-9 | Mild |
| 10-14 | Moderate |
| 15-21 | Severe |

Interpretation:

- A score of 10 or higher is commonly used as a threshold for further anxiety assessment.
- Pair score with avoidance, sleep disruption, panic symptoms, concentration, and functioning.
- Anxiety and depressive symptoms frequently overlap, so the report should show both scales side by side rather than force a single label.

### WHO-5: Positive Well-Being

Use: weekly.  
Score range: raw 0-25, often multiplied by 4 to produce a 0-100 percentage score.

Interpretation:

- Lower scores suggest poorer well-being and can complement PHQ-9/GAD-7.
- A raw score below 13, or a percentage score below 50, is commonly treated as poor well-being and may justify further screening for depression.
- A change of about 10 percentage points is often treated as clinically meaningful.

Product wording:

> Well-being is low this week, even though symptom severity is not high. That pattern can still matter clinically, especially if it continues across several weeks or affects daily functioning.

### MDQ: Bipolar-Spectrum Screen

Use: baseline, then repeat only when clinically relevant patterns appear.  
Trigger patterns:

- Periods of unusually high energy or unusually elevated/irritable mood.
- Reduced need for sleep without fatigue.
- Increased risk-taking, spending, impulsivity, talkativeness, racing thoughts, or unusually high activity.
- Antidepressant use plus activation-like symptoms.
- Family history of bipolar disorder.

MDQ positive screen pattern:

- 7 or more endorsed symptoms.
- Symptoms occurred during the same period.
- Symptoms caused moderate or serious problems.

Interpretation:

- Positive MDQ is not diagnostic. It should recommend clinical assessment.
- MDQ is better at detecting bipolar I than bipolar II or hypomania, so a negative screen does not fully exclude bipolar-spectrum conditions.

### C-SSRS Style Safety Triage

Use: when PHQ-9 self-harm item is positive, user text mentions self-harm, or behavior indicates acute risk.

Risk logic:

- Passive death wish without plan or intent: safety follow-up and support resources.
- Suicidal thoughts with method, intent, or plan: urgent escalation.
- Recent suicidal behavior or preparatory behavior: urgent escalation.
- Ambiguous self-harm language: ask direct safety questions or route to clinician review.

Product rule:

Safety state must override all summary labels. Do not bury self-harm indicators under "mild" or "improving" score trends.

## Mood Analysis Model

### 1. Safety Layer

Classify first:

| Safety State | Criteria | Product Action |
|---|---|---|
| Routine | No self-harm, mania, psychosis, or severe deterioration flags | Generate normal report. |
| Elevated concern | Passive self-harm thoughts, rapid worsening, severe insomnia, severe impairment | Generate report plus clear recommendation for timely professional support. |
| Urgent concern | Intent, plan, recent behavior, psychosis, mania-like presentation, inability to care for self | Interrupt normal report and advise urgent clinical or emergency assessment. |

### 2. Symptom Burden Layer

Calculate:

- Depression severity from PHQ-9.
- Anxiety severity from GAD-7.
- Well-being from WHO-5.
- Functional impact from work/school/social/self-care ratings.

Suggested labels:

- Low symptom burden.
- Mild elevated symptom burden.
- Moderate elevated symptom burden.
- High symptom burden.
- High symptom burden with safety concern.

Avoid diagnostic labels:

- Do not say "major depression," "generalized anxiety disorder," or "bipolar disorder."
- Say "screening scores are consistent with..." or "symptoms are elevated in..."

### 3. Trend Layer

Report changes over 2, 4, and 8 weeks:

- Direction: improving, stable, worsening, fluctuating.
- Magnitude: small, meaningful, large.
- Confidence: low when data is sparse or inconsistent.

Suggested thresholds:

- PHQ-9 or GAD-7 change of 5 or more points: likely meaningful.
- WHO-5 change of 10 percentage points: likely meaningful.
- Any safety flag: meaningful regardless of numeric trend.

### 4. Context Layer

Use context to explain possible contributors, not causes:

- Sleep loss or irregular sleep.
- Alcohol or substance use.
- Caffeine timing and amount.
- Meal skipping or low dietary quality.
- Major stressors or conflict.
- Reduced social contact.
- Low activity or abrupt overtraining.
- Medication changes.
- Menstrual cycle, perimenopause/menopause, pregnancy/postpartum context where relevant.
- Pain, illness, thyroid disease, anemia, vitamin deficiencies, or other medical factors where relevant.

Good wording:

> Low mood appears to cluster with short sleep and skipped meals in this log. This pattern is not proof of cause, but it may be useful to discuss with a clinician or test with a low-risk routine change.

Bad wording:

> Your diet caused your depression.

## Food and Mood Evidence

Nutrition can be included as a contextual factor, especially for a MoodFood-style product, but it should not dominate the clinical interpretation.

Evidence position:

- Diet quality is associated with depression risk in observational research.
- The SMILES randomized trial found that a structured dietary support intervention improved depressive symptoms more than social support control in adults with major depression, with remission in 32.3% of the diet group versus 8.0% of controls at 12 weeks.
- The evidence supports nutrition as an adjunctive lifestyle factor, not a substitute for psychotherapy, medication, clinical assessment, or crisis care.

Reportable nutrition signals:

- Meal regularity.
- Breakfast/late-night eating pattern.
- Fruit, vegetable, whole grain, legume, nuts, fish, lean protein, and olive oil pattern.
- High frequency of ultra-processed foods, sugary drinks, heavy alcohol, and high caffeine late in day.
- Hydration and appetite change.

Safe product wording:

> Your lower mood days often coincide with skipped meals and lower diet quality. This is a pattern worth watching, but it does not prove causation.

## Recommended Report Template

### Mood Summary

Current profile:

- Depression screen: [PHQ-9 score and band].
- Anxiety screen: [GAD-7 score and band].
- Well-being: [WHO-5 score and band].
- Function: [work/school/social/self-care impact].
- Safety: [routine/elevated/urgent].

Plain-language summary:

> This week's responses suggest [low/mild/moderate/high] mood symptom burden, with [improving/stable/worsening/fluctuating] trend compared with your recent baseline. This is a screening summary, not a diagnosis.

### Key Patterns

- Mood was lowest on: [days].
- Mood was strongest on: [days].
- Most consistent contributors: [sleep, stress, activity, food, social contact].
- Data confidence: [low/medium/high] based on completion rate and consistency.

### Clinical Interpretation

Use one of these:

- Low: "Scores are currently in a low range. Continue monitoring if symptoms return or functioning changes."
- Mild: "Scores are mildly elevated. Consider tracking sleep, stress, food regularity, and activity for patterns."
- Moderate: "Scores are moderately elevated. Consider discussing these results with a licensed clinician, especially if symptoms persist for 2 weeks or impair daily life."
- High: "Scores are high. A licensed clinician can help assess severity, safety, and treatment options."
- Safety concern: "Responses indicate a possible safety concern. Seek urgent clinical or emergency assessment according to local resources."

### Suggested Next Step

Choose only one primary recommendation:

- Continue tracking.
- Repeat screen in 1 week.
- Review lifestyle pattern.
- Share report with clinician.
- Seek timely professional assessment.
- Seek urgent clinical or emergency assessment.

## Implementation Recommendations

Minimum data model:

- Daily mood rating: valence, anxiety, irritability, energy, stress.
- Daily functioning: work/school, social, self-care.
- Daily context: sleep, meals, caffeine, alcohol/substances, activity, social contact, major stressor.
- Weekly PHQ-9, GAD-7, WHO-5.
- Baseline MDQ, repeated only on trigger patterns.
- Safety questions triggered by self-harm signals.

Cadence:

- Daily: 30-second mood/context check-in.
- Weekly: PHQ-9, GAD-7, WHO-5.
- Monthly: trend report with 4-week baseline comparison.
- Triggered: safety triage, mania/hypomania referral logic, clinician-share report.

Data confidence:

- High: 80% or more daily completion plus complete weekly scales.
- Medium: 50-79% daily completion or one missing weekly scale.
- Low: less than 50% daily completion, missing scales, or contradictory entries.

Privacy and safety:

- Treat mood logs, self-harm text, medication data, reproductive health data, substance use, and clinician notes as sensitive health data.
- Store minimal necessary data.
- Provide export/delete controls.
- Avoid social sharing defaults.
- Log safety interventions separately from engagement analytics.

## Example Output

> Your depression screen is in the mild range, anxiety is in the moderate range, and well-being is below the usual threshold for positive well-being. Compared with the past 4 weeks, anxiety has increased while mood has stayed fairly stable. Lower mood days clustered with short sleep, skipped meals, and high stress. This is not a diagnosis, but the anxiety score and low well-being suggest it may be worth sharing this report with a licensed clinician if the pattern continues.

## Evidence Strength

| Evidence Area | Strength | Use in Report |
|---|---|---|
| PHQ-9 depression screening | Strong | Primary depressive symptom screen. |
| GAD-7 anxiety screening | Strong | Primary anxiety symptom screen. |
| WHO-5 well-being | Strong/moderate | Positive well-being and depression screening support. |
| C-SSRS suicide risk triage | Strong for structured triage | Safety routing, not passive score. |
| MDQ bipolar screening | Moderate | Referral trigger; not diagnostic. |
| Sleep and mood | Strong/moderate | Contextual factor and intervention target. |
| Exercise and mood | Moderate/strong | Adjunctive recommendation when appropriate. |
| Diet quality and depression | Moderate | Contextual and adjunctive; avoid individual causal claims. |
| Daily mood tracking | Moderate/emerging | Useful for trends; depends on completion and interpretation quality. |

## Sources

- U.S. Preventive Services Task Force. Depression and Suicide Risk in Adults: Screening, 2023. https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/screening-depression-suicide-risk-adults
- U.S. Preventive Services Task Force. Anxiety Disorders in Adults: Screening, 2023. https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/anxiety-adults-screening
- American Psychological Association. Assessment of depression: PHQ-9 and related tools. https://www.apa.org/depression-guideline/assessment
- Government of British Columbia. PHQ-9 scoring and interpretation. https://www2.gov.bc.ca/assets/gov/health/practitioner-pro/bc-guidelines/depress_appd.pdf
- Anxiety and Depression Association of America. GAD-7 Anxiety scale. https://adaa.org/sites/default/files/GAD-7_Anxiety-updated_0.pdf
- Psychiatric Research Unit, WHO Collaborating Center. WHO-5 Well-Being Index. https://www.psykiatri-regionh.dk/who-5/Documents/WHO5_English.pdf
- Topp CW, Ostergaard SD, Sondergaard S, Bech P. The WHO-5 Well-Being Index: a systematic review. Psychotherapy and Psychosomatics, 2015. https://pubmed.ncbi.nlm.nih.gov/25831962/
- Columbia Lighthouse Project. C-SSRS triage and risk identification. https://cssrs.columbia.edu/the-columbia-scale-c-ssrs/risk-identification/
- International Bipolar Foundation. Mood Disorder Questionnaire overview and scoring. https://ibpf.org/wp-content/uploads/2016/11/MDQ.pdf
- NICE. Depression in adults: treatment and management, NG222, 2022. https://www.nice.org.uk/guidance/ng222
- NICE. Bipolar disorder: assessment and management, CG185. https://www.nice.org.uk/guidance/cg185
- Jacka FN et al. A randomised controlled trial of dietary improvement for adults with major depression: the SMILES trial. BMC Medicine, 2017. https://link.springer.com/article/10.1186/s12916-017-0791-y
- Noetel M et al. Effect of exercise for depression: systematic review and network meta-analysis. BMJ, 2024. https://www.bmj.com/content/384/bmj-2023-075847

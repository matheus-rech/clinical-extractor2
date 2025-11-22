# Medical Agent Prompts - Complete Reference

**Purpose:** Specialized prompts for 6 medical research AI agents
**Location:** `src/services/MedicalAgentBridge.ts`
**Format:** Ready to customize or replace with Python agents

---

## 1. StudyDesignExpertAgent

**Expertise:** Research methodology, study design, sample selection
**Accuracy:** 92%
**Model:** gemini-2.0-flash-thinking-exp-1219

### Prompt Template
```
You are a Study Design Expert analyzing medical research methodology.
Your expertise: research design, inclusion/exclusion criteria, study types, sample selection.
Accuracy: 92%

Analyze the provided data and extract:
- Study type (RCT, cohort, case-control, etc.)
- Inclusion/exclusion criteria
- Sample selection method
- Study period
- Methodology details

Provide confidence score (0-1) for each extraction.
```

### Expected Output
```json
{
  "extractedFields": {
    "studyType": {"value": "Retrospective cohort", "confidence": 0.95},
    "inclusionCriteria": {"value": "Cerebellar infarction >3cm³", "confidence": 0.90},
    "sampleSelection": {"value": "Consecutive patients 2010-2015", "confidence": 0.92},
    "studyPeriod": {"value": "2010-2015", "confidence": 1.0}
  },
  "overallConfidence": 0.92,
  "sourceQuote": "Retrospective analysis of consecutive patients",
  "insights": ["Well-defined inclusion criteria", "Adequate study period"]
}
```

---

## 2. PatientDataSpecialistAgent

**Expertise:** Patient demographics, baseline characteristics
**Accuracy:** 88%
**Model:** gemini-2.0-flash-thinking-exp-1219

### Prompt Template
```
You are a Patient Data Specialist extracting demographics and baseline characteristics.
Your expertise: patient demographics, sample sizes, baseline characteristics.
Accuracy: 88%

Extract from the data:
- Total sample size (N)
- Age (mean, median, range)
- Sex/Gender distribution
- Baseline characteristics
- Group comparisons

Provide confidence score (0-1) for each field.
```

### Expected Output
```json
{
  "extractedFields": {
    "totalN": {"value": 84, "confidence": 1.0},
    "interventionN": {"value": 28, "confidence": 1.0},
    "controlN": {"value": 56, "confidence": 1.0},
    "meanAge": {"value": "59.2±12.3", "confidence": 0.95},
    "maleSex": {"value": "60.7%", "confidence": 0.90},
    "gcs": {"value": "12.1±4.1", "confidence": 0.88}
  },
  "overallConfidence": 0.88,
  "sourceQuote": "Mean age 59.2±12.3 years, 60.7% male",
  "insights": ["Well-matched groups", "Good sample size for subgroup analysis"]
}
```

---

## 3. SurgicalExpertAgent

**Expertise:** Surgical procedures, operative techniques
**Accuracy:** 91%
**Model:** gemini-2.0-flash-thinking-exp-1219

### Prompt Template
```
You are a Surgical Expert analyzing surgical procedures and techniques.
Your expertise: surgical procedures, operative techniques, surgical outcomes.
Accuracy: 91%

Extract surgical details:
- Type of surgery/procedure
- Surgical technique details
- Operative time
- Surgical approach
- Intraoperative findings

Provide confidence score (0-1) for each extraction.
```

### Expected Output
```json
{
  "extractedFields": {
    "procedureType": {"value": "Bilateral suboccipital decompressive craniectomy", "confidence": 0.95},
    "approach": {"value": "Bilateral SDC with foramen magnum opening", "confidence": 0.92},
    "evdPlacement": {"value": "50% of patients", "confidence": 0.90},
    "resection": {"value": "Infarcted cerebellum resected in 57.1%", "confidence": 0.88},
    "complications": {"value": "CSF leakage 7.1%", "confidence": 0.91}
  },
  "overallConfidence": 0.91,
  "sourceQuote": "Bilateral SDC performed with EVD in 50%",
  "insights": ["Standard surgical technique", "Low complication rate"]
}
```

---

## 4. OutcomesAnalystAgent

**Expertise:** Clinical outcomes, statistics, mortality
**Accuracy:** 89%
**Model:** gemini-2.0-flash-thinking-exp-1219

### Prompt Template
```
You are an Outcomes Analyst extracting statistics and clinical outcomes.
Your expertise: mortality rates, mRS scores, outcome measures, statistical analysis.
Accuracy: 89%

Extract outcome data:
- Primary outcomes (mortality, mRS, etc.)
- Secondary outcomes
- Follow-up period
- Statistical significance (p-values)
- Effect sizes

Provide confidence score (0-1) for each field.
```

### Expected Output
```json
{
  "extractedFields": {
    "favorableOutcome": {"value": "66.7% vs 51.0%", "confidence": 0.95},
    "pValue": {"value": "0.030", "confidence": 1.0},
    "mortality": {"value": "3.6% vs 8.9%", "confidence": 0.92},
    "followUp": {"value": "12 months", "confidence": 0.90},
    "mrsScore": {"value": "mRS 0-2", "confidence": 0.88}
  },
  "overallConfidence": 0.89,
  "sourceQuote": "Favorable outcome 66.7% vs 51.0%, P=0.030",
  "insights": ["Statistically significant improvement", "Clinically meaningful effect"]
}
```

---

## 5. NeuroimagingSpecialistAgent

**Expertise:** CT/MRI findings, lesion volumes
**Accuracy:** 92%
**Model:** gemini-2.0-flash-thinking-exp-1219

### Prompt Template
```
You are a Neuroimaging Specialist analyzing imaging data.
Your expertise: CT/MRI findings, lesion volumes, brain swelling, imaging measurements.
Accuracy: 92%

Extract imaging data:
- Lesion volume (mm³ or cm³)
- Brain swelling measurements
- Imaging modality (CT, MRI)
- Imaging findings
- Quantitative measurements

Provide confidence score (0-1) for each value.
```

### Expected Output
```json
{
  "extractedFields": {
    "lesionVolume": {"value": "45.3±18.2 cm³", "confidence": 0.95},
    "imagingModality": {"value": "CT", "confidence": 1.0},
    "swellingOnset": {"value": "2-4 days", "confidence": 0.90},
    "hydrocephalus": {"value": "Present in 42.9%", "confidence": 0.92},
    "brainstemInfarct": {"value": "Predictor of poor outcome", "confidence": 0.88}
  },
  "overallConfidence": 0.92,
  "sourceQuote": "Mean lesion volume 45.3±18.2 cm³ on CT",
  "insights": ["Large lesion volumes", "Peak swelling 2-4 days typical"]
}
```

---

## 6. TableExtractorAgent

**Expertise:** Table structure validation
**Confidence:** 100%
**Model:** gemini-2.0-flash-exp (faster, cheaper)

### Prompt Template
```
You are a Table Structure Validator using vision-based analysis.
Your expertise: table structure validation, data type detection, quality assessment.
Confidence: 100%

Validate the table structure:
- Verify headers match data
- Check for missing values
- Identify data types (numeric, percentage, categorical)
- Assess table quality (5 factors)
- Suggest corrections if needed

Provide overall confidence score (0-1).
```

### Expected Output
```json
{
  "extractedFields": {
    "structureValid": {"value": true, "confidence": 1.0},
    "headerAlignment": {"value": "Perfect", "confidence": 1.0},
    "missingValues": {"value": 0, "confidence": 1.0},
    "dataTypes": {"value": ["categorical", "numeric", "numeric"], "confidence": 1.0},
    "qualityScore": {"value": 0.95, "confidence": 1.0}
  },
  "overallConfidence": 1.0,
  "sourceQuote": "Table structure validated successfully",
  "insights": ["Clean table structure", "No data quality issues"]
}
```

---

## Customization Guide

### 1. Modify Agent Expertise

Edit `src/services/MedicalAgentBridge.ts`:

```typescript
const AGENT_PROMPTS = {
    CustomAgent: `You are a Custom Agent with specialized knowledge.
Your expertise: [your domain here]
Accuracy: [your accuracy]

Extract:
- Field 1
- Field 2
- Field 3

Provide confidence score (0-1) for each extraction.`,
    // ... other agents
};
```

### 2. Add New Agent

```typescript
// In MedicalAgentBridge.ts
const AGENT_PROMPTS = {
    // ... existing agents
    NewSpecializedAgent: `Your specialized prompt here`
};

// In AgentOrchestrator.ts
private getAgentsForDataType(dataType: ClinicalDataType): string[] {
    const agentMap: Record<ClinicalDataType, string[]> = {
        'your_new_type': ['NewSpecializedAgent', 'TableExtractorAgent'],
        // ... existing mappings
    };
    return agentMap[dataType] || ['TableExtractorAgent'];
}
```

### 3. Adjust Model Selection

```typescript
// In MedicalAgentBridge.ts
private async callGeminiAgent(prompt: string, agentName: string): Promise<string> {
    // Choose model based on agent
    const model = agentName === 'FastAgent'
        ? 'gemini-2.0-flash-exp'           // Fast & cheap
        : 'gemini-2.0-flash-thinking-exp';  // Deep reasoning

    // ... rest of implementation
}
```

### 4. Tune Generation Parameters

```typescript
generationConfig: {
    temperature: 0.2,      // Lower = more deterministic
    topP: 0.8,            // Nucleus sampling
    topK: 40,             // Top-k sampling
    maxOutputTokens: 2048, // Increase for longer responses
    responseMimeType: "application/json"
}
```

---

## Agent Routing Logic

### Content Classification Patterns

```typescript
// In AgentOrchestrator.ts
private classifyTableContent(table: ExtractedTable): ClinicalDataType {
    const content = table.headers.join(' ').toLowerCase();

    // Patient Demographics
    if (matchesPattern(content, ['age', 'sex', 'gender', 'patient', 'n =']))
        return 'patient_demographics';

    // Surgical Procedures
    if (matchesPattern(content, ['surgery', 'procedure', 'sdc', 'evd']))
        return 'surgical_procedures';

    // Outcomes Statistics
    if (matchesPattern(content, ['outcome', 'mortality', 'mrs', '%']))
        return 'outcomes_statistics';

    // Neuroimaging Data
    if (matchesPattern(content, ['volume', 'lesion', 'swelling', 'mm']))
        return 'neuroimaging_data';

    // Study Methodology
    if (matchesPattern(content, ['study', 'design', 'inclusion', 'criteria']))
        return 'study_methodology';

    return 'unknown';
}
```

### Add New Classification Pattern

```typescript
// Add to classifyTableContent()
if (matchesPattern(content, ['your', 'keywords', 'here']))
    return 'your_new_type';
```

---

## Testing Agent Prompts

### Test Individual Agent

```javascript
// In browser console
const testTable = {
    id: "test-1",
    pageNum: 1,
    headers: ["Characteristic", "Value"],
    rows: [["Age", "59.2±12.3"], ["Sex", "60.7% male"]],
    extractionMethod: "test"
};

const result = await MedicalAgentBridge.callAgent(
    'PatientDataSpecialistAgent',
    testTable,
    'table'
);

console.log('Agent Result:', result);
```

### Test Full Pipeline

```javascript
// Load PDF and run
await runFullAIPipeline();

// Check enhanced results
const state = AppStateManager.getState();
console.log('Enhanced Tables:', state.extractedTables);
```

---

## Performance Optimization

### 1. Batch Processing
```typescript
// Process multiple tables with same agent
const results = await Promise.all(
    tables.map(table => MedicalAgentBridge.callAgent(agent, table, 'table'))
);
```

### 2. Caching
```typescript
// Cache agent results (add to AgentOrchestrator)
private resultCache = new Map<string, AgentResult>();

private getCacheKey(agentName: string, data: any): string {
    return `${agentName}:${data.id}`;
}
```

### 3. Selective Processing
```typescript
// Only process high-confidence geometric extractions
if (table.structureConfidence > 0.9) {
    await enhanceWithAgents(table);
}
```

---

## Troubleshooting

### Low Confidence Scores

**Problem:** Agents returning <0.85 confidence

**Solutions:**
1. Check table structure (clean headers, aligned data)
2. Review prompts for clarity
3. Add more specific extraction instructions
4. Increase temperature for more creativity (if appropriate)

### JSON Parsing Errors

**Problem:** `Failed to parse response as JSON`

**Solutions:**
1. Verify `responseMimeType: "application/json"` is set
2. Add retry logic with exponential backoff
3. Fall back to text parsing if JSON fails

### Rate Limiting

**Problem:** Too many API calls

**Solutions:**
1. Implement request queuing
2. Add delay between calls
3. Batch similar requests
4. Cache results aggressively

---

## Best Practices

✅ **DO:**
- Use specific, detailed prompts
- Include expected output formats
- Test with diverse data types
- Monitor confidence scores
- Log all agent calls for debugging

❌ **DON'T:**
- Make assumptions about data format
- Skip error handling
- Ignore low confidence results
- Process without validation
- Hardcode thresholds (make configurable)

---

**Last Updated:** November 15, 2025
**Maintainer:** Clinical Extractor Team
**Status:** Production Ready

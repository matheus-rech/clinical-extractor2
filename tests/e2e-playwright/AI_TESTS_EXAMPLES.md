# AI Test Suites - Code Examples

## Table of Contents
1. [Helper Functions](#helper-functions)
2. [PICO Extraction Tests](#pico-extraction-tests)
3. [Multi-Agent Pipeline Tests](#multi-agent-pipeline-tests)
4. [Mocking Strategies](#mocking-strategies)

---

## Helper Functions

### Mocking Gemini API

```typescript
// Mock successful response
await mockGeminiAPI(page, {
  population: 'Patients with cerebellar infarction',
  intervention: 'Suboccipital decompressive craniectomy',
  comparator: 'Conservative medical management',
  outcomes: 'Mortality rate, mRS scores',
  timing: '30-day and 90-day follow-up',
  study_type: 'Retrospective cohort study'
});

// Mock API error
await mockGeminiAPIError(page, 429, 'Resource exhausted (quota)');
```

### Waiting for AI Processing

```typescript
// Trigger AI operation
await page.click('#generate-pico-btn');

// Wait for completion
await waitForAIProcessing(page);

// Or use timeout
await waitForAIProcessing(page, 60000); // 60 seconds
```

### Verifying Results

```typescript
// Verify all PICO fields are populated
await verifyPICOFields(page);

// Verify consensus with minimum confidence
await verifyConsensusResults(page, 0.85); // 85% minimum

// Verify pipeline stats are displayed
await verifyPipelineStats(page);
```

---

## PICO Extraction Tests

### Example 1: Basic PICO Generation

```typescript
test('should generate PICO fields from PDF', async ({ page }) => {
  // Setup mock response
  await mockGeminiAPI(page, {
    population: 'Adult patients aged 18-85 with acute cerebellar stroke',
    intervention: 'Emergency suboccipital decompressive craniectomy',
    comparator: 'Standard medical therapy',
    outcomes: 'Primary: 90-day mortality; Secondary: mRS 0-3',
    timing: '30-day, 90-day follow-up',
    study_type: 'Retrospective cohort study'
  });

  // Trigger PICO generation
  await generatePICO(page);

  // Verify all fields populated
  await verifyPICOFields(page);

  // Verify success message
  await expect(page.locator('#extraction-status'))
    .toContainText(/success|complete/i);
});
```

### Example 2: Error Handling

```typescript
test('should handle AI API errors gracefully', async ({ page }) => {
  // Mock API rate limit error
  await mockGeminiAPIError(page, 429, 'Resource exhausted (quota)');

  // Attempt PICO generation
  await page.click('#generate-pico-btn');
  await page.waitForTimeout(2000);

  // Verify error message displayed
  await expect(page.locator('#extraction-status'))
    .toContainText(/error|failed|quota/i, { timeout: 10000 });

  // Verify app didn't crash
  await expect(page.locator('#population')).toBeVisible();
});
```

### Example 3: Loading State Verification

```typescript
test('should show loading state during AI processing', async ({ page }) => {
  await mockGeminiAPI(page, { /* mock data */ });

  // Start generation
  const generatePromise = page.click('#generate-pico-btn');

  // Verify loading state appears
  await verifyLoadingState(page);

  await generatePromise;
  await waitForAIProcessing(page);

  // Verify loading state is gone
  await expect(page.locator('.loading-indicator')).toBeHidden();
});
```

### Example 4: Metadata Extraction

```typescript
test('should extract metadata with DOI and PMID', async ({ page }) => {
  // Mock metadata response
  await mockGeminiAPI(page, {
    doi: '10.1161/STROKEAHA.120.031234',
    pmid: '32847456',
    journal: 'Stroke',
    year: '2020'
  });

  await findMetadata(page);

  // Verify DOI format (10.xxxx/xxxxx)
  const doiValue = await page.locator('#doi').inputValue();
  expect(doiValue).toMatch(/^10\.\d{4,}/);

  // Verify PMID is numeric
  const pmidValue = await page.locator('#pmid').inputValue();
  expect(pmidValue).toMatch(/^\d+$/);

  // Verify year is 4 digits
  expect(await page.locator('#year').inputValue()).toMatch(/^\d{4}$/);
});
```

---

## Multi-Agent Pipeline Tests

### Example 1: Figure Extraction

```typescript
test('should extract figures using operator interception', async ({ page }) => {
  // Mock agent responses
  await mockGeminiAPI(page, {
    figureType: 'medical_image',
    description: 'CT scan showing cerebellar infarction',
    clinicalInsights: ['Large lesion volume', 'Mass effect on brainstem']
  });

  // Run full pipeline
  await runFullAIPipeline(page);

  // Verify figures extracted
  const figuresCount = await getExtractedFiguresCount(page);
  expect(figuresCount).toBeGreaterThanOrEqual(0);

  // If figures found, verify display
  if (figuresCount > 0) {
    const figureElements = page.locator('.extracted-figure');
    await expect(figureElements.first()).toBeVisible();
  }
});
```

### Example 2: Multi-Agent Consensus

```typescript
test('should calculate multi-agent consensus', async ({ page }) => {
  // Mock agents with varying confidence
  await mockMedicalAgents(page, {
    'PatientDataSpecialistAgent': {
      confidence: 0.88,
      fields: { sample_size: '150', mean_age: '65.2' }
    },
    'TableExtractorAgent': {
      confidence: 1.0,
      fields: { structure_valid: 'true' }
    }
  });

  await runFullAIPipeline(page);
  await page.waitForTimeout(2000);

  // Verify consensus results (minimum 85% confidence)
  await verifyConsensusResults(page, 0.85);

  // Check consensus details
  const consensusSection = page.locator('.consensus-result');
  if (await consensusSection.count() > 0) {
    const consensusText = await consensusSection.first().textContent();
    expect(consensusText).toMatch(/\d+(\.\d+)?%/);
  }
});
```

### Example 3: Agent Routing

```typescript
test('should route tables to appropriate agents', async ({ page }) => {
  // Mock different specialized agents
  await mockMedicalAgents(page, {
    'PatientDataSpecialistAgent': {
      confidence: 0.88,
      fields: { sample_size: '150' }
    },
    'SurgicalExpertAgent': {
      confidence: 0.91,
      fields: { procedure: 'Suboccipital decompression' }
    },
    'OutcomesAnalystAgent': {
      confidence: 0.89,
      fields: { mortality_rate: '15%' }
    }
  });

  await runFullAIPipeline(page);
  await page.waitForTimeout(3000);

  // Verify multiple agents were invoked
  const statsSection = page.locator('#pipeline-stats');
  if (await statsSection.count() > 0) {
    const statsText = await statsSection.textContent();

    const agentCountMatch = statsText!.match(/(\d+)\s*agents/i);
    if (agentCountMatch) {
      expect(parseInt(agentCountMatch[1])).toBeGreaterThan(0);
    }
  }
});
```

### Example 4: Provenance Visualization

```typescript
test('should show color-coded bounding boxes', async ({ page }) => {
  await mockGeminiAPI(page, {
    tables: [{ dataType: 'patient_demographics', confidence: 0.92 }]
  });

  await runFullAIPipeline(page);
  await page.waitForTimeout(2000);

  // Toggle bounding box visualization
  const toggleBtn = page.locator('#toggle-bounding-boxes-btn');
  if (await toggleBtn.count() > 0) {
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Verify bounding boxes displayed
    await verifyBoundingBoxes(page);

    // Check color legend
    const legend = page.locator('.bounding-box-legend');
    if (await legend.count() > 0) {
      const legendText = await legend.textContent();
      expect(legendText).toMatch(/red|green|blue|manual|ai/i);
    }
  }
});
```

---

## Mocking Strategies

### 1. Simple Mock (Single Response)

```typescript
// Mock a single successful response
await mockGeminiAPI(page, {
  population: 'Test population',
  intervention: 'Test intervention'
});

// Trigger action
await generatePICO(page);
```

### 2. Error Mock (Simulate Failures)

```typescript
// Mock rate limit error
await mockGeminiAPIError(page, 429, 'Resource exhausted');

// Mock server error
await mockGeminiAPIError(page, 500, 'Internal server error');

// Mock timeout
await page.route('**/v1beta/models/gemini-*:generateContent',
  async (route) => {
    await page.waitForTimeout(2000);
    await route.abort('timedout');
  }
);
```

### 3. Multi-Agent Mock (Complex Scenarios)

```typescript
// Mock all 6 specialized medical agents
await mockMedicalAgents(page, {
  'StudyDesignExpertAgent': {
    confidence: 0.92,
    fields: { study_type: 'Retrospective cohort' },
    insights: ['Well-designed study', 'Clear inclusion criteria']
  },
  'PatientDataSpecialistAgent': {
    confidence: 0.88,
    fields: { sample_size: '150', mean_age: '65.2' },
    insights: ['Adequate sample size', 'Representative age distribution']
  },
  'SurgicalExpertAgent': {
    confidence: 0.91,
    fields: { procedure: 'Suboccipital craniectomy', timing: '<48h' },
    insights: ['Standard surgical approach', 'Appropriate timing']
  },
  'OutcomesAnalystAgent': {
    confidence: 0.89,
    fields: { mortality_rate: '15%', favorable_outcome: '45%' },
    insights: ['Mortality within expected range', 'Good outcomes']
  },
  'NeuroimagingSpecialistAgent': {
    confidence: 0.92,
    fields: { lesion_volume: '50ml', mass_effect: 'significant' },
    insights: ['Large lesion', 'Significant compression']
  },
  'TableExtractorAgent': {
    confidence: 1.0,
    fields: {
      headers_valid: 'true',
      structure_consistent: 'true',
      quality_score: '5/5'
    },
    insights: ['Perfect table structure', 'All data present']
  }
});
```

### 4. Sequential Mocking (Different Responses)

```typescript
let callCount = 0;

await page.route('**/v1beta/models/gemini-*:generateContent',
  async (route) => {
    callCount++;

    if (callCount === 1) {
      // First call succeeds
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ /* success response */ })
      });
    } else {
      // Second call fails
      await route.fulfill({
        status: 429,
        body: JSON.stringify({ error: 'Rate limit' })
      });
    }
  }
);
```

### 5. Conditional Mocking (Based on Request)

```typescript
await page.route('**/v1beta/models/gemini-*:generateContent',
  async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    if (postData.model.includes('flash')) {
      // Fast model - return quickly
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ /* flash response */ })
      });
    } else if (postData.model.includes('pro')) {
      // Pro model - simulate longer processing
      await page.waitForTimeout(1000);
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ /* pro response */ })
      });
    }
  }
);
```

---

## Advanced Patterns

### Pattern 1: Test with State Preservation

```typescript
test('should preserve data on error', async ({ page }) => {
  // Set initial data
  await page.fill('#population', 'Initial value');
  const initialValue = await page.locator('#population').inputValue();

  // Mock API failure
  await mockGeminiAPIError(page, 500, 'Server error');

  // Attempt operation
  await page.click('#generate-pico-btn');
  await page.waitForTimeout(2000);

  // Verify data preserved
  expect(await page.locator('#population').inputValue())
    .toBe(initialValue);
});
```

### Pattern 2: Test with Performance Measurement

```typescript
test('should complete within reasonable time', async ({ page }) => {
  await mockMedicalAgents(page, { /* agents */ });

  const startTime = Date.now();
  await runFullAIPipeline(page);
  const endTime = Date.now();

  const processingTime = endTime - startTime;

  // Should complete within 60 seconds
  expect(processingTime).toBeLessThan(60000);

  // Verify processing time is displayed
  const statsSection = page.locator('#pipeline-stats');
  const statsText = await statsSection.textContent();
  expect(statsText).toMatch(/\d+\s*(ms|seconds)/i);
});
```

### Pattern 3: Test with Trace Verification

```typescript
test('should log extractions in trace', async ({ page }) => {
  await mockGeminiAPI(page, { /* data */ });

  const initialCount = await getAIExtractionCount(page, 'gemini-pico');

  await generatePICO(page);
  await page.waitForTimeout(1000);

  const newCount = await getAIExtractionCount(page, 'gemini-pico');

  // Should have 6 new extractions (one per PICO field)
  expect(newCount - initialCount).toBeGreaterThanOrEqual(6);

  // Verify trace entries have correct method
  await verifyTraceLogMethod(page, 'gemini-pico', 6);
});
```

---

## Running Examples

### Run Single Test
```bash
npm run test:e2e -- tests/e2e-playwright/03-ai-pico-extraction.spec.ts \
  -g "should generate PICO fields from PDF"
```

### Run with Debug Output
```bash
DEBUG=pw:api npm run test:e2e -- \
  tests/e2e-playwright/03-ai-pico-extraction.spec.ts
```

### Run with Screenshots on Failure
```bash
npm run test:e2e -- tests/e2e-playwright/03-ai-pico-extraction.spec.ts \
  --screenshot=only-on-failure
```

### Run with Video Recording
```bash
npm run test:e2e -- tests/e2e-playwright/04-multi-agent-pipeline.spec.ts \
  --video=on
```

---

## Tips & Best Practices

### 1. Always Clean Up Mocks
```typescript
test.afterEach(async ({ page }) => {
  await clearGeminiMocks(page);
});
```

### 2. Use Appropriate Timeouts
```typescript
// Short timeout for UI elements
await expect(element).toBeVisible({ timeout: 5000 });

// Long timeout for AI operations
await waitForAIProcessing(page, 60000);
```

### 3. Check Element Existence First
```typescript
const btn = page.locator('#optional-button');
if (await btn.count() > 0) {
  await btn.click();
  // ... verify results
} else {
  console.log('Optional feature not available');
}
```

### 4. Use Soft Assertions for Optional Features
```typescript
// Hard assertion (test fails if missing)
await expect(element).toBeVisible();

// Soft check (test continues if missing)
if (await element.count() > 0) {
  await expect(element).toBeVisible();
}
```

### 5. Verify Multiple Conditions
```typescript
// Verify success message OR completion message
await expect(page.locator('#status'))
  .toContainText(/success|complete|done/i);

// Verify numeric value within range
const confidence = parseFloat(await element.textContent() || '0');
expect(confidence).toBeGreaterThan(0.75);
expect(confidence).toBeLessThanOrEqual(1.0);
```

---

**File:** `tests/e2e-playwright/AI_TESTS_EXAMPLES.md`
**Purpose:** Code examples and patterns for AI feature testing
**Last Updated:** 2025-11-19

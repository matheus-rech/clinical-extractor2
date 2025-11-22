# Error Handling Implementation

## Overview

This document details the implementation of comprehensive error handling and crash recovery systems for the La Consulta Clinical Data Extractor application.

## Implementation Date

November 16, 2025

## Components Implemented

### 1. Error Boundary System (`src/utils/errorBoundary.ts`)

The error boundary system provides global error handling and crash state preservation.

#### Features

- **Global Error Handler**: Captures all unhandled errors via `window.onerror`
- **Promise Rejection Handler**: Captures unhandled promise rejections
- **Full Stack Trace Logging**: Logs complete error details to console for debugging
- **User-Friendly Error Display**: Shows modal with error information and recovery options
- **Crash State Preservation**: Automatically saves application state to LocalStorage before crash

#### Saved State Data

When an error occurs, the following data is saved to LocalStorage under the key `clinical_extractor_crash_recovery`:

- Timestamp of crash
- Error message and stack trace
- Current PDF document name
- Current page number and zoom scale
- All extractions made
- Current wizard step
- All form field values

#### API Functions

- `initializeErrorBoundary()`: Sets up global error handlers
- `hasCrashRecoveryData()`: Checks if recovery data exists
- `getCrashRecoveryData()`: Retrieves crash recovery data
- `clearCrashRecoveryData()`: Removes recovery data after successful restore
- `triggerCrashStateSave()`: Manually saves crash state (for testing)

### 2. Error Recovery System (`src/utils/errorRecovery.ts`)

The error recovery system handles session restoration after crashes.

#### Features

- **Startup Recovery Check**: Automatically checks for crash data on application load
- **User Prompt**: Displays attractive modal asking user to restore or start fresh
- **Complete State Restoration**: Restores PDF, extractions, and form data
- **Graceful Degradation**: Handles partial recovery failures

#### Recovery Process

1. Check for crash recovery data in LocalStorage
2. If found, display recovery modal with crash details
3. If user accepts:
   - Restore application state (page, zoom, document name)
   - Restore all extractions to ExtractionTracker
   - Restore all form field values
   - Update UI with restored data
   - Clear recovery data
4. If user declines:
   - Clear recovery data
   - Start fresh session

#### API Functions

- `checkAndOfferRecovery()`: Main function called on startup
- `triggerManualRecovery()`: Manually trigger recovery (for testing)

### 3. AI Service Retry Logic (`src/services/AIService.ts`)

Enhanced all Gemini API calls with exponential backoff retry logic for rate limiting and server errors.

#### Retry Configuration

```typescript
{
    maxAttempts: 3,
    delays: [2000, 4000, 8000], // 2s, 4s, 8s
    retryableStatusCodes: [429, 500, 502, 503, 504]
}
```

#### Features

- **Automatic Retry**: Retries failed API calls up to 3 times
- **Exponential Backoff**: Delays increase exponentially (2s → 4s → 8s)
- **Smart Error Detection**: Only retries on rate limits (429) and server errors (5xx)
- **User Feedback**: Shows retry status messages to user
- **Non-Retryable Errors**: Immediately fails on client errors (4xx except 429)

#### Functions Enhanced

All 7 AI functions now include retry logic:

1. `generatePICO()` - PICO-T extraction
2. `generateSummary()` - Summary generation
3. `validateFieldWithAI()` - Field validation
4. `findMetadata()` - Metadata search with Google Search
5. `handleExtractTables()` - Table extraction
6. `handleImageAnalysis()` - Image analysis
7. `handleDeepAnalysis()` - Deep analysis with thinking budget

#### Implementation Details

```typescript
async function retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    context: string = 'API call'
): Promise<T>
```

This wrapper function:
- Executes the provided async function
- Catches errors and checks if they're retryable
- Waits with exponential backoff before retrying
- Shows user-friendly status messages during retries
- Throws error after max attempts exceeded

### 4. Integration with Main Application (`src/main.ts`)

The error handling system is integrated into the main application initialization flow.

#### Initialization Order

1. **Error Boundary** (first, to catch all subsequent errors)
2. Dependencies setup
3. Module initialization
4. PDF.js configuration
5. Event listeners
6. Window API exposure
7. **Crash Recovery Check** (after all modules loaded)
8. Initial status message

#### Exposed Functions

Two new functions are exposed to the window API for testing:

- `window.ClinicalExtractor.triggerCrashStateSave()` - Manually save crash state
- `window.ClinicalExtractor.triggerManualRecovery()` - Manually trigger recovery

## Testing Instructions

### Test 1: Crash Recovery

1. Load a PDF and make some extractions
2. Fill out some form fields
3. Open browser console
4. Run: `window.ClinicalExtractor.triggerCrashStateSave()`
5. Refresh the page
6. Verify recovery modal appears
7. Click "Restore Session"
8. Verify all data is restored correctly

### Test 2: Automatic Crash Detection

1. Load a PDF and make some extractions
2. Open browser console
3. Trigger an error: `throw new Error('Test crash')`
4. Verify error modal appears
5. Refresh the page
6. Verify recovery modal appears
7. Test both "Restore Session" and "Start Fresh" options

### Test 3: AI Service Retry Logic

To test the retry logic, you would need to:

1. Temporarily modify the Gemini API to return 429 errors
2. Trigger any AI function (e.g., Generate PICO)
3. Observe console logs showing retry attempts
4. Verify user sees retry status messages
5. Verify function eventually succeeds or fails after 3 attempts

**Note**: Testing 429 errors in production requires either:
- Hitting actual rate limits (not recommended)
- Using a mock API endpoint
- Modifying the code temporarily to simulate 429 responses

## Security Considerations

### Data Sanitization

All data saved to LocalStorage is sanitized using existing `SecurityUtils`:
- Text inputs are sanitized before storage
- HTML is escaped in error messages
- No sensitive API keys are stored

### LocalStorage Limits

- Browser LocalStorage typically has 5-10MB limit
- Crash recovery data is kept minimal (metadata only, no PDF binary)
- Old recovery data is automatically cleared after successful restore

### Error Information Exposure

- Full stack traces are logged to console (for debugging)
- User-facing error messages are simplified
- Technical details are hidden in collapsible sections

## Performance Impact

### Error Boundary

- Negligible performance impact
- Only activates on actual errors
- No overhead during normal operation

### Crash Recovery Check

- Runs once on startup
- Single LocalStorage read operation
- Async modal display (non-blocking)

### AI Service Retry Logic

- Only activates on API failures
- Adds 2-14 seconds total delay on retries (2s + 4s + 8s)
- No overhead on successful first attempts
- Prevents complete failure on temporary rate limits

## Known Limitations

### PDF Binary Storage

- PDF files are NOT saved to LocalStorage (size constraints)
- Users must re-upload PDF after crash
- All extraction metadata and coordinates are preserved

### Browser Compatibility

- Requires modern browser with LocalStorage support
- Requires ES6+ JavaScript features
- Tested on Chrome, Firefox, Safari, Edge

### Recovery Scope

The recovery system preserves:
- ✅ Form field values
- ✅ Extraction data and coordinates
- ✅ Current page and zoom level
- ✅ Wizard step progress
- ❌ PDF file itself (must re-upload)
- ❌ Temporary UI state (modals, tooltips)
- ❌ Undo/redo history

## Future Enhancements

### Potential Improvements

1. **PDF Caching**: Use IndexedDB to cache PDF files (larger storage)
2. **Partial Recovery**: Allow selective restoration of specific data
3. **Recovery History**: Keep multiple recovery points
4. **Cloud Backup**: Sync recovery data to server
5. **Retry Customization**: Allow users to configure retry behavior
6. **Error Analytics**: Track error patterns for debugging

### Monitoring

Consider adding:
- Error frequency tracking
- Recovery success rate metrics
- Retry attempt statistics
- User recovery acceptance rate

## Dependencies

### New Dependencies

None - implementation uses only existing dependencies:
- AppStateManager (state management)
- ExtractionTracker (data persistence)
- StatusManager (user notifications)
- SecurityUtils (data sanitization)

### Modified Files

1. `src/utils/errorBoundary.ts` (new)
2. `src/utils/errorRecovery.ts` (new)
3. `src/services/AIService.ts` (modified - added retry logic)
4. `src/main.ts` (modified - integrated error handling)

## Conclusion

The error handling implementation provides robust crash recovery and AI service resilience without introducing new dependencies or significant performance overhead. The system gracefully handles unexpected errors while preserving user work and providing clear feedback during recovery operations.

## Support

For issues or questions about the error handling system:
1. Check browser console for detailed error logs
2. Verify LocalStorage is enabled in browser
3. Test with `triggerCrashStateSave()` and `triggerManualRecovery()`
4. Review this documentation for expected behavior

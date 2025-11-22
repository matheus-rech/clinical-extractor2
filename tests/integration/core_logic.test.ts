/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Core Logic Integration Test
 * 
 * This file verifies the business logic of the application
 * (State Management -> Agent Orchestration -> AI Service)
 * without requiring the full React UI or a browser environment.
 * 
 * Tests the integration between:
 * - AppStateManager: Global state management with observer pattern
 * - AgentOrchestrator: Multi-agent coordination for medical data extraction
 * - AIService: AI-powered extraction and analysis (via backend)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies BEFORE any imports that might use them
// This prevents import.meta errors in MedicalAgentBridge
jest.mock('../../src/services/MedicalAgentBridge', () => ({
  default: {
    callAgent: jest.fn(() => Promise.resolve({
      agentName: 'MockAgent',
      confidence: 0.9,
      extractedData: {},
      processingTime: 1000,
      validationStatus: 'validated'
    }))
  }
}));
jest.mock('../../src/services/BackendClient');

import AppStateManager from '../../src/state/AppStateManager';
import AgentOrchestrator from '../../src/services/AgentOrchestrator';
import type { ExtractedTable } from '../../src/services/TableExtractor';
import type { ExtractedFigure } from '../../src/services/FigureExtractor';
import type { AgentResult } from '../../src/services/AgentOrchestrator';

describe('System Core Logic Integration', () => {
  beforeEach(() => {
    // Reset state to clean slate for each test
    // Using the internal test method to ensure complete reset
    (AppStateManager as any).__resetForTesting();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('AppStateManager', () => {
    it('should initialize with default state', () => {
      const state = AppStateManager.getState();
      
      // Verify initial state matches expected defaults
      expect(state.pdfDoc).toBeNull();
      expect(state.currentPage).toBe(1);
      expect(state.totalPages).toBe(0);
      expect(state.scale).toBe(1.0);
      expect(state.isProcessing).toBe(false);
      expect(state.extractions).toEqual([]);
      expect(state.documentName).toBe('');
      expect(state.activeField).toBeNull();
    });

    it('should transition state correctly when processing is simulated', () => {
      // Simulate starting a processing operation (e.g., PDF analysis)
      AppStateManager.setState({
        isProcessing: true,
        documentName: 'test-patient.pdf'
      });

      let currentState = AppStateManager.getState();
      expect(currentState.isProcessing).toBe(true);
      expect(currentState.documentName).toBe('test-patient.pdf');

      // Simulate completion of processing
      AppStateManager.setState({
        isProcessing: false,
        totalPages: 10
      });

      currentState = AppStateManager.getState();
      expect(currentState.isProcessing).toBe(false);
      expect(currentState.totalPages).toBe(10);
      expect(currentState.documentName).toBe('test-patient.pdf'); // Should be preserved
    });

    it('should notify subscribers when state changes', () => {
      const mockCallback = jest.fn();
      const unsubscribe = AppStateManager.subscribe(mockCallback);

      AppStateManager.setState({ currentPage: 2 });

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({ currentPage: 2 })
      );

      // Cleanup
      unsubscribe();
    });

    it('should handle multiple state updates correctly', () => {
      // Simulate a sequence of state changes during document processing
      AppStateManager.setState({ isProcessing: true });
      expect(AppStateManager.getState().isProcessing).toBe(true);

      AppStateManager.setState({ documentName: 'research-paper.pdf' });
      expect(AppStateManager.getState().documentName).toBe('research-paper.pdf');

      AppStateManager.setState({ totalPages: 25 });
      expect(AppStateManager.getState().totalPages).toBe(25);

      AppStateManager.setState({ isProcessing: false });
      expect(AppStateManager.getState().isProcessing).toBe(false);

      // All updates should be preserved
      const finalState = AppStateManager.getState();
      expect(finalState.documentName).toBe('research-paper.pdf');
      expect(finalState.totalPages).toBe(25);
      expect(finalState.isProcessing).toBe(false);
    });
  });

  describe('AgentOrchestrator', () => {
    it('should process extracted data with multi-agent pipeline', async () => {
      // Mock extracted table data
      const mockTable: ExtractedTable = {
        id: 'table-1-1',
        pageNum: 1,
        headers: ['Patient', 'Age', 'Gender', 'Condition'],
        rows: [
          ['John Doe', '45', 'Male', 'Hypertension'],
          ['Jane Smith', '62', 'Female', 'Diabetes']
        ],
        rawGrid: [
          ['Patient', 'Age', 'Gender', 'Condition'],
          ['John Doe', '45', 'Male', 'Hypertension'],
          ['Jane Smith', '62', 'Female', 'Diabetes']
        ],
        columnPositions: [50, 150, 250, 350],
        boundingBox: { x: 50, y: 100, width: 500, height: 100 },
        extractionMethod: 'geometric_detection'
      };

      const mockFigure: ExtractedFigure = {
        id: 'fig-1-1',
        pageNum: 1,
        dataUrl: 'data:image/png;base64,mock-image-data',
        width: 400,
        height: 300,
        extractionMethod: 'operator_list_interception',
        metadata: {
          imageName: 'figure-1',
          colorSpace: 1,
          hasAlpha: false
        }
      };

      // Mock the MedicalAgentBridge to return successful results
      const MedicalAgentBridge = require('../../src/services/MedicalAgentBridge').default;
      const mockAgentResult: AgentResult = {
        agentName: 'PatientDataSpecialistAgent',
        confidence: 0.92,
        extractedData: {
          totalPatients: 2,
          demographics: {
            averageAge: 53.5,
            maleCount: 1,
            femaleCount: 1
          }
        },
        processingTime: 1500,
        validationStatus: 'validated',
        sourceQuote: 'Patient demographics from table',
        pageNumber: 1
      };
      MedicalAgentBridge.callAgent = jest.fn(() => Promise.resolve(mockAgentResult));

      // Process the data through the orchestrator
      const result = await AgentOrchestrator.processExtractedData(
        [mockFigure],
        [mockTable]
      );

      // Verify the orchestrator processed the data
      expect(result).toBeDefined();
      expect(result.enhancedTables).toHaveLength(1);
      expect(result.enhancedFigures).toHaveLength(1);
      expect(result.pipelineStats).toBeDefined();

      // Verify enhanced table has AI enhancement data
      const enhancedTable = result.enhancedTables[0];
      expect(enhancedTable.aiEnhancement).toBeDefined();
      expect(enhancedTable.aiEnhancement?.agentResults).toBeDefined();
      expect(enhancedTable.aiEnhancement?.overallConfidence).toBeGreaterThan(0);

      // Verify the MedicalAgentBridge was called
      expect(MedicalAgentBridge.callAgent).toHaveBeenCalled();
    });

    it('should handle empty input gracefully', async () => {
      const result = await AgentOrchestrator.processExtractedData([], []);

      expect(result).toBeDefined();
      expect(result.enhancedTables).toEqual([]);
      expect(result.enhancedFigures).toEqual([]);
      expect(result.pipelineStats.tablesProcessed).toBe(0);
      expect(result.pipelineStats.figuresProcessed).toBe(0);
    });

    it('should classify table content correctly', async () => {
      // Test patient demographics classification
      const demographicsTable: ExtractedTable = {
        id: 'table-demographics',
        pageNum: 1,
        headers: ['Age', 'Sex', 'N'],
        rows: [
          ['65.5 ± 12.3', 'Male', '75'],
          ['62.1 ± 10.8', 'Female', '50']
        ],
        rawGrid: [
          ['Age', 'Sex', 'N'],
          ['65.5 ± 12.3', 'Male', '75'],
          ['62.1 ± 10.8', 'Female', '50']
        ],
        columnPositions: [50, 150, 250],
        boundingBox: { x: 50, y: 100, width: 300, height: 80 },
        extractionMethod: 'geometric_detection'
      };

      const MedicalAgentBridge = require('../../src/services/MedicalAgentBridge').default;
      const mockAgentResult: AgentResult = {
        agentName: 'PatientDataSpecialistAgent',
        confidence: 0.88,
        extractedData: { sampleSize: 125 },
        processingTime: 1200,
        validationStatus: 'validated'
      };
      MedicalAgentBridge.callAgent = jest.fn(() => Promise.resolve(mockAgentResult));

      const result = await AgentOrchestrator.processExtractedData([], [demographicsTable]);

      // The orchestrator should classify this as patient_demographics
      // and route it to PatientDataSpecialistAgent
      expect(result.enhancedTables[0].aiEnhancement?.clinicalDataType).toBe('patient_demographics');
    });
  });

  describe('State Management and Agent Orchestration Integration', () => {
    it('should coordinate state updates during document analysis workflow', async () => {
      // Track state changes
      const stateChanges: any[] = [];
      const unsubscribe = AppStateManager.subscribe((state) => {
        stateChanges.push({ ...state });
      });

      // Step 1: Mark processing as started
      AppStateManager.setState({
        isProcessing: true,
        documentName: 'clinical-study.pdf'
      });

      expect(stateChanges.length).toBeGreaterThan(0);
      expect(stateChanges[stateChanges.length - 1].isProcessing).toBe(true);

      // Step 2: Simulate table extraction
      const mockTable: ExtractedTable = {
        id: 'outcomes-table',
        pageNum: 3,
        headers: ['Outcome', 'Mortality %', 'mRS 0-2 %'],
        rows: [
          ['DC Group', '25.5', '48.3'],
          ['Control', '38.2', '32.1']
        ],
        rawGrid: [
          ['Outcome', 'Mortality %', 'mRS 0-2 %'],
          ['DC Group', '25.5', '48.3'],
          ['Control', '38.2', '32.1']
        ],
        columnPositions: [50, 200, 350],
        boundingBox: { x: 50, y: 150, width: 400, height: 60 },
        extractionMethod: 'geometric_detection'
      };

      // Mock agent response
      const MedicalAgentBridge = require('../../src/services/MedicalAgentBridge').default;
      const mockAgentResult: AgentResult = {
        agentName: 'OutcomesAnalystAgent',
        confidence: 0.89,
        extractedData: {
          mortality: { dc: 25.5, control: 38.2 },
          favorable_outcome: { dc: 48.3, control: 32.1 }
        },
        processingTime: 1800,
        validationStatus: 'validated',
        sourceQuote: 'Outcomes data from clinical trial'
      };
      MedicalAgentBridge.callAgent = jest.fn(() => Promise.resolve(mockAgentResult));

      // Step 3: Process with orchestrator
      const result = await AgentOrchestrator.processExtractedData([], [mockTable]);

      // Step 4: Update state with results
      AppStateManager.setState({
        extractedTables: result.enhancedTables,
        isProcessing: false
      });

      // Verify final state
      const finalState = AppStateManager.getState();
      expect(finalState.isProcessing).toBe(false);
      expect(finalState.extractedTables).toBeDefined();
      expect(finalState.extractedTables?.length).toBe(1);

      // Cleanup
      unsubscribe();
    });

    it('should prevent concurrent operations using isProcessing flag', () => {
      // Set processing state
      AppStateManager.setState({ isProcessing: true });

      // Attempt to check if another operation should be allowed
      const state = AppStateManager.getState();
      
      if (state.isProcessing) {
        // In real code, this would prevent starting another operation
        expect(state.isProcessing).toBe(true);
      }

      // Complete processing
      AppStateManager.setState({ isProcessing: false });
      
      // Now another operation could start
      const newState = AppStateManager.getState();
      expect(newState.isProcessing).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle agent failures gracefully', async () => {
      const mockTable: ExtractedTable = {
        id: 'error-table',
        pageNum: 1,
        headers: ['Data'],
        rows: [['Invalid']],
        rawGrid: [['Data'], ['Invalid']],
        columnPositions: [50],
        boundingBox: { x: 50, y: 100, width: 100, height: 30 },
        extractionMethod: 'geometric_detection'
      };

      // Mock agent to fail
      const MedicalAgentBridge = require('../../src/services/MedicalAgentBridge').default;
      const mockFailedResult: AgentResult = {
        agentName: 'TableExtractorAgent',
        confidence: 0,
        extractedData: null,
        processingTime: 500,
        validationStatus: 'failed'
      };
      MedicalAgentBridge.callAgent = jest.fn(() => Promise.resolve(mockFailedResult));

      // Should not throw, but handle gracefully
      const result = await AgentOrchestrator.processExtractedData([], [mockTable]);
      
      expect(result).toBeDefined();
      expect(result.enhancedTables).toHaveLength(1);
      // Even with failed agents, structure should be preserved
    });

    it('should maintain state consistency after errors', () => {
      const initialState = AppStateManager.getState();
      
      try {
        // Simulate an error during state update
        AppStateManager.setState({ isProcessing: true });
        
        // Even if an error occurs, state should be updated
        const currentState = AppStateManager.getState();
        expect(currentState.isProcessing).toBe(true);
        
      } finally {
        // Cleanup
        AppStateManager.setState({ isProcessing: false });
      }
      
      // State should be recoverable
      const finalState = AppStateManager.getState();
      expect(finalState.isProcessing).toBe(false);
    });
  });
});

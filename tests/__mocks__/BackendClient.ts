/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mock for BackendClient
 * Prevents actual network requests during testing
 */

const BackendClient = {
    healthCheck: jest.fn().mockResolvedValue(true),

    uploadPDF: jest.fn().mockResolvedValue({
        documentId: 'mock-doc-id-123',
        success: true,
    }),

    getExtractions: jest.fn().mockResolvedValue({
        extractions: [],
        documentId: 'mock-doc-id-123',
    }),

    storeToVectorDB: jest.fn().mockResolvedValue({
        success: true,
        stored: 10,
    }),

    semanticSearch: jest.fn().mockResolvedValue({
        results: [],
        query: 'test query',
    }),

    callAI: jest.fn().mockResolvedValue({
        result: 'mock AI response',
        confidence: 0.95,
    }),
};

export default BackendClient;

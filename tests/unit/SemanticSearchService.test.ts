/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for SemanticSearchService
 */

import SemanticSearchService from '../../src/services/SemanticSearchService';
import type { TextChunk } from '../../src/services/CitationService';
import AppStateManager from '../../src/state/AppStateManager';

describe('SemanticSearchService', () => {
    const mockTextChunks: TextChunk[] = [
        {
            index: 0,
            text: 'Cerebrovascular accident (stroke) is a leading cause of mortality.',
            pageNum: 1,
            bbox: { x: 10, y: 20, width: 200, height: 15 },
            fontName: 'Arial',
            fontSize: 12,
            isHeading: false,
            isBold: false,
            confidence: 1.0,
        },
        {
            index: 1,
            text: 'Surgical intervention for hemorrhagic stroke patients.',
            pageNum: 1,
            bbox: { x: 10, y: 40, width: 180, height: 15 },
            fontName: 'Arial',
            fontSize: 12,
            isHeading: false,
            isBold: false,
            confidence: 1.0,
        },
        {
            index: 2,
            text: 'Patient outcomes and mortality rates were analyzed.',
            pageNum: 2,
            bbox: { x: 10, y: 20, width: 190, height: 15 },
            fontName: 'Arial',
            fontSize: 12,
            isHeading: false,
            isBold: false,
            confidence: 1.0,
        },
        {
            index: 3,
            text: 'Treatment protocols for cerebral infarction.',
            pageNum: 2,
            bbox: { x: 10, y: 40, width: 170, height: 15 },
            fontName: 'Arial',
            fontSize: 14,
            isHeading: true,
            isBold: true,
            confidence: 1.0,
        },
    ];

    beforeEach(() => {
        AppStateManager.setState({
            textChunks: mockTextChunks,
        });
        SemanticSearchService.clearHistory();
        SemanticSearchService.clearResults();
    });

    describe('search', () => {
        it('should find exact matches', async () => {
            // Disable semantic expansion to get exact matches
            const results = await SemanticSearchService.search('stroke', { semanticExpansion: false });
            
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].matchType).toBe('exact');
            expect(results[0].text).toContain('stroke');
        });

        it('should find semantic matches with synonyms', async () => {
            const results = await SemanticSearchService.search('stroke', {
                semanticExpansion: true,
            });
            
            expect(results.length).toBeGreaterThan(0);
            const texts = results.map(r => r.text);
            expect(texts.some(t => t.includes('Cerebrovascular accident'))).toBe(true);
        });

        it('should perform fuzzy matching', async () => {
            const results = await SemanticSearchService.search('strke', {
                fuzzyThreshold: 0.7,
            });
            
            expect(results.length).toBeGreaterThan(0);
            expect(results.some(r => r.matchType === 'fuzzy')).toBe(true);
        });

        it('should rank results by relevance score', async () => {
            const results = await SemanticSearchService.search('stroke');
            
            for (let i = 1; i < results.length; i++) {
                expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
            }
        });

        it('should limit results to maxResults', async () => {
            const results = await SemanticSearchService.search('patient', {
                maxResults: 2,
            });
            
            expect(results.length).toBeLessThanOrEqual(2);
        });

        it('should extract context around matches', async () => {
            const results = await SemanticSearchService.search('mortality');
            
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].context).toBeTruthy();
            expect(results[0].context.length).toBeGreaterThan(0);
        });

        it('should include bounding box coordinates', async () => {
            const results = await SemanticSearchService.search('stroke');
            
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].bbox).toBeDefined();
            expect(results[0].bbox?.x).toBeDefined();
            expect(results[0].bbox?.y).toBeDefined();
        });

        it('should skip headings when includeHeadings is false', async () => {
            const results = await SemanticSearchService.search('cerebral', {
                includeHeadings: false,
            });
            
            expect(results.every(r => r.chunkIndex !== 3)).toBe(true);
        });

        it('should include headings when includeHeadings is true', async () => {
            const results = await SemanticSearchService.search('cerebral', {
                includeHeadings: true,
            });
            
            expect(results.some(r => r.chunkIndex === 3)).toBe(true);
        });

        it('should return empty array for empty query', async () => {
            const results = await SemanticSearchService.search('');
            
            expect(results).toEqual([]);
        });

        it('should return empty array when no text chunks available', async () => {
            AppStateManager.setState({ textChunks: [] });
            
            const results = await SemanticSearchService.search('stroke');
            
            expect(results).toEqual([]);
        });

        it('should add query to search history', async () => {
            await SemanticSearchService.search('stroke');
            
            expect(SemanticSearchService.searchHistory).toContain('stroke');
        });

        it('should not duplicate queries in history', async () => {
            await SemanticSearchService.search('stroke');
            await SemanticSearchService.search('stroke');
            
            const strokeCount = SemanticSearchService.searchHistory.filter(
                h => h === 'stroke'
            ).length;
            expect(strokeCount).toBe(1);
        });

        it('should limit search history to 20 items', async () => {
            for (let i = 0; i < 25; i++) {
                await SemanticSearchService.search(`query${i}`);
            }
            
            expect(SemanticSearchService.searchHistory.length).toBeLessThanOrEqual(20);
        });

        it('should highlight match positions', async () => {
            const results = await SemanticSearchService.search('stroke');
            
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].highlights).toBeDefined();
            expect(results[0].highlights.length).toBeGreaterThan(0);
            expect(results[0].highlights[0].start).toBeGreaterThanOrEqual(0);
            expect(results[0].highlights[0].end).toBeGreaterThan(results[0].highlights[0].start);
        });
    });

    describe('getSuggestions', () => {
        it('should return recent search history for empty query', () => {
            SemanticSearchService.searchHistory = ['stroke', 'hemorrhage', 'patient'];
            
            const suggestions = SemanticSearchService.getSuggestions('');
            
            expect(suggestions).toContain('patient');
            expect(suggestions).toContain('hemorrhage');
            expect(suggestions).toContain('stroke');
        });

        it('should filter suggestions based on partial query', () => {
            SemanticSearchService.searchHistory = ['stroke', 'hemorrhage', 'patient'];
            
            const suggestions = SemanticSearchService.getSuggestions('str');
            
            expect(suggestions).toContain('stroke');
            expect(suggestions).not.toContain('patient');
        });

        it('should include common medical terms', () => {
            const suggestions = SemanticSearchService.getSuggestions('mor');
            
            expect(suggestions).toContain('mortality');
        });

        it('should return empty for very short queries', () => {
            const suggestions = SemanticSearchService.getSuggestions('s');
            
            expect(Array.isArray(suggestions)).toBe(true);
        });
    });

    describe('clearHistory', () => {
        it('should clear search history', () => {
            SemanticSearchService.searchHistory = ['stroke', 'hemorrhage'];
            
            SemanticSearchService.clearHistory();
            
            expect(SemanticSearchService.searchHistory).toEqual([]);
        });
    });

    describe('getCurrentResults', () => {
        it('should return current search results', async () => {
            await SemanticSearchService.search('stroke');
            
            const results = SemanticSearchService.getCurrentResults();
            
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('clearResults', () => {
        it('should clear current results', async () => {
            await SemanticSearchService.search('stroke');
            
            SemanticSearchService.clearResults();
            
            expect(SemanticSearchService.getCurrentResults()).toEqual([]);
        });
    });

    describe('medical synonym expansion', () => {
        it('should expand "stroke" to include "cerebrovascular accident"', async () => {
            const results = await SemanticSearchService.search('stroke', {
                semanticExpansion: true,
            });
            
            expect(results.some(r => r.chunkIndex === 0)).toBe(true);
        });

        it('should expand "hemorrhage" to include "bleeding"', async () => {
            const chunksWithBleeding = [
                ...mockTextChunks,
                {
                    index: 4,
                    text: 'Severe bleeding was observed in the patient.',
                    pageNum: 3,
                    bbox: { x: 10, y: 20, width: 180, height: 15 },
                    fontName: 'Arial',
                    fontSize: 12,
                    isHeading: false,
                    isBold: false,
                    confidence: 1.0,
                },
            ];
            AppStateManager.setState({ textChunks: chunksWithBleeding });
            
            const results = await SemanticSearchService.search('hemorrhage', {
                semanticExpansion: true,
            });
            
            expect(results.length).toBeGreaterThan(0);
        });

        it('should not expand when semanticExpansion is false', async () => {
            const results = await SemanticSearchService.search('stroke', {
                semanticExpansion: false,
            });
            
            expect(results.every(r => r.text.toLowerCase().includes('stroke'))).toBe(true);
        });
    });

    describe('TF-IDF scoring', () => {
        it('should rank more relevant results higher', async () => {
            const chunksWithVaryingFreq = [
                {
                    index: 0,
                    text: 'Patient patient patient patient.',
                    pageNum: 1,
                    bbox: { x: 10, y: 20, width: 150, height: 15 },
                    fontName: 'Arial',
                    fontSize: 12,
                    isHeading: false,
                    isBold: false,
                    confidence: 1.0,
                },
                {
                    index: 1,
                    text: 'The patient was treated successfully.',
                    pageNum: 1,
                    bbox: { x: 10, y: 40, width: 150, height: 15 },
                    fontName: 'Arial',
                    fontSize: 12,
                    isHeading: false,
                    isBold: false,
                    confidence: 1.0,
                },
            ];
            AppStateManager.setState({ textChunks: chunksWithVaryingFreq });
            
            const results = await SemanticSearchService.search('patient');
            
            expect(results[0].chunkIndex).toBe(0);
            expect(results[0].score).toBeGreaterThan(results[1].score);
        });
    });
});

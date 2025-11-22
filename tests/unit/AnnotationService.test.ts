/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for AnnotationService
 */

import AnnotationService from '../../src/services/AnnotationService';
import type { Annotation, AnnotationType, AnnotationColor } from '../../src/services/AnnotationService';

// Helper to reset AnnotationService state
function resetAnnotationService() {
    AnnotationService.annotations = [];
    AnnotationService.layers.clear();
    AnnotationService.currentTool = 'highlight';
    AnnotationService.currentColor = 'yellow';
    AnnotationService.currentAuthor = 'Anonymous';
}

describe('AnnotationService', () => {
    let mockContainer: HTMLElement;

    beforeEach(() => {
        resetAnnotationService();

        mockContainer = document.createElement('div');
        mockContainer.style.width = '800px';
        mockContainer.style.height = '1000px';
        // Set clientWidth/clientHeight for canvas sizing
        Object.defineProperty(mockContainer, 'clientWidth', { value: 800, writable: true });
        Object.defineProperty(mockContainer, 'clientHeight', { value: 1000, writable: true });
        document.body.appendChild(mockContainer);
    });

    afterEach(() => {
        AnnotationService.cleanup();
        if (mockContainer.parentNode) {
            mockContainer.parentNode.removeChild(mockContainer);
        }
    });

    describe('initializeLayer', () => {
        it('should create annotation layer canvas', () => {
            const canvas = AnnotationService.initializeLayer(1, mockContainer);
            
            expect(canvas).toBeDefined();
            expect(canvas.tagName).toBe('CANVAS');
            expect(canvas.className).toBe('annotation-layer');
        });

        it('should position canvas absolutely', () => {
            const canvas = AnnotationService.initializeLayer(1, mockContainer);
            
            expect(canvas.style.position).toBe('absolute');
            expect(canvas.style.top).toBe('0px');
            expect(canvas.style.left).toBe('0px');
        });

        it('should set canvas size to match container', () => {
            const canvas = AnnotationService.initializeLayer(1, mockContainer);
            
            expect(canvas.width).toBeGreaterThan(0);
            expect(canvas.height).toBeGreaterThan(0);
        });

        it('should append canvas to container', () => {
            AnnotationService.initializeLayer(1, mockContainer);
            
            const canvasInContainer = mockContainer.querySelector('canvas');
            expect(canvasInContainer).toBeDefined();
        });

        it('should store layer in layers map', () => {
            AnnotationService.initializeLayer(1, mockContainer);
            
            expect(AnnotationService.layers.has(1)).toBe(true);
        });

        it('should return existing layer if already initialized', () => {
            const canvas1 = AnnotationService.initializeLayer(1, mockContainer);
            const canvas2 = AnnotationService.initializeLayer(1, mockContainer);
            
            expect(canvas1).toBe(canvas2);
        });
    });

    describe('createHighlight', () => {
        beforeEach(() => {
            AnnotationService.initializeLayer(1, mockContainer);
        });

        it('should create highlight annotation', () => {
            const annotation = AnnotationService.createHighlight(1, 10, 20, 100, 15, 'test text');
            
            expect(annotation.type).toBe('highlight');
            expect(annotation.pageNum).toBe(1);
            expect(annotation.coordinates.x).toBe(10);
            expect(annotation.coordinates.y).toBe(20);
            expect(annotation.coordinates.width).toBe(100);
            expect(annotation.coordinates.height).toBe(15);
            expect(annotation.text).toBe('test text');
        });

        it('should assign unique ID', () => {
            const ann1 = AnnotationService.createHighlight(1, 10, 20, 100, 15);
            const ann2 = AnnotationService.createHighlight(1, 10, 20, 100, 15);
            
            expect(ann1.id).not.toBe(ann2.id);
        });

        it('should use current color', () => {
            AnnotationService.setColor('red');
            const annotation = AnnotationService.createHighlight(1, 10, 20, 100, 15);
            
            expect(annotation.color).toBe('red');
        });

        it('should set timestamp', () => {
            const before = Date.now();
            const annotation = AnnotationService.createHighlight(1, 10, 20, 100, 15);
            const after = Date.now();
            
            expect(annotation.timestamp).toBeGreaterThanOrEqual(before);
            expect(annotation.timestamp).toBeLessThanOrEqual(after);
        });

        it('should set author', () => {
            AnnotationService.setAuthor('John Doe');
            const annotation = AnnotationService.createHighlight(1, 10, 20, 100, 15);
            
            expect(annotation.author).toBe('John Doe');
        });

        it('should add annotation to annotations list', () => {
            const annotation = AnnotationService.createHighlight(1, 10, 20, 100, 15);
            
            expect(AnnotationService.annotations).toContain(annotation);
        });

        it('should add annotation to layer', () => {
            const annotation = AnnotationService.createHighlight(1, 10, 20, 100, 15);
            const layer = AnnotationService.layers.get(1);
            
            expect(layer?.annotations).toContain(annotation);
        });
    });

    describe('createNote', () => {
        beforeEach(() => {
            AnnotationService.initializeLayer(1, mockContainer);
        });

        it('should create note annotation', () => {
            const annotation = AnnotationService.createNote(1, 50, 60, 'Important note');
            
            expect(annotation.type).toBe('note');
            expect(annotation.pageNum).toBe(1);
            expect(annotation.coordinates.x).toBe(50);
            expect(annotation.coordinates.y).toBe(60);
            expect(annotation.comment).toBe('Important note');
        });

        it('should set default note size', () => {
            const annotation = AnnotationService.createNote(1, 50, 60, 'Note');
            
            expect(annotation.coordinates.width).toBe(30);
            expect(annotation.coordinates.height).toBe(30);
        });
    });

    describe('createShape', () => {
        beforeEach(() => {
            AnnotationService.initializeLayer(1, mockContainer);
        });

        it('should create rectangle annotation', () => {
            const annotation = AnnotationService.createShape('rectangle', 1, 10, 20, 110, 120);
            
            expect(annotation.type).toBe('rectangle');
            expect(annotation.coordinates.x).toBe(10);
            expect(annotation.coordinates.y).toBe(20);
            expect(annotation.coordinates.x2).toBe(110);
            expect(annotation.coordinates.y2).toBe(120);
        });

        it('should create circle annotation', () => {
            const annotation = AnnotationService.createShape('circle', 1, 10, 20, 110, 120);
            
            expect(annotation.type).toBe('circle');
        });

        it('should create arrow annotation', () => {
            const annotation = AnnotationService.createShape('arrow', 1, 10, 20, 110, 120);
            
            expect(annotation.type).toBe('arrow');
        });
    });

    describe('createFreehand', () => {
        beforeEach(() => {
            AnnotationService.initializeLayer(1, mockContainer);
        });

        it('should create freehand annotation', () => {
            const paths = [
                [{ x: 10, y: 20 }, { x: 15, y: 25 }, { x: 20, y: 30 }],
                [{ x: 30, y: 40 }, { x: 35, y: 45 }],
            ];
            
            const annotation = AnnotationService.createFreehand(1, paths);
            
            expect(annotation.type).toBe('freehand');
            expect(annotation.paths).toEqual(paths);
        });

        it('should calculate bounding box from paths', () => {
            const paths = [
                [{ x: 10, y: 20 }, { x: 50, y: 60 }],
            ];
            
            const annotation = AnnotationService.createFreehand(1, paths);
            
            expect(annotation.coordinates.x).toBe(10);
            expect(annotation.coordinates.y).toBe(20);
            expect(annotation.coordinates.width).toBe(40);
            expect(annotation.coordinates.height).toBe(40);
        });
    });

    describe('getAnnotationsForPage', () => {
        beforeEach(() => {
            AnnotationService.initializeLayer(1, mockContainer);
            AnnotationService.initializeLayer(2, mockContainer);
        });

        it('should return annotations for specific page', () => {
            AnnotationService.createHighlight(1, 10, 20, 100, 15);
            AnnotationService.createHighlight(1, 30, 40, 100, 15);
            AnnotationService.createHighlight(2, 10, 20, 100, 15);
            
            const page1Annotations = AnnotationService.getAnnotationsForPage(1);
            
            expect(page1Annotations.length).toBe(2);
            expect(page1Annotations.every(a => a.pageNum === 1)).toBe(true);
        });

        it('should return empty array for page with no annotations', () => {
            const annotations = AnnotationService.getAnnotationsForPage(5);
            
            expect(annotations).toEqual([]);
        });
    });

    describe('getAnnotationById', () => {
        beforeEach(() => {
            AnnotationService.initializeLayer(1, mockContainer);
        });

        it('should return annotation by ID', () => {
            const annotation = AnnotationService.createHighlight(1, 10, 20, 100, 15);
            
            const found = AnnotationService.getAnnotationById(annotation.id);
            
            expect(found).toBe(annotation);
        });

        it('should return null for non-existent ID', () => {
            const found = AnnotationService.getAnnotationById('non-existent');
            
            expect(found).toBeNull();
        });
    });

    describe('updateAnnotation', () => {
        beforeEach(() => {
            AnnotationService.initializeLayer(1, mockContainer);
        });

        it('should update annotation properties', () => {
            const annotation = AnnotationService.createHighlight(1, 10, 20, 100, 15);
            
            const success = AnnotationService.updateAnnotation(annotation.id, {
                comment: 'Updated comment',
                color: 'blue',
            });
            
            expect(success).toBe(true);
            
            const updated = AnnotationService.getAnnotationById(annotation.id);
            expect(updated?.comment).toBe('Updated comment');
            expect(updated?.color).toBe('blue');
        });

        it('should return false for non-existent annotation', () => {
            const success = AnnotationService.updateAnnotation('non-existent', {
                comment: 'Test',
            });
            
            expect(success).toBe(false);
        });
    });

    describe('deleteAnnotation', () => {
        beforeEach(() => {
            AnnotationService.initializeLayer(1, mockContainer);
        });

        it('should delete annotation', () => {
            const annotation = AnnotationService.createHighlight(1, 10, 20, 100, 15);
            
            const success = AnnotationService.deleteAnnotation(annotation.id);
            
            expect(success).toBe(true);
            expect(AnnotationService.getAnnotationById(annotation.id)).toBeNull();
        });

        it('should remove annotation from layer', () => {
            const annotation = AnnotationService.createHighlight(1, 10, 20, 100, 15);
            
            AnnotationService.deleteAnnotation(annotation.id);
            
            const layer = AnnotationService.layers.get(1);
            expect(layer?.annotations.find(a => a.id === annotation.id)).toBeUndefined();
        });

        it('should return false for non-existent annotation', () => {
            const success = AnnotationService.deleteAnnotation('non-existent');
            
            expect(success).toBe(false);
        });
    });

    describe('clearAllAnnotations', () => {
        beforeEach(() => {
            AnnotationService.initializeLayer(1, mockContainer);
            AnnotationService.initializeLayer(2, mockContainer);
        });

        it('should clear all annotations', () => {
            AnnotationService.createHighlight(1, 10, 20, 100, 15);
            AnnotationService.createHighlight(2, 10, 20, 100, 15);
            
            AnnotationService.clearAllAnnotations();
            
            expect(AnnotationService.annotations.length).toBe(0);
        });

        it('should clear all layer annotations', () => {
            AnnotationService.createHighlight(1, 10, 20, 100, 15);
            
            AnnotationService.clearAllAnnotations();
            
            const layer = AnnotationService.layers.get(1);
            expect(layer?.annotations.length).toBe(0);
        });
    });

    describe('exportAnnotations', () => {
        beforeEach(() => {
            AnnotationService.initializeLayer(1, mockContainer);
        });

        it('should export annotations as JSON', () => {
            AnnotationService.createHighlight(1, 10, 20, 100, 15, 'test');
            
            const json = AnnotationService.exportAnnotations();
            const data = JSON.parse(json);
            
            expect(data.version).toBe('1.0');
            expect(data.annotations).toBeDefined();
            expect(data.annotations.length).toBe(1);
        });

        it('should include export date', () => {
            const json = AnnotationService.exportAnnotations();
            const data = JSON.parse(json);
            
            expect(data.exportDate).toBeDefined();
            expect(new Date(data.exportDate).getTime()).toBeGreaterThan(0);
        });
    });

    describe('importAnnotations', () => {
        beforeEach(() => {
            AnnotationService.initializeLayer(1, mockContainer);
        });

        it('should import annotations from JSON', () => {
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                documentName: 'test.pdf',
                annotations: [
                    {
                        id: 'test-1',
                        type: 'highlight',
                        pageNum: 1,
                        color: 'yellow',
                        coordinates: { x: 10, y: 20, width: 100, height: 15 },
                        timestamp: Date.now(),
                        author: 'Test User',
                    },
                ],
            };
            
            const success = AnnotationService.importAnnotations(JSON.stringify(exportData));
            
            expect(success).toBe(true);
            expect(AnnotationService.annotations.length).toBe(1);
            expect(AnnotationService.annotations[0].id).toBe('test-1');
        });

        it('should return false for invalid JSON', () => {
            const success = AnnotationService.importAnnotations('invalid json');
            
            expect(success).toBe(false);
        });

        it('should return false for invalid data format', () => {
            const success = AnnotationService.importAnnotations('{"invalid": true}');
            
            expect(success).toBe(false);
        });
    });

    describe('setTool', () => {
        it('should set current tool', () => {
            AnnotationService.setTool('rectangle');
            
            expect(AnnotationService.currentTool).toBe('rectangle');
        });
    });

    describe('setColor', () => {
        it('should set current color', () => {
            AnnotationService.setColor('blue');
            
            expect(AnnotationService.currentColor).toBe('blue');
        });
    });

    describe('setAuthor', () => {
        it('should set author name', () => {
            AnnotationService.setAuthor('Jane Doe');
            
            expect(AnnotationService.currentAuthor).toBe('Jane Doe');
        });
    });

    describe('cleanup', () => {
        it('should remove all canvas elements', () => {
            AnnotationService.initializeLayer(1, mockContainer);
            AnnotationService.initializeLayer(2, mockContainer);
            
            AnnotationService.cleanup();
            
            const canvases = mockContainer.querySelectorAll('canvas');
            expect(canvases.length).toBe(0);
        });

        it('should clear layers map', () => {
            AnnotationService.initializeLayer(1, mockContainer);
            
            AnnotationService.cleanup();
            
            expect(AnnotationService.layers.size).toBe(0);
        });
    });

    describe('renderAnnotations', () => {
        beforeEach(() => {
            AnnotationService.initializeLayer(1, mockContainer);
        });

        it('should render all annotations on page', () => {
            AnnotationService.createHighlight(1, 10, 20, 100, 15);
            AnnotationService.createNote(1, 50, 60, 'Note');
            
            expect(() => {
                AnnotationService.renderAnnotations(1);
            }).not.toThrow();
        });

        it('should warn for non-existent layer', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            AnnotationService.renderAnnotations(999);
            
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});

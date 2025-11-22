/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Citation Provenance Service
 *
 * Complete implementation of sentence-level citation tracking with coordinates.
 * Based on Phase 3 Citation Provenance Implementation Guide.
 *
 * Key Features:
 * - Sequential sentence indexing [0], [1], [2]...
 * - Coordinate tracking for every sentence
 * - Citation map for instant lookup
 * - AI-compatible indexed document format
 * - Citation parsing from AI responses
 * - Visual highlighting support
 *
 * This enables Nobel-Prize-worthy reproducible medical research! 🏆
 */

import type { PDFDocumentProxy, PDFPageProxy } from '../pdf/PDFLoader';

// ==================== DEPENDENCY INJECTION ====================

/**
 * Dependencies for CitationService
 * Injected to avoid circular dependencies and accessing global window object
 */
interface Dependencies {
    getCanvas: () => HTMLCanvasElement | null;
    getScale: () => number;
}

/**
 * Internal dependencies storage
 */
let dependencies: Dependencies | null = null;

/**
 * Set dependencies for CitationService
 * Should be called during app initialization
 */
export const setDependencies = (deps: Dependencies): void => {
    dependencies = deps;
};

// ==================== TYPE DEFINITIONS ====================

/**
 * Bounding box coordinates in PDF space
 */
export interface BoundingBox {
    x: number;           // Left edge (PDF coordinates)
    y: number;           // Top edge (PDF coordinates)
    width: number;       // Width
    height: number;      // Height
}

/**
 * Raw text item from PDF.js with coordinates
 */
interface RawTextItem {
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
    transform: number[];  // PDF.js transform matrix [scaleX, skewY, skewX, scaleY, x, y]
    fontName: string;
}

/**
 * Text chunk with full provenance metadata
 */
export interface TextChunk {
    index: number;              // Global sequential index
    text: string;               // Sentence text
    pageNum: number;            // Which page (1-indexed)
    bbox: BoundingBox;          // Exact coordinates
    fontName: string;           // Font metadata
    fontSize: number;           // Estimated font size
    isHeading: boolean;         // Likely a heading
    isBold: boolean;            // Likely bold text
    confidence: number;         // Extraction quality (0-1)
}

/**
 * Citation map entry for fast lookup
 */
export interface Citation {
    index: number;              // Same as TextChunk.index
    pageNum: number;            // Page number
    sentence: string;           // Sentence text
    bbox: BoundingBox;          // Coordinates
    confidence: number;         // Extraction confidence
}

/**
 * Citation map: index → Citation
 */
export interface CitationMap {
    [index: number]: Citation;
}

/**
 * AI response with citation metadata
 */
export interface AIResponse {
    answer: string;                     // The AI's answer
    citationIndices: number[];          // Which chunks support the answer
    sourceQuote: string;                // Most relevant quote
    pageNumber: number;                 // Primary source page
    confidence?: number;                // AI confidence (0-1)
    referencedFigures?: string[];       // Referenced figures
    referencedTables?: string[];        // Referenced tables
}

// ==================== TEXT EXTRACTION WITH COORDINATES ====================

/**
 * Extract raw text items with coordinates from a PDF page
 */
const extractRawTextItems = async (
    page: PDFPageProxy,
    pageNum: number
): Promise<RawTextItem[]> => {
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    return (textContent.items as any[]).map((item: any) => ({
        str: item.str,
        x: item.transform[4],
        y: viewport.height - item.transform[5],  // Flip Y-axis (PDF coords start bottom-left)
        width: item.width,
        height: item.height,
        transform: item.transform,
        fontName: item.fontName || 'unknown',
    }));
};

/**
 * Calculate bounding box encompassing multiple text items
 */
const calculateBoundingBox = (items: RawTextItem[]): BoundingBox => {
    if (items.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    const xs = items.map(i => i.x);
    const ys = items.map(i => i.y);
    const rights = items.map(i => i.x + i.width);
    const bottoms = items.map(i => i.y + i.height);

    return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...rights) - Math.min(...xs),
        height: Math.max(...bottoms) - Math.min(...ys),
    };
};

/**
 * Estimate font size from PDF.js transform matrix
 * Transform matrix: [scaleX, skewY, skewX, scaleY, translateX, translateY]
 */
const estimateFontSize = (item: RawTextItem): number => {
    // Font size ≈ sqrt(scaleX² + skewY²)
    return Math.sqrt(item.transform[0] ** 2 + item.transform[1] ** 2);
};

// ==================== SENTENCE SEGMENTATION ====================

/**
 * Segment raw text items into sentences with coordinate tracking
 */
const segmentIntoSentences = (
    rawItems: RawTextItem[],
    pageNum: number
): TextChunk[] => {
    const chunks: TextChunk[] = [];

    if (rawItems.length === 0) return chunks;

    // Combine all text items
    const pageText = rawItems.map(item => item.str).join(' ');

    // Split into sentences using multiple delimiters
    // Matches: sentence + punctuation OR sentence without punctuation at end
    const sentences = pageText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];

    // Track position in raw items
    let rawItemIndex = 0;
    let accumulatedChars = 0;

    sentences.forEach(sentence => {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) return;

        // Find which raw items correspond to this sentence
        const sentenceItems: RawTextItem[] = [];
        const sentenceLength = trimmedSentence.length;
        let collectedChars = 0;

        // Collect raw items until we have the full sentence
        while (collectedChars < sentenceLength && rawItemIndex < rawItems.length) {
            const item = rawItems[rawItemIndex];
            sentenceItems.push(item);
            collectedChars += item.str.length + 1; // +1 for space
            rawItemIndex++;
        }

        if (sentenceItems.length > 0) {
            // Calculate bounding box for entire sentence
            const bbox = calculateBoundingBox(sentenceItems);

            // Get font properties from first item (representative)
            const firstItem = sentenceItems[0];
            const fontSize = estimateFontSize(firstItem);
            const fontName = firstItem.fontName.toLowerCase();

            chunks.push({
                index: 0,  // Will be set globally later
                text: trimmedSentence,
                pageNum,
                bbox,
                fontName: firstItem.fontName,
                fontSize,
                isHeading: fontSize > 14 || fontName.includes('heading') || fontName.includes('bold'),
                isBold: fontName.includes('bold') || fontName.includes('heavy'),
                confidence: 1.0,
            });
        }
    });

    return chunks;
};

// ==================== GLOBAL TEXT CHUNK EXTRACTION ====================

/**
 * Extract all text chunks from PDF with global sequential indexing
 *
 * This is the main entry point for Phase 3 citation provenance.
 */
export const extractAllTextChunks = async (
    pdfDoc: PDFDocumentProxy
): Promise<TextChunk[]> => {
    const allChunks: TextChunk[] = [];
    let globalIndex = 0;

    console.log('📖 Starting Phase 3 text chunk extraction...');

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        console.log(`  Processing page ${pageNum}/${pdfDoc.numPages}...`);

        const page = await pdfDoc.getPage(pageNum);
        const rawItems = await extractRawTextItems(page, pageNum);
        const pageChunks = segmentIntoSentences(rawItems, pageNum);

        // Assign global indices
        pageChunks.forEach(chunk => {
            chunk.index = globalIndex++;
            allChunks.push(chunk);
        });

        console.log(`    ✓ Found ${pageChunks.length} sentences (total: ${allChunks.length})`);
    }

    console.log(`✅ Extracted ${allChunks.length} total text chunks with coordinates`);
    return allChunks;
};

// ==================== CITATION MAP ====================

/**
 * Build citation map for fast lookup
 */
export const buildCitationMap = (textChunks: TextChunk[]): CitationMap => {
    const map: CitationMap = {};

    textChunks.forEach(chunk => {
        map[chunk.index] = {
            index: chunk.index,
            pageNum: chunk.pageNum,
            sentence: chunk.text,
            bbox: chunk.bbox,
            confidence: chunk.confidence,
        };
    });

    console.log(`📚 Citation map built with ${Object.keys(map).length} entries`);
    return map;
};

/**
 * Get citation by index
 */
export const getCitation = (map: CitationMap, index: number): Citation | null => {
    return map[index] || null;
};

/**
 * Get all citations for a specific page
 */
export const getCitationsForPage = (map: CitationMap, pageNum: number): Citation[] => {
    return Object.values(map).filter(citation => citation.pageNum === pageNum);
};

/**
 * Get citation indices for a specific page
 */
export const getCitationIndicesForPage = (map: CitationMap, pageNum: number): number[] => {
    return getCitationsForPage(map, pageNum).map(c => c.index);
};

// ==================== CITABLE DOCUMENT FORMAT ====================

/**
 * Create indexed document for AI consumption
 * Format: [0] First sentence. [1] Second sentence. [2] Third...
 */
export const createCitableDocument = (
    textChunks: TextChunk[],
    maxLength = 15000
): string => {
    let citableText = '';
    let currentLength = 0;

    for (const chunk of textChunks) {
        const indexedSentence = `[${chunk.index}] ${chunk.text}\n`;

        // Respect token limits
        if (currentLength + indexedSentence.length > maxLength) {
            citableText += '\n[... document continues ...]\n';
            break;
        }

        citableText += indexedSentence;
        currentLength += indexedSentence.length;
    }

    return citableText;
};

/**
 * Create smart citable document with focus on specific page
 */
export const createSmartCitableDocument = (
    textChunks: TextChunk[],
    focusPage?: number,
    windowSize = 50  // chunks before/after focus
): string => {
    if (!focusPage) {
        // No focus - use first N chunks
        return createCitableDocument(textChunks.slice(0, 200));
    }

    // Get chunks from focus page
    const focusChunks = textChunks.filter(c => c.pageNum === focusPage);
    if (focusChunks.length === 0) {
        return createCitableDocument(textChunks.slice(0, 200));
    }

    // Get surrounding context
    const focusStartIndex = focusChunks[0].index;
    const startIndex = Math.max(0, focusStartIndex - windowSize);
    const endIndex = Math.min(textChunks.length, focusStartIndex + windowSize * 2);

    const contextChunks = textChunks.slice(startIndex, endIndex);

    return createCitableDocument(contextChunks);
};

/**
 * Format document for AI with metadata
 */
export const formatDocumentForAI = (
    textChunks: TextChunk[],
    figures: any[] = [],
    tables: any[] = []
): string => {
    const citableDoc = createCitableDocument(textChunks);

    const metadata = `DOCUMENT METADATA:
- Total text chunks: ${textChunks.length}
- Total pages: ${Math.max(...textChunks.map(c => c.pageNum))}
- Figures available: ${figures.length}
- Tables available: ${tables.length}

IMPORTANT INSTRUCTIONS FOR AI:
- Each sentence is prefixed with [index] for citation tracking
- When answering, note which [index] numbers support your answer
- Return citation indices in your JSON metadata
- Be specific and detailed in your analysis
- Only cite sentences that directly support your claims

DOCUMENT TEXT:
${citableDoc}
`;

    return metadata;
};

// ==================== AI CITATION RESPONSE PARSING ====================

/**
 * Parse AI response and extract citation metadata
 */
export const parseAIResponseWithCitations = (
    response: string,
    citationMap: CitationMap
): AIResponse => {
    // Extract JSON metadata block
    const jsonMatch = response.match(/JSON_METADATA:\s*(\{[\s\S]*?\})/);

    if (!jsonMatch) {
        console.warn('⚠️ No JSON metadata found in AI response');
        return {
            answer: response,
            citationIndices: [],
            sourceQuote: '',
            pageNumber: 1,
        };
    }

    try {
        const metadata = JSON.parse(jsonMatch[1]);
        const answer = response.substring(0, response.indexOf('JSON_METADATA:')).trim();

        // Validate citation indices exist in map
        const validIndices = (metadata.sentence_indices || []).filter(
            (idx: number) => citationMap[idx] !== undefined
        );

        if (validIndices.length === 0 && metadata.sentence_indices?.length > 0) {
            console.warn('⚠️ AI returned invalid citation indices:', metadata.sentence_indices);
        }

        // Determine primary page from first citation
        const primaryPage = validIndices.length > 0
            ? citationMap[validIndices[0]].pageNum
            : metadata.page_number || 1;

        return {
            answer,
            citationIndices: validIndices,
            sourceQuote: metadata.source_quote || '',
            pageNumber: primaryPage,
            confidence: metadata.confidence || 0.9,
            referencedFigures: metadata.referenced_figures || [],
            referencedTables: metadata.referenced_tables || [],
        };
    } catch (error) {
        console.error('❌ Failed to parse AI metadata:', error);
        return {
            answer: response,
            citationIndices: [],
            sourceQuote: '',
            pageNumber: 1,
        };
    }
};

// ==================== CITATION HIGHLIGHTING ====================

/**
 * Highlight a citation on the PDF canvas
 * Navigates to the citation's page and draws a highlight overlay
 */
export const highlightCitation = (
    citationIndex: number,
    citationMap: CitationMap,
    renderPageCallback?: (pageNum: number) => Promise<void>
): void => {
    const citation = citationMap[citationIndex];
    if (!citation) {
        console.warn(`Citation [${citationIndex}] not found in citation map`);
        return;
    }

    // Navigate to citation page if callback provided
    if (renderPageCallback) {
        renderPageCallback(citation.pageNum).then(() => {
            // Wait for page to render, then highlight
            setTimeout(() => {
                drawCitationHighlight(citation);
            }, 500);
        });
    } else {
        // Just highlight if already on correct page
        drawCitationHighlight(citation);
    }
};

/**
 * Draw citation highlight on canvas
 * Uses injected dependencies to get canvas and scale
 * @private
 */
const drawCitationHighlight = (citation: Citation): void => {
    // Check if dependencies are injected
    if (!dependencies) {
        console.warn('Dependencies not injected. Call setDependencies() first.');
        return;
    }
    
    // Get canvas from injected dependency
    const canvas = dependencies.getCanvas();
    if (!canvas) {
        console.warn('No canvas found for citation highlighting');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get current scale from injected dependency
    const scale = dependencies.getScale();

    // Draw highlight overlay
    ctx.save();
    ctx.fillStyle = 'rgba(255, 235, 59, 0.4)'; // Yellow highlight
    ctx.strokeStyle = 'rgba(255, 193, 7, 0.8)';
    ctx.lineWidth = 2;
    
    const x = citation.bbox.x * scale;
    const y = citation.bbox.y * scale;
    const width = citation.bbox.width * scale;
    const height = citation.bbox.height * scale;

    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    // Add citation index label
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`[${citation.index}]`, x + 2, y - 2);

    ctx.restore();
};

/**
 * Clear citation highlights from canvas
 */
export const clearCitationHighlights = (): void => {
    // This would need to re-render the page to clear highlights
    // For now, just log - actual implementation would require PDFRenderer integration
    console.log('Clearing citation highlights - re-render page to clear');
};

/**
 * Jump to citation location
 * Navigates to the citation's page
 */
export const jumpToCitation = (
    citationIndex: number,
    citationMap: CitationMap,
    renderPageCallback: (pageNum: number) => Promise<void>
): Promise<void> => {
    const citation = citationMap[citationIndex];
    if (!citation) {
        console.warn(`Citation [${citationIndex}] not found`);
        return Promise.resolve();
    }

    return renderPageCallback(citation.pageNum).then(() => {
        // Wait for the next paint cycle to ensure the page is rendered
        requestAnimationFrame(() => {
            highlightCitation(citationIndex, citationMap);
        });
    });
};

// ==================== SEARCH FUNCTIONALITY ====================

export interface SearchResult {
    text: string
    pageNumber: number
    x: number
    y: number
    width: number
    height: number
}

/**
 * Search for text in the current citation map
 * Returns locations where the text was found
 */
export const searchText = async (searchText: string, citationMap?: CitationMap): Promise<SearchResult[]> => {
    const results: SearchResult[] = []
    const map = citationMap || CitationServiceClass.getInstance().citationMap
    
    if (!map || Object.keys(map).length === 0) {
        console.warn('No citation map available for search')
        return results
    }
    
    const normalizedSearch = searchText.toLowerCase().trim()
    
    // Search through all citations
    Object.values(map).forEach((citation: any) => {
        if (citation.sentence && citation.sentence.toLowerCase().includes(normalizedSearch)) {
            results.push({
                text: citation.sentence,
                pageNumber: citation.pageNum,
                x: citation.bbox.x,
                y: citation.bbox.y,
                width: citation.bbox.width,
                height: citation.bbox.height
            })
        }
    })
    
    console.log(`📍 Found ${results.length} matches for "${searchText}"`)
    return results
}

/**
 * Scroll to a specific citation location
 */
export const scrollToCitation = async (location: {
    pageNumber: number
    x: number
    y: number
    width: number
    height: number
    text?: string
}): Promise<void> => {
    // Get dependencies for highlighting
    if (!dependencies) {
        console.warn('Dependencies not injected. Call setDependencies() first.')
        return
    }
    
    // Create a temporary citation for highlighting
    const tempCitation: Citation = {
        index: -1,  // Temporary index
        pageNum: location.pageNumber,
        sentence: location.text || '',
        bbox: {
            x: location.x,
            y: location.y,
            width: location.width,
            height: location.height
        },
        confidence: 1.0
    }
    
    // Draw highlight
    drawCitationHighlight(tempCitation)
    
    // Scroll the canvas into view if needed
    const canvas = dependencies.getCanvas()
    if (canvas) {
        const scale = dependencies.getScale()
        const scrollY = location.y * scale
        
        // Scroll to make the citation visible
        canvas.scrollIntoView({ behavior: 'smooth', block: 'center' })
        
        // Additional scroll to specific position
        window.scrollTo({
            top: scrollY - 100,  // Offset for better visibility
            behavior: 'smooth'
        })
    }
}

// ==================== EXPORT ALL ====================

export default {
    setDependencies,
    extractAllTextChunks,
    buildCitationMap,
    getCitation,
    getCitationsForPage,
    getCitationIndicesForPage,
    createCitableDocument,
    createSmartCitableDocument,
    formatDocumentForAI,
    parseAIResponseWithCitations,
    highlightCitation,
    clearCitationHighlights,
    jumpToCitation,
    searchText,
    scrollToCitation,
};

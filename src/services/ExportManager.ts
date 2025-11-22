/**
 * ExportManager
 * Handles data export functionality (JSON, CSV, Excel, Audit Report, Annotated PDF)
 *
 * SECURITY NOTE: xlsx@0.18.5 has known vulnerabilities (Prototype Pollution, ReDoS)
 * but they are NOT exploitable in our use case because:
 * 1. We only GENERATE Excel files (output-only)
 * 2. We never PARSE user-uploaded Excel files
 * 3. All data comes from trusted form inputs
 *
 * If Excel IMPORT is added in the future, reevaluate and consider:
 * - Switching to 'exceljs' library
 * - Implementing input sanitization
 * - Sandboxing file parsing in Web Worker
 *
 * See: DEPENDENCY_VULNERABILITIES.md
 */

import * as XLSX from 'xlsx';
import AppStateManager from '../state/AppStateManager';
import FormManager from '../forms/FormManager';
import ExtractionTracker from '../data/ExtractionTracker';
import StatusManager from '../utils/status';
import citationAuditTrail from './CitationAuditTrail';
import type { TextChunk, Citation } from './CitationService';

/**
 * ExportManager Object
 * Central manager for all export operations
 */
const ExportManager = {
    /**
     * Export extraction data as JSON with full provenance metadata
     * Includes document metadata, form data, all extractions with coordinates,
     * citation map, text chunks, and bounding box data
     */
    exportJSON: function() {
        const state = AppStateManager.getState();
        const formData = FormManager.collectFormData();
        const extractions = ExtractionTracker.getExtractions();
        
        // Enhanced data structure with provenance
        const data = {
            version: '2.0',
            document: state.documentName,
            exportDate: new Date().toISOString(),
            totalPages: state.totalPages,
            formData,
            extractions: extractions.map(ext => ({
                ...ext,
                // Ensure coordinates are included
                coordinates: {
                    x: ext.coordinates?.x ?? 0,
                    y: ext.coordinates?.y ?? 0,
                    width: ext.coordinates?.width ?? 0,
                    height: ext.coordinates?.height ?? 0
                },
                // Add provenance metadata
                provenance: {
                    method: ext.method,
                    timestamp: ext.timestamp,
                    page: ext.page,
                    hasCoordinates: ext.coordinates?.x != null
                }
            })),
            // Include citation map if available
            citationMap: state.citationMap || {},
            // Include text chunks for citation lookup
            textChunks: state.textChunks?.map(chunk => ({
                index: chunk.index,
                text: chunk.text.substring(0, 200), // Truncate for export
                pageNum: chunk.pageNum,
                bbox: chunk.bbox
            })) || [],
            // Include extracted figures and tables metadata
            metadata: {
                extractedFigures: state.extractedFigures?.length || 0,
                extractedTables: state.extractedTables?.length || 0,
                extractionCount: extractions.length,
                uniqueFields: new Set(extractions.map(e => e.fieldName)).size
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `extraction_${Date.now()}.json`);
        StatusManager.show('JSON export successful with provenance metadata', 'success');
    },

    /**
     * Export extraction data as CSV
     * Includes field name, text, page, coordinates, timestamp, and citations
     */
    exportCSV: function() {
        const state = AppStateManager.getState();
        let csv = 'Field,Text,Page,X,Y,Width,Height,Timestamp,Citation Count,Citation Pages,Citation Text\n';
        
        ExtractionTracker.getExtractions().forEach(ext => {
            // Get citation details
            const citationCount = ext.citationCount || 0;
            const citationPages = ext.citationIndices?.map(idx => {
                const citation = state.citationMap?.[idx];
                return citation?.pageNum || '?';
            }).join('; ') || 'N/A';
            
            const citationTexts = ext.citationIndices?.map(idx => {
                const citation = state.citationMap?.[idx];
                return citation?.sentence?.substring(0, 50) || '';
            }).join(' | ') || 'N/A';
            
            csv += `"${ext.fieldName}","${ext.text.replace(/"/g, '""')}",${ext.page},${ext.coordinates.x},${ext.coordinates.y},${ext.coordinates.width},${ext.coordinates.height},"${ext.timestamp}",${citationCount},"${citationPages}","${citationTexts.replace(/"/g, '""')}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        this.downloadFile(blob, `extraction_${Date.now()}.csv`);
        StatusManager.show('CSV export successful with citations', 'success');
    },

    /**
     * Generate and export audit report as HTML
     * Opens in new tab with document metadata, form data, and extractions
     */
    exportAudit: function() {
        const formData = FormManager.collectFormData();
        // Generate simplified HTML locally for preview
        const state = AppStateManager.getState();
        const extractions = ExtractionTracker.getExtractions();
        let html = `<h1>Audit Report</h1><h2>Document: ${state.documentName}</h2><h3>Form Data</h3><ul>`;
        Object.entries(formData).forEach(([key, value]) => html += `<li><b>${key}:</b> ${value}</li>`);
        html += `</ul><h3>Extractions</h3>`;
        extractions.forEach(ext => html += `<p><b>${ext.fieldName} (Page ${ext.page}):</b> "${ext.text}" <i>@ ${ext.timestamp}</i></p>`);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000); // Clean up blob URL
        StatusManager.show('Audit report generated (Preview)', 'success');
    },

    /**
     * Export data as Excel (.xlsx) file with multiple sheets
     * Creates professional Excel workbook with:
     * - Summary sheet with form data
     * - Extractions sheet with all extraction details
     * - Statistics sheet with extraction counts
     */
    exportExcel: function() {
        const state = AppStateManager.getState();
        const formData = FormManager.collectFormData();
        const extractions = ExtractionTracker.getExtractions();

        // Create new workbook
        const workbook = XLSX.utils.book_new();

        // SHEET 1: Summary (Form Data)
        const summaryData = [
            ['Clinical Extractor - Data Export'],
            [''],
            ['Document:', state.documentName],
            ['Export Date:', new Date().toLocaleString()],
            ['Total Extractions:', extractions.length],
            [''],
            ['Form Data'],
            ['Field', 'Value']
        ];

        // Add form data rows
        Object.entries(formData).forEach(([key, value]) => {
            summaryData.push([key, String(value)]);
        });

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // SHEET 2: Extractions (Detailed with Citations)
        const extractionsData: (string | number)[][] = [
            ['Field Name', 'Extracted Text', 'Page', 'Method', 'X', 'Y', 'Width', 'Height', 'Timestamp', 'Citations', 'Citation Sources']
        ];

        extractions.forEach(ext => {
            const citationCount = ext.citationCount || 0;
            const citationSources = ext.citationIndices?.map(idx => {
                const citation = state.citationMap?.[idx];
                return citation ? `[${idx}] p.${citation.pageNum}: "${citation.sentence.substring(0, 50)}..."` : `[${idx}]`;
            }).join(' | ') || 'None';
            
            extractionsData.push([
                ext.fieldName,
                ext.text,
                ext.page,
                ext.method,
                ext.coordinates.x,
                ext.coordinates.y,
                ext.coordinates.width,
                ext.coordinates.height,
                new Date(ext.timestamp).toLocaleString(),
                citationCount,
                citationSources
            ]);
        });

        const extractionsSheet = XLSX.utils.aoa_to_sheet(extractionsData);
        XLSX.utils.book_append_sheet(workbook, extractionsSheet, 'Extractions');

        // SHEET 3: Statistics
        const uniquePages = new Set(extractions.map(e => e.page));
        const methodCounts = extractions.reduce((acc, ext) => {
            acc[ext.method] = (acc[ext.method] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const statsData = [
            ['Extraction Statistics'],
            [''],
            ['Metric', 'Value'],
            ['Total Extractions', extractions.length],
            ['Pages with Data', uniquePages.size],
            ['Unique Fields', new Set(extractions.map(e => e.fieldName)).size],
            [''],
            ['Extraction Methods'],
            ['Method', 'Count']
        ];

        Object.entries(methodCounts).forEach(([method, count]) => {
            statsData.push([method, count]);
        });

        const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
        XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics');

        // SHEET 4: Citation Audit Trail
        const citationStats = ExtractionTracker.getCitationStats();
        const citationAuditData: (string | number)[][] = [
            ['Citation Audit Report'],
            ['Generated:', new Date().toLocaleString()],
            [''],
            ['Summary'],
            ['Total Citations Used:', citationStats.totalCitations],
            ['Fields with Citation Backing:', citationStats.fieldsWithCitations],
            ['Average Citations per Field:', citationStats.avgCitationsPerField],
            [''],
            ['Detailed Citation Usage'],
            ['Field Name', 'Citation Count', 'Citation Indices', 'Pages Referenced']
        ];

        // Add rows for each extraction with citations
        extractions.forEach(ext => {
            if (ext.citationCount && ext.citationCount > 0) {
                const indices = ext.citationIndices?.join(', ') || '';
                const pages = ext.citationIndices?.map(idx => {
                    const citation = state.citationMap?.[idx];
                    return citation?.pageNum || '?';
                }).join(', ') || '';
                
                citationAuditData.push([
                    ext.fieldName,
                    ext.citationCount || 0,
                    indices,
                    pages
                ]);
            }
        });

        const citationAuditSheet = XLSX.utils.aoa_to_sheet(citationAuditData);
        XLSX.utils.book_append_sheet(workbook, citationAuditSheet, 'Citation Audit');

        // Generate Excel file and trigger download
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        this.downloadFile(blob, `clinical_extraction_${Date.now()}.xlsx`);
        StatusManager.show('✓ Excel file exported with citations and audit trail!', 'success');
    },

    /**
     * Export annotated PDF with extraction highlights
     * Not available in preview mode
     */
    exportAnnotatedPDF: function() {
        StatusManager.show('Annotated PDF export not available in preview.', 'info');
    },

    /**
     * Export provenance data with complete coordinate metadata
     * Includes all extraction coordinates, bounding boxes, and citation information
     */
    exportProvenance: function() {
        const state = AppStateManager.getState();
        const formData = FormManager.collectFormData();
        const extractions = ExtractionTracker.getExtractions();

        const provenanceData = {
            document: {
                name: state.documentName,
                totalPages: state.totalPages,
                loadDate: state.documentName ? new Date().toISOString() : null,
            },
            exportDate: new Date().toISOString(),
            formData,
            extractions: extractions.map(ext => ({
                id: ext.id,
                fieldName: ext.fieldName,
                text: ext.text,
                page: ext.page,
                method: ext.method,
                timestamp: ext.timestamp,
                coordinates: {
                    x: ext.coordinates.x,
                    y: ext.coordinates.y,
                    width: ext.coordinates.width,
                    height: ext.coordinates.height,
                },
            })),
            citations: state.citationMap ? Object.entries(state.citationMap).map(([index, chunk]: [string, Citation]) => ({
                index: parseInt(index),
                text: chunk.sentence,
                pageNum: chunk.pageNum,
                bbox: chunk.bbox,
            })) : [],
            textChunks: state.textChunks ? state.textChunks.map((chunk: TextChunk) => ({
                index: chunk.index,
                text: chunk.text,
                pageNum: chunk.pageNum,
                bbox: chunk.bbox,
                isHeading: chunk.isHeading,
            })) : [],
            metadata: {
                totalExtractions: extractions.length,
                extractionMethods: extractions.reduce((acc: Record<string, number>, ext) => {
                    acc[ext.method] = (acc[ext.method] || 0) + 1;
                    return acc;
                }, {}),
                pagesWithExtractions: [...new Set(extractions.map(e => e.page))],
            },
        };

        const blob = new Blob([JSON.stringify(provenanceData, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `provenance_${state.documentName || 'extraction'}_${Date.now()}.json`);
        StatusManager.show('Provenance export successful', 'success');
    },

    /**
     * Export citation audit trail as JSON
     * For regulatory compliance and audit purposes
     */
    exportCitationAuditJSON: function() {
        const blob = citationAuditTrail.exportJSON();
        this.downloadFile(blob, `citation_audit_${Date.now()}.json`);
        StatusManager.show('✓ Citation audit trail exported (JSON)', 'success');
        citationAuditTrail.logExport('citation_audit_json', citationAuditTrail.getAllLogs().length);
    },

    /**
     * Export citation audit trail as CSV
     * For regulatory compliance and audit purposes
     */
    exportCitationAuditCSV: function() {
        const blob = citationAuditTrail.exportCSV();
        this.downloadFile(blob, `citation_audit_${Date.now()}.csv`);
        StatusManager.show('✓ Citation audit trail exported (CSV)', 'success');
        citationAuditTrail.logExport('citation_audit_csv', citationAuditTrail.getAllLogs().length);
    },

    /**
     * Download file helper
     * Creates temporary download link and triggers download
     * @private
     */
    downloadFile: function(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Required for Firefox
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000); // Clean up blob URL
    }
};

/**
 * Individual export functions for window binding
 */
export function exportJSON() {
    ExportManager.exportJSON();
}

export function exportCSV() {
    ExportManager.exportCSV();
}

export function exportExcel() {
    ExportManager.exportExcel();
}

export function exportAudit() {
    ExportManager.exportAudit();
}

export function exportAnnotatedPDF() {
    ExportManager.exportAnnotatedPDF();
}

export function exportProvenance() {
    ExportManager.exportProvenance();
}

export function exportCitationAuditJSON() {
    ExportManager.exportCitationAuditJSON();
}

export function exportCitationAuditCSV() {
    ExportManager.exportCitationAuditCSV();
}

export default ExportManager;

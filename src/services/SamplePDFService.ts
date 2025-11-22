/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sample PDF Service
 *
 * Provides functionality to load sample PDFs from GitHub repository.
 * Enables quick demos and testing without manual file uploads.
 *
 * @module SamplePDFService
 */

import PDFLoader from '../pdf/PDFLoader';
import StatusManager from '../utils/status';

/**
 * GitHub file metadata from Contents API
 */
interface GitHubFile {
    name: string;
    path: string;
    download_url: string;
    type: 'file' | 'dir';
}

/**
 * Sample PDF metadata
 */
interface SamplePDF {
    name: string;
    displayName: string;
    url: string;
}

/**
 * Configuration for sample PDFs
 */
const SAMPLE_CONFIG = {
    owner: import.meta.env.VITE_SAMPLE_REPO_OWNER || 'matheus-rech',
    repo: import.meta.env.VITE_SAMPLE_REPO || 'la_consulta',
    branch: import.meta.env.VITE_SAMPLE_BRANCH || 'master',
    folder: import.meta.env.VITE_SAMPLE_FOLDER || 'public',
    useLocal: import.meta.env.DEV !== false,
};

/**
 * Local sample PDFs (for development)
 */
const LOCAL_SAMPLES: SamplePDF[] = [
    {
        name: 'Kim2016.pdf',
        displayName: 'Kim et al. 2016 - Character-Aware Neural Language Models',
        url: `${window.location.origin}/Kim2016.pdf`
    }
];

/**
 * Default sample PDFs (fallback if GitHub API fails)
 */
const DEFAULT_SAMPLES: SamplePDF[] = [
    {
        name: 'Kim2016.pdf',
        displayName: 'Kim et al. 2016 - Character-Aware Neural Language Models',
        url: `https://raw.githubusercontent.com/${SAMPLE_CONFIG.owner}/${SAMPLE_CONFIG.repo}/${SAMPLE_CONFIG.branch}/${SAMPLE_CONFIG.folder}/Kim2016.pdf`
    }
];

/**
 * SamplePDFService Object
 *
 * Provides methods for loading sample PDFs from GitHub.
 */
const SamplePDFService = {
    /**
     * List available sample PDFs (local-first in development, GitHub fallback)
     *
     * @returns Promise resolving to array of sample PDF metadata
     */
    listSamples: async (): Promise<SamplePDF[]> => {
        if (SAMPLE_CONFIG.useLocal) {
            console.log('Using local sample PDFs for development');
            return LOCAL_SAMPLES;
        }

        try {
            const url = `https://api.github.com/repos/${SAMPLE_CONFIG.owner}/${SAMPLE_CONFIG.repo}/contents/${SAMPLE_CONFIG.folder}?ref=${SAMPLE_CONFIG.branch}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn('GitHub API request failed, using default samples');
                return DEFAULT_SAMPLES;
            }
            
            const files: GitHubFile[] = await response.json();
            
            const pdfFiles = files
                .filter(file => file.type === 'file' && file.name.toLowerCase().endsWith('.pdf'))
                .map(file => ({
                    name: file.name,
                    displayName: file.name.replace('.pdf', '').replace(/_/g, ' '),
                    url: file.download_url
                }));
            
            return pdfFiles.length > 0 ? pdfFiles : DEFAULT_SAMPLES;
            
        } catch (error) {
            console.error('Failed to list sample PDFs from GitHub:', error);
            return DEFAULT_SAMPLES;
        }
    },

    /**
     * Fetch a PDF from URL and convert to File object
     * Tries local URL first in development, then falls back to GitHub
     *
     * @param url - URL to fetch PDF from
     * @param name - Filename for the PDF
     * @returns Promise resolving to File object
     */
    fetchAsFile: async (url: string, name: string): Promise<File> => {
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                if (SAMPLE_CONFIG.useLocal && url.startsWith(window.location.origin)) {
                    console.warn(`Local file not found, trying GitHub fallback for ${name}`);
                    const githubUrl = `https://raw.githubusercontent.com/${SAMPLE_CONFIG.owner}/${SAMPLE_CONFIG.repo}/${SAMPLE_CONFIG.branch}/${SAMPLE_CONFIG.folder}/${name}`;
                    const githubResponse = await fetch(githubUrl);
                    
                    if (!githubResponse.ok) {
                        throw new Error(`Failed to fetch PDF from both local and GitHub: ${githubResponse.statusText}`);
                    }
                    
                    const blob = await githubResponse.blob();
                    return new File([blob], name, { type: 'application/pdf' });
                }
                
                throw new Error(`Failed to fetch PDF: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            return new File([blob], name, { type: 'application/pdf' });
            
        } catch (error) {
            console.error('Failed to fetch PDF from URL:', error);
            throw error;
        }
    },

    /**
     * Load a sample PDF by name or URL
     *
     * @param nameOrUrl - Sample PDF name or direct URL
     * @returns Promise resolving when PDF is loaded
     */
    loadSample: async (nameOrUrl: string): Promise<void> => {
        try {
            const source = SAMPLE_CONFIG.useLocal ? 'local files' : 'GitHub';
            StatusManager.show(`Loading sample PDF from ${source}...`, 'info');
            
            let url: string;
            let filename: string;
            
            if (nameOrUrl.startsWith('http://') || nameOrUrl.startsWith('https://')) {
                url = nameOrUrl;
                filename = nameOrUrl.split('/').pop() || 'sample.pdf';
            } else {
                const samples = await SamplePDFService.listSamples();
                const sample = samples.find(s => s.name === nameOrUrl);
                
                if (!sample) {
                    throw new Error(`Sample PDF not found: ${nameOrUrl}. Try using "Load PDF" button to upload manually.`);
                }
                
                url = sample.url;
                filename = sample.name;
            }
            
            const file = await SamplePDFService.fetchAsFile(url, filename);
            await PDFLoader.loadPDF(file);
            
            StatusManager.show(`Loaded sample PDF: ${filename}`, 'success');
            
        } catch (error) {
            console.error('Failed to load sample PDF:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            StatusManager.show(`Failed to load sample PDF: ${errorMessage}. Try using "Load PDF" button instead.`, 'error');
            throw error;
        }
    },

    /**
     * Load the default sample PDF (Kim2016.pdf)
     *
     * @returns Promise resolving when PDF is loaded
     */
    loadDefaultSample: async (): Promise<void> => {
        return SamplePDFService.loadSample('Kim2016.pdf');
    }
};

export default SamplePDFService;
export type { SamplePDF };

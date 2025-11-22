/**
 * Citation API Client
 * Handles communication with backend File Search endpoints
 */

interface UploadPDFRequest {
    document_id: string
    pdf_data: string  // Base64 encoded
    filename: string
}

interface UploadPDFResponse {
    document_id: string
    file_search_store_id: string
    message: string
}

interface QueryCitationsRequest {
    document_id: string
    file_search_store_id: string
    query: string
}

interface Citation {
    text: string
    page_number?: number
    confidence?: number
}

interface QueryCitationsResponse {
    document_id: string
    answer: string
    citations: Citation[]
}

export class CitationAPIClient {
    private backendUrl: string

    constructor() {
        this.backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8080'
    }

    /**
     * Lazily get auth token from localStorage
     */
    private getAuthToken(): string | null {
        return localStorage.getItem('auth_token')
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return this.getAuthToken() !== null
    }

    private getAuthHeaders(): HeadersInit {
        const token = this.getAuthToken()
        if (!token) {
            throw new Error('Please log in to use citation features')
        }
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    }

    /**
     * Upload PDF to Gemini File Search store
     */
    async uploadPDFForCitations(
        documentId: string,
        pdfBase64: string,
        filename: string
    ): Promise<UploadPDFResponse> {
        const response = await fetch(`${this.backendUrl}/api/ai/upload-pdf`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
                document_id: documentId,
                pdf_data: pdfBase64,
                filename: filename
            } as UploadPDFRequest)
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`Failed to upload PDF: ${error}`)
        }

        return await response.json()
    }

    /**
     * Query document with citations
     */
    async queryWithCitations(
        documentId: string,
        fileSearchStoreId: string,
        query: string
    ): Promise<QueryCitationsResponse> {
        const response = await fetch(`${this.backendUrl}/api/ai/query-with-citations`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
                document_id: documentId,
                file_search_store_id: fileSearchStoreId,
                query: query
            } as QueryCitationsRequest)
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`Failed to query with citations: ${error}`)
        }

        return await response.json()
    }

    /**
     * Set auth token
     */
    setAuthToken(token: string) {
        localStorage.setItem('auth_token', token)
    }
}

// Export singleton instance
export const citationAPIClient = new CitationAPIClient()
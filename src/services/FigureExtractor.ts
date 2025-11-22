/**
 * FigureExtractor.ts
 *
 * Extracts figures from PDF using PDF.js operator list interception.
 * Implements the methodology from pdf-data-extraction-guide.md
 *
 * Key technique: Intercept image rendering operators (92, 93, 94) before they
 * hit the canvas, accessing decoded image data directly from PDF.js memory.
 */

interface ImageOperatorDiagnostics {
    pageNum: number
    totalOperators: number
    imageOperators: number
    extractedImages: number
    filteredImages: number
    errors: string[]
    processingTime: number
    imageDetails: Array<{
        name: string
        width: number
        height: number
        kind: number
        hasAlpha: boolean
        dataLength: number
    }>
}

interface ExtractedFigure {
    id: string
    pageNum: number
    dataUrl: string
    width: number
    height: number
    extractionMethod: string
    metadata: {
        imageName: string
        colorSpace: number
        hasAlpha: boolean
    }
}

class FigureExtractor {
    // PDF image operator codes
    private readonly IMAGE_OPERATOR_TYPES = [
        92,  // paintImageXObject - External image reference
        93,  // paintInlineImageXObject - Embedded image data
        94,  // paintImageMaskXObject - Image masks/transparency
    ]

    /**
     * Extract all figures from a PDF page
     */
    async extractFiguresFromPage(
        page: any,
        pageNum: number
    ): Promise<{ figures: ExtractedFigure[], diagnostics: ImageOperatorDiagnostics }> {
        const diagnostics: ImageOperatorDiagnostics = {
            pageNum,
            totalOperators: 0,
            imageOperators: 0,
            extractedImages: 0,
            filteredImages: 0,
            errors: [],
            processingTime: 0,
            imageDetails: [],
        }

        const startTime = Date.now()
        const figures: ExtractedFigure[] = []

        try {
            // Step 1: Access operator list (rendering instructions)
            const ops = await page.getOperatorList()
            diagnostics.totalOperators = ops.fnArray?.length || 0

            // Step 2: Iterate through operators looking for image commands
            for (let i = 0; i < ops.fnArray.length; i++) {
                const opType = ops.fnArray[i]

                if (this.IMAGE_OPERATOR_TYPES.includes(opType)) {
                    diagnostics.imageOperators++

                    try {
                        const args = ops.argsArray[i]
                        const imageName = args?.[0]

                        if (!imageName) {
                            diagnostics.errors.push(`No image name at operator ${i}`)
                            continue
                        }

                        // Step 3: Retrieve image object from PDF.js memory
                        const image = await this.getImageObject(page, imageName)

                        if (image && image.width && image.height) {
                            diagnostics.extractedImages++

                            // Log image details for debugging
                            diagnostics.imageDetails.push({
                                name: imageName,
                                width: image.width,
                                height: image.height,
                                kind: image.kind,
                                hasAlpha: !!image.smask,
                                dataLength: image.data?.length || 0,
                            })

                            // Step 4: Filter intelligently (not all images are figures)
                            if (this.shouldExtractAsFigure(image)) {
                                diagnostics.filteredImages++

                                // Step 5: Convert to displayable format
                                const dataUrl = this.convertImageDataToCanvas(image)

                                figures.push({
                                    id: `fig-${pageNum}-${figures.length + 1}`,
                                    pageNum: pageNum,
                                    dataUrl: dataUrl,
                                    width: image.width,
                                    height: image.height,
                                    extractionMethod: 'PDF.js Operator List',
                                    metadata: {
                                        imageName,
                                        colorSpace: image.kind,
                                        hasAlpha: !!image.smask,
                                    },
                                })
                            }
                        }
                    } catch (error: any) {
                        diagnostics.errors.push(`Error processing operator ${i}: ${error.message}`)
                    }
                }
            }
        } catch (error: any) {
            diagnostics.errors.push(`Page processing error: ${error.message}`)
        }

        diagnostics.processingTime = Date.now() - startTime

        return { figures, diagnostics }
    }

    /**
     * Retrieve image object from PDF.js memory with fallback
     */
    private async getImageObject(page: any, imageName: string): Promise<any> {
        let image = null

        try {
            // Primary method
            image = await page.objs.get(imageName)
        } catch (e) {
            // Fallback: direct memory access
            if (page.objs.objs && page.objs.objs[imageName]) {
                image = page.objs.objs[imageName]
            }
        }

        return image
    }

    /**
     * Filter: Determine if an image should be extracted as a figure
     * Filters out tiny images, logos, icons, and decorative elements
     */
    private shouldExtractAsFigure(image: any): boolean {
        const minSize = 50  // Minimum dimension in pixels
        const aspectRatio = image.width / image.height

        // Size check: Must be at least 50x50 pixels
        const isReasonableSize = image.width >= minSize && image.height >= minSize

        // Aspect ratio check: Very permissive to catch various figure types
        // Excludes extremely wide banners (>20:1) or tall dividers (<0.05:1)
        const isNotTooWide = aspectRatio <= 20 && aspectRatio >= 0.05

        // Data quality check
        const hasValidData = image.data && image.data.length > 0

        return isReasonableSize && isNotTooWide && hasValidData
    }

    /**
     * Convert PDF image data to PNG data URL
     * Handles multiple color spaces: Grayscale, RGB, RGBA, CMYK
     */
    private convertImageDataToCanvas(image: any): string {
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const ctx = canvas.getContext('2d')!

        const imageData = ctx.createImageData(image.width, image.height)
        const data = image.data

        // Handle different color spaces
        if (image.kind === 1) {
            // Grayscale (1 byte per pixel)
            for (let j = 0; j < data.length; j++) {
                const gray = data[j]
                imageData.data[j * 4] = gray      // R
                imageData.data[j * 4 + 1] = gray  // G
                imageData.data[j * 4 + 2] = gray  // B
                imageData.data[j * 4 + 3] = 255   // Alpha
            }
        }
        else if (image.kind === 2) {
            // RGB format
            if (data.length === image.width * image.height * 4) {
                // Already RGBA - just copy
                imageData.data.set(data)
            }
            else if (data.length === image.width * image.height * 3) {
                // RGB - need to add alpha channel
                for (let j = 0, k = 0; j < data.length; j += 3, k += 4) {
                    imageData.data[k] = data[j]         // R
                    imageData.data[k + 1] = data[j + 1] // G
                    imageData.data[k + 2] = data[j + 2] // B
                    imageData.data[k + 3] = 255         // Alpha
                }
            }
        }
        else {
            // Other color spaces (CMYK, etc.) - best effort conversion
            const pixelCount = image.width * image.height
            const bytesPerPixel = Math.max(1, Math.floor(data.length / pixelCount))

            for (let j = 0; j < pixelCount; j++) {
                const srcIndex = j * bytesPerPixel

                if (bytesPerPixel >= 3) {
                    // Assume RGB-like
                    imageData.data[j * 4] = data[srcIndex] || 0
                    imageData.data[j * 4 + 1] = data[srcIndex + 1] || 0
                    imageData.data[j * 4 + 2] = data[srcIndex + 2] || 0
                } else {
                    // Grayscale fallback
                    const gray = data[srcIndex] || 0
                    imageData.data[j * 4] = gray
                    imageData.data[j * 4 + 1] = gray
                    imageData.data[j * 4 + 2] = gray
                }
                imageData.data[j * 4 + 3] = 255
            }
        }

        ctx.putImageData(imageData, 0, 0)
        return canvas.toDataURL('image/png')
    }
}

// Export singleton instance
export default new FigureExtractor()
export type { ExtractedFigure, ImageOperatorDiagnostics }

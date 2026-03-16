// src/lib/fileConverter.ts
// Stage 1: File Conversion — DWG/PDF → PNG via GroupDocs Cloud API
//
// GroupDocs Conversion Cloud handles the heavy CAD/PDF rendering.
// Images (JPG/PNG) pass through without conversion.

import * as groupdocs_conversion_cloud from 'groupdocs-conversion-cloud';

const PASSTHROUGH_MIMES = ['image/png', 'image/jpeg', 'image/jpg'];

const CONVERTIBLE_MIMES: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/vnd.dwg': 'dwg',
    'application/acad': 'dwg',
    'application/x-dwg': 'dwg',
    'application/dxf': 'dxf',
    'application/x-dxf': 'dxf',
};

// Also check file extension as a fallback (browsers may not set correct MIME for DWG)
const EXTENSION_MAP: Record<string, string> = {
    '.dwg': 'dwg',
    '.dxf': 'dxf',
    '.pdf': 'pdf',
    '.png': 'png',
    '.jpg': 'jpg',
    '.jpeg': 'jpg',
};

export interface ConversionResult {
    imageBuffers: Buffer[];
    originalFormat: string;
    wasConverted: boolean;
    error?: string;
}

function getFormatFromExtension(fileName: string): string | null {
    const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
    return EXTENSION_MAP[ext] ?? null;
}

export async function convertToPng(
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string
): Promise<ConversionResult> {
    // If already an image, pass through
    if (PASSTHROUGH_MIMES.includes(mimeType)) {
        return { imageBuffers: [fileBuffer], originalFormat: mimeType, wasConverted: false };
    }

    // Check MIME type first, then fallback to extension
    let sourceFormat = CONVERTIBLE_MIMES[mimeType];
    if (!sourceFormat) {
        sourceFormat = getFormatFromExtension(fileName) ?? '';
    }

    if (!sourceFormat || ['png', 'jpg', 'jpeg'].includes(sourceFormat)) {
        // It's an image by extension but didn't match MIME — pass through
        if (['png', 'jpg', 'jpeg'].includes(sourceFormat || '')) {
            return { imageBuffers: [fileBuffer], originalFormat: sourceFormat || mimeType, wasConverted: false };
        }
        return {
            imageBuffers: [],
            originalFormat: mimeType,
            wasConverted: false,
            error: `Unsupported file type: ${mimeType} (${fileName}). Accepted: PDF, DWG, DXF, JPG, PNG.`,
        };
    }

    // ── Local PDF Conversion via pdfjs-dist ──
    if (sourceFormat === 'pdf') {
        try {
            console.log('[FileConverter] Using local pdfjs-dist for PDF conversion');
            
            // pdfjs-dist requires a specific import for Node.js environments
            const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
            const Canvas = require('canvas');

            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) });
            const pdfDocument = await loadingTask.promise;
            
            const imageBuffers: Buffer[] = [];
            const numPages = Math.min(pdfDocument.numPages, 3); // Max 3 pages for floor plans

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const page = await pdfDocument.getPage(pageNum);
                
                // Use a scale that provides good resolution (e.g. 150-200 DPI equivalent)
                const scale = 2.0; 
                const viewport = page.getViewport({ scale });

                const canvas = Canvas.createCanvas(viewport.width, viewport.height);
                const context = canvas.getContext('2d');

                const renderContext = {
                    canvasContext: context as any, // Cast needed due to DOM types mismatch with Node canvas
                    viewport: viewport,
                };

                await page.render(renderContext).promise;
                
                // Convert Node canvas to PNG buffer
                const pngBuffer = canvas.toBuffer('image/png', { compressionLevel: 3 });
                imageBuffers.push(pngBuffer);
            }

            if (imageBuffers.length > 0) {
                return {
                    imageBuffers,
                    originalFormat: sourceFormat,
                    wasConverted: true,
                };
            } else {
                throw new Error("Local PDF conversion produced no output.");
            }

        } catch (pdfErr: any) {
            console.error('[pdfjs Error]:', pdfErr);
            return {
                imageBuffers: [],
                originalFormat: sourceFormat,
                wasConverted: false,
                error: `Local PDF conversion failed: ${pdfErr.message || 'Unknown PDF processing error'}.`,
            };
        }
    }

    // ── GroupDocs Fallback for DWG/DXF ──
    const clientId = process.env.GROUPDOCS_CLIENT_ID;
    const clientSecret = process.env.GROUPDOCS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return {
            imageBuffers: [],
            originalFormat: sourceFormat,
            wasConverted: false,
            error: 'GroupDocs API credentials not configured. Setup GROUPDOCS_CLIENT_ID and GROUPDOCS_CLIENT_SECRET in .env.local to convert CAD files.',
        };
    }

    try {
        console.log('[FileConverter] Using GroupDocs for CAD conversion');
        // Initialize GroupDocs API
        const config = new groupdocs_conversion_cloud.Configuration(clientId, clientSecret);
        const fileApi = groupdocs_conversion_cloud.FileApi.fromConfig(config);
        const convertApi = groupdocs_conversion_cloud.ConvertApi.fromConfig(config);

        // Upload file to GroupDocs cloud storage
        const uploadPath = `firerulx/uploads/${Date.now()}_${fileName}`;
        const uploadRequest = new groupdocs_conversion_cloud.UploadFileRequest(uploadPath, fileBuffer);
        await fileApi.uploadFile(uploadRequest);

        // Convert to PNG
        const settings = new groupdocs_conversion_cloud.ConvertSettings();
        settings.filePath = uploadPath;
        settings.format = 'png';
        settings.outputPath = `firerulx/converted/${Date.now()}_output.png`;

        const convertRequest = new groupdocs_conversion_cloud.ConvertDocumentRequest(settings);
        const result = await convertApi.convertDocument(convertRequest);

        if (!result || result.length === 0) {
            return {
                imageBuffers: [],
                originalFormat: sourceFormat,
                wasConverted: false,
                error: 'GroupDocs conversion returned no output.',
            };
        }

        // Download all converted PNG pages
        const imageBuffers: Buffer[] = [];
        for (const res of result) {
            if (res.path) {
                const downloadRequest = new groupdocs_conversion_cloud.DownloadFileRequest(res.path);
                const downloadResult = await fileApi.downloadFile(downloadRequest);
                imageBuffers.push(Buffer.from(downloadResult));
            }
        }

        // Clean up uploaded file (best effort)
        try {
            const deleteRequest = new groupdocs_conversion_cloud.DeleteFileRequest(uploadPath);
            await fileApi.deleteFile(deleteRequest);
        } catch {
            // Non-critical: cleanup failure is OK
        }

        return {
            imageBuffers,
            originalFormat: sourceFormat,
            wasConverted: true,
        };
    } catch (err: any) {
        console.error('[GroupDocs Conversion Error]:', err);
        
        let message = 'Unknown conversion error';
        if (err instanceof Error) {
            message = err.message;
        } else if (typeof err === 'object' && err !== null) {
            if (err.message) message = err.message;
            else if (err.error && err.error.message) message = err.error.message;
            else {
                try { message = JSON.stringify(err); } catch { message = String(err); }
            }
        } else {
            message = String(err);
        }

        return {
            imageBuffers: [],
            originalFormat: sourceFormat,
            wasConverted: false,
            error: `CAD conversion failed (GroupDocs): ${message}`,
        };
    }
}

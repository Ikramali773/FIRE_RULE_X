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

    // Validate GroupDocs credentials
    const clientId = process.env.GROUPDOCS_CLIENT_ID;
    const clientSecret = process.env.GROUPDOCS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return {
            imageBuffers: [],
            originalFormat: sourceFormat,
            wasConverted: false,
            error: 'GroupDocs API credentials not configured. Set GROUPDOCS_CLIENT_ID and GROUPDOCS_CLIENT_SECRET in .env.local.',
        };
    }

    try {
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
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown conversion error';
        return {
            imageBuffers: [],
            originalFormat: sourceFormat,
            wasConverted: false,
            error: `File conversion failed: ${message}`,
        };
    }
}

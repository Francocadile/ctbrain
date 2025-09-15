// Tipos mínimos para usar pdfjs-dist en el server
declare module "pdfjs-dist/build/pdf.mjs" {
  export interface PDFTextItem {
    str: string;
  }
  export interface PDFTextContent {
    items: PDFTextItem[];
  }
  export interface PDFPageProxy {
    getTextContent(): Promise<PDFTextContent>;
  }
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }
  export function getDocument(params: {
    data: Uint8Array;
    disableWorker?: boolean;
  }): { promise: Promise<PDFDocumentProxy> };
}

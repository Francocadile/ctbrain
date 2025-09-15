// Tipos mínimos para usar pdfjs-dist en el server (ESM / legacy)
declare module "pdfjs-dist/build/pdf.mjs" {
  export interface PDFTextItem { str: string }
  export interface PDFTextContent { items: PDFTextItem[] }
  export interface PDFPageProxy { getTextContent(): Promise<PDFTextContent> }
  export interface PDFDocumentProxy {
    numPages: number
    getPage(pageNumber: number): Promise<PDFPageProxy>
  }
  export const GlobalWorkerOptions: { workerSrc?: string }
  export function getDocument(params: {
    data: Uint8Array
    disableWorker?: boolean
    isEvalSupported?: boolean
    useWorkerFetch?: boolean
  }): { promise: Promise<PDFDocumentProxy> }
}

declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export interface PDFTextItem { str: string }
  export interface PDFTextContent { items: PDFTextItem[] }
  export interface PDFPageProxy { getTextContent(): Promise<PDFTextContent> }
  export interface PDFDocumentProxy {
    numPages: number
    getPage(pageNumber: number): Promise<PDFPageProxy>
  }
  export const GlobalWorkerOptions: { workerSrc?: string }
  export function getDocument(params: {
    data: Uint8Array
    disableWorker?: boolean
    isEvalSupported?: boolean
    useWorkerFetch?: boolean
  }): { promise: Promise<PDFDocumentProxy> }
}

// types/pdfjs-dist.d.ts
declare module 'pdfjs-dist/build/pdf.mjs' {
  const pdfjs: any;
  export default pdfjs;
  export const GlobalWorkerOptions: any;
  export const getDocument: any;
}

declare module 'pdfjs-dist/build/pdf.worker.mjs';

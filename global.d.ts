import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      role?: "SUPERADMIN" | "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";
      isApproved?: boolean;
      teamId?: string | null;
    };
  }
}
// global.d.ts
declare module 'pdf-parse' {
  export interface PDFInfo {
    PDFFormatVersion?: string;
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
    Creator?: string;
    Producer?: string;
    Title?: string;
    Author?: string;
    CreationDate?: string;
    ModDate?: string;
    Pages?: number;
  }

  export interface PDFMetadata {
    _metadata?: any;
    metadata?: any;
  }

  export interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata?: PDFMetadata;
    text: string;
    version?: string;
  }

  export type PDFSource = Buffer | Uint8Array | ArrayBuffer;

  export default function pdf(dataBuffer: PDFSource, options?: any): Promise<PDFData>;
}

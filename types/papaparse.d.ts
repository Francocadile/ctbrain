declare module 'papaparse' {
  export type ParseError = { type: string; code: string; message: string; row?: number };

  export interface ParseResult<T = any> {
    data: T[];
    errors: ParseError[];
    meta: any;
  }

  export interface ParseOptions {
    delimiter?: string;
    newline?: string;
    quoteChar?: string;
    escapeChar?: string;
    header?: boolean;
    dynamicTyping?: boolean | Record<string, boolean>;
    preview?: number;
    encoding?: string;
    worker?: boolean;
    comments?: boolean | string;
    step?: (results: ParseResult, parser: any) => void;
    complete?: (results: ParseResult, file?: any) => void;
    error?: (error: ParseError, file?: any) => void;
    download?: boolean;
    skipEmptyLines?: boolean | 'greedy';
    chunk?: (results: ParseResult, parser: any) => void;
    beforeFirstChunk?: (chunk: string) => string | void;
    withCredentials?: boolean;
    transform?: (value: any, field?: string) => any;
    transformHeader?: (header: string) => string;
    fastMode?: boolean;
  }

  const Papa: {
    parse: (input: string | File | Blob, options?: ParseOptions) => ParseResult;
    unparse: (data: any, options?: any) => string;
  };

  export default Papa;
}

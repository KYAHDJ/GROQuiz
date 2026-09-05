declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }
  interface PdfParseOptions {
    pagerender?: (pageData: unknown) => Promise<unknown>;
    max?: number;
    version?: string;
  }
  function pdfParse(
    buffer: Buffer,
    options?: PdfParseOptions
  ): Promise<PdfParseResult>;
  export default pdfParse;
}
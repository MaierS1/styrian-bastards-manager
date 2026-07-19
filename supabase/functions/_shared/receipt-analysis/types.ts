export type ReceiptAnalysisField<T = string> = {
  value: T | null
  confidence: number | null
  sourceText: string | null
}

export type ReceiptAnalysisWarning = {
  code: string
  message: string
}

export type ReceiptAnalysis = {
  documentType: ReceiptAnalysisField | null
  invoiceDate: ReceiptAnalysisField | null
  totalAmount: ReceiptAnalysisField<number> | null
  currency: ReceiptAnalysisField | null
  merchantName: ReceiptAnalysisField | null
  invoiceNumber: ReceiptAnalysisField | null
  paymentMethod: ReceiptAnalysisField | null
  suggestedCashType: ReceiptAnalysisField | null
  suggestedCategory: ReceiptAnalysisField | null
  suggestedDescription: ReceiptAnalysisField | null
}

export type ReceiptAnalysisResult = {
  analysis: ReceiptAnalysis
  warnings: ReceiptAnalysisWarning[]
  metadata: {
    provider: string | null
    model: string | null
  }
}

export type ReceiptAnalysisInput = {
  fileBytes: ArrayBuffer
  mimeType: string
  fileName: string
}

export type ReceiptAnalysisProvider = {
  analyze(input: ReceiptAnalysisInput): Promise<ReceiptAnalysisResult>
}

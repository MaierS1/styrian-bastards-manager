import { createOpenAiReceiptAnalysisProvider } from './openai.ts'
import type {
  ReceiptAnalysis,
  ReceiptAnalysisInput,
  ReceiptAnalysisProvider,
  ReceiptAnalysisResult,
} from './types.ts'

const configuredProvider = 'openai'

export async function analyzeReceipt(input: ReceiptAnalysisInput): Promise<ReceiptAnalysisResult> {
  const provider = getConfiguredProvider()

  if (!provider) {
    return providerNotConfiguredResult()
  }

  return provider.analyze(input)
}

function getConfiguredProvider(): ReceiptAnalysisProvider | null {
  const providerName = String(Deno.env.get('RECEIPT_ANALYSIS_PROVIDER') || '').trim().toLowerCase()
  const openAiApiKey = String(Deno.env.get('OPENAI_API_KEY') || '').trim()

  if (providerName !== configuredProvider || !openAiApiKey) {
    return null
  }

  return createOpenAiReceiptAnalysisProvider(openAiApiKey)
}

function providerNotConfiguredResult(): ReceiptAnalysisResult {
  return {
    analysis: emptyAnalysis(),
    warnings: [
      {
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'Receipt analysis provider is not configured yet.',
      },
    ],
  }
}

function emptyAnalysis(): ReceiptAnalysis {
  return {
    documentType: null,
    invoiceDate: null,
    totalAmount: null,
    currency: null,
    merchantName: null,
    invoiceNumber: null,
    paymentMethod: null,
    suggestedCashType: null,
    suggestedCategory: null,
    suggestedDescription: null,
  }
}

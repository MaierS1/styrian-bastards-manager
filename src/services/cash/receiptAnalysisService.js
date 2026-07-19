import { supabase } from '../../lib/supabase'

function buildAnalysisError(error, data) {
  const message = data?.error?.message || error?.message || 'Beleganalyse konnte nicht ausgefuehrt werden.'
  return new Error(message)
}

export async function analyzeCashReceipt({ storagePath } = {}) {
  const cleanedStoragePath = String(storagePath || '').trim()

  if (!cleanedStoragePath) {
    throw new Error('Storage-Pfad fehlt.')
  }

  const { data, error } = await supabase.functions.invoke('analyze-cash-receipt', {
    body: {
      storagePath: cleanedStoragePath,
    },
  })

  if (error || data?.success === false) {
    throw buildAnalysisError(error, data)
  }

  return {
    analysis: data?.analysis || null,
    warnings: Array.isArray(data?.warnings) ? data.warnings : [],
  }
}

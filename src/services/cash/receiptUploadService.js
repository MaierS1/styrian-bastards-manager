import { supabase } from '../../lib/supabase'

const CASH_RECEIPTS_BUCKET = 'receipts'
const CASH_RECEIPTS_FOLDER = 'cash'

function getSafeFileExtension(fileName) {
  const extension = String(fileName || '')
    .split('.')
    .pop()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

  if (!extension || extension === String(fileName || '').toLowerCase()) {
    return 'bin'
  }

  return extension
}

function createCashReceiptPath(file) {
  const fileExt = getSafeFileExtension(file?.name)
  const uniquePart = `${Date.now()}-${Math.random().toString(36).substring(2)}`

  return `${CASH_RECEIPTS_FOLDER}/${uniquePart}.${fileExt}`
}

export async function uploadCashReceipt({
  file,
  supabaseClient = supabase,
} = {}) {
  if (!file) {
    throw new Error('Keine Belegdatei ausgewählt.')
  }

  if (!supabaseClient?.storage) {
    throw new Error('Supabase Storage ist nicht verfügbar.')
  }

  const filePath = createCashReceiptPath(file)

  const { error } = await supabaseClient.storage
    .from(CASH_RECEIPTS_BUCKET)
    .upload(filePath, file)

  if (error) {
    throw new Error(`Beleg konnte nicht hochgeladen werden: ${error.message}`)
  }

  return filePath
}

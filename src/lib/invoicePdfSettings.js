let showPaymentQr = false

export function getShowPaymentQr() {
  return showPaymentQr
}

export function setShowPaymentQr(value) {
  showPaymentQr = Boolean(value)
}

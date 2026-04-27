const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) {
    return inrFormatter.format(0)
  }

  return inrFormatter.format(amount)
}

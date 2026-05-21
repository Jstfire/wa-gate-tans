export function normalizePhoneNumber(input: string): string {
  const digits = input.replace(/\D/g, '')

  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`
  }

  if (digits.startsWith('8')) {
    return `62${digits}`
  }

  return digits
}

export function isInternationalPhoneNumber(input: string): boolean {
  const normalized = normalizePhoneNumber(input)
  return /^62\d{8,15}$/.test(normalized)
}

export function uniquePhoneNumbers(inputs: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const input of inputs) {
    const normalized = normalizePhoneNumber(input)
    if (isInternationalPhoneNumber(normalized) && !seen.has(normalized)) {
      seen.add(normalized)
      result.push(normalized)
    }
  }

  return result
}

export function toWhatsAppChatId(phoneNumber: string): string {
  return `${normalizePhoneNumber(phoneNumber)}@c.us`
}

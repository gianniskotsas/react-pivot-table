export type Account = {
  id: string
  entity: string
  bank: string
  accountName: string
  iban: string
  currency: string
  balance: number
}

export const accounts: Account[] = [
  { id: "1", entity: "Sombrero Coffee Inc", bank: "Citi", accountName: "Coffee Operating", iban: "US12CITI0000111122", currency: "USD", balance: 152340.55 },
  { id: "2", entity: "Sombrero Coffee Inc", bank: "Citi", accountName: "Coffee Reserve", iban: "US12CITI0000111133", currency: "USD", balance: 89000.0 },
  { id: "3", entity: "Sombrero Coffee Inc", bank: "HSBC", accountName: "Coffee FX", iban: "GB29HSBC0000222244", currency: "GBP", balance: 41250.1 },
  { id: "4", entity: "Sombrero Holding BV", bank: "HSBC", accountName: "Holding Main", iban: "GB29HSBC0000333355", currency: "EUR", balance: 980500.0 },
  { id: "5", entity: "Sombrero Holding BV", bank: "HSBC", accountName: "Holding Savings", iban: "GB29HSBC0000333366", currency: "EUR", balance: 1200000.0 },
  { id: "6", entity: "Sombrero Holding BV", bank: "ABN AMRO", accountName: "Sombrero Holding - Payroll", iban: "NL92ABNA2067756052", currency: "EUR", balance: 73420.42 },
  { id: "7", entity: "Sombrero France SAS", bank: "BNP Paribas", accountName: "France Operating", iban: "FR7630006000011234567890189", currency: "EUR", balance: 56120.0 },
  { id: "8", entity: "Sombrero France SAS", bank: "BNP Paribas", accountName: "France Tax", iban: "FR7630006000011234567890222", currency: "EUR", balance: 18900.0 },
  { id: "9", entity: "Sombrero France SAS", bank: "Citi", accountName: "France USD", iban: "US12CITI0000444477", currency: "USD", balance: 22000.0 },
]

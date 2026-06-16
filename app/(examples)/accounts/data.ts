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
  // Acme Robotics Inc
  { id: "1", entity: "Acme Robotics Inc", bank: "JPMorgan Chase", accountName: "Operating", iban: "US64JPMC0000100001", currency: "USD", balance: 482190.34 },
  { id: "2", entity: "Acme Robotics Inc", bank: "JPMorgan Chase", accountName: "Reserve", iban: "US64JPMC0000100002", currency: "USD", balance: 1250000.0 },
  { id: "3", entity: "Acme Robotics Inc", bank: "Citibank", accountName: "EUR FX", iban: "DE89370400440532013000", currency: "EUR", balance: 96420.18 },

  // Globex Trading Ltd
  { id: "4", entity: "Globex Trading Ltd", bank: "Barclays", accountName: "Operating", iban: "GB29BARC20040112345678", currency: "GBP", balance: 318745.9 },
  { id: "5", entity: "Globex Trading Ltd", bank: "Barclays", accountName: "Payroll", iban: "GB29BARC20040187654321", currency: "GBP", balance: 142300.0 },
  { id: "6", entity: "Globex Trading Ltd", bank: "HSBC", accountName: "Trade Finance", iban: "GB33HSBC40051512345678", currency: "USD", balance: 720000.0 },

  // Initech Software BV
  { id: "7", entity: "Initech Software BV", bank: "ING", accountName: "Operating", iban: "NL91INGB0001234567", currency: "EUR", balance: 254880.75 },
  { id: "8", entity: "Initech Software BV", bank: "ING", accountName: "Tax", iban: "NL91INGB0007654321", currency: "EUR", balance: 61500.0 },
  { id: "9", entity: "Initech Software BV", bank: "Deutsche Bank", accountName: "Euro Reserve", iban: "DE12500700100200300400", currency: "EUR", balance: 530000.0 },

  // Umbrella Health SAS
  { id: "10", entity: "Umbrella Health SAS", bank: "BNP Paribas", accountName: "Operating", iban: "FR7630006000011234567890189", currency: "EUR", balance: 173260.42 },
  { id: "11", entity: "Umbrella Health SAS", bank: "BNP Paribas", accountName: "Payroll", iban: "FR7630006000011234567890222", currency: "EUR", balance: 88940.0 },
  { id: "12", entity: "Umbrella Health SAS", bank: "Santander", accountName: "Iberia Ops", iban: "ES9121000418450200051332", currency: "EUR", balance: 45120.6 },

  // Wayne Industries GmbH
  { id: "13", entity: "Wayne Industries GmbH", bank: "Deutsche Bank", accountName: "Operating", iban: "DE44500105175407324931", currency: "EUR", balance: 905430.0 },
  { id: "14", entity: "Wayne Industries GmbH", bank: "Deutsche Bank", accountName: "CapEx", iban: "DE44500105175407329999", currency: "EUR", balance: 2100000.0 },
  { id: "15", entity: "Wayne Industries GmbH", bank: "JPMorgan Chase", accountName: "USD Holdings", iban: "US64JPMC0000900015", currency: "USD", balance: 415000.0 },
]

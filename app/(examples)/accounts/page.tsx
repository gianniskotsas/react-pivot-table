import { AccountsTable } from "./accounts-table"
import { accounts } from "./data"

export default function AccountsPage() {
  // Server component: in a real app this is where you'd fetch data
  // (async + fetch/db) before handing it to the client table.
  const data = accounts

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-lg font-semibold">Accounts</h1>
      <AccountsTable data={data} />
    </div>
  )
}

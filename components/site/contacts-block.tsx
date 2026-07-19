"use client"

import * as React from "react"
import { Mail, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  DataTable,
  defineColumns,
  type DataTableAction,
} from "@/components/data-table"

type Contact = {
  id: string
  name: string
  organization: string
  phone: string
  email: string
  website: string
}

// Same people/companies as the Pipeline block's deals — this block is the
// other half of the same CRM narrative: one contact per open or closed deal.
const CONTACTS: Contact[] = [
  { id: "1", name: "Jordan Lee", organization: "Acme Robotics", phone: "+14155550132", email: "jordan.lee@acmerobotics.com", website: "https://www.acmerobotics.com" },
  { id: "2", name: "Sam Patel", organization: "Globex Trading", phone: "+12125550148", email: "sam.patel@globextrading.com", website: "https://www.globextrading.com" },
  { id: "3", name: "Alex Kim", organization: "Initech Software", phone: "+16465550119", email: "alex.kim@initechsoftware.com", website: "https://www.initechsoftware.com" },
  { id: "4", name: "Taylor Brooks", organization: "Umbrella Health", phone: "+13105550176", email: "taylor.brooks@umbrellahealth.com", website: "https://www.umbrellahealth.com" },
  { id: "5", name: "Morgan Reyes", organization: "Wayne Industries", phone: "+12065550193", email: "morgan.reyes@wayneindustries.com", website: "https://www.wayneindustries.com" },
  { id: "6", name: "Casey Nolan", organization: "Stark Manufacturing", phone: "+14045550157", email: "casey.nolan@starkmfg.com", website: "https://www.starkmfg.com" },
  { id: "7", name: "Riley Foster", organization: "Hooli Cloud", phone: "+16175550184", email: "riley.foster@hoolicloud.com", website: "https://www.hoolicloud.com" },
  { id: "8", name: "Drew Sanders", organization: "Soylent Foods", phone: "+17205550161", email: "drew.sanders@soylentfoods.com", website: "https://www.soylentfoods.com" },
  { id: "9", name: "Jamie Ortiz", organization: "Vandelay Industries", phone: "+13055550142", email: "jamie.ortiz@vandelayindustries.com", website: "https://www.vandelayindustries.com" },
  { id: "10", name: "Cameron Blake", organization: "Massive Dynamic", phone: "+14255550178", email: "cameron.blake@massivedynamic.com", website: "https://www.massivedynamic.com" },
]

const ORGANIZATIONS = Array.from(new Set(CONTACTS.map((c) => c.organization))).map((org) => ({
  label: org,
  value: org,
}))

const col = defineColumns<Contact>()
const columns = [
  col.text("name", { header: "Person" }),
  col.text("organization", { header: "Organization" }),
  col.phone("phone", { header: "Phone" }),
  col.email("email", { header: "Email" }),
  col.url("website", { header: "URL" }),
]

const actions: DataTableAction<Contact>[] = [
  {
    id: "sequence",
    label: "Add to sequence",
    icon: Mail,
    onClick: ({ rows }) =>
      toast(`Added ${rows.length} contact${rows.length === 1 ? "" : "s"} to sequence`),
  },
  {
    id: "delete",
    label: "Delete",
    icon: Trash2,
    variant: "destructive",
    onClick: ({ rows }) =>
      toast(`Deleted ${rows.length} contact${rows.length === 1 ? "" : "s"}`),
  },
]

export function ContactsBlock() {
  const [data, setData] = React.useState(CONTACTS)

  const handleUpdateData = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setData((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, [columnId]: value } : row))
      )
    },
    []
  )

  return (
    <div className="w-full space-y-4 rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <div>
        <h3 className="font-semibold">Contacts</h3>
        <p className="text-sm text-muted-foreground">
          One contact per deal in the pipeline — organization, phone, email, and site.
        </p>
      </div>

      <DataTable<Contact>
        data={data}
        columns={columns}
        getRowId={(row) => row.id}
        editable
        onUpdateData={handleUpdateData}
        enableRowSelection
        enablePagination={false}
        actions={actions}
        filterableColumns={[
          { id: "organization", label: "Organization", type: "select", options: ORGANIZATIONS },
        ]}
      />
    </div>
  )
}

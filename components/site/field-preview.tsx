"use client"

import type * as React from "react"

import { defineColumns } from "@/components/data-table"

import { FieldDemoTable } from "./field-demo-table"

const PRIORITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
]

const TAG_OPTIONS = [
  { label: "Design", value: "design" },
  { label: "Backend", value: "backend" },
  { label: "Urgent", value: "urgent" },
]

const DEMOS: Record<string, () => React.ReactNode> = {
  text: () => {
    const col = defineColumns<{ value: string }>()
    return (
      <FieldDemoTable
        columns={[col.text("value")]}
        data={[{ value: "Acme Robotics Inc" }, { value: "Globex Trading Ltd" }]}
      />
    )
  },
  "long-text": () => {
    const col = defineColumns<{ value: string }>()
    return (
      <FieldDemoTable
        columns={[col.longText("value")]}
        data={[
          {
            value:
              "Migrate the auth service to OAuth2 and retire the legacy session cookies.",
          },
        ]}
      />
    )
  },
  url: () => {
    const col = defineColumns<{ value: string }>()
    return (
      <FieldDemoTable
        columns={[col.url("value")]}
        data={[
          { value: "https://ui.kotsas.com" },
          { value: "https://github.com" },
        ]}
      />
    )
  },
  email: () => {
    const col = defineColumns<{ value: string }>()
    return (
      <FieldDemoTable
        columns={[col.email("value")]}
        data={[{ value: "hello@kotsas.com" }]}
      />
    )
  },
  phone: () => {
    const col = defineColumns<{ value: string }>()
    return (
      <FieldDemoTable
        columns={[col.phone("value")]}
        data={[{ value: "+14155552671" }]}
      />
    )
  },
  number: () => {
    const col = defineColumns<{ value: number }>()
    return (
      <FieldDemoTable
        columns={[col.number("value")]}
        data={[{ value: 1234.5 }, { value: 42 }]}
      />
    )
  },
  currency: () => {
    const col = defineColumns<{ value: number }>()
    return (
      <FieldDemoTable
        columns={[col.currency("value", { currency: "USD" })]}
        data={[{ value: 4200 }, { value: 118500 }]}
      />
    )
  },
  percent: () => {
    const col = defineColumns<{ value: number }>()
    return (
      <FieldDemoTable
        columns={[col.percent("value")]}
        data={[{ value: 0.42 }, { value: 0.9 }]}
      />
    )
  },
  duration: () => {
    const col = defineColumns<{ value: number }>()
    return (
      <FieldDemoTable
        columns={[col.duration("value")]}
        data={[{ value: 5400 }, { value: 86400 }]}
      />
    )
  },
  "single-select": () => {
    const col = defineColumns<{ value: string }>()
    return (
      <FieldDemoTable
        columns={[col.singleSelect("value", { options: PRIORITY_OPTIONS })]}
        data={[{ value: "high" }, { value: "urgent" }]}
      />
    )
  },
  "multi-select": () => {
    const col = defineColumns<{ value: string[] }>()
    return (
      <FieldDemoTable
        columns={[col.multiSelect("value", { options: TAG_OPTIONS })]}
        data={[{ value: ["design", "urgent"] }, { value: ["backend"] }]}
      />
    )
  },
  checkbox: () => {
    const col = defineColumns<{ value: boolean }>()
    return (
      <FieldDemoTable
        columns={[col.checkbox("value")]}
        data={[{ value: true }, { value: false }]}
      />
    )
  },
  rating: () => {
    const col = defineColumns<{ value: number }>()
    return (
      <FieldDemoTable
        columns={[col.rating("value")]}
        data={[{ value: 4 }, { value: 2 }]}
      />
    )
  },
  date: () => {
    const col = defineColumns<{ value: string }>()
    return (
      <FieldDemoTable
        columns={[col.date("value")]}
        data={[{ value: "2026-07-04" }, { value: "2026-08-20" }]}
      />
    )
  },
  button: () => {
    const col = defineColumns<{ id: string }>()
    return (
      <FieldDemoTable
        columns={[col.button("action", { label: "View", onClick: () => {} })]}
        data={[{ id: "1" }]}
      />
    )
  },
}

export function FieldPreview({ id }: { id: string }) {
  const Demo = DEMOS[id]
  return Demo ? Demo() : null
}

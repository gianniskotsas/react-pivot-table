import { describe, expect, it } from "vitest"
import * as dataTable from "./index"

describe("data-table barrel", () => {
  it("re-exports the public surface", () => {
    for (const name of [
      "DataTable",
      "defineColumns",
      "ColumnHeader",
      "ColumnsMenu",
      "ColumnsMenuContent",
      "useDataTable",
      "useGridNavigation",
      "DataTableRuntimeContext",
      "useDataTableRuntime",
      "PopoverButtonTrigger",
      "buildRowGutterColumn",
      "ROW_GUTTER_COLUMN_ID",
      "aggregate",
      "AGGREGATION_METHOD_LABELS",
      "ALL_AGGREGATION_METHODS",
      "useFooterAggregation",
      "DataTableFooter",
      "createUndoStack",
      "parseTsv",
      "gridToTsv",
      "planPaste",
      "exportCsv",
      "downloadCsv",
    ]) {
      expect(dataTable).toHaveProperty(name)
    }
  })
})

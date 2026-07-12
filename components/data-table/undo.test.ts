import { describe, expect, it } from "vitest"

import { createUndoStack, type CellEdit } from "./undo"

const EDIT_A: CellEdit = { rowId: "1", columnId: "name", prev: "Bailey", next: "Baily" }
const EDIT_B: CellEdit = { rowId: "2", columnId: "age", prev: 30, next: 31 }

describe("createUndoStack", () => {
  it("starts with nothing to undo or redo", () => {
    const stack = createUndoStack()
    expect(stack.canUndo()).toBe(false)
    expect(stack.canRedo()).toBe(false)
    expect(stack.undo()).toBeNull()
    expect(stack.redo()).toBeNull()
  })

  it("push then undo returns the pushed batch and enables redo", () => {
    const stack = createUndoStack()
    stack.push([EDIT_A])
    expect(stack.canUndo()).toBe(true)
    expect(stack.undo()).toEqual([EDIT_A])
    expect(stack.canUndo()).toBe(false)
    expect(stack.canRedo()).toBe(true)
  })

  it("redo returns the same batch that was undone", () => {
    const stack = createUndoStack()
    stack.push([EDIT_A])
    stack.undo()
    expect(stack.redo()).toEqual([EDIT_A])
    expect(stack.canRedo()).toBe(false)
    expect(stack.canUndo()).toBe(true)
  })

  it("undo/redo pop in LIFO order across multiple batches", () => {
    const stack = createUndoStack()
    stack.push([EDIT_A])
    stack.push([EDIT_B])
    expect(stack.undo()).toEqual([EDIT_B])
    expect(stack.undo()).toEqual([EDIT_A])
    expect(stack.undo()).toBeNull()
    expect(stack.redo()).toEqual([EDIT_A])
    expect(stack.redo()).toEqual([EDIT_B])
  })

  it("a new push after an undo clears the redo stack (branching history is discarded, not kept)", () => {
    const stack = createUndoStack()
    stack.push([EDIT_A])
    stack.undo()
    expect(stack.canRedo()).toBe(true)
    stack.push([EDIT_B])
    expect(stack.canRedo()).toBe(false)
    expect(stack.redo()).toBeNull()
  })

  it("pushing an empty batch is a no-op", () => {
    const stack = createUndoStack()
    stack.push([])
    expect(stack.canUndo()).toBe(false)
  })

  it("pushing an empty batch does not clear an existing redo stack", () => {
    const stack = createUndoStack()
    stack.push([EDIT_A])
    stack.undo()
    expect(stack.canRedo()).toBe(true)
    stack.push([])
    expect(stack.canRedo()).toBe(true)
    expect(stack.redo()).toEqual([EDIT_A])
  })

  it("undo/redo apply a multi-edit batch atomically, as one step", () => {
    const stack = createUndoStack()
    stack.push([EDIT_A, EDIT_B])
    expect(stack.canUndo()).toBe(true)
    expect(stack.undo()).toEqual([EDIT_A, EDIT_B])
    expect(stack.canUndo()).toBe(false)
    expect(stack.canRedo()).toBe(true)
    expect(stack.redo()).toEqual([EDIT_A, EDIT_B])
  })

  it("caps history at maxSize, dropping the oldest batch first", () => {
    const stack = createUndoStack(2)
    stack.push([{ rowId: "1", columnId: "a", prev: 0, next: 1 }])
    stack.push([{ rowId: "1", columnId: "a", prev: 1, next: 2 }])
    stack.push([{ rowId: "1", columnId: "a", prev: 2, next: 3 }])
    // Only the last 2 pushes survive — the first (0->1) was evicted.
    expect(stack.undo()).toEqual([{ rowId: "1", columnId: "a", prev: 2, next: 3 }])
    expect(stack.undo()).toEqual([{ rowId: "1", columnId: "a", prev: 1, next: 2 }])
    expect(stack.undo()).toBeNull()
  })

  it("clear() empties both the undo and redo stacks", () => {
    const stack = createUndoStack()
    stack.push([EDIT_A])
    stack.undo()
    stack.clear()
    expect(stack.canUndo()).toBe(false)
    expect(stack.canRedo()).toBe(false)
  })
})

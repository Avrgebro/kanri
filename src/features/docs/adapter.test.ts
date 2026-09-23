import { DataStore } from "@svar-ui/filemanager-store"
import { describe, expect, it } from "vitest"

import { folderIdAt, nearestFolder, ROOT, toDocsTree } from "@/features/docs/adapter"
import type { DocFile, DocFolder } from "@/types/domain"

const folder = (id: string, name: string, parent_id: string | null = null) =>
  ({ id, name, parent_id, created_at: "2026-09-01T00:00:00Z" }) as DocFolder

const file = (id: string, name: string, folder_id: string | null = null) =>
  ({
    id,
    name,
    folder_id,
    size_bytes: 2048,
    storage_path: `p/${id}-${name}`,
    updated_at: "2026-09-02T00:00:00Z",
  }) as DocFile

/** A minimal svelte-style writable, which is what SVAR's store is built on. */
const writable = (value: unknown) => {
  const subs = new Set<(v: unknown) => void>()
  return {
    set: (next: unknown) => ((value = next), subs.forEach((s) => s(next))),
    update: (fn: (v: unknown) => unknown) => ((value = fn(value)), subs.forEach((s) => s(value))),
    subscribe: (fn: (v: unknown) => void) => (subs.add(fn), fn(value), () => subs.delete(fn)),
  }
}

/** Load the adapter's output into SVAR's own store, as the component will. */
function load(folders: DocFolder[], files: DocFile[]) {
  const tree = toDocsTree(folders, files)
  const store = new DataStore(writable as never)
  store.init({ data: tree.entities, panels: [] } as never)
  return { tree, store }
}

describe("toDocsTree", () => {
  const folders = [folder("f1", "Contracts"), folder("f2", "Signed", "f1"), folder("f3", "Design")]
  const files = [file("a", "sow.pdf", "f2"), file("b", "brief.docx"), file("c", "logo.png", "f3")]

  it("addresses every entry by its path, which SVAR parses back to the same tree", () => {
    const { store } = load(folders, files)
    expect(store.getFile("/Contracts/Signed/sow.pdf")).toMatchObject({
      name: "sow.pdf",
      parent: "/Contracts/Signed",
      type: "file",
      ext: "pdf",
    })
    expect(store.getFile("/Contracts/Signed")).toMatchObject({ parent: "/Contracts", type: "folder" })
    expect(store.getFile("/brief.docx")).toMatchObject({ parent: ROOT })
  })

  it("resolves each path back to its row", () => {
    const tree = toDocsTree(folders, files)
    expect(tree.byPath.get("/Design/logo.png")).toMatchObject({ kind: "file", id: "c" })
    expect(folderIdAt(tree, "/Contracts/Signed")).toBe("f2")
    expect(folderIdAt(tree, ROOT)).toBeNull()
    expect(folderIdAt(tree, "/brief.docx")).toBeUndefined()
  })

  it("lists folders before their contents regardless of row order", () => {
    // Children first in the input: SVAR adds entries to an existing parent, so
    // a child listed before its folder would have nowhere to go.
    const { store } = load([folder("f2", "Signed", "f1"), folder("f1", "Contracts")], [])
    expect(store.getFile("/Contracts/Signed")).toBeTruthy()
  })

  it("leaves out a file whose folder is missing", () => {
    const { tree } = load([], [file("x", "lost.txt", "gone")])
    expect(tree.entities).toEqual([])
  })
})

describe("nearestFolder", () => {
  const tree = toDocsTree([folder("f1", "Contracts"), folder("f2", "Signed", "f1")], [])

  it("keeps a folder that still exists", () => {
    expect(nearestFolder(tree, "/Contracts/Signed")).toBe("/Contracts/Signed")
  })

  it("climbs to the deepest surviving ancestor", () => {
    expect(nearestFolder(tree, "/Contracts/Old/Drafts")).toBe("/Contracts")
    expect(nearestFolder(tree, "/Gone")).toBe(ROOT)
    expect(nearestFolder(tree, ROOT)).toBe(ROOT)
  })
})

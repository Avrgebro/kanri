import type { IEntity } from "@svar-ui/react-filemanager"

import type { DocFile, DocFolder } from "@/types/domain"

/**
 * Adapter boundary: SVAR's File Manager addresses every entry by its path
 * ("/Contracts/sow.pdf") and derives name and parent from it. The database
 * addresses rows by id with a parent reference. This file maps one to the
 * other; nothing else should build or parse a path.
 *
 * Paths are unique because the schema makes them so: names are single
 * segments, unique among siblings across folders and files alike.
 */

export type DocRef = { kind: "folder"; id: string } | { kind: "file"; id: string; file: DocFile }

export interface DocsTree {
  entities: IEntity[]
  /** Every path SVAR can hand back, resolved to the row it names. */
  byPath: Map<string, DocRef>
}

export const ROOT = "/"

const join = (parent: string, name: string) => (parent === ROOT ? `/${name}` : `${parent}/${name}`)

export function toDocsTree(folders: DocFolder[], files: DocFile[]): DocsTree {
  const children = new Map<string | null, DocFolder[]>()
  for (const f of folders) children.set(f.parent_id, [...(children.get(f.parent_id) ?? []), f])

  // Walk down from the root so every folder's path is known before its
  // contents. A folder unreachable from the root (impossible under the
  // schema's tree trigger) is simply not shown.
  const folderPath = new Map<string, string>()
  const entities: IEntity[] = []
  const byPath = new Map<string, DocRef>()

  const walk = (parentId: string | null, parentPath: string) => {
    for (const f of children.get(parentId) ?? []) {
      const path = join(parentPath, f.name)
      folderPath.set(f.id, path)
      byPath.set(path, { kind: "folder", id: f.id })
      entities.push({ id: path, type: "folder", date: new Date(f.created_at) })
      walk(f.id, path)
    }
  }
  walk(null, ROOT)

  for (const file of files) {
    const parent = file.folder_id ? folderPath.get(file.folder_id) : ROOT
    if (!parent) continue
    const path = join(parent, file.name)
    byPath.set(path, { kind: "file", id: file.id, file })
    entities.push({
      id: path,
      type: "file",
      size: file.size_bytes ?? undefined,
      date: new Date(file.updated_at),
    })
  }

  return { entities, byPath }
}

/** The folder a path names, as a parent reference: null for the root. */
export function folderIdAt(tree: DocsTree, path: string): string | null | undefined {
  if (path === ROOT) return null
  const ref = tree.byPath.get(path)
  return ref?.kind === "folder" ? ref.id : undefined
}

/**
 * The deepest folder on `path` that still exists: where to stand after the
 * open folder was renamed, moved or deleted underneath the view.
 */
export function nearestFolder(tree: DocsTree, path: string): string {
  for (let p = path; p !== ROOT; p = p.slice(0, p.lastIndexOf("/")) || ROOT) {
    if (tree.byPath.get(p)?.kind === "folder") return p
  }
  return ROOT
}

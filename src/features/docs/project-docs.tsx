import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react"
import {
  Filemanager,
  getMenuOptions,
  WillowDark,
  type IApi,
  type TContextMenuType,
} from "@svar-ui/react-filemanager"
import { toast } from "sonner"

import {
  folderIdAt,
  nearestFolder,
  toDocsTree,
  type DocRef,
} from "@/features/docs/adapter"
import { signedUrl, useDocActions, type DocSelection } from "@/features/docs/queries"
import { errorMessage } from "@/lib/errors"
import type { DocFile, DocFolder } from "@/types/domain"

/**
 * Menus without the actions kanri doesn't offer. Hotkeys follow the menus in
 * SVAR, so dropping an entry also disables its shortcut.
 *
 * - Copy: a copied file would need its stored object duplicated too.
 * - Add new file: files here are uploads; an empty one has nothing in it.
 *
 * Module-level: SVAR re-registers its menus whenever this function's identity
 * changes.
 */
function menuOptions(mode: TContextMenuType) {
  if (mode === "add") {
    return [
      { icon: "wxi-folder", text: "Add new folder", id: "add-folder" },
      { icon: "wxi-upload", text: "Upload file", id: "upload", comp: "upload" },
    ]
  }
  return getMenuOptions(mode).filter((o) => o.id !== "copy")
}

/**
 * The project's documents, shown in SVAR's File Manager.
 *
 * SVAR is a view here, never a second copy of the data: every action that
 * would change the tree is intercepted before SVAR applies it, written to the
 * database, and the refetched tree comes back in as new `data`. SVAR re-reads
 * it and keeps the open folder and selection.
 */
export function ProjectDocs({
  projectId,
  folders,
  files,
}: {
  projectId: string
  folders: DocFolder[]
  files: DocFile[]
}) {
  const tree = useMemo(() => toDocsTree(folders, files), [folders, files])
  const actions = useDocActions(projectId)
  const api = useRef<IApi | null>(null)

  // `init` runs once, so its handlers read the current tree and actions
  // through this ref rather than capturing the first render's.
  const latest = useRef({ tree, actions })
  useLayoutEffect(() => {
    latest.current = { tree, actions }
  })

  // If the open folder went away (renamed, moved, deleted), step up to the
  // nearest one that still exists rather than show a folder that isn't there.
  // Child effects run first, so SVAR already holds the new data here.
  useEffect(() => {
    const store = api.current
    if (!store) return
    const { panels, activePanel } = store.getState()
    const path = panels?.[activePanel ?? 0]?.path
    if (path && nearestFolder(tree, path) !== path) {
      void store.exec("set-path", { id: nearestFolder(tree, path) })
    }
  }, [tree])

  const init = useCallback((instance: IApi) => {
    const run = (work: Promise<unknown>) =>
      // The schema's rules raise messages written for the user; show them.
      void work.catch((err: unknown) => toast.error(errorMessage(err)))

    const resolve = (ids: string[]): DocSelection => {
      const refs = ids
        .map((id) => latest.current.tree.byPath.get(id))
        .filter((r): r is DocRef => r !== undefined)
      return {
        folders: refs.filter((r) => r.kind === "folder").map((r) => r.id),
        files: refs.filter((r) => r.kind === "file").map((r) => r.id),
      }
    }

    // Returning false stops SVAR applying the change to its own tree.
    instance.intercept("create-file", ({ file, parent }) => {
      const { tree, actions } = latest.current
      const parentId = folderIdAt(tree, parent)
      if (parentId === undefined) return false
      if (file.type === "folder") {
        run(actions.createFolder.mutateAsync({ parent_id: parentId, name: file.name }))
      } else if (file.file) {
        run(actions.upload.mutateAsync({ folder_id: parentId, file: file.file }))
      }
      return false
    })

    instance.intercept("rename-file", ({ id, name }) => {
      const ref = latest.current.tree.byPath.get(id)
      if (ref) run(latest.current.actions.rename.mutateAsync({ kind: ref.kind, id: ref.id, name }))
      return false
    })

    instance.intercept("move-files", ({ ids, target }) => {
      const { tree, actions } = latest.current
      const folderId = folderIdAt(tree, target)
      if (folderId !== undefined) {
        run(actions.move.mutateAsync({ ...resolve(ids), target: folderId }))
      }
      return false
    })

    instance.intercept("delete-files", ({ ids }) => {
      run(latest.current.actions.remove.mutateAsync(resolve(ids)))
      return false
    })

    instance.intercept("download-file", ({ id }) => {
      const ref = latest.current.tree.byPath.get(id)
      if (ref?.kind !== "file") return false
      run(
        signedUrl(ref.file.storage_path, ref.file.name).then((url) => {
          window.location.assign(url)
        }),
      )
      return false
    })

    instance.intercept("open-file", ({ id }) => {
      const ref = latest.current.tree.byPath.get(id)
      if (ref?.kind !== "file") return false
      // Open the tab now, inside the click, or the browser blocks it as a
      // popup; point it at the file once the signed link is back.
      const tab = window.open("", "_blank")
      if (tab) tab.opener = null
      run(
        signedUrl(ref.file.storage_path)
          .then((url) => {
            if (tab) tab.location.href = url
          })
          .catch((err: unknown) => {
            tab?.close()
            throw err
          }),
      )
      return false
    })
  }, [])

  return (
    <div className="svar-surface min-h-0 flex-1 overflow-hidden">
      <WillowDark>
        <Filemanager ref={api} data={tree.entities} menuOptions={menuOptions} init={init} />
      </WillowDark>
    </div>
  )
}

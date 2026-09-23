import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"

const BUCKET = "docs"

export const docKeys = {
  tree: (projectId: string) => ["projects", projectId, "docs"] as const,
}

/** A project's folders and files, fetched together: the tree needs both. */
export function useProjectDocs(projectId: string) {
  return useQuery({
    queryKey: docKeys.tree(projectId),
    queryFn: async () => {
      const [folders, files] = await Promise.all([
        supabase.from("doc_folders").select("*").eq("project_id", projectId),
        supabase.from("doc_files").select("*").eq("project_id", projectId),
      ])
      if (folders.error) throw folders.error
      if (files.error) throw files.error
      return { folders: folders.data, files: files.data }
    },
  })
}

/** What an action applies to, split by table. */
export interface DocSelection {
  folders: string[]
  files: string[]
}

/**
 * Every docs write, one mutation per action. Each refetches the tree when it
 * lands: the File Manager is a pure view of the database, so it redraws from
 * what was actually stored, never from its own guess.
 */
export function useDocActions(projectId: string) {
  const qc = useQueryClient()
  const onSettled = () => qc.invalidateQueries({ queryKey: docKeys.tree(projectId) })

  const createFolder = useMutation({
    mutationFn: async ({ parent_id, name }: { parent_id: string | null; name: string }) => {
      const { error } = await supabase
        .from("doc_folders")
        .insert({ project_id: projectId, parent_id, name })
      if (error) throw error
    },
    onSettled,
  })

  const upload = useMutation({
    mutationFn: async ({ folder_id, file }: { folder_id: string | null; file: File }) => {
      // The object key is the row id alone; the name lives on the row, so a
      // rename never has to touch storage.
      const id = crypto.randomUUID()
      const storage_path = `${projectId}/${id}`
      const stored = await supabase.storage
        .from(BUCKET)
        .upload(storage_path, file, { contentType: file.type || undefined })
      if (stored.error) throw stored.error

      const { error } = await supabase.from("doc_files").insert({
        id,
        project_id: projectId,
        folder_id,
        name: file.name,
        storage_path,
        mime_type: file.type || null,
        size_bytes: file.size,
      })
      if (error) {
        // No row, so nothing can reach the object: take it back out.
        await supabase.storage.from(BUCKET).remove([storage_path])
        throw error
      }
    },
    onSettled,
  })

  const rename = useMutation({
    mutationFn: async ({ kind, id, name }: { kind: "folder" | "file"; id: string; name: string }) => {
      const { error } =
        kind === "folder"
          ? await supabase.from("doc_folders").update({ name }).eq("id", id)
          : await supabase.from("doc_files").update({ name }).eq("id", id)
      if (error) throw error
    },
    onSettled,
  })

  const move = useMutation({
    mutationFn: async ({ folders, files, target }: DocSelection & { target: string | null }) => {
      const { error } = await supabase.rpc("move_docs", {
        p_folders: folders,
        p_files: files,
        // Omitted means null: the project root.
        p_target: target ?? undefined,
      })
      if (error) throw error
    },
    onSettled,
  })

  const remove = useMutation({
    mutationFn: async ({ folders, files }: DocSelection) => {
      const { data: paths, error } = await supabase.rpc("delete_docs", {
        p_folders: folders,
        p_files: files,
      })
      if (error) throw error
      // Rows are gone; the objects are now unreachable, so a failure here
      // leaves orphaned storage rather than a broken listing.
      if (paths.length) {
        const stored = await supabase.storage.from(BUCKET).remove(paths)
        if (stored.error) throw stored.error
      }
    },
    onSettled,
  })

  return { createFolder, upload, rename, move, remove }
}

/**
 * A short-lived link to a file. `download` makes the browser save it under
 * its current name; otherwise it opens inline where the browser can show it.
 */
export async function signedUrl(storagePath: string, download?: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60, download ? { download } : undefined)
  if (error) throw error
  return data.signedUrl
}

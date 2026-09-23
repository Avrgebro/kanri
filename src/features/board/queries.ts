import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { PositionWrite } from "@/features/board/board-model"
import { taskKeys } from "@/features/tasks/queries"
import { supabase } from "@/lib/supabase"
import type { Task, TaskStatus } from "@/types/domain"

export interface MoveTaskInput {
  taskId: string
  status: TaskStatus
  epic_id: string | null
  writes: PositionWrite[]
}

const applyMove = ({ taskId, status, epic_id, writes }: MoveTaskInput) => {
  const positions = new Map(writes.map((w) => [w.id, w.position]))
  return (tasks: Task[] = []) =>
    tasks.map((t) => {
      const position = positions.get(t.id) ?? t.position
      return t.id === taskId ? { ...t, status, epic_id, position } : { ...t, position }
    })
}

/**
 * Move a card. The cache is patched synchronously, in the same tick as the
 * drop, so the board never renders the card back in its old cell while the
 * write is in flight; the write itself is a single atomic `move_task` call.
 * On failure the cache is restored from the snapshot taken before the patch.
 */
export function useMoveTask(projectId: string) {
  const qc = useQueryClient()
  const key = taskKeys.tasks(projectId)

  const mutation = useMutation({
    mutationFn: async ({ taskId, status, epic_id, writes }: MoveTaskInput) => {
      const { error } = await supabase.rpc("move_task", {
        p_task: taskId,
        p_status: status,
        p_ids: writes.map((w) => w.id),
        p_positions: writes.map((w) => w.position),
        // Omitted means null: the "No epic" lane.
        p_epic: epic_id ?? undefined,
      })
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })

  return (input: MoveTaskInput, onError: (err: unknown) => void) => {
    // Cancel before patching: cancelling reverts an in-flight refetch, which
    // would otherwise land on top of the patch with pre-drop data.
    void qc.cancelQueries({ queryKey: key })
    const previous = qc.getQueryData<Task[]>(key)
    qc.setQueryData<Task[]>(key, applyMove(input))

    mutation.mutate(input, {
      onError: (err) => {
        qc.setQueryData(key, previous)
        onError(err)
      },
    })
  }
}

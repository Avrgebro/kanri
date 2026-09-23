import { describe, expect, it } from "vitest"

import {
  dependents,
  endOfGroup,
  nextSubtaskPosition,
  waitingOn,
} from "@/features/tasks/task-model"
import type { DependencyType, Task } from "@/types/domain"

const task = (id: string, over: Partial<Task> = {}) =>
  ({ id, parent_id: null, epic_id: null, status: "todo", position: 1024, ...over }) as Task

const dep = (task_id: string, depends_on: string, type: DependencyType = "finish_to_start") => ({
  task_id,
  depends_on,
  type,
})

describe("waitingOn", () => {
  it("lists the unfinished predecessors of a finish-to-start dependency", () => {
    const a = task("a")
    const b = task("b")
    const waiting = waitingOn([a, b, task("x")], [dep("x", "a"), dep("x", "b")])
    expect(waiting.get("x")).toEqual([a, b])
  })

  it("stops waiting once the predecessor is done", () => {
    const waiting = waitingOn([task("a", { status: "done" }), task("x")], [dep("x", "a")])
    expect(waiting.has("x")).toBe(false)
  })

  it("never marks a done task", () => {
    const waiting = waitingOn([task("a"), task("x", { status: "done" })], [dep("x", "a")])
    expect(waiting.has("x")).toBe(false)
  })

  it.each<DependencyType>(["start_to_start", "finish_to_finish", "start_to_finish"])(
    "ignores %s, which constrains the schedule rather than starting",
    (type) => {
      expect(waitingOn([task("a"), task("x")], [dep("x", "a", type)]).size).toBe(0)
    },
  )
})

describe("dependents", () => {
  it("follows dependencies transitively, whatever their type", () => {
    const deps = [dep("b", "a"), dep("c", "b", "start_to_start"), dep("z", "y")]
    expect(dependents("a", deps)).toEqual(new Set(["b", "c"]))
  })

  it("terminates on a cycle already in the data", () => {
    expect(dependents("a", [dep("b", "a"), dep("a", "b")])).toEqual(new Set(["a", "b"]))
  })
})

describe("positions", () => {
  it("sends a task to the end of its new status and epic group", () => {
    const tasks = [
      task("a", { status: "review", epic_id: "e", position: 1024 }),
      task("b", { status: "review", epic_id: "e", position: 4096 }),
      task("other-epic", { status: "review", epic_id: "f", position: 9000 }),
      task("subtask", { status: "review", epic_id: "e", parent_id: "a", position: 9000 }),
      task("x", { status: "todo", epic_id: "e", position: 99999 }),
    ]
    expect(endOfGroup(tasks, tasks[4], "review", "e")).toBe(4096 + 1024)
  })

  it("starts an empty group at the first rank", () => {
    const x = task("x", { position: 5000 })
    expect(endOfGroup([x], x, "done", null)).toBe(1024)
  })

  it("adds a subtask after its siblings", () => {
    const tasks = [task("p"), task("s", { parent_id: "p", position: 2048 })]
    expect(nextSubtaskPosition(tasks, "p")).toBe(3072)
    expect(nextSubtaskPosition(tasks, "s")).toBe(1024)
  })
})

import { DataStore } from "@svar-ui/gantt-store"
import { describe, expect, it } from "vitest"

import {
  formatDay,
  formatStart,
  parseDay,
  toDependencyType,
  toGanttData,
  toTaskDates,
  type GanttData,
} from "@/features/gantt/adapter"
import type { DependencyType, Epic, Task } from "@/types/domain"

const task = (id: string, over: Partial<Task> = {}) =>
  ({
    id,
    title: id,
    parent_id: null,
    epic_id: null,
    status: "todo",
    position: 1,
    start_date: null,
    due_date: null,
    ...over,
  }) as Task

const epic = (id: string, position = 1) => ({ id, name: id, position }) as Epic

type Dep = { id: string; task_id: string; depends_on: string; type: DependencyType }

/** A minimal svelte-style writable, which is what SVAR's store is built on. */
const writable = (value: unknown) => {
  const subs = new Set<(v: unknown) => void>()
  return {
    set: (next: unknown) => ((value = next), subs.forEach((s) => s(next))),
    update: (fn: (v: unknown) => unknown) => ((value = fn(value)), subs.forEach((s) => s(value))),
    subscribe: (fn: (v: unknown) => void) => (subs.add(fn), fn(value), () => subs.delete(fn)),
  }
}

/**
 * Every fixture goes through SVAR's own store, not just our adapter. The
 * adapter's output being well-typed never proved SVAR accepts it: an `open`
 * flag on a leaf passed our tests and crashed SVAR's tree walk in the browser.
 */
function build(tasks: Task[], epics: Epic[] = [], deps: Dep[] = []): GanttData {
  const data = toGanttData(tasks, epics, deps)
  const store = new DataStore(writable as never)
  expect(() =>
    store.init({
      tasks: data.tasks,
      links: data.links,
      scales: [{ unit: "day", step: 1, format: "d" }],
      cellWidth: 40,
      cellHeight: 36,
    } as never),
  ).not.toThrow()
  return data
}

const row = (data: GanttData, id: string) => data.tasks.find((r) => r.id === id)

describe("dates", () => {
  it.each(["2026-01-01", "2026-03-08", "2026-11-01", "2026-12-31"])(
    "round-trips %s in the local timezone",
    (day) => expect(formatDay(parseDay(day))).toBe(day),
  )

  it("maps an inclusive due date to SVAR's exclusive end, and back", () => {
    const data = build([task("t", { start_date: "2026-09-01", due_date: "2026-09-05" })])
    const { start, end } = row(data, "t")!
    expect(formatDay(end!)).toBe("2026-09-06")
    expect(toTaskDates(start!, end!)).toEqual({ start_date: "2026-09-01", due_date: "2026-09-05" })
    expect(formatStart(start)).toBe("Sep 1")
  })

  it("draws a task with only a due date as a one-day bar on that day", () => {
    const data = build([task("t", { due_date: "2026-10-03" })])
    expect(formatDay(row(data, "t")!.start!)).toBe("2026-10-03")
    expect(formatDay(row(data, "t")!.end!)).toBe("2026-10-04")
  })
})

describe("undated tasks", () => {
  it("are left off the chart and counted, never drawn with invented dates", () => {
    const data = build([task("dated", { due_date: "2026-10-03" }), task("undated")])
    expect(data.tasks.map((r) => r.id)).toEqual(["dated"])
    expect(data.hidden).toBe(1)
  })

  it("appear as a derived summary when their subtasks have dates", () => {
    const data = build([
      task("p"),
      task("s1", { parent_id: "p", start_date: "2026-09-01", due_date: "2026-09-02", status: "done" }),
      task("s2", { parent_id: "p", start_date: "2026-09-08", due_date: "2026-09-09" }),
    ])
    const p = row(data, "p")!
    expect(formatDay(p.start!)).toBe("2026-09-01")
    expect(formatDay(p.end!)).toBe("2026-09-10")
    expect(p.progress).toBe(50)
    expect(data.derivedIds.has("p")).toBe(true)
    expect(data.hidden).toBe(0)
  })

  it("take their subtasks with them when the whole family is undated", () => {
    const data = build([task("p"), task("s", { parent_id: "p" })])
    expect(data.tasks).toEqual([])
    expect(data.hidden).toBe(2)
  })
})

describe("epics", () => {
  it("span their dated tasks and are derived", () => {
    const data = build(
      [
        task("a", { epic_id: "e", start_date: "2026-09-01", due_date: "2026-09-03" }),
        task("b", { epic_id: "e", start_date: "2026-09-10", due_date: "2026-09-12" }),
      ],
      [epic("e")],
    )
    const e = row(data, "e")!
    expect(formatDay(e.start!)).toBe("2026-09-01")
    expect(formatDay(e.end!)).toBe("2026-09-13")
    expect(row(data, "a")!.parent).toBe("e")
    expect(data.derivedIds.has("e")).toBe(true)
  })

  it("are dropped when they have no dated work", () => {
    const data = build([task("b", { epic_id: "e" })], [epic("e")])
    expect(row(data, "e")).toBeUndefined()
  })
})

describe("open flag", () => {
  it("is set only on rows that actually have children", () => {
    const data = build(
      [
        task("p", { epic_id: "e1", start_date: "2026-09-01", due_date: "2026-09-02" }),
        // Dated work in e2 whose only row nests under a parent in e1, so e2
        // has no direct children and must not be marked open.
        task("s", { epic_id: "e2", parent_id: "p", start_date: "2026-09-03", due_date: "2026-09-04" }),
        task("leaf", { start_date: "2026-09-05", due_date: "2026-09-06" }),
      ],
      [epic("e1", 1), epic("e2", 2)],
    )
    const parents = new Set(data.tasks.map((r) => String(r.parent)))
    for (const r of data.tasks) expect(r.open === true).toBe(parents.has(String(r.id)))
  })
})

describe("links", () => {
  it("drop any link that touches a hidden task", () => {
    const data = build(
      [task("x", { due_date: "2026-09-01" }), task("y", { due_date: "2026-09-05" }), task("z")],
      [],
      [
        { id: "kept", task_id: "y", depends_on: "x", type: "finish_to_start" },
        { id: "dropped", task_id: "z", depends_on: "x", type: "finish_to_start" },
      ],
    )
    expect(data.links).toEqual([{ id: "kept", source: "x", target: "y", type: "e2s" }])
  })

  it.each<DependencyType>(["finish_to_start", "start_to_start", "finish_to_finish", "start_to_finish"])(
    "round-trips %s",
    (type) => {
      const data = build(
        [task("a", { due_date: "2026-01-01" }), task("b", { due_date: "2026-01-02" })],
        [],
        [{ id: "l", task_id: "a", depends_on: "b", type }],
      )
      expect(toDependencyType(data.links[0].type)).toBe(type)
    },
  )
})

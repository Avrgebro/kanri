import { describe, expect, it } from "vitest"

import {
  buildLanes,
  buildLayout,
  cellId,
  NO_EPIC,
  planMove,
} from "@/features/board/board-model"
import type { Epic, Task } from "@/types/domain"

const task = (id: string, over: Partial<Task> = {}) =>
  ({ id, parent_id: null, epic_id: null, status: "todo", position: 1, ...over }) as Task

const epic = (id: string, position = 1) => ({ id, name: id, color: "#000", position }) as Epic

const cell = cellId("epicA", "todo")

describe("planMove", () => {
  it("ranks a card between its neighbours with a single write", () => {
    const pos = new Map([["a", 1024], ["b", 2048], ["x", 9999]])
    const plan = planMove("x", cell, ["a", "x", "b"], pos)
    expect(plan.writes).toEqual([{ id: "x", position: 1536 }])
  })

  it("takes status and epic from the target cell", () => {
    const plan = planMove("x", cell, ["x"], new Map())
    expect(plan).toMatchObject({ status: "todo", epic_id: "epicA" })
  })

  it("maps the no-epic lane to a null epic", () => {
    expect(planMove("x", cellId(NO_EPIC, "done"), ["x"], new Map()).epic_id).toBeNull()
  })

  it("ranks above the last card and below the first", () => {
    const pos = new Map([["a", 1024], ["b", 2048], ["x", 0]])
    expect(planMove("x", cell, ["x", "a", "b"], pos).writes[0].position).toBeLessThan(1024)
    expect(planMove("x", cell, ["a", "b", "x"], pos).writes[0].position).toBeGreaterThan(2048)
  })

  it("renumbers the cell before repeated inserts exhaust float precision", () => {
    // Keep dropping into the same shrinking gap. Positions collapse into one
    // another after ~50 halvings, so a rebalance must happen well before.
    let lo = 1024
    let hi = 2048
    for (let step = 0; step < 60; step++) {
      const plan = planMove("x", cell, ["a", "x", "b"], new Map([["a", lo], ["b", hi], ["x", 0]]))
      if (plan.writes.length > 1) {
        expect(step).toBeLessThan(40)
        return
      }
      hi = plan.writes[0].position
      expect(hi).not.toBe(lo)
    }
    throw new Error("never rebalanced")
  })

  it("renumbers the whole cell evenly, in drop order", () => {
    const plan = planMove("x", cell, ["a", "x", "b"], new Map([["a", 1], ["b", 1.00001], ["x", 0]]))
    expect(plan.writes).toEqual([
      { id: "a", position: 1024 },
      { id: "x", position: 2048 },
      { id: "b", position: 3072 },
    ])
  })
})

describe("buildLayout", () => {
  const lanes = buildLanes([epic("epicA")])

  it("gives subtasks no card of their own", () => {
    const layout = buildLayout(
      [task("p", { epic_id: "epicA" }), task("s", { parent_id: "p", epic_id: "epicA" })],
      lanes,
    )
    expect(layout[cellId("epicA", "todo")]).toEqual(["p"])
  })

  it("puts a task whose epic no longer exists in the no-epic lane", () => {
    const layout = buildLayout([task("o", { epic_id: "deleted" })], lanes)
    expect(layout[cellId(NO_EPIC, "todo")]).toEqual(["o"])
  })

  it("orders cards by position", () => {
    const layout = buildLayout(
      [task("late", { position: 3 }), task("early", { position: 1 }), task("mid", { position: 2 })],
      lanes,
    )
    expect(layout[cellId(NO_EPIC, "todo")]).toEqual(["early", "mid", "late"])
  })
})

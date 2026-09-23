import { useState, type KeyboardEvent, type ReactNode } from "react"
import { IconAlertCircleFilled, IconX, type Icon } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { describeDue, type DueState } from "@/features/tasks/task-model"
import { formatDay, parseDay, shortDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { Task } from "@/types/domain"

/*
 * The sheet's fields. Text fields hold a draft only while being edited and
 * commit it on blur; the rest commit on pick. Outside editing they show the
 * saved value, so a write that fails and is rolled back shows as reverted.
 */

/** A ghost control: no chrome until hovered, like a property in a list. */
export const ghost =
  "h-8 rounded-md border border-transparent bg-transparent px-2 text-sm shadow-none hover:bg-input/50 hover:text-foreground aria-expanded:bg-input/50 dark:bg-transparent dark:hover:bg-input/50"

/** Enter commits a single-line draft by blurring it, which saves. */
const blurOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") e.currentTarget.blur()
}

/**
 * A draft that exists only between focus and blur. `value` is what shows the
 * rest of the time: the saved value, straight from the cache.
 */
function useDraft(saved: string) {
  const [draft, setDraft] = useState<string | null>(null)
  return {
    value: draft ?? saved,
    bind: {
      onFocus: () => setDraft(saved),
      onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
    },
    /** Ends editing and returns what was typed. */
    end: () => {
      const typed = draft ?? saved
      setDraft(null)
      return typed
    },
  }
}

/** One row of the property list: an icon and label, then the control. */
export function Property({
  icon: Glyph,
  label,
  children,
}: {
  icon: Icon
  label: string
  children: ReactNode
}) {
  return (
    <>
      <span className="flex h-8 items-center gap-2 text-[13px] text-muted-foreground">
        <Glyph className="size-3.5" />
        {label}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">{children}</div>
    </>
  )
}

export function TitleField({ task, onSave }: { task: Task; onSave: (title: string) => void }) {
  const draft = useDraft(task.title)
  return (
    <Input
      aria-label="Title"
      value={draft.value}
      {...draft.bind}
      onKeyDown={blurOnEnter}
      onBlur={() => {
        // A task always has a title; clearing it just ends the edit, which
        // shows the saved one again.
        const title = draft.end().trim()
        if (title && title !== task.title) onSave(title)
      }}
      className="-mx-2 h-auto w-[calc(100%+1rem)] border-transparent bg-transparent px-2 py-1 text-xl leading-7 font-semibold tracking-tight shadow-none hover:bg-input/30 focus-visible:bg-input/30 md:text-xl dark:bg-transparent dark:hover:bg-input/30"
    />
  )
}

export function DescriptionField({
  task,
  onSave,
}: {
  task: Task
  onSave: (description: string | null) => void
}) {
  const draft = useDraft(task.description ?? "")
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="task-description" className="text-xs font-medium text-muted-foreground">
        Description
      </label>
      <Textarea
        id="task-description"
        value={draft.value}
        {...draft.bind}
        placeholder="Notes, links, acceptance criteria…"
        onBlur={() => {
          const description = draft.end().trim() || null
          if (description !== task.description) onSave(description)
        }}
        className="min-h-20 resize-none"
      />
    </div>
  )
}

/**
 * A calendar day picked from a popover, or cleared. `min`/`max` grey out
 * the days that would put the start after the due date; the schema enforces
 * the same rule, so this only saves a round trip.
 */
export function DateField({
  label,
  value,
  min,
  max,
  due,
  onChange,
}: {
  label: string
  value: string | null
  min?: string | null
  max?: string | null
  /** Set on the due date only: styles it overdue. */
  due?: DueState | null
  onChange: (day: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseDay(value) : undefined
  const overdue = due?.kind === "overdue"

  const pick = (day: string | null) => {
    setOpen(false)
    if (day !== value) onChange(day)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          title={label}
          className={cn(
            ghost,
            "gap-1.5 font-normal tabular-nums",
            !value && "text-muted-foreground",
            overdue && "font-semibold",
          )}
        >
          {overdue && <IconAlertCircleFilled className="size-3.5 text-destructive" />}
          {selected ? shortDate(selected) : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => pick(date ? formatDay(date) : null)}
          disabled={[
            ...(min ? [{ before: parseDay(min) }] : []),
            ...(max ? [{ after: parseDay(max) }] : []),
          ]}
        />
        {value && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => pick(null)}>
              Clear {label.toLowerCase()}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** The relative hint beside the due date: a pill when overdue, quiet when soon. */
export function DueHint({ due }: { due: DueState }) {
  return due.kind === "overdue" ? (
    <span className="rounded-full bg-destructive/35 px-2 py-0.5 text-xs font-medium">
      {describeDue(due)}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">{describeDue(due)}</span>
  )
}

export function EstimateField({
  task,
  onSave,
}: {
  task: Task
  onSave: (hours: number | null) => void
}) {
  const draft = useDraft(task.estimate_hours?.toString() ?? "")

  return (
    <div className="flex h-8 items-center gap-2">
      <div className="flex items-center gap-1 text-sm">
        <Input
          aria-label="Estimate in hours"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          value={draft.value}
          {...draft.bind}
          placeholder="Add estimate"
          onKeyDown={blurOnEnter}
          onBlur={() => {
            // Anything that isn't a non-negative number just ends the edit.
            const typed = draft.end().trim()
            const hours = typed === "" ? null : Number(typed)
            if (hours !== null && (Number.isNaN(hours) || hours < 0)) return
            if (hours !== task.estimate_hours) onSave(hours)
          }}
          // Sized to its content, so the unit sits right after the number.
          className={cn(
            ghost,
            "field-sizing-content min-w-10 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
          )}
        />
        {task.estimate_hours != null && <span>h</span>}
      </div>
      {/* Planned, not tracked: kanri logs no time. */}
      {task.estimate_hours != null && (
        <span className="text-xs text-muted-foreground">planned · steps of 0.5</span>
      )}
    </div>
  )
}

export function TagsField({ task, onSave }: { task: Task; onSave: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("")
  const [duplicate, setDuplicate] = useState<string | null>(null)

  function add() {
    const tag = draft.trim()
    setDraft("")
    if (!tag) return
    if (task.tags.includes(tag)) return setDuplicate(tag)
    setDuplicate(null)
    onSave([...task.tags, tag])
  }

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1.5 py-1 pl-1">
      {task.tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex h-[22px] items-center gap-0.5 rounded-full bg-secondary pr-[3px] pl-2 text-xs font-medium"
        >
          {tag}
          <button
            aria-label={`Remove ${tag}`}
            onClick={() => onSave(task.tags.filter((t) => t !== tag))}
            className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            <IconX className="size-[11px]" />
          </button>
        </span>
      ))}
      <input
        aria-label="Add a tag"
        value={draft}
        placeholder={task.tags.length ? "Add…" : "Add a tag"}
        onChange={(e) => {
          setDraft(e.target.value)
          setDuplicate(null)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            add()
          }
        }}
        onBlur={add}
        className="h-6 min-w-24 flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-muted-foreground"
      />
      {duplicate && (
        <span className="w-full px-1 text-xs text-muted-foreground">Already tagged “{duplicate}”.</span>
      )}
    </div>
  )
}

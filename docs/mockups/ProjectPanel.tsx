import { Area, ComposedChart, Line, ReferenceLine, XAxis, YAxis, Bar } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

// ---------- mock data (shape mirrors schema) ----------
type Status = "backlog" | "todo" | "in_progress" | "blocked" | "review" | "done"
type Epic = { id: string; name: string; color: string; taskCount: number; doneCount: number; estHours: number; actualHours: number }
type DueTask = { id: string; title: string; epicId: string; due: string; estHours: number; status: Status }

const TODAY = new Date("2026-09-23")
const project = {
  name: "Commerce replatform",
  client: "Northwind Outfitters",
  targetDate: "2026-10-23",
  estimate: { code: "EST-0042", status: "accepted", value: 38400, hoursSold: 240, rate: 160 },
}
const epics: Epic[] = [
  { id: "e1", name: "Discovery & audit", color: "var(--chart-1)", taskCount: 6, doneCount: 6, estHours: 24, actualHours: 27 },
  { id: "e2", name: "Design system", color: "var(--chart-2)", taskCount: 12, doneCount: 12, estHours: 48, actualHours: 52.5 },
  { id: "e3", name: "Checkout rebuild", color: "var(--chart-3)", taskCount: 18, doneCount: 11, estHours: 72, actualHours: 61 },
  { id: "e4", name: "Account & auth", color: "var(--chart-4)", taskCount: 14, doneCount: 8, estHours: 44, actualHours: 30 },
  { id: "e5", name: "Integrations", color: "var(--chart-5)", taskCount: 14, doneCount: 4, estHours: 52, actualHours: 16 },
]
const statusCounts: Record<Status, number> = { backlog: 9, todo: 8, in_progress: 4, blocked: 1, review: 1, done: 41 }
const openWorkHours = 71 // sum of estHours on non-done tasks
const weekly = [
  ["2026-07-06", 8], ["2026-07-13", 14], ["2026-07-20", 18], ["2026-07-27", 22], ["2026-08-03", 20], ["2026-08-10", 16],
  ["2026-08-17", 19], ["2026-08-24", 15], ["2026-08-31", 14], ["2026-09-07", 12], ["2026-09-14", 13], ["2026-09-21", 15.5],
] as const
const dueTasks: DueTask[] = [
  { id: "t1", title: "Stripe webhook retries", epicId: "e5", due: "2026-09-19", estHours: 4, status: "blocked" },
  { id: "t2", title: "Saved cards UI", epicId: "e3", due: "2026-09-22", estHours: 3, status: "in_progress" },
  { id: "t3", title: "Address autocomplete", epicId: "e3", due: "2026-09-25", estHours: 2, status: "todo" },
  { id: "t4", title: "Password reset flow", epicId: "e4", due: "2026-09-26", estHours: 5, status: "in_progress" },
  { id: "t5", title: "Tax calculation service", epicId: "e5", due: "2026-09-30", estHours: 6, status: "todo" },
  { id: "t6", title: "Order confirmation email", epicId: "e3", due: "2026-10-02", estHours: 2.5, status: "todo" },
  { id: "t7", title: "SSO — Google", epicId: "e4", due: "2026-10-06", estHours: 4, status: "backlog" },
]

// ---------- helpers ----------
const DAY = 86_400_000
const days = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY)
const fmtH = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-US", { maximumFractionDigits: 1 })
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const epicById = Object.fromEntries(epics.map((e) => [e.id, e]))

const STATUS_META: { key: Status; label: string; className: string }[] = [
  { key: "backlog", label: "Backlog", className: "bg-muted-foreground/30" },
  { key: "todo", label: "Todo", className: "bg-muted-foreground" },
  { key: "in_progress", label: "In progress", className: "bg-[var(--chart-1)]" },
  { key: "blocked", label: "Blocked", className: "bg-destructive" },
  { key: "review", label: "Review", className: "bg-[var(--chart-3)]" },
  { key: "done", label: "Done", className: "bg-primary" },
]
const HATCH = "bg-[repeating-linear-gradient(135deg,currentColor_0_3px,transparent_3px_7px)]"
const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("text-[11px] font-medium uppercase tracking-wider text-muted-foreground", className)}>{children}</span>
)

// ---------- page ----------
export default function ProjectPanel({ empty = false }: { empty?: boolean }) {
  const sold = project.estimate.hoursSold
  const logged = empty ? 0 : weekly.reduce((s, [, h]) => s + h, 0)
  const open = empty ? 0 : openWorkHours
  const forecast = logged + open
  const remaining = sold - logged
  const forecastOver = forecast - sold
  const total = empty ? 0 : Object.values(statusCounts).reduce((a, b) => a + b, 0)
  const done = empty ? 0 : statusCounts.done
  const last4 = weekly.slice(-4).reduce((s, [, h]) => s + h, 0) / 4
  const target = new Date(project.targetDate)
  const projected = empty ? null : new Date(TODAY.getTime() + (open / last4) * 7 * DAY)
  const lateDays = projected ? days(target, projected) : 0

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-6 pb-8 pt-5 tabular-nums">
      {/* identity */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{project.client}</span><span className="opacity-50">/</span>
            <span className="font-mono text-[11px]">{project.estimate.code}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
            <Badge variant="outline" className="text-muted-foreground">{empty ? "Planning" : "Active"}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Open estimate</Button>
          <Button size="sm" variant={empty ? "outline" : "default"}>Log time</Button>
        </div>
      </div>

      {/* hero + side metrics */}
      <div className="flex flex-wrap gap-3">
        <BudgetHero {...{ sold, logged, open, forecast, remaining, forecastOver, empty, openTasks: total - done }} />
        <Card className="min-w-0 flex-[1_1_300px] gap-0 py-0">
          <div className="flex flex-1 flex-col gap-1 px-[18px] py-4">
            <div className="flex items-center justify-between"><Label>Estimate value</Label><Badge variant="secondary" className="capitalize">{project.estimate.status}</Badge></div>
            <div className="text-[26px] font-semibold tracking-tight">{money(project.estimate.value)}</div>
            <div className="text-xs text-muted-foreground">
              {sold}h × {money(project.estimate.rate)}/h
              {!empty && <> · effective {money(project.estimate.value / Math.max(sold, forecast))}/h at forecast</>}
            </div>
          </div>
          <Separator />
          <div className="flex flex-1 flex-col gap-1 px-[18px] py-4">
            <Label>Open tasks</Label>
            <div className="flex items-baseline justify-between">
              <span className="text-[26px] font-semibold tracking-tight">{total - done}</span>
              <span className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{done}</span> / {total} done</span>
            </div>
            <Progress value={total ? (done / total) * 100 : 0} className="mt-1 h-1 bg-muted" />
          </div>
          <Separator />
          <div className="flex flex-1 flex-col gap-1 px-[18px] py-4">
            <div className="flex items-center justify-between">
              <Label>Target date</Label>
              {lateDays > 0 && <Badge className="border-0 bg-destructive/15 text-destructive">At risk</Badge>}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-semibold tracking-tight">{fmtDate(target)}</span>
              <span className="text-sm text-muted-foreground">{days(TODAY, target)} days left</span>
            </div>
            <div className={cn("text-xs", lateDays > 0 ? "text-destructive" : "text-muted-foreground")}>
              {!projected ? "Projection needs logged time and tasks"
                : `Projected ${fmtDate(projected)} at current burn · ${lateDays > 0 ? `${lateDays}d late` : "on schedule"}`}
            </div>
          </div>
        </Card>
      </div>

      {empty ? <EmptyState /> : (
        <>
          <div className="flex flex-wrap gap-3">
            <BurnCard sold={sold} forecast={forecast} projected={projected} target={target} avg={last4} />
            <StatusCard total={total} />
          </div>
          <div className="flex flex-wrap gap-3">
            <EpicsCard />
            <DueCard />
          </div>
        </>
      )}
    </div>
  )
}

// ---------- hero: one bar, sold line as the fixed reference ----------
function BudgetHero(p: { sold: number; logged: number; open: number; forecast: number; remaining: number; forecastOver: number; empty: boolean; openTasks: number }) {
  const { sold, logged, open, forecast, remaining, forecastOver, empty } = p
  const max = Math.max(sold, forecast) * 1.08
  const pct = (v: number) => `${(v / max) * 100}%`
  const pill = empty ? "Not started" : logged > sold ? "Over budget" : forecastOver > 0 ? "Trending over" : "On budget"
  const overBudget = remaining < 0

  return (
    <Card className="min-w-0 flex-[2_1_560px] gap-4 px-[22px] py-5">
      <div className="flex items-center justify-between">
        <Label>Hours · sold vs logged</Label>
        <Badge className={cn("border-0", empty ? "bg-muted text-muted-foreground" : forecastOver > 0 ? "bg-destructive/15 text-destructive" : "bg-primary/12 text-primary")}>{pill}</Badge>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className={cn("text-[64px] font-semibold leading-[0.9] tracking-[-0.045em]", overBudget && "text-destructive")}>{fmtH(Math.abs(remaining))}</span>
          <span className="text-base font-medium">{overBudget ? "hours over" : "hours left"}</span>
          <span className="text-sm text-muted-foreground">of {sold}h sold</span>
        </div>
        <p className="text-pretty text-sm text-muted-foreground">
          {empty ? "Nothing logged yet. Burn and forecast appear once tasks exist."
            : overBudget ? `Sold hours exhausted. ${fmtH(open)}h of open work remains unbilled at the current estimate.`
            : forecastOver > 0 ? `Open work is estimated at ${fmtH(open)}h — ${fmtH(forecastOver)}h more than what's left.`
            : `Open work fits within the remaining budget with ${fmtH(-forecastOver)}h to spare.`}
        </p>
      </div>

      <div className="relative pt-[22px]">
        <span className="absolute top-0 -translate-x-full whitespace-nowrap pr-2 text-[11px] font-semibold" style={{ left: pct(sold) }}>{sold}h sold</span>
        <span className="absolute top-0 whitespace-nowrap pl-2 text-[11px] text-destructive/80" style={{ left: pct(sold) }}>over budget →</span>
        <div className="relative h-4 overflow-hidden rounded bg-muted">
          <div className="absolute inset-y-0 right-0 bg-destructive/10" style={{ left: pct(sold) }} />
          <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: pct(Math.min(logged, sold)) }} />
          <div className={cn("absolute inset-y-0 text-primary/45", HATCH)} style={{ left: pct(logged), width: pct(Math.max(0, Math.min(open, sold - logged))) }} />
          <div className="absolute inset-y-0 bg-destructive" style={{ left: pct(sold), width: pct(Math.max(0, logged - sold)) }} />
          <div className={cn("absolute inset-y-0 text-destructive/70", HATCH)} style={{ left: pct(Math.max(sold, logged)), width: pct(Math.max(0, forecast - Math.max(sold, logged))) }} />
        </div>
        <div className="absolute -bottom-1 top-[18px] -ml-px w-0.5 bg-foreground" style={{ left: pct(sold) }} />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-x-5 gap-y-3">
        <HeroStat swatch={<span className="h-2.5 w-0.5 bg-foreground" />} label="Sold" value={sold} note="at $160/h" />
        <HeroStat swatch={<span className="size-2.5 rounded-sm bg-primary" />} label="Logged" value={logged} note={`${Math.round((logged / sold) * 100)}% of sold`} />
        <HeroStat swatch={<span className={cn("size-2.5 rounded-sm text-primary", HATCH)} />} label="Open work" value={open} note={empty ? "no tasks yet" : `${p.openTasks} open tasks`} />
        <HeroStat label="Forecast at completion" value={empty ? null : forecast} danger={forecastOver > 0}
          note={empty ? "needs tasks" : forecastOver > 0 ? `+${fmtH(forecastOver)}h · ${Math.round((forecastOver / sold) * 100)}% over sold` : `${fmtH(-forecastOver)}h under sold`} />
      </div>
    </Card>
  )
}

function HeroStat({ label, value, note, swatch, danger }: { label: string; value: number | null; note: string; swatch?: React.ReactNode; danger?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">{swatch}{label}</div>
      <div className={cn("text-[22px] font-semibold tracking-tight", danger && "text-destructive")}>
        {value === null ? "—" : fmtH(value)}<span className="text-sm font-medium text-muted-foreground">h</span>
      </div>
      <div className={cn("text-xs", danger ? "text-destructive" : "text-muted-foreground")}>{note}</div>
    </div>
  )
}

// ---------- burn ----------
const burnConfig = {
  cumulative: { label: "Cumulative", color: "var(--primary)" },
  projected: { label: "Projected", color: "var(--destructive)" },
  week: { label: "Logged this week", color: "var(--muted-foreground)" },
} satisfies ChartConfig

function BurnCard({ sold, forecast, projected, target, avg }: { sold: number; forecast: number; projected: Date | null; target: Date; avg: number }) {
  let cum = 0
  const data: { t: number; week?: number; cumulative?: number; projected?: number }[] = weekly.map(([d, h]) => {
    cum += h
    return { t: new Date(d).getTime(), week: h, cumulative: cum }
  })
  data[data.length - 1].projected = cum
  if (projected) data.push({ t: projected.getTime(), projected: forecast })
  const over = forecast > sold
  const xMax = Math.max(target.getTime(), projected?.getTime() ?? 0) + 6 * DAY

  return (
    <Card className="min-w-0 flex-[2_1_520px] gap-3 px-[18px] py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <CardTitle className="text-sm">Burn</CardTitle>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>4-wk avg <b className="font-semibold text-foreground">{fmtH(avg)}h</b>/wk</span>
          <span>Peak <b className="font-semibold text-foreground">{fmtH(Math.max(...weekly.map(([, h]) => h)))}h</b></span>
        </div>
      </div>
      <ChartContainer config={burnConfig} className="aspect-auto h-[240px] w-full">
        <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="t" type="number" scale="time" domain={[data[0].t, xMax]} tickLine={false} axisLine={false}
            tickFormatter={(t) => new Date(t).toLocaleDateString("en-US", { month: "short" })} fontSize={10} />
          <YAxis yAxisId="cum" domain={[0, Math.ceil(Math.max(sold, forecast) * 1.12)]} tickLine={false} axisLine={false} width={32} fontSize={10} />
          <YAxis yAxisId="wk" orientation="right" hide domain={[0, (m: number) => m * 5]} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => fmtDate(new Date(p?.[0]?.payload.t))} />} />
          <Bar yAxisId="wk" dataKey="week" fill="var(--color-week)" fillOpacity={0.45} radius={[2, 2, 0, 0]} barSize={10} />
          <Area yAxisId="cum" dataKey="cumulative" type="linear" stroke="var(--color-cumulative)" strokeWidth={2} fill="var(--color-cumulative)" fillOpacity={0.1} />
          <Line yAxisId="cum" dataKey="projected" type="linear" connectNulls dot={{ r: 3, fill: "var(--card)" }}
            stroke={over ? "var(--color-projected)" : "var(--muted-foreground)"} strokeWidth={2} strokeDasharray="4 4" />
          <ReferenceLine yAxisId="cum" y={sold} stroke="var(--foreground)" strokeWidth={1.5}
            label={{ value: `Sold ${sold}h`, position: "insideTopLeft", fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }} />
          <ReferenceLine yAxisId="cum" x={TODAY.getTime()} stroke="var(--foreground)" strokeOpacity={0.25} />
          <ReferenceLine yAxisId="cum" x={target.getTime()} stroke="var(--muted-foreground)" strokeDasharray="3 3"
            label={{ value: "Target", position: "insideBottomLeft", fill: "var(--muted-foreground)", fontSize: 10 }} />
        </ComposedChart>
      </ChartContainer>
    </Card>
  )
}

// ---------- status ----------
function StatusCard({ total }: { total: number }) {
  return (
    <Card className="min-w-0 flex-[1_1_280px] gap-3.5 px-[18px] py-4">
      <div className="flex items-baseline justify-between"><CardTitle className="text-sm">Task status</CardTitle><span className="text-xs text-muted-foreground">{total} tasks</span></div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-[3px]">
        {STATUS_META.map((s) => statusCounts[s.key] > 0 && (
          <Tooltip key={s.key}>
            <TooltipTrigger asChild><div className={s.className} style={{ flex: `${statusCounts[s.key]} 1 0` }} /></TooltipTrigger>
            <TooltipContent>{s.label} · {statusCounts[s.key]}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex flex-col">
        {STATUS_META.map((s) => {
          const n = statusCounts[s.key]
          return (
            <div key={s.key} className="grid grid-cols-[10px_1fr_36px_40px] items-center gap-2.5 border-t border-border/60 py-[7px] text-sm">
              <span className={cn("size-2 rounded-sm", s.className)} />
              <span className={cn(s.key === "blocked" && n > 0 && "text-destructive")}>{s.label}</span>
              <span className="text-right font-semibold">{n}</span>
              <span className="text-right text-xs text-muted-foreground">{Math.round((n / total) * 100)}%</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---------- epics ----------
function EpicsCard() {
  return (
    <Card className="min-w-0 flex-[3_1_560px] gap-2 px-[18px] pb-2 pt-4">
      <div className="flex items-baseline justify-between"><CardTitle className="text-sm">Progress by epic</CardTitle><span className="text-xs text-muted-foreground">{epics.length} epics</span></div>
      <Table>
        <TableHeader>
          <TableRow className="text-[11px] hover:bg-transparent">
            <TableHead className="h-8 px-0">Epic</TableHead>
            <TableHead className="h-8">Tasks done</TableHead>
            <TableHead className="h-8 text-right">Tasks</TableHead>
            <TableHead className="h-8 w-[150px] px-0 text-right">Hours actual / est.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {epics.map((e) => {
            const donePct = Math.round((e.doneCount / e.taskCount) * 100)
            const over = e.actualHours - e.estHours
            return (
              <TableRow key={e.id} className="border-border/60">
                <TableCell className="px-0 py-2.5 font-medium">
                  <span className="flex items-center gap-2"><span className="size-2 shrink-0 rounded-sm" style={{ background: e.color }} />{e.name}</span>
                </TableCell>
                <TableCell className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full" style={{ width: `${donePct}%`, background: e.color }} /></div>
                    <span className="w-8 text-right text-xs text-muted-foreground">{donePct}%</span>
                  </div>
                </TableCell>
                <TableCell className="py-2.5 text-right text-muted-foreground"><span className="font-semibold text-foreground">{e.doneCount}</span>/{e.taskCount}</TableCell>
                <TableCell className="px-0 py-2.5">
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-semibold">{fmtH(e.actualHours)}</span><span className="text-muted-foreground">/ {e.estHours}h</span>
                      {over > 0 && <span className="text-[11px] font-semibold text-destructive">+{fmtH(over)}h</span>}
                    </div>
                    <div className="relative h-[3px] w-full rounded-full bg-muted">
                      <div className={cn("absolute inset-y-0 left-0 rounded-full", over > 0 ? "bg-destructive" : "bg-muted-foreground")} style={{ width: `${Math.min(100, (e.actualHours / e.estHours) * 100)}%` }} />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

// ---------- due ----------
function DueCard() {
  const rows = dueTasks.map((t) => ({ ...t, offset: days(TODAY, new Date(t.due)), epic: epicById[t.epicId] }))
  const overdue = rows.filter((t) => t.offset < 0)
  const upcoming = rows.filter((t) => t.offset >= 0 && t.offset <= 14)

  const Row = ({ t, late }: { t: (typeof rows)[number]; late?: boolean }) => (
    <div className={cn("grid grid-cols-[1fr_auto_40px] items-center gap-3 py-2", late ? "-mx-2.5 mb-0.5 rounded-md bg-destructive/5 px-2.5" : "border-b border-border/60")}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{t.title}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="size-1.5 rounded-sm" style={{ background: t.epic.color }} />{t.epic.name}{t.status === "blocked" && " · Blocked"}
        </span>
      </div>
      {late
        ? <span className="whitespace-nowrap text-xs font-semibold text-destructive">{-t.offset}d overdue</span>
        : <span className="whitespace-nowrap text-xs text-muted-foreground"><span className="text-foreground">{fmtDate(new Date(t.due))}</span> · in {t.offset}d</span>}
      <span className="text-right font-mono text-xs text-muted-foreground">{t.estHours}h</span>
    </div>
  )

  return (
    <Card className="min-w-0 flex-[2_1_360px] gap-0 px-[18px] pb-2.5 pt-4">
      <div className="flex items-baseline justify-between pb-1.5"><CardTitle className="text-sm">Due</CardTitle><span className="text-xs text-muted-foreground">next 14 days</span></div>
      {overdue.length > 0 && <>
        <Label className="flex gap-2 pb-1 pt-2 font-semibold text-destructive">Overdue <span className="font-medium">{overdue.length}</span></Label>
        {overdue.map((t) => <Row key={t.id} t={t} late />)}
      </>}
      <Label className="flex gap-2 pb-1 pt-3 font-semibold">Upcoming <span className="font-medium">{upcoming.length}</span></Label>
      {upcoming.map((t) => <Row key={t.id} t={t} />)}
    </Card>
  )
}

// ---------- empty ----------
function EmptyState() {
  return (
    <Card className="flex-row flex-wrap items-center gap-8 p-8">
      <div className="flex max-w-[420px] flex-[1_1_300px] flex-col gap-2.5">
        <h2 className="text-lg font-semibold tracking-tight">No tasks yet</h2>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          The accepted estimate has {epics.length} sections totalling {project.estimate.hoursSold} hours. Turn them into epics and tasks to start
          tracking burn, status and due dates — or build the plan from scratch.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button>Generate from estimate</Button>
          <Button variant="outline">Add epic</Button>
        </div>
      </div>
      <div className="flex min-w-0 flex-[1_1_340px] flex-col rounded-[10px] bg-muted px-4 py-3.5">
        <div className="flex justify-between pb-2 text-[11px] text-muted-foreground"><span>Will create from {project.estimate.code}</span><span>Hours</span></div>
        {epics.map((e) => (
          <div key={e.id} className="flex items-center gap-2.5 border-t border-border py-2 text-sm">
            <span className="size-2 rounded-sm" style={{ background: e.color }} />
            <span className="flex-1">{e.name}</span>
            <span className="text-muted-foreground">{e.taskCount} tasks</span>
            <span className="w-10 text-right font-semibold">{e.estHours}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

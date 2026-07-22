import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { OverviewCharts } from "@/components/admin/OverviewCharts";
import { Card, CardContent } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Clock, Users, CheckCircle2, Timer, Monitor, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

function avgMinutes(pairs: { start: string; end: string | null }[]) {
  const durations = pairs
    .filter((p) => p.end)
    .map((p) => (new Date(p.end!).getTime() - new Date(p.start).getTime()) / 60000);
  if (!durations.length) return 0;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const { profile } = await getCurrentUserAndProfile();
  const organizationId = profile?.organization_id || "";
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ data: services }, { data: counters }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, color")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    supabase
      .from("counters")
      .select(
        "id, name, is_active, current_ticket_id, agent:profiles!counters_current_agent_id_fkey(full_name), ticket:tickets!counters_current_ticket_fk(code)"
      )
      .eq("organization_id", organizationId),
  ]);

  // Tickets carry no organization_id of their own — they belong to this org
  // only via the service they were issued against.
  const serviceIds = (services || []).map((s) => s.id as string);
  const { data: todayTickets } = serviceIds.length
    ? await supabase
        .from("tickets")
        .select(
          "id, status, service_id, created_at, called_at, served_at, finished_at"
        )
        .in("service_id", serviceIds)
        .gte("created_at", startOfDay.toISOString())
    : { data: [] };

  const tickets = todayTickets || [];
  const waitingNow = tickets.filter((t) => t.status === "waiting").length;
  const servedToday = tickets.filter((t) => t.status === "served").length;
  const avgWait = avgMinutes(
    tickets
      .filter((t) => t.called_at)
      .map((t) => ({ start: t.created_at, end: t.called_at }))
  );
  const avgServiceTime = avgMinutes(
    tickets
      .filter((t) => t.served_at && t.finished_at)
      .map((t) => ({ start: t.served_at!, end: t.finished_at }))
  );

  const byService = (services || []).map((s) => ({
    name: s.name,
    color: s.color,
    total: tickets.filter((t) => t.service_id === s.id).length,
  }));

  const stats = [
    { label: "Waiting now", value: waitingNow, icon: Users, accent: true },
    { label: "Served today", value: servedToday, icon: CheckCircle2 },
    { label: "Avg wait time", value: `${avgWait}m`, icon: Clock },
    { label: "Avg service time", value: `${avgServiceTime}m`, icon: Timer },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
          <p className="text-sm text-slate-500">
            A snapshot of today&apos;s queue activity.
          </p>
        </div>
        <Link
          href="/admin/queue"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
        >
          Go to live queue <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} />
        ))}
      </div>

      <OverviewCharts byService={byService} />

      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Counters right now
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {(counters || []).map((c) => {
              const agent = Array.isArray(c.agent) ? c.agent[0] : c.agent;
              const ticket = Array.isArray(c.ticket) ? c.ticket[0] : c.ticket;
              return (
                <div
                  key={c.id}
                  className="px-6 py-3.5 flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        c.is_active ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    <span className="font-medium text-slate-800">
                      {c.name}
                    </span>
                  </div>
                  <span className="text-slate-500">
                    {agent?.full_name || "Unassigned"}
                  </span>
                  <span className="text-slate-900 font-medium tabular-nums">
                    {ticket?.code || "—"}
                  </span>
                </div>
              );
            })}
            {(!counters || counters.length === 0) && (
              <EmptyState
                icon={Monitor}
                title="No counters yet"
                description="Add a counter to start calling customers."
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

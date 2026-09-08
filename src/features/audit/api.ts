import { supabase } from "@/lib/supabase";
import type { AuditLog } from "@/types/database";

export interface ListAuditLogsParams {
  page: number;
  pageSize: number;
  action?: string;
}

export async function listAuditLogs(
  params: ListAuditLogsParams
): Promise<{ data: AuditLog[]; count: number }> {
  const { page, pageSize, action } = params;
  let query = supabase
    .from("audit_logs")
    .select("*, actor:profiles!audit_logs_user_id_fkey(name)", { count: "exact" });

  if (action) query = query.eq("action", action);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;

  const rows = (data ?? []).map((row) => {
    const r = row as unknown as AuditLog & { actor: { name: string } | null };
    return { ...r, actor_name: r.actor?.name ?? null };
  });

  return { data: rows, count: count ?? 0 };
}

import { redirect } from "next/navigation";
import { getActor } from "@/lib/permissions";
import { AuditLogManager } from "@/components/audit-log-manager";

export default async function AuditLogsPage() {
  const actor = await getActor();
  if (actor?.role !== "admin") redirect("/dashboard");
  return <AuditLogManager />;
}

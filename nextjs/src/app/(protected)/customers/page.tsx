import { redirect } from "next/navigation";
import { CustomersManager } from "@/components/customers-manager";
import { getActor } from "@/lib/permissions";

export default async function CustomersPage() {
  const actor = await getActor();
  if (actor?.role !== "admin") redirect("/dashboard");
  return <CustomersManager/>;
}

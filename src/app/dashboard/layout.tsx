import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Header
        user={{
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          email: session.user.email,
          role: session.user.role,
        }}
        tenant={{
          name: session.tenant.name,
          status: session.tenant.status || "active",
        }}
      />
      <main className="ml-64 pt-16">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

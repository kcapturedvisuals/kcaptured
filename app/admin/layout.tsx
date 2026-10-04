import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, getAdminSession } from "@/lib/auth-utils";

export const metadata: Metadata = {
  title: "KCAPTURED Studios Admin",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionToken = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const session = await getAdminSession(sessionToken);

  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/change-password");

  return (
    <div className="min-h-screen bg-[#090909] text-[#f2f2f2]">{children}</div>
  );
}

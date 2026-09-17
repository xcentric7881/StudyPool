import Link from "next/link";
import { UserRole } from "@prisma/client";
import { logoutAction } from "@/lib/actions/auth-actions";

type Props = {
  user: { name: string; role: UserRole };
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  const isStaff = user.role === UserRole.STAFF || user.role === UserRole.ADMIN;
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/dashboard">StudyPool <span className="prototype-tag">prototype</span></Link>
          <nav className="nav">
            <Link href="/dashboard">Dashboard</Link>
            {isStaff && <Link href="/projects/new">New study</Link>}
            {user.role === UserRole.ADMIN && <Link href="/admin/roster">Admin</Link>}
            <span className="user-chip">{user.name}</span>
            <form action={logoutAction}><button className="ghost" type="submit">Sign out</button></form>
          </nav>
        </div>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}

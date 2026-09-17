import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { demoLoginAction } from "@/lib/actions/auth-actions";

const accounts = [
  { email: "admin@studypool.test", label: "Administrator", detail: "Roster, point targets and reports" },
  { email: "staff@studypool.test", label: "Researcher", detail: "Create studies, sessions and mark attendance" },
  { email: "student1@studypool.test", label: "Student 1", detail: "Browse, book, cancel and earn points" },
  { email: "student2@studypool.test", label: "Student 2", detail: "Useful for capacity and wait-list testing" }
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await currentUser()) redirect("/dashboard");
  const p = await searchParams;
  const error = typeof p.error === "string" ? p.error : null;
  return (
    <main className="auth-wrap">
      <section className="card auth-card stack">
        <div>
          <div className="auth-logo">StudyPool</div>
          <h1>Prototype sign in</h1>
          <p className="muted">Choose a synthetic test role to explore the participation workflow.</p>
        </div>
        <div className="notice">Prototype only — no real participant data. Email verification, passwords and reminders are deliberately disabled in this Render build.</div>
        {error && <div className="notice error">{error}</div>}
        <div className="stack">
          {accounts.map((account) => (
            <form action={demoLoginAction} key={account.email} className="demo-account">
              <input type="hidden" name="email" value={account.email} />
              <div><strong>{account.label}</strong><div className="muted small">{account.detail}</div></div>
              <button type="submit">Enter</button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}

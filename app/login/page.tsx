import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { requestEmailCodeAction, verifyEmailCodeAction } from "@/lib/actions/auth-actions";

type Params = Record<string, string | string[] | undefined>;
export default async function LoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  if (await currentUser()) redirect("/dashboard");
  const p = await searchParams;
  const email = typeof p.email === "string" ? p.email : "";
  const error = typeof p.error === "string" ? p.error : "";
  const sent = p.sent === "1";
  return (
    <main className="auth-wrap">
      <section className="card auth-card stack">
        <div>
          <div className="auth-logo">StudyPool</div>
          <h1>Sign in by email</h1>
          <p className="muted">Use the email address on the approved StudyPool roster. No password is needed.</p>
        </div>
        {error && <div className="notice error" role="alert">{error}</div>}
        {sent && <div className="notice">If this address is approved, a six-digit verification code has been sent. It expires in 10 minutes.</div>}
        <form action={requestEmailCodeAction} className="stack">
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" name="email" required defaultValue={email} autoComplete="email" maxLength={254} />
          <button type="submit">Send sign-in code</button>
        </form>
        {sent && <form action={verifyEmailCodeAction} className="stack">
          <input type="hidden" name="email" value={email} />
          <label htmlFor="code">Six-digit code</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
          <button type="submit">Verify and sign in</button>
        </form>}
      </section>
    </main>
  );
}

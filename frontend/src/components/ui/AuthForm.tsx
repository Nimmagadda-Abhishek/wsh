import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { login, toast, type Role } from "../../store";
import { ChoiceGroup, Field, inputCls, PrimaryBtn } from "./Modal";
import { authApi, setSession } from "../../api";

const roles: Role[] = ["Founder", "Investor", "Business", "Mentor", "Student", "Professional"];

export function AuthForm({ reason, onDone, compact = false }: { reason?: string; onDone?: () => void; compact?: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Founder");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const signedUp = await authApi.signup({
          email: email.trim(), password, fullName: name.trim(),
          accountType: role === "Business" ? "business_owner" : "user",
          memberType: ({ Founder: "founder", Business: "business", Investor: "investor", Mentor: "mentor", Student: "student", Professional: "professional" } as const)[role],
        });
        setSession(null);
        const confirmation = signedUp.emailConfirmationRequired ? " Confirm your email using the link we sent." : "";
        setNotice(`Your account is waiting for administrator approval.${confirmation}`);
        setMode("signin");
        toast("Account created. It is awaiting approval.", "success");
        return;
      }
      const result = await authApi.login(email.trim(), password);
      setSession(result.session);
      const account = await authApi.me();
      const accountRole = account?.profile?.role;
      const memberRole = account?.profile?.member_type;
      if (accountRole !== "admin" && account?.profile?.approval_status !== "approved") {
        setSession(null);
        setNotice("Your email is confirmed. Your account is still waiting for administrator approval.");
        return;
      }
      login({
        name: account?.profile?.full_name || name.trim() || result.user.email.split("@")[0],
        email: result.user.email,
        role: accountRole === "admin" ? "Admin" : memberRole === "investor" ? "Investor" : memberRole === "mentor" ? "Mentor" : memberRole === "student" ? "Student" : memberRole === "professional" ? "Professional" : accountRole === "business_owner" || memberRole === "business" ? "Business" : memberRole === "founder" ? "Founder" : role,
      });
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {reason && (
        <div className="flex items-start gap-3 rounded-lg bg-navy-50 p-3 text-[12.5px] text-navy-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" />
          <p>
            <span className="font-semibold">Members only.</span> {reason}
          </p>
        </div>
      )}
      <div className="flex rounded-md bg-slate-100 p-1 text-[12px] font-semibold">
        {(["signup", "signin"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`flex-1 rounded py-1.5 transition-all ${mode === m ? "bg-white text-navy-900 shadow-sm" : "text-slate-500"}`}>
            {m === "signup" ? "Create account" : "Sign in"}
          </button>
        ))}
      </div>
      {mode === "signup" && (
        <Field label="Full name" htmlFor="auth-name">
          <input id="auth-name" required className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </Field>
      )}
      <Field label="Email" htmlFor="auth-email">
        <input id="auth-email" type="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      </Field>
      <Field label="Password" htmlFor="auth-password">
        <input id="auth-password" type="password" required minLength={8} maxLength={72} className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
      </Field>
      {mode === "signin" && <div className="-mt-2 text-right"><Link to="/auth/reset-password" className="text-[11.5px] font-semibold text-navy-700 hover:underline">Forgot password?</Link></div>}
      {!compact && (
        <Field label="I am a">
          <ChoiceGroup options={roles} value={role} onChange={setRole} name="Role" />
        </Field>
      )}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-800">{notice}</p>}
      <PrimaryBtn>{submitting ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in & continue"}</PrimaryBtn>
      <p className="text-center text-[11px] text-slate-500">{mode === "signup" ? "Account access starts after administrator approval." : "By continuing you agree to the WS Hub terms."}</p>
    </form>
  );
}

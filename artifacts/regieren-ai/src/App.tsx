import { useEffect, useRef, useState, type ChangeEvent, type ComponentProps, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  CircleUserRound,
  Cpu,
  FileKey2,
  KeyRound,
  Link2,
  Loader2,
  LogOut,
  MessageSquare,
  PanelLeft,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  Unlink,
  Wifi,
} from 'lucide-react';
import {
  getGetChatHistoryQueryKey,
  getGetMeQueryKey,
  getGetTelegramLinkQueryKey,
  getListClaimsQueryKey,
  setAuthTokenGetter,
  useGetChatHistory,
  useGetMe,
  useGetTelegramLink,
  useListClaims,
  useLogin,
  useLogout,
  useRedeemClaim,
  useRegister,
  useSendChat,
  useStreamChat,
  useTelegramWebhook,
  useUnlinkTelegram,
  type ChatMessage,
  type Claim,
  type User,
} from '@workspace/api-client-react';
import { Link, Redirect, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const TOKEN_KEY = 'regieren_ai_token';

setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));

function errorText(error: unknown) {
  if (error instanceof Error) return error.message.replace(/^HTTP \d+ [^:]+:\s*/, '');
  return 'Something did not land. Try again.';
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className={`group flex items-center gap-3 ${compact ? 'justify-center' : ''}`} data-testid="link-logo">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_20px_hsl(var(--primary)/.22)]">
        <span className="absolute h-4 w-4 rounded-[5px] border-2 border-current opacity-90" />
        <span className="absolute h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      {!compact && <span className="text-[15px] font-extrabold tracking-[-.03em] text-sidebar-foreground">regieren<span className="text-sidebar-primary">.</span>ai</span>}
    </Link>
  );
}

function AuthFrame({ eyebrow, title, detail, children }: { eyebrow: string; title: string; detail: string; children: ReactNode }) {
  return (
    <main className="grain flex min-h-[100dvh] bg-background text-foreground">
      <section className="relative hidden w-[43%] overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 top-24 h-80 w-80 rounded-full border border-sidebar-primary/20" />
        <div className="absolute -right-12 top-40 h-56 w-56 rounded-full border border-sidebar-primary/15" />
        <div className="absolute bottom-0 left-0 h-1/2 w-full bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--sidebar-primary)/.18),transparent_65%)]" />
        <Logo />
        <div className="relative max-w-md animate-rise">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[.24em] text-sidebar-primary">private command center / 01</p>
          <h2 className="max-w-sm text-5xl font-extrabold leading-[.98] tracking-[-.07em]">Your signal,<br /><span className="text-sidebar-primary">undiluted.</span></h2>
          <p className="mt-7 max-w-xs text-sm leading-6 text-sidebar-foreground/60">A focused AI workspace with the context that makes it yours. No noise. No public timeline.</p>
        </div>
        <div className="relative flex items-center gap-3 text-[11px] text-sidebar-foreground/45">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-sidebar-primary" />
          encrypted session layer active
        </div>
      </section>
      <section className="flex w-full items-center justify-center px-5 py-12 lg:w-[57%] lg:px-12">
        <div className="w-full max-w-[430px] animate-rise">
          <div className="mb-10 lg:hidden"><Logo /></div>
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[.22em] text-primary">{eyebrow}</p>
          <h1 className="text-4xl font-extrabold tracking-[-.055em] text-foreground">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>
          <div className="mt-9">{children}</div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, ...props }: { label: string } & ComponentProps<typeof Input>) {
  return (
    <label className="block space-y-2">
      <span className="font-mono text-[10px] uppercase tracking-[.17em] text-muted-foreground">{label}</span>
      <Input {...props} className="h-12 rounded-xl border-border/80 bg-card px-4 text-sm shadow-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/15" />
    </label>
  );
}

function AuthNotice({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' }) {
  return <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-5 ${tone === 'success' ? 'border-primary/25 bg-primary/8 text-primary' : 'border-destructive/20 bg-destructive/7 text-destructive'}`}><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{children}</div>;
}

function LoginPage() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate({ data: { email, password } }, {
      onSuccess: (result) => {
        localStorage.setItem(TOKEN_KEY, result.token);
        queryClient.setQueryData(getGetMeQueryKey(), result.user);
        setLocation('/dashboard');
      },
    });
  };

  return (
    <AuthFrame eyebrow="welcome back" title="Enter your workspace." detail="Sign in to continue to your private assistant and connected context.">
      <form onSubmit={submit} className="space-y-5" data-testid="form-login">
        {login.isError && <AuthNotice>{errorText(login.error)}</AuthNotice>}
        <Field label="Email address" data-testid="input-login-email" type="email" autoComplete="email" placeholder="you@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field label="Password" data-testid="input-login-password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-[0_12px_24px_hsl(var(--primary)/.18)] transition-transform hover:-translate-y-0.5" disabled={login.isPending} data-testid="button-login-submit">
          {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {login.isPending ? 'Verifying access' : 'Sign in'}
          {!login.isPending && <ArrowUpRight className="ml-auto h-4 w-4 opacity-60" />}
        </Button>
        <p className="pt-3 text-center text-sm text-muted-foreground">No workspace yet? <Link href="/register" className="font-semibold text-primary hover:underline" data-testid="link-register">Create an account</Link></p>
      </form>
    </AuthFrame>
  );
}

function RegisterPage() {
  const [, setLocation] = useLocation();
  const register = useRegister();
  const [values, setValues] = useState({ email: '', password: '', deviceModel: '', deviceProcessor: '', rootStatus: '' });
  const update = (key: keyof typeof values) => (event: ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const data = Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== '')) as typeof values;
    register.mutate({ data }, {
      onSuccess: (result) => {
        localStorage.setItem(TOKEN_KEY, result.token);
        queryClient.setQueryData(getGetMeQueryKey(), result.user);
        setLocation('/dashboard');
      },
    });
  };

  return (
    <AuthFrame eyebrow="new workspace" title="Make the context yours." detail="Create your private command center. Device context is optional and can be added later.">
      <form onSubmit={submit} className="space-y-5" data-testid="form-register">
        {register.isError && <AuthNotice>{errorText(register.error)}</AuthNotice>}
        <Field label="Email address" data-testid="input-register-email" type="email" autoComplete="email" placeholder="you@domain.com" value={values.email} onChange={update('email')} required />
        <Field label="Password" data-testid="input-register-password" type="password" autoComplete="new-password" placeholder="8 characters minimum" value={values.password} onChange={update('password')} minLength={8} required />
        <div className="border-t border-border/70 pt-5">
          <div className="mb-4 flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /><span className="text-xs font-semibold text-foreground">Device context</span><span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">optional</span></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Model" data-testid="input-register-device-model" placeholder="Pixel 9 Pro" value={values.deviceModel} onChange={update('deviceModel')} />
            <Field label="Processor" data-testid="input-register-device-processor" placeholder="Tensor G4" value={values.deviceProcessor} onChange={update('deviceProcessor')} />
          </div>
          <div className="mt-4"><Field label="Root status" data-testid="input-register-root-status" placeholder="stock / rooted / unknown" value={values.rootStatus} onChange={update('rootStatus')} /></div>
        </div>
        <Button type="submit" className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-[0_12px_24px_hsl(var(--primary)/.18)] transition-transform hover:-translate-y-0.5" disabled={register.isPending} data-testid="button-register-submit">
          {register.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {register.isPending ? 'Preparing workspace' : 'Create workspace'}
          {!register.isPending && <ArrowUpRight className="ml-auto h-4 w-4 opacity-60" />}
        </Button>
        <p className="pt-1 text-center text-sm text-muted-foreground">Already have access? <Link href="/login" className="font-semibold text-primary hover:underline" data-testid="link-login">Sign in</Link></p>
      </form>
    </AuthFrame>
  );
}

function Sidebar({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <aside className="hidden min-h-[100dvh] w-[238px] shrink-0 flex-col bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex">
      <div className="px-3"><Logo /></div>
      <div className="mt-14 px-3 font-mono text-[9px] uppercase tracking-[.22em] text-sidebar-foreground/35">workspace</div>
      <nav className="mt-3 space-y-1">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent px-3 py-3 text-sm font-semibold text-sidebar-accent-foreground"><MessageSquare className="h-4 w-4 text-sidebar-primary" /> Assistant <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" /></div>
      </nav>
      <div className="mt-auto space-y-3">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/45 p-3">
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-sidebar-primary animate-pulse-dot" /><span className="font-mono text-[9px] uppercase tracking-wider text-sidebar-foreground/50">session secure</span></div>
          <p className="mt-2 truncate text-xs text-sidebar-foreground/70">{user.email}</p>
        </div>
        <button type="button" onClick={onLogout} className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="button-sidebar-logout"><LogOut className="h-4 w-4" /> End session</button>
      </div>
    </aside>
  );
}

function MobileHeader({ onLogout, onMenu }: { onLogout: () => void; onMenu: () => void }) {
  return <header className="flex items-center justify-between border-b border-border/70 bg-card/80 px-5 py-4 backdrop-blur lg:hidden"><button type="button" onClick={onMenu} className="focus-ring rounded-lg p-1" data-testid="button-mobile-menu"><PanelLeft className="h-5 w-5" /></button><Logo compact /><button type="button" onClick={onLogout} className="focus-ring rounded-lg p-1 text-muted-foreground" data-testid="button-mobile-logout"><LogOut className="h-5 w-5" /></button></header>;
}

function StatusPill({ children, tone = 'teal' }: { children: ReactNode; tone?: 'teal' | 'orange' | 'slate' }) {
  const toneClass = tone === 'orange' ? 'bg-accent/12 text-accent' : tone === 'slate' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary';
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.12em] ${toneClass}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{children}</span>;
}

function AccountCard({ user }: { user: User }) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5" data-testid="card-account-context">
      <div className="flex items-start justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">account context</p><h2 className="mt-2 text-lg font-bold tracking-[-.03em]">Identity & environment</h2></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary"><CircleUserRound className="h-5 w-5" /></div></div>
      <div className="mt-6 flex items-center gap-3 border-b border-border/70 pb-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{user.email.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-semibold" data-testid="text-user-email">{user.email}</p><p className="mt-0.5 font-mono text-[10px] text-muted-foreground" data-testid="text-user-id">ID / {user.userId.slice(0, 14)}</p></div><StatusPill tone="orange">{user.plan || 'standard'}</StatusPill></div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-4">
        <ContextItem icon={<Smartphone />} label="device" value={user.deviceModel || 'Not specified'} />
        <ContextItem icon={<Cpu />} label="processor" value={user.deviceProcessor || 'Not specified'} />
        <ContextItem icon={<ShieldCheck />} label="root status" value={user.rootStatus || 'Unknown'} />
        <ContextItem icon={<Wifi />} label="telegram" value={user.telegramLinked ? `@${user.telegramUsername || 'linked'}` : 'Not linked'} />
      </div>
    </section>
  );
}

function ContextItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="min-w-0"><div className="flex items-center gap-1.5 text-muted-foreground [&_svg]:h-3 [&_svg]:w-3"><span className="text-primary">{icon}</span><span className="font-mono text-[9px] uppercase tracking-wider">{label}</span></div><p className="mt-1.5 truncate text-xs font-semibold text-foreground" title={value}>{value}</p></div>;
}

function TelegramCard({ user }: { user: User }) {
  const client = useQueryClient();
  const link = useGetTelegramLink({ query: { queryKey: getGetTelegramLinkQueryKey(), enabled: !user.telegramLinked } });
  const unlink = useUnlinkTelegram();
  const webhook = useTelegramWebhook();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!link.data?.token) return;
    await navigator.clipboard?.writeText(link.data.token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const disconnect = () => {
    if (!window.confirm('Disconnect Telegram from this workspace?')) return;
    unlink.mutate(undefined, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetMeQueryKey() }); client.invalidateQueries({ queryKey: getGetTelegramLinkQueryKey() }); } });
  };
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-soft)]" data-testid="card-telegram">
      <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full border border-primary/10" />
      <div className="relative flex items-start justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">connected channel</p><h2 className="mt-2 text-lg font-bold tracking-[-.03em]">Telegram relay</h2></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#229ED9]/10 text-[#229ED9]"><Send className="h-4 w-4" /></div></div>
      {user.telegramLinked ? <div className="relative mt-6"><div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/6 px-3.5 py-3"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span><div><p className="text-sm font-semibold">@{user.telegramUsername || 'connected'}</p><p className="font-mono text-[9px] uppercase tracking-wider text-primary">relay active</p></div></div><StatusPill>linked</StatusPill></div><button type="button" onClick={disconnect} disabled={unlink.isPending} className="focus-ring mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-destructive" data-testid="button-telegram-unlink"><Unlink className="h-3.5 w-3.5" />{unlink.isPending ? 'Disconnecting' : 'Disconnect relay'}</button></div> : <div className="relative mt-5"><p className="text-xs leading-5 text-muted-foreground">Connect the relay to send and receive assistant context from your private channel.</p>{link.isError && <p className="mt-3 text-xs text-destructive">{errorText(link.error)}</p>}{link.data?.botConfigured ? <div className="mt-5 rounded-xl border border-border/70 bg-secondary/45 p-3.5"><p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">one-time link token</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate text-sm font-semibold text-primary" data-testid="text-telegram-token">{link.data.token}</code><button type="button" onClick={copy} className="focus-ring rounded-lg p-2 text-muted-foreground transition-colors hover:bg-card hover:text-primary" data-testid="button-copy-telegram-token">{copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}</button></div><p className="mt-3 text-[11px] leading-4 text-muted-foreground">Open the Regieren bot in Telegram and send this token to finish linking.</p></div> : <div className="mt-5 flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs text-muted-foreground"><CircleAlert className="h-4 w-4" /> Bot configuration is pending.</div>}{webhook.isError && <span className="hidden">{errorText(webhook.error)}</span>}</div>}
    </section>
  );
}

function ClaimsCard() {
  const client = useQueryClient();
  const claims = useListClaims({ query: { queryKey: getListClaimsQueryKey() } });
  const redeem = useRedeemClaim();
  const [serial, setSerial] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!serial.trim()) return;
    redeem.mutate({ data: { serial: serial.trim() } }, { onSuccess: () => { setSerial(''); client.invalidateQueries({ queryKey: getListClaimsQueryKey() }); } });
  };
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-soft)]" data-testid="card-claims">
      <div className="flex items-start justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">premium files</p><h2 className="mt-2 text-lg font-bold tracking-[-.03em]">Claim vault</h2></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent"><FileKey2 className="h-5 w-5" /></div></div>
      <form onSubmit={submit} className="mt-5 flex gap-2" data-testid="form-redeem-claim"><Input value={serial} onChange={(event) => setSerial(event.target.value)} placeholder="Enter file serial" className="h-10 rounded-lg border-border/80 bg-secondary/35 text-xs shadow-none" data-testid="input-claim-serial" /><Button type="submit" size="sm" className="h-10 shrink-0 rounded-lg bg-accent px-3 text-accent-foreground" disabled={redeem.isPending || !serial.trim()} data-testid="button-redeem-claim">{redeem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Redeem'}</Button></form>
      {redeem.isError && <p className="mt-3 text-xs text-destructive" data-testid="status-claim-error">{errorText(redeem.error)}</p>}
      <div className="mt-5 border-t border-border/70 pt-4">{claims.isLoading ? <div className="scan-line h-12 rounded-lg bg-muted" /> : claims.isError ? <div className="flex items-center justify-between text-xs text-destructive"><span>Could not load claims.</span><button type="button" className="font-semibold underline" onClick={() => claims.refetch()} data-testid="button-retry-claims">Retry</button></div> : claims.data?.length ? <div className="space-y-1">{claims.data.map((claim) => <ClaimRow key={claim.serial} claim={claim} />)}</div> : <div className="flex items-center gap-3 rounded-xl bg-secondary/45 px-3.5 py-3 text-xs text-muted-foreground"><FileKey2 className="h-4 w-4 text-accent" /><span data-testid="status-claims-empty">No premium files claimed yet.</span></div>}</div>
    </section>
  );
}

function ClaimRow({ claim }: { claim: Claim }) {
  return <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60" data-testid={`row-claim-${claim.serial}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent"><FileKey2 className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{claim.fileName}</p><p className="mt-0.5 font-mono text-[9px] text-muted-foreground">{claim.serial}</p></div><StatusPill tone="orange">claimed</StatusPill></div>;
}

function ChatWorkspace({ user }: { user: User }) {
  const client = useQueryClient();
  const history = useGetChatHistory({ query: { queryKey: getGetChatHistoryQueryKey() } });
  const send = useSendChat();
  const stream = useStreamChat();
  const [message, setMessage] = useState('');
  const [useLive, setUseLive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = history.data ?? [];
  const busy = send.isPending || stream.isPending;
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages.length, busy]);
  const addOptimistic = (text: string) => {
    const current = client.getQueryData<ChatMessage[]>(getGetChatHistoryQueryKey()) ?? [];
    client.setQueryData<ChatMessage[]>(getGetChatHistoryQueryKey(), [...current, { id: `local-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() }]);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    setMessage('');
    addOptimistic(trimmed);
    const onAssistant = (content: string) => {
      const current = client.getQueryData<ChatMessage[]>(getGetChatHistoryQueryKey()) ?? [];
      client.setQueryData<ChatMessage[]>(getGetChatHistoryQueryKey(), [...current, { id: `local-assistant-${Date.now()}`, role: 'assistant', content, createdAt: new Date().toISOString() }]);
    };
    if (useLive) stream.mutate({ data: { message: trimmed } }, { onSuccess: (result) => onAssistant(typeof result === 'string' ? result : String(result)), onError: () => history.refetch() });
    else send.mutate({ data: { message: trimmed } }, { onSuccess: (result) => onAssistant(result.content), onError: () => history.refetch() });
  };
  return (
    <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-soft)] lg:min-h-[calc(100dvh-178px)]" data-testid="card-chat">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-4"><div className="flex items-center gap-3"><div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Terminal className="h-4 w-4" /><span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-card bg-primary" /></div><div><p className="text-sm font-bold">Regieren assistant</p><p className="font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">private channel / ready</p></div></div><div className="hidden items-center gap-2 sm:flex"><span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">response mode</span><button type="button" onClick={() => setUseLive((current) => !current)} className={`focus-ring inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider transition-colors ${useLive ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-secondary/55 text-muted-foreground'}`} data-testid="button-toggle-stream"><span className={`h-1.5 w-1.5 rounded-full ${useLive ? 'animate-pulse-dot bg-primary' : 'bg-muted-foreground'}`} />{useLive ? 'live stream' : 'direct'}</button></div></div>
      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">{history.isLoading ? <ChatSkeleton /> : history.isError ? <div className="flex min-h-[330px] flex-col items-center justify-center text-center"><CircleAlert className="h-7 w-7 text-destructive/70" /><p className="mt-4 text-sm font-semibold">The channel is quiet.</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">We could not load your recent messages.</p><button type="button" onClick={() => history.refetch()} className="mt-4 text-xs font-semibold text-primary underline" data-testid="button-retry-chat">Retry connection</button></div> : messages.length === 0 ? <EmptyChat user={user} /> : messages.map((item) => <MessageBubble key={item.id} item={item} />)}{busy && <div className="flex items-start gap-3 animate-rise"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span><div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-secondary px-4 py-3"><span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary" /><span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary [animation-delay:200ms]" /><span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary [animation-delay:400ms]" /></div></div>}</div>
      <div className="border-t border-border/70 bg-background/40 p-4 sm:p-5"><form onSubmit={submit} className="relative" data-testid="form-chat"><Textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(event); } }} placeholder="Ask something specific..." className="min-h-[62px] resize-none rounded-xl border-border/80 bg-card pb-12 pr-14 text-sm shadow-none focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="input-chat-message" /><div className="absolute bottom-2.5 left-3 font-mono text-[9px] text-muted-foreground/60">shift + enter for a new line</div><Button type="submit" size="icon" className="absolute bottom-2.5 right-2.5 h-9 w-9 rounded-lg bg-primary text-primary-foreground" disabled={busy || !message.trim()} data-testid="button-send-chat"><Send className="h-4 w-4" /></Button></form><div className="mt-2 flex items-center justify-between px-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/55"><span>context: account + device + claims</span><span className="hidden sm:block">{useLive ? 'streaming enabled' : 'direct response'}</span></div></div>
    </section>
  );
}

function ChatSkeleton() {
  return <div className="space-y-6">{[1, 2, 3].map((item) => <div key={item} className={`flex items-start gap-3 ${item % 2 === 0 ? 'justify-end' : ''}`}><div className={`scan-line h-12 w-3/4 rounded-2xl bg-muted ${item % 2 === 0 ? 'rounded-tr-md' : 'rounded-tl-md'}`} /></div>)}</div>;
}

function EmptyChat({ user }: { user: User }) {
  return <div className="flex min-h-[330px] flex-col items-center justify-center text-center"><div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/8 text-primary"><Sparkles className="h-7 w-7" /><span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent" /></div><p className="mt-5 text-sm font-bold">A clear channel, {user.email.split('@')[0]}.</p><p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">Start with a precise question. Your account context is already in the room.</p></div>;
}

function MessageBubble({ item }: { item: ChatMessage }) {
  const assistant = item.role === 'assistant';
  return <div className={`flex items-start gap-3 animate-rise ${assistant ? '' : 'justify-end'}`} data-testid={`message-${item.id}`}><div className={`max-w-[86%] ${assistant ? 'order-2' : ''}`}><div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${assistant ? 'rounded-tl-md bg-secondary text-foreground' : 'rounded-tr-md bg-primary text-primary-foreground'}`}><p className="whitespace-pre-wrap">{item.content}</p></div><p className={`mt-1.5 font-mono text-[9px] text-muted-foreground/60 ${assistant ? '' : 'text-right'}`}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>{assistant && <span className="order-1 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>}</div>;
}

function DashboardPage() {
  const [, setLocation] = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), enabled: Boolean(localStorage.getItem(TOKEN_KEY)) } });
  const logout = useLogout();
  useEffect(() => { document.title = 'Workspace · Regieren AI'; }, []);
  const signOut = () => logout.mutate(undefined, { onSettled: () => { localStorage.removeItem(TOKEN_KEY); queryClient.clear(); setLocation('/login'); } });
  if (me.isLoading) return <LoadingScreen />;
  if (me.isError || !me.data) return <AuthRedirect />;
  return <main className="grain min-h-[100dvh] bg-background"><div className={`fixed inset-0 z-30 bg-sidebar/35 backdrop-blur-sm transition-opacity lg:hidden ${mobileMenu ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setMobileMenu(false)} /><div className={`fixed inset-y-0 left-0 z-40 w-[238px] transform bg-sidebar transition-transform lg:hidden ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}><div className="flex h-full flex-col px-4 py-5"><div className="px-3"><Logo /></div><div className="mt-14 px-3 font-mono text-[9px] uppercase tracking-[.22em] text-sidebar-foreground/35">workspace</div><div className="mt-3 flex items-center gap-3 rounded-xl bg-sidebar-accent px-3 py-3 text-sm font-semibold text-sidebar-accent-foreground"><MessageSquare className="h-4 w-4 text-sidebar-primary" /> Assistant <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" /></div><button type="button" onClick={signOut} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-sidebar-foreground/55" data-testid="button-drawer-logout"><LogOut className="h-4 w-4" /> End session</button></div></div><div className="flex min-h-[100dvh]"><Sidebar user={me.data} onLogout={signOut} /><div className="min-w-0 flex-1"><MobileHeader onLogout={signOut} onMenu={() => setMobileMenu(true)} /><div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><header className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.24em] text-primary">workspace / assistant</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.06em] sm:text-4xl">Good to see you, <span className="text-primary">{me.data.email.split('@')[0]}.</span></h1><p className="mt-2 text-sm text-muted-foreground">Your private command center is ready for a signal.</p></div><div className="flex items-center gap-2"><StatusPill>system online</StatusPill><span className="hidden font-mono text-[9px] uppercase tracking-widest text-muted-foreground sm:inline">UTC {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div></header><div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,.75fr)]"><ChatWorkspace user={me.data} /><div className="space-y-5"><AccountCard user={me.data} /><TelegramCard user={me.data} /><ClaimsCard /></div></div></div></div></div></main>;
}

function LoadingScreen() {
  return <main className="grain flex min-h-[100dvh] items-center justify-center bg-background"><div className="w-full max-w-md px-6"><div className="flex items-center gap-3"><span className="h-9 w-9 rounded-xl bg-primary/20" /><div className="scan-line h-4 w-32 rounded bg-muted" /></div><div className="mt-10 space-y-3"><div className="scan-line h-8 w-3/4 rounded bg-muted" /><div className="scan-line h-4 w-1/2 rounded bg-muted" /></div></div></main>;
}

function AuthRedirect() {
  useEffect(() => { localStorage.removeItem(TOKEN_KEY); }, []);
  return <Redirect to="/login" />;
}

function Home() {
  return localStorage.getItem(TOKEN_KEY) ? <Redirect to="/dashboard" /> : <Redirect to="/login" />;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Home} /><Route path="/login" component={LoginPage} /><Route path="/register" component={RegisterPage} /><Route path="/dashboard" component={DashboardPage} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
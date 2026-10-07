import { Link } from "@/i18n/navigation";

export default function LocaleNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg text-ink">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-ink-muted">La página que buscas no existe.</p>
      <Link href="/dashboard" className="text-accent hover:underline">
        Volver al dashboard
      </Link>
    </div>
  );
}
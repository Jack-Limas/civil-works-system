import Link from "next/link";
import es from "@/messages/es.json";
import en from "@/messages/en.json";

/**
 * Last-resort 404 rendered outside any [locale] segment, so there is no
 * active language: it shows both catalogs' texts and links to "/", which the
 * proxy redirects to the default locale.
 */
export default function RootNotFound() {
  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-bg px-6 text-center text-ink">
        <main className="space-y-3">
          <p className="text-5xl font-semibold text-accent">404</p>
          <h1 className="text-xl font-semibold">
            {es.notFound.title} · <span lang="en">{en.notFound.title}</span>
          </h1>
          <p className="text-sm text-ink-muted">{es.notFound.description}</p>
          <p lang="en" className="text-sm text-ink-muted">{en.notFound.description}</p>
          <Link href="/" className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
            {es.notFound.backHome} · {en.notFound.backHome}
          </Link>
        </main>
      </body>
    </html>
  );
}

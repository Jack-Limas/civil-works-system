import Link from "next/link";

export default function RootNotFound() {
  return (
    <html lang="es">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          backgroundColor: "#0f172a",
          color: "#f8fafc",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>404</h1>
          <p style={{ color: "#94a3b8", marginBottom: "1rem" }}>
            Página no encontrada.
          </p>
          <Link
            href="/es/dashboard"
            style={{ color: "#6366f1", textDecoration: "none" }}
          >
            Volver al inicio
          </Link>
        </div>
      </body>
    </html>
  );
}
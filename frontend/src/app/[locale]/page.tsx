import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("common");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">{t("appName")}</h1>
      <p className="text-gray-500 dark:text-gray-400">Frontend conectado correctamente 🚀</p>
    </main>
  );
}
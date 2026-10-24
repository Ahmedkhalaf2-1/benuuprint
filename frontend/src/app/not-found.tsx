import { getI18n } from "@/i18n/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-brand">404</p>
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">{t.text("Page not found")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t.text("The page you are looking for does not exist or has moved.")}</p>
      <Button asChild><Link href="/">{t.text("Back to start")}</Link></Button>
    </main>
  );
}

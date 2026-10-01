import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Goleiros • Centro de performance",
    template: "%s | Goleiros",
  },
  description: "Gestão de alunos e evolução no campo.",
  robots: { index: false, follow: false, noarchive: true },
};
export const dynamic = "force-dynamic";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

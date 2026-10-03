import type { Metadata } from "next";
export const metadata: Metadata = {
  title: {
    default: "Portal do Responsável",
    template: "%s | Portal do Responsável",
  },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default function GuardianRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

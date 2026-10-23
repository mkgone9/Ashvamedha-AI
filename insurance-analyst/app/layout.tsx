import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Ashvamedha AI | Insurance Analyst",
  description: "An educational insurance assistant that explains concepts using cited sources and flags uncertainty.",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
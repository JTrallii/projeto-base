import "./globals.css";
import type {
  Metadata,
} from "next";

import { AuthProvider } from "@/contexts/AuthContext";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const metadata: Metadata = {
  title: "Seu SaaS",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user =
    await getCurrentUser();

  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider
          initialUser={user}
        >
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
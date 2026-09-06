import type { Metadata } from "next";
import "./globals.css";
import { VoiceMascot } from "@/components/mascot/VoiceMascot";
import { FolkMusicPlayer } from "@/components/layout/FolkMusicPlayer";
import { AuthProvider } from "@/components/auth/AuthContext";

export const metadata: Metadata = {
  title: "Cogniva - Good Days, Brighter Tomorrows",
  description: "Senior care daily companion with gentle routines, memory games, and voice interaction.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#fbf9f4] text-stone-900 antialiased">
        <AuthProvider>
          {children}
          <FolkMusicPlayer />
          <VoiceMascot />
        </AuthProvider>
      </body>
    </html>
  );
}

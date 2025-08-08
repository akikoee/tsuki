import { Card, CardContent } from "@/components/ui/card";
import Header from "./components/Header";
import TransferCenter from "./components/TransferCenter";

export default function Home() {
  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-sky-50 via-pink-50 to-rose-50">
      <Header />
      {/* Sakura petals background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 14 }).map((_, index) => (
          <span
            key={index}
            className="petal"
            style={{
              left: `${(index * 7) % 100}%`,
              animationDelay: `${(index % 7) * 0.9}s`,
              animationDuration: `${10 + (index % 5) * 3}s`,
            }}
          />
        ))}
      </div>
      <main className="relative container mx-auto px-4 py-16">
        <div className="mx-auto max-w-5xl space-y-3 text-center">
          <p className="text-muted-foreground">
            Seamlessly move your playlists between Spotify and Apple Music.
            <br />
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-8xl">
          <Card className="border-rose-100 bg-white/70 backdrop-blur-md p-2">
            <CardContent className="p-6 md:p-8">
              <TransferCenter />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

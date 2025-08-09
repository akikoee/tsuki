import { Card, CardContent } from "@/components/ui/card";
import type { CSSProperties } from "react";
import Header from "./components/Header";
import TransferCenter from "./components/TransferCenter";

type PetalStyle = CSSProperties & {
  "--petal-size"?: string;
  "--endX"?: string;
  "--spin"?: string;
};

export default function Home() {
  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-sky-50 via-pink-50 to-rose-50">
      <Header />
      {/* Sakura petals background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, index) => {
          // Pseudo-random values per index to avoid obvious lines
          const rand = (seed: number) => {
            const x = Math.sin(seed * 999.1337) * 10000;
            return x - Math.floor(x);
          };
          const r1 = rand(index + 1);
          const r2 = rand(index + 2);
          const r3 = rand(index + 3);
          const r4 = rand(index + 4);
          const r5 = rand(index + 5);

          const leftPercent = Math.round(r1 * 100); // 0–100%
          const delayS = (r2 * 7).toFixed(2); // 0–7s
          const durationS = (10 + r3 * 6).toFixed(2); // 10–16s
          const sizePx = Math.round(8 + r4 * 10); // 8–18px
          const driftVw = (-(10 + r5 * 25)).toFixed(2); // -10vw to -35vw (mostly left)
          const spinDeg = Math.round(360 + r3 * 540); // 360–900deg

          const style: PetalStyle = {
            left: `${leftPercent}%`,
            animationDelay: `${delayS}s`,
            animationDuration: `${durationS}s`,
            "--petal-size": `${sizePx}px`,
            "--endX": `${driftVw}vw`,
            "--spin": `${spinDeg}deg`,
          };

          return <span key={index} className="petal" style={style} />;
        })}
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

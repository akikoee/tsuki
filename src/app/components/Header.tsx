import { Badge } from "@/components/ui/badge";

export default function Header() {
  return (
    <header className="bg-transparent">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-200 shadow-inner" />
            <span className="text-xl font-semibold text-emerald-900">
              Tsuki
            </span>
            <span className="text-sm text-muted-foreground">
              Playlist Transfer
            </span>
            <Badge className="bg-rose-100 text-rose-700 border-rose-200">
              Development Preview
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}

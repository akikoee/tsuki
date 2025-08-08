import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const loginAction = (provider: "spotify" | "apple") => {
  authClient.signIn.social({ provider });
};

export default function LoginButton(props: { provider: "spotify" | "apple" }) {
  const { provider } = props;

  return (
    <Button
      className={cn(
        "w-full cursor-pointer",
        provider === "spotify" && "bg-emerald-500 hover:bg-emerald-600",
        provider === "apple" && "bg-rose-500 hover:bg-rose-600"
      )}
      onClick={() => loginAction(provider)}
    >
      Login with {provider.charAt(0).toUpperCase() + provider.slice(1)}
    </Button>
  );
}

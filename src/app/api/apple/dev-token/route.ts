import { auth } from "@/lib/auth";
import { getUser } from "@/lib/database";
import { getAppleDeveloperToken } from "@/lib/utils";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";



export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUser(session.user.id);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const appleAccount = user.accounts.find(
    (account) => account.providerId === "apple"
  );

  if (!appleAccount) {
    return NextResponse.json(
      { error: "Apple account not found" },
      { status: 404 }
    );
  }

  const token = await getAppleDeveloperToken();
  return NextResponse.json({ token });
}

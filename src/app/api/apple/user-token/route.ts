import { auth } from "@/lib/auth/auth";
import { getUser, updateAppleMusicUserToken } from "@/lib/db/database";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { token, storefrontId } = await request.json();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getUser(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  await updateAppleMusicUserToken(user.id, token, storefrontId || "us");
  return NextResponse.json({ success: true });
}

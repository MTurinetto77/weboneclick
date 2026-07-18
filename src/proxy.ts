import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLogin = pathname.startsWith("/admin/login");
  const isAdmin = pathname.startsWith("/admin");

  if (!isAdmin || isLogin) {
    return NextResponse.next();
  }

  const role = req.auth?.user?.role;
  if (!req.auth || role !== "admin") {
    const url = new URL("/admin/login", req.nextUrl.origin);
    url.searchParams.set("error", "AccessDenied");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};

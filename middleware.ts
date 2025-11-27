import { NextResponse } from 'next/server';

export function middleware(req: Request) {
  const url = new URL(req.url);

  if (url.pathname === "/") {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};

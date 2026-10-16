import { NextResponse, type NextRequest } from "next/server";

/** Caminhos que só robôs de ataque acessam (WordPress, arquivos de configuração, painéis). */
const SCANNER_PATH =
  /^\/(wp-admin|wp-login\.php|wp-content|wp-includes|wp-json|xmlrpc\.php|\.env|\.git|\.aws|\.ssh|phpmyadmin|pma|myadmin|administrator|cgi-bin|config\.(php|json|ya?ml)|backup|dump\.sql|.*\.(php|asp|aspx|jsp|bak|old|swp)$)/i;

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (SCANNER_PATH.test(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export const config = {
  // Não intercepta assets estáticos nem imagens otimizadas.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};

export type CheckoutStatus =
  | "ready"
  | "missing_url"
  | "missing_allowed_hosts"
  | "invalid_url"
  | "insecure_url"
  | "credentials_not_allowed"
  | "unauthorized_host";

export type CheckoutResult =
  | { status: "ready"; url: string; host: string }
  | { status: Exclude<CheckoutStatus, "ready">; message: string };

export type CheckoutEnvironment = {
  checkoutUrl?: string;
  allowedHosts?: string;
};

export function getCheckoutUrl(
  environment: CheckoutEnvironment = {
    checkoutUrl: process.env.NEXT_PUBLIC_EXTERNAL_CHECKOUT_URL,
    allowedHosts: process.env.NEXT_PUBLIC_EXTERNAL_CHECKOUT_ALLOWED_HOSTS,
  },
): CheckoutResult {
  const checkoutUrl = environment.checkoutUrl?.trim();
  if (!checkoutUrl) {
    return {
      status: "missing_url",
      message: "O checkout externo ainda não foi configurado. Nenhum pedido foi iniciado.",
    };
  }

  const allowedHosts = (environment.allowedHosts ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (allowedHosts.length === 0) {
    return {
      status: "missing_allowed_hosts",
      message:
        "A lista de domínios autorizados do checkout ainda não foi configurada. Nenhum redirecionamento foi feito.",
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(checkoutUrl);
  } catch {
    return {
      status: "invalid_url",
      message: "A URL de checkout configurada não é válida. Nenhum redirecionamento foi feito.",
    };
  }

  if (parsedUrl.protocol !== "https:") {
    return {
      status: "insecure_url",
      message: "O checkout precisa utilizar HTTPS. Nenhum redirecionamento foi feito.",
    };
  }

  if (parsedUrl.username || parsedUrl.password) {
    return {
      status: "credentials_not_allowed",
      message: "A URL de checkout não pode conter credenciais. Nenhum redirecionamento foi feito.",
    };
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (!allowedHosts.includes(host)) {
    return {
      status: "unauthorized_host",
      message:
        "O domínio do checkout não está na lista de destinos autorizados. Nenhum redirecionamento foi feito.",
    };
  }

  return { status: "ready", url: parsedUrl.toString(), host };
}

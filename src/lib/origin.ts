// The public address of this site for the current request (for example https://goodsmandi.com).
//
// Behind nginx (the Azure VM) the Node server only knows its own internal address, so
// `new URL(request.url).origin` is http://localhost:3000 and redirects built from it send
// people to localhost. nginx passes the real host and scheme in the Host and
// X-Forwarded-Proto headers, so we read those.
//
// Only hosts we recognise are trusted. A request with any other Host header (someone
// forging it) falls back to the server's own address, so this can never be used to send a
// person to a site of an attacker's choosing.

const TRUSTED_HOSTS = new Set(['goodsmandi.com', 'www.goodsmandi.com'])

function isTrustedHost(host: string): boolean {
  const name = host.split(':')[0].toLowerCase()
  return (
    TRUSTED_HOSTS.has(name) ||
    name === 'localhost' ||
    name === '127.0.0.1' ||
    name.endsWith('.vercel.app') // the old Vercel copy and preview deployments
  )
}

export function publicOrigin(request: Request): string {
  const own = new URL(request.url)
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').split(',')[0].trim()
  if (!host || !isTrustedHost(host)) return own.origin

  const forwarded = (request.headers.get('x-forwarded-proto') ?? '').split(',')[0].trim()
  const protocol = forwarded === 'http' || forwarded === 'https' ? forwarded : own.protocol.replace(':', '')
  return `${protocol}://${host}`
}

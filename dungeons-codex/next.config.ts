import type { NextConfig } from 'next';

// Plain static generation (generateStaticParams) per D-003; no Cache Components.

const isDev = process.env.NODE_ENV === 'development';

/**
 * Content Security Policy (D-107). Every page is static, so a per-request nonce is impossible
 * (a nonce needs dynamic rendering), and Next's own inline flight-data scripts differ on every
 * page, so hashes cannot be listed here either. Scripts are therefore `'self'` plus inline; all
 * other directives are as tight as the site allows: the site loads nothing from another origin.
 * `style-src` needs inline for the `style=` attributes React renders (sliders, bars, tilt) and
 * for next/font's inline @font-face. `next dev` needs `unsafe-eval`; production does not.
 * `upgrade-insecure-requests` is left out on purpose: it would break the http://localhost e2e
 * run, and Vercel serves HTTPS only.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;

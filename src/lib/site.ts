/** Public origin of the deployed site; `NEXT_PUBLIC_SITE_URL` overrides it (a custom domain, a preview). */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jwt-viewer-chi.vercel.app'
).replace(/\/$/, '');

export const SITE_NAME = 'JWT Viewer';
export const SITE_TITLE = 'JWT Viewer · Decodificar, verificar y generar JSON Web Tokens';
export const SITE_DESCRIPTION =
    'Decodificá, verificá y generá JSON Web Tokens (RFC 7519) sin que el token salga de tu navegador.';

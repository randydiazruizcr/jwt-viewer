import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

/** Inter para la interfaz; JetBrains Mono para todo lo que sea token, JSON o clave. */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains-mono',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'JWT Viewer · Decodificar, verificar y generar JSON Web Tokens',
    description:
        'Decodificá, verificá y generá JSON Web Tokens (RFC 7519) sin que el token salga de tu navegador.',
};

export const viewport: Viewport = {
    themeColor: '#0a0c11',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
                {children}
            </body>
        </html>
    );
}

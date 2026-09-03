# JWT Viewer

Decodificar, verificar y generar JSON Web Tokens ([RFC 7519](https://www.rfc-editor.org/rfc/rfc7519))
sin que el token salga del navegador.

Casi todos los depuradores de JWT que hay en línea piden pegar el token en un formulario que
viaja a un servidor. Eso suele estar bien con un token de juguete, y es una mala idea con el
token de producción que acabás de sacar de un log. Esta herramienta no tiene backend: todo el
trabajo criptográfico ocurre en el cliente, sobre la Web Crypto API a través de
[`jose`](https://github.com/panva/jose). No hay llamadas de red, no hay almacenamiento, no hay
telemetría. Cerrás la pestaña y no queda nada.

## Qué hace

**Decodificar.** Pegá un token y el header y el payload aparecen como JSON formateado, editable.
Los tres segmentos se colorean por separado —ámbar, verde-agua, violeta— para poder cortar de un
vistazo la sopa de base64. Si el token está roto, el mensaje dice _cuál_ de los tres segmentos
falló y por qué: no es lo mismo un token que no tiene tres partes que uno cuyo payload no es JSON
válido.

**Verificar.** Comprobá la firma contra un secreto compartido (HS\*) o una clave pública
(RS\*, ES\*, PS\*). La verificación se dispara sola mientras escribís, y un token vencido se
reporta aparte de una firma que no coincide, porque para quien está depurando auth son dos
problemas distintos con dos soluciones distintas.

**Generar.** Editá los claims a mano y firmá un token nuevo con tu secreto o tu clave privada. El
token firmado vuelve al panel de la izquierda por el mismo camino que uno pegado, así que queda
decodificado y verificado sin que tengas que hacer nada más.

Los claims de tiempo (`iat`, `nbf`, `exp`) se traducen a lenguaje humano debajo del payload:
`1788456573` no dice nada; "venció hace veinte minutos" es justo lo que estabas buscando.

El botón **Ejemplo** carga un token HS256 firmado en el momento con un secreto público
(`jwt-viewer-demo-secret`), para probar la herramienta sin ir a buscar un token de verdad.

## Algoritmos y claves

HS256/384/512 · RS256/384/512 · ES256/384/512 · PS256/384/512

Las claves asimétricas se pegan en PEM, en los dos formatos que importa Web Crypto:

| Para      | Formato | Cabecera                      |
| --------- | ------- | ----------------------------- |
| Verificar | SPKI    | `-----BEGIN PUBLIC KEY-----`  |
| Firmar    | PKCS#8  | `-----BEGIN PRIVATE KEY-----` |

Si pegás una clave en PKCS#1 (`BEGIN RSA PUBLIC KEY`) o en el formato heredado de OpenSSL
(`BEGIN RSA/EC PRIVATE KEY`), la app no te deja adivinando: detecta el formato y te muestra el
comando exacto de `openssl` para convertirla.

Cambiar de familia de algoritmo (HS ↔ RS/ES/PS) limpia el material de clave cargado. Arrastrar un
secreto a un campo que espera un PEM solo produce errores confusos.

## Desarrollo

Requiere Node 20+ y Yarn 1.22 (el proyecto declara `packageManager`, así que Corepack lo resuelve
solo).

```bash
yarn install
yarn dev          # http://localhost:3000
```

| Comando           | Qué hace                                           |
| ----------------- | -------------------------------------------------- |
| `yarn validate`   | type-check + lint + format:check + tests unitarios |
| `yarn test`       | Vitest (unitarios y de componentes)                |
| `yarn test:watch` | Vitest en modo watch                               |
| `yarn e2e`        | Playwright (levanta `yarn dev` solo si hace falta) |
| `yarn build`      | Build de producción                                |

`yarn validate` **no incluye `yarn build`**: un `tsc --noEmit` limpio no garantiza que el build de
Next pase. Corré los dos antes de dar algo por terminado.

## Estructura

```
src/
  app/            Shell de Next (una sola ruta, toda cliente) y el sistema visual
  components/
    ui/           Primitivas propias: Button, Panel, CopyButton
    jwt-editor/   Token, header, payload, estado de la firma, claims de tiempo
    jwt-keys/     Selector de algoritmo y entrada de claves
  lib/
    jwt/          decode · verify · sign · validación de claves (sin React adentro)
    format/       Traducción de los claims de tiempo
  store/          Zustand: la única fuente de verdad de la pantalla
e2e/              Especificaciones Playwright (`*.e2e.ts`)
```

La separación importante es la de `lib/jwt`: no sabe que existe React. Se prueba entera con Vitest
contra Web Crypto de verdad —no hay mocks de criptografía en ningún lado— sin montar un solo
componente. Los componentes quedan tontos a propósito: leen del store de Zustand y disparan
acciones, nada más.

## Tests

84 tests unitarios y de componentes con Vitest, más 9 recorridos end-to-end con Playwright que
cubren lo que de verdad se rompe: el ejemplo que llega ya verificado, cambiar el secreto para
invalidar la firma, un token con estructura rota, un token con tres segmentos pero contenido roto,
el ciclo completo de editar → firmar → verificar, y un token vencido distinguido de una firma
inválida.

Tres de esos recorridos son de layout, y corren la misma comprobación en teléfono, tablet y
portátil: que el veredicto de la firma y el botón que firma estén **en pantalla sin scrollear**, y
que nada desborde a lo ancho. Es la regresión que hubo: la app vivía dentro de un `h-dvh` con un
scroll anidado que en un portátil de 1366×768 dejaba el botón fuera de la vista.

Los specs e2e llevan sufijo `.e2e.ts` en lugar de `.spec.ts` para que Vitest nunca los recoja por
error. En Windows, Vitest corre con el pool de `threads`: el de `forks` rompe al ejecutar varios
archivos a la vez.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Zustand · jose · Vitest · Playwright

Las decisiones de diseño, junto con las alternativas que se descartaron y por qué, están en
[`docs/specs/2026-09-03-jwt-viewer-design.md`](docs/specs/2026-09-03-jwt-viewer-design.md).

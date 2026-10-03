# Reto de Bienestar

Aplicación multiusuario para COOPEBANACIO R.L. Next.js, React, TypeScript, Tailwind CSS y Supabase. Los datos se guardan en PostgreSQL, no en una simulación local.

## Requisitos

Node.js 22 o posterior y pnpm 11. El archivo `pnpm-lock.yaml` fija las versiones verificadas. Se recomienda `corepack enable` y `corepack prepare pnpm@11.19.0 --activate`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

En PowerShell, usar `Copy-Item .env.example .env.local`. Abrir http://localhost:3000.

## Supabase

1. Crear un proyecto dedicado. No ejecutar estos scripts en una base de datos con tablas ajenas de aplicación.
2. Ejecutar en este orden `supabase/schema.sql`, `supabase/policies.sql`, `supabase/seed.sql` en SQL Editor, preferentemente en una única transacción `begin; ... commit;`. El esquema se instala una sola vez; el seed no duplica los retos existentes.
3. En Authentication → Sign In / Providers habilitar Anonymous Sign-Ins y Email/Password. Los participantes usan sesiones anónimas por dispositivo; los administradores usan correo/contraseña.
4. Para exposición pública, activar protección CAPTCHA de Supabase Auth (Turnstile) y límites de tasa. Añadir `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. La clave secreta del CAPTCHA se configura únicamente en Supabase, nunca en el frontend. Si no se configura CAPTCHA, revisar expresamente el riesgo de altas automatizadas y cuota.
5. En Project Settings → API Keys obtener la URL y la clave **publishable** y colocarlas en `.env.local`. También se admite la clave heredada **anon**, nunca `service_role` ni una secret key.
6. Crear una cuenta administrativa de Supabase Auth con correo y contraseña propios. Autorizar su UUID ejecutando, desde SQL Editor:

```sql
insert into public.admins(user_id) values ('UUID_REAL_DEL_USUARIO_AUTH');
```

Ningún registro público puede concederse permisos administrativos. Configurar recuperación de contraseña/SMTP en Supabase según las necesidades del organizador. La recuperación de una cuenta administrativa se realiza desde Supabase Auth, no con cédula.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública publishable o anon |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Clave pública CAPTCHA, cuando esté habilitado |

Todas las variables NEXT_PUBLIC se incorporan al compilar: hacer un nuevo deploy después de modificarlas. No hay contraseñas, claves privadas ni claves de servicio en el código.

## GitHub y Vercel

Repositorio del proyecto: https://github.com/yuipo1992-sys/reto-de-bienestar

1. Subir el proyecto completo, incluido el lockfile, excluyendo `.env.local`, `.next` y `node_modules`.
2. En Vercel, importar el repositorio y seleccionar Next.js. La raíz es esta carpeta (la que contiene package.json).
3. Instalación: `pnpm install --frozen-lockfile`. Build: `pnpm build`. Vercel detecta la salida de Next.js automáticamente.
4. Configurar las variables de entorno en Production y, si corresponde, Preview. Usar un proyecto Supabase de pruebas para previews con datos de prueba.
5. Desplegar. Registrar la URL pública como Site URL en Supabase Auth y en los dominios permitidos de Turnstile.
6. Verificar `/`, `/admin`, `/admin/desbloqueo`, `/admin/reportes`, `/admin/retos`, `/admin/participantes` y `/privacidad`.

No usar exportación estática: hay rutas dinámicas de Next.js. RLS protege los datos incluso si alguien abre directamente una ruta administrativa.

## Operación

El colaborador entra con nombre y cédula. En su primera inscripción recibe un código aleatorio personal de recuperación. Debe guardarlo; se almacena únicamente su hash en la base de datos. Su sesión mantiene el acceso en ese navegador. En otro navegador o tras cerrar sesión necesita ese código para recuperar el mismo participante, sin duplicarlo. La aplicación normaliza guiones y espacios de la cédula.

**Decisión de seguridad:** conocer nombre y cédula no demuestra identidad. Por eso se requiere código al recuperar desde otra sesión. El primer registro es autodeclarado; para verificar pertenencia laboral antes del primer acceso, integrar padrón validado o SSO institucional antes del lanzamiento. No se afirma que la cédula sola sea autenticación segura.

Los cinco retos comienzan bloqueados. El administrador los habilita en Desbloqueo; el cambio aparece en los navegadores al recuperar el foco o en un máximo aproximado de 30 segundos mientras estén abiertos. No hay desbloqueo automático por fecha. Los campos scheduled_date y order_number permiten extender futuras actividades.

Los reportes consideran **activo** al participante cuyo estado active está habilitado, no a alguien conectado en ese instante. Se puede activar/desactivar desde su detalle. Las exportaciones incluyen participantes, respuestas y la lista 5/5; CSV con BOM UTF-8 y neutralización de fórmulas para Excel. Las horas se muestran en America/Costa_Rica.

Las respuestas no pueden editarse ni repetirse. Se guarda una copia de título, instrucciones y etiquetas originales para que las ediciones posteriores no alteren lo que la persona contestó. El bingo compara nombres sin mayúsculas, acentos, espacios ni puntuación; no identifica personas reales ni detecta apodos equivalentes. El reto de áreas distintas compara las áreas escritas; no existe un directorio de departamentos.

La administración no muestra secciones adicionales. Los operadores de la base de datos pueden asistir con códigos perdidos después de verificar identidad por un canal institucional; no hay recuperación insegura basada solo en cédula. El propietario de Supabase debe definir el procedimiento de soporte.

## Logo y accesibilidad

El componente `Brand` en `src/components/ui.tsx` contiene el placeholder “Logo institucional”. Sustituirlo por el logo autorizado dentro de `public/`; no se inventó un logo. El favicon es una letra B genérica de la aplicación.

Diseño móvil, campos de 16px, etiquetas, foco visible, estados con texto e iconos, diálogo nativo con captura de foco y Escape, y respeto por movimiento reducido. Bingo: tres columnas en escritorio, dos en móvil y una en pantallas muy estrechas.

## Validación

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

Las pruebas ejecutan SQL real en PGlite/PostgreSQL con pgcrypto/unaccent y un esquema Auth mínimo de prueba. Comprueban RLS, recuperación, unicidad, validaciones, bloqueo de retos, auditoría, respuestas inmutables, desactivación y exportación CSV. No sustituyen una prueba real con Supabase Auth y Vercel.

Antes de abrir al equipo: probar dos participantes y un administrador en sesiones separadas; verificar registro/recuperación, 5/5, reabrir respuestas, bloqueo simultáneo, edición del bingo, CSV y acceso denegado entre participantes. Comunicar contacto y plazo de conservación institucionales en la página de privacidad. Revisar cuota y disponibilidad de Supabase.

## Estructura

- `src/app`: rutas y estilos.
- `src/components`: experiencia de colaboradores y administración.
- `src/lib`: Supabase, tipos, errores, validación y CSV.
- `supabase`: esquema, políticas RLS y datos iniciales.
- `tests`: pruebas de reglas y seguridad.
- `ARCHITECTURE.md`: decisiones documentadas antes de implementar.

Referencias: [Next.js](https://nextjs.org/docs/app/getting-started), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

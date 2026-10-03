# Verificación realizada

Aplicación: https://reto-de-bienestar.vercel.app

Repositorio: https://github.com/yuipo1992-sys/reto-de-bienestar

Proyecto Supabase: `xtrlvcjmwquaigtoeiqb`.

## Comprobado

- Compilación de producción de Next.js y verificación TypeScript.
- 11 pruebas automáticas: reglas SQL en PostgreSQL/PGlite, RLS, auditoría, respuestas inmutables, bingo y CSV.
- Despliegue real en Vercel conectado al repositorio y a Supabase.
- Logo institucional entregado por el usuario incorporado.
- Registro real con Supabase Auth y guardado de participante.
- Recuperación desde otra sesión con código correcto; código incorrecto rechazado sin exponer participantes.
- Una sesión sin vincular no ve participantes; un colaborador no ve secretos ni puede desbloquear retos o concederse administración.
- Rechazo real de entrega en reto bloqueado y rechazo de entregas duplicadas.
- Recorrido hasta 5/5 guardado en Supabase: reto 1 y bingo a través de la interfaz; retos 2–4 mediante el mismo cliente/API de Supabase.
- Nueve casillas del bingo; repetición rechazada por base de datos.
- Consulta de respuestas completadas desde la interfaz; modificaciones rechazadas con permisos insuficientes.
- Vista móvil de 390px sin desbordamiento horizontal; bingo en dos columnas.
- Rutas públicas y administrativas renderizadas. Las rutas administrativas se protegen por Auth + RLS; el HTML del formulario de acceso no es información privada.
- Cuenta administrativa del correo indicado por el propietario creada en Supabase Auth y autorizada en `admins`.

## Límites de esta verificación

La contraseña administrativa fue creada por el propietario y no se copió a los archivos. No se inspeccionó ni se reutilizó esa contraseña para un inicio de sesión automatizado; la autorización se verificó en Supabase. Las reglas de lectura/edición administrativa y auditoría se verificaron en las pruebas SQL. No se hizo una prueba de carga a gran escala ni se asegura disponibilidad de los proveedores.

Supabase mostró un aviso de cuota de la organización excedida en el ciclo anterior, con posible restricción desde el 1 de noviembre de 2026 si continúa el exceso. El proyecto se mostraba saludable durante las pruebas. Revisar ese estado antes de la actividad.

CAPTCHA está implementado pero no configurado: requiere claves de Turnstile del propietario y activación en Supabase. Los límites de Supabase y el límite de intentos de recuperación en SQL permanecen activos. La primera inscripción es autodeclarada; la cédula no verifica pertenencia laboral.

No hay cuentas o contraseñas administrativas hardcodeadas, datos simulados en producción ni clave privada de Supabase en el frontend. Las variables públicas se gestionan como variables de entorno.

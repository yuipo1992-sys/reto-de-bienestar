# Decisiones previas a la implementación

Next.js App Router + TypeScript + Tailwind. Vercel sirve la aplicación. Supabase Auth emite sesiones y PostgreSQL es la autoridad de permisos y validación. No se utiliza service_role en la aplicación.

## Rutas y componentes
- `/`: ingreso y pantalla única; Brand, ParticipantApp, ChallengeDialog, Progress y cápsulas semanales.
- `/admin`: ingreso seguro de administradores y redirección a Desbloqueo.
- `/admin/[section]`: solamente desbloqueo, reportes, retos, participantes. AdminApp comparte navegación lateral/compacta.
- `/privacidad`: información mínima de tratamiento de datos, sin inventar contactos o plazos institucionales.

## Datos
participants (identificación normalizada única); participant_devices (usuario Auth vinculado al participante); participant_secrets (hash de recuperación, inaccesible al cliente); challenges (configuración y definición de formularios); bingo_items; challenge_responses (participante/reto únicos, respuestas e instrucciones congeladas); admins (lista autorizada); unlock_events (auditoría).

## Seguridad
RLS en todas las tablas. Alta/recuperación mediante RPC restringida a sesiones Auth. Los colaboradores usan Auth anónimo persistente por dispositivo. Nombre y cédula bastan al inscribirse; recuperar desde otro dispositivo requiere el código secreto emitido al inscribirse. La cédula no constituye prueba de identidad: el primer registro sigue siendo autodeclarado. Si la institución exige identidad laboral verificada, debe prevalidar inscripción con su directorio/SSO antes de abrir al público. No es posible garantizar identidad con solo dos datos públicos.

Los administradores ingresan con correo/contraseña de Supabase Auth y deben estar en admins; no pueden autoconcederse ese rol. La interfaz no es la barrera de autorización. SQL valida reto abierto, campos completos, no repetición de nombres en bingo y unicidad; un bloqueo de fila serializa entregas y cierres. Respuestas son inmutables. Cambios en retos preservan el contexto de respuestas históricas.

Lecturas administrativas paginadas; exportación CSV UTF-8 BOM y escape de fórmulas. Fechas guardadas en UTC, mostradas en America/Costa_Rica. Disponibilidad se refresca al volver a la ventana y cada 30 segundos.

## Publicación
Se requiere acceso real a las cuentas de Supabase, GitHub y Vercel para crear recursos, ejecutar SQL y verificar producción. La ausencia de estas conexiones no se sustituye con datos simulados ni se presenta como un despliegue terminado.

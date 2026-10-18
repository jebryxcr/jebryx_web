# Jebryx Web

Versión web de `jebrix`, desarrollada con React, TypeScript y Vite. Utiliza **el mismo JEBRYX_API existente**, sus usuarios, perfiles, datos y rutas `/api/v1`. No contiene otro backend ni datos de demostración en la aplicación.

## Iniciar

Requisitos: Node.js 22.12+ o 24 y acceso al backend utilizado por la app móvil.

```powershell
cd C:\github\jebryx_web
npm install
Copy-Item .env.example .env.local # solo si .env.local todavía no existe
npm run dev
```

Abre `http://localhost:5173`. En este equipo `.env.local` apunta al backend local en `http://127.0.0.1:8765` y conserva el identificador web de Google del proyecto móvil. `10.0.2.2` es la dirección usada desde el emulador de Android; no la uses para el proxy que ejecuta Vite en Windows. No sobrescribas ese archivo con el ejemplo si quieres conservar esa configuración.

Variables:

| Variable                    | Uso                                                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_PROXY_TARGET`     | URL raíz del JEBRYX_API real para el proxy de desarrollo; sin `/api/v1` al final. Respeta cualquier subdirectorio de instalación. |
| `VITE_API_URL`              | Vacía en desarrollo: las peticiones `/api/v1` pasan por Vite. En producción puede indicar la URL raíz pública de la misma API.    |
| `VITE_GOOGLE_WEB_CLIENT_ID` | El cliente OAuth **web** que valida la API. Autoriza `http://localhost:5173` y el origen final de la web en Google Cloud.         |
| `VITE_COACH_SABIO_MODEL`    | Por defecto `openai/gpt-oss-120b`, según `jebryx_api/config/app.php`.                                                             |
| `VITE_COACH_DESTELLO_MODEL` | Por defecto `openai/gpt-oss-20b`, según el mismo backend.                                                                         |

Las variables `VITE_*` son públicas y se integran al compilar. No colocar claves privadas, credenciales de base de datos ni secretos de Groq.

## Configurar el acceso con Google

1. En [Google Auth Platform → Clientes](https://console.cloud.google.com/auth/clients), abre el cliente de tipo **Aplicación web** cuyo ID coincide con `VITE_GOOGLE_WEB_CLIENT_ID` de `.env.local`.
2. En **Orígenes autorizados de JavaScript**, agrega `http://localhost`, `http://localhost:5173` y, si abres la web con esa dirección, `http://127.0.0.1:5173`. Incluye también el origen HTTPS de producción cuando corresponda. Los orígenes no llevan rutas como `/login` ni `/api/v1/auth/google`.
3. Guarda los cambios y recarga la web. Usa el puerto autorizado; si Vite arranca en `5174`, ese origen también necesita autorización o debes liberar `5173` y volver a arrancar.
4. Conserva el mismo ID web en la lista `Google.clientIds` del backend (configurada mediante `GOOGLE_WEB_CLIENT_ID`). Reinicia Vite después de cambiar `.env.local`.

El flujo actual usa el botón de Google con un callback JavaScript y envía `{ idToken }` a `POST /api/v1/auth/google`. No requiere una URI de redirección ni un secreto de cliente en el frontend. Consulta la [configuración oficial de Google](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

Diagnóstico por etapa:

| Síntoma | Qué revisar |
| --- | --- |
| `The given origin is not allowed for the given client ID` / HTTP 403 de `accounts.google.com/gsi/button` | El origen exacto del navegador debe estar autorizado en el cliente web que usa la página. |
| No aparece el botón | Comprueba `VITE_GOOGLE_WEB_CLIENT_ID`, reinicia Vite y revisa si el navegador bloquea `https://accounts.google.com/gsi/client`. |
| Google permite elegir cuenta, pero `/api/v1/auth/google` no responde | Comprueba que el backend esté iniciado y que `VITE_API_PROXY_TARGET` sea accesible desde Windows. |
| La API responde `No se pudo validar la cuenta de Google.` / HTTP 401 | Revisa el ID web aceptado por el backend y su conexión HTTPS con Google. |

## Apartados y funciones

| Apartado             | Funciones                                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceso               | Login por correo, Google ID token, registro, verificación y reenvío de código, recuperación de contraseña en tres pasos, persistencia y expiración de sesión.                       |
| Inicio               | Saldo, ingresos y gastos, desglose por mes y moneda, movimientos recientes y recorrido inicial cuenta → categoría → ingreso.                                                        |
| Movimientos          | Crear, editar, eliminar, paginar, buscar, filtrar por tipo/categoría/cuenta/fechas y exportar CSV. Advertencias de saldo negativo y presupuesto.                                    |
| Cuentas              | Crear y editar, banco/efectivo/crédito/ahorro, monedas, alias, últimos dígitos, color, favoritas y archivo. El saldo existente se modifica mediante movimientos, como exige la API. |
| Categorías           | Crear, editar y eliminar, mismos nombres de iconos de la app, color y cuenta vinculada obligatoria.                                                                                 |
| Presupuestos         | Crear, editar, eliminar, gasto acumulado, disponible y porcentaje proporcionados por la API.                                                                                        |
| Recurrentes y cuotas | Crear, editar, eliminar, pausar/reanudar, frecuencias y vencimientos, registrar pagos en la API y progreso de cuotas.                                                               |
| Reportes             | Semana/mes/trimestre/año, indicadores, gráfica de ingresos y egresos, desglose, resumen IA a petición y revisión de acciones sugeridas.                                             |
| Coach IA             | Conversaciones e historial, respuesta en streaming SSE mediante `fetch`, Markdown, selección de modelo, respuestas rápidas, revisión de acciones y consumo por día/modelo.          |
| Notificaciones       | Consultar, filtrar no leídas, marcar individualmente o todas y eliminar.                                                                                                            |
| Ajustes              | Hasta 3 perfiles, nombre/color/avatar, perfil predeterminado, eliminación con nombre exacto, tema claro/oscuro/sistema, español/inglés y preferencias por usuario/perfil.           |

Un gasto con categoría utiliza la cuenta vinculada a esa categoría; un ingreso utiliza la cuenta elegida y envía `categoria_id: null`, siguiendo el comportamiento real de `MovimientosController`. Los identificadores numéricos de cuentas se normalizan a cadenas para los selectores HTML. No se convierten montos entre monedas ni se mezclan sus saldos.

Las sugerencias de IA requieren revisión: primero se crea el recurso real y después se confirma la acción con `created_resource_id`. Si falla la confirmación, se permite reintentar esa confirmación sin volver a crear el recurso.

El respaldo cifrado y la importación CSV/Excel permanecen señalados como próximos, como en la app móvil. El escaneo de recibos y las transferencias no tienen un flujo operativo/endpoints en el proyecto de origen; no se inventaron rutas para ellos. La exportación CSV sí está implementada en la web. Las opciones nativas de biometría no se simulan en el navegador.

## Identidad y animaciones de la app

- `public/logo.png` y `public/logo-glow.png` son copias de los archivos originales de `jebrix/assets/images/`, sin redibujarlos. El favicon utiliza el logo oficial.
- Los 10 avatares SVG provienen de la misma carpeta de recursos de la app. `CoachAvatar` reproduce el SVG original del coach.
- La tipografía Inter se sirve localmente y se conservan las paletas clara y oscura de `src/components/auth/tokens.ts`.
- `src/components/Motion.tsx` y `src/motion.css` adaptan `AppLoadingScreen` (3800 + 650 ms), `LoginTransition` (700 + 1400 + 1600 ms), las órbitas/partículas, el brillo, la aparición de letras, los puntos de carga y el fundido del tema (650 ms).
- Se respeta `prefers-reduced-motion`. Las animaciones de marca se pausan cuando la pestaña pasa a segundo plano. El tema utiliza View Transitions cuando está disponible y aplica el cambio directamente en los otros navegadores.
- `src/i18n.ts` conserva los recursos de traducción del proyecto móvil y sustituye la detección de idioma de Expo por la del navegador.

## Contrato con la API

Los módulos de `src/lib/api/` provienen de la app móvil y conservan métodos, campos y rutas. Las peticiones financieras incluyen `Authorization: Bearer …`, `X-Profile-Id` y `X-Timezone`. Las de autenticación y gestión de perfiles no envían `X-Profile-Id`.

Vite evita el problema de CORS en desarrollo mediante un proxy que reenvía al backend real. No se modificó el repositorio `jebryx_api`. Si la app muestra un error de conexión, revisa que la URL configurada sea accesible desde esta máquina; la comprobación inicial de `/api/v1/health` agotó el tiempo de espera en este entorno.

## Producción

```powershell
npm run build
```

Publica el contenido de `dist/` en tu hosting. Configura el servidor para devolver `index.html` en las rutas de la aplicación. El proxy de Vite existe **solo en desarrollo**.

Opciones para conectar la misma API en producción:

1. Mantener `VITE_API_URL=` y configurar un reverse proxy `/api/` en el dominio web hacia JEBRYX_API. El proxy debe preservar `Authorization`, `X-Profile-Id` y `X-Timezone`, y desactivar el buffering en el streaming del coach.
2. Establecer `VITE_API_URL=https://tu-api.example.com` antes de compilar. El servidor de esa API debe permitir el origen web mediante CORS, los métodos GET/POST/PATCH/DELETE/OPTIONS y los encabezados Authorization, Content-Type, Accept, X-Profile-Id y X-Timezone.

Para Google, agrega también el origen HTTPS del sitio al mismo cliente OAuth web y conserva el audience que valida JEBRYX_API.

## Verificaciones

```powershell
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Las pruebas de navegador usan Google Chrome instalado (`channel: chrome`) en tamaños de escritorio y móvil. Si no está instalado, instala Chrome o adapta `playwright.config.ts` para tu navegador. Las pruebas interceptan la API con respuestas ajustadas a sus contratos; **no crean ni eliminan datos de tu backend**. La app en ejecución usa la API real. No se validó un login real ni un envío real a Google/Groq sin credenciales de prueba.

Estructura principal: `src/pages/` para apartados, `src/components/` para formularios y recursos visuales, `src/lib/api/` para el cliente compartido con la app, `src/lib/store.ts` para sesión/preferencias y `tests/` para contratos y flujos de navegador.

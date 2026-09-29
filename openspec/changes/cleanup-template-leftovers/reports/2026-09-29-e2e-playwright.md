# E2E con Playwright MCP: 2026-09-29

Ejecutado por el agente con Playwright MCP (Chromium). Frontend en Vite (`127.0.0.1:5173`, proxy de `/api` a `127.0.0.1:8000`) y backend de la rama contra la base desechable `fastapi_template_e2e`, creada para este recorrido. Al arrancar, el backend migró hasta 0003 y sembró el admin. Un solo login, sin "Mantener sesión iniciada", navegando con clics.

| Paso | Qué se comprobó | Resultado |
| --- | --- | --- |
| 1-2 | Acceso a `/` sin sesión y login | Redirige a `/login`; tras el login llega a `/`. |
| 3 | Dashboard | KPI "Métrica 1" a "Métrica 4", encabezados "Elementos destacados", "Últimas acciones", "Acciones rápidas" y "Distribución", tarjeta "Añade tus funcionalidades". |
| 4 | CSS renombrado | 0 elementos con clases `home-alert*` o `home-movement*`; `.home-highlight-list` y `.home-activity-list` con `display: grid`. |
| 5 | Consola | Solo el 401 de `/api/auth/refresh` al cargar la página antes del login. |
| 6 | Barra lateral (1280x800) | `complementary "Barra lateral"` contiene `navigation "Navegación principal"` con "Dashboard" y "Usuarios". Un único elemento con `aria-label="Navegación principal"`. |
| 7 | Plegado | "Plegar menú" pasa a "Expandir menú" y vuelve. |
| 8 | Móvil (390x844) | Botón "Abrir menú": la barra lateral se abre (`is-open`) y se cierra con Escape. |
| 9 | `/usuarios` | Fila `admin`, `navigation "Paginación"`, combobox "Elementos por página" con "10 por página". |
| 10 | Borrado del último admin | El diálogo "Eliminar usuario" dice "Vas a eliminar al usuario admin. Esta acción no se puede deshacer.". Al confirmar: `DELETE /api/users/1` 400 y alerta "No se puede eliminar o degradar al último admin activo". Cerrado con "Cancelar". |
| 11 | Alta | El diálogo "Crear usuario" muestra `admin` "Administración del sistema" y `user` "Usuario operativo". `e2e_cleanup` con rol `user`: `POST /api/users` 201, fila "Usuario E2E, user, Activo". |
| 12 | Edición | Nombre "Usuario E2E editado" y rol `admin` añadido: `PUT /api/users/2` 200, fila con roles "admin, user". |
| 13 | Borrado | El diálogo dice "Vas a eliminar al usuario e2e_cleanup. Esta acción no se puede deshacer.". `DELETE /api/users/2` 204 y la fila desaparece. |
| 14 | Red | Ningún 500 en todo el recorrido: `Role.users` con `lazy="raise"` no rompe alta ni edición. |
| 15 | Cerrar sesión | Vuelve a `/login`. Errores de consola: solo el 401 del paso 5 y el 400 del paso 10. |

Nota: la lista de red de Playwright mostró dos `DELETE /api/users/2`; el log de uvicorn confirma una sola petición.

## Restauración (7.2)

`e2e_cleanup` borrado en el paso 13. Navegador cerrado, uvicorn y Vite parados, `DROP DATABASE fastapi_template_e2e`. `fastapi_template` sin cambios respecto al estado posterior a la restauración del curl.

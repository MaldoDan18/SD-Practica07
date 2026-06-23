## Práctica 07 - PWA y Docker

Esta práctica introduce la PWA como cliente visual y deja el servidor listo para ejecutarse en contenedores.

## Cambios clave

- La PWA consume la API HTTP del servidor.
- Se añade dashboard paralelo para monitoreo.
- La ejecución local y la ejecución con Docker usan la misma lógica.

## Funcionamiento

- `server`: API HTTP de la venta.
- `ticketing_service`: persistencia y emisión de tickets.
- `frontend`: PWA estática servida por Nginx.

## Ejecución local

```powershell
docker compose up -d --build
```

URLs:

- PWA: `http://localhost/`
- Dashboard: `http://localhost/dashboard`
- API: `http://localhost/api/...`

## Notas

- El backend expone API en `5002`.
- El ticketing service usa `7000`.
- El frontend se sirve en `80`.
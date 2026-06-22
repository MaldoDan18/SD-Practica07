## Docker

La práctica 07 queda lista para desplegarse en contenedores, igual que la práctica 06.

Componentes:
- `server`: servidor principal + API HTTP en `5001`
- `ticketing_service`: persistencia de tickets en `7000`
- `frontend`: PWA estática en `80`

Arranque:

```bash
docker compose up -d --build
```

URLs:
- PWA: `http://localhost/`
- Servidor/API: `http://localhost/api/...` desde el navegador público
- Dashboard: `http://localhost/dashboard`

Nota: el puerto `5001` queda para acceso directo al backend, pero en despliegue normal la PWA y el dashboard pasan por Nginx en `80`.

Si lo despliegas en una VM de Azure, abre los puertos `80`, `5001` y `7000` en el NSG.

## Implementación de PWA

Una Progressive Web App (PWA) es una aplicación web que incorpora capacidades propias de una app instalada, como funcionamiento desde el navegador, almacenamiento local y soporte para experiencias más fluidas.

En esta práctica se implementa una PWA cliente para la simulación de venta de boletos, con el fin de ofrecer una interfaz visual para seleccionar asientos, reservarlos y concretar la compra sin alterar la lógica principal del servidor.

Además, se agrega un dashboard paralelo para monitoreo y control de la venta, sin tocar el flujo de la PWA.

Estructura:
- webapp/: archivos estáticos de la PWA (index.html, app.js, styles.css, manifest.json, sw.js)

Cómo probar localmente:
1. Se debe tener corriendo el servidor de la práctica 07 (copia de la práctica 06) en el puerto 5000.
2. Desde la carpeta `07-App-PWA` se debe arrancar un servidor estático para servir `webapp`.

Ejemplo (Python 3):

```bash
cd 07-App-PWA
python -m http.server 8000 --directory webapp
```

3. La apertura en el navegador corresponde a `http://localhost:8000/index.html` (o `http://127.0.0.1:8000/index.html`).
4. Se selecciona el tipo de comprador, se espera a que se cargue el mapa y se prueban los asientos. La PWA llamará a los endpoints en `http://127.0.0.1:5000/api/...` por defecto.

Dashboard paralelo:
- Se sirve desde el propio servidor en `http://127.0.0.1:5001/dashboard`.
- Permite ver estado, eventos, métricas, generar carga y reiniciar la venta.

API server:
- Esta copia del `servidor.py` expone un servidor HTTP en `127.0.0.1:5001` con los endpoints REST consumidos por la PWA:
	- `GET /api/availability` — estado de asientos y snapshot
	- `POST /api/request_ticket` — crear una reserva (payload JSON)
	- `POST /api/purchase` — confirmar compra (payload JSON)

Nota: el servidor socket original sigue escuchando en el puerto configurado (por defecto 5000) para la PWA y sus hilos; la API HTTP utiliza el puerto 5001 para evitar conflictos.

Notas:
- El Service Worker requiere servir desde `localhost` o HTTPS para poder registrarse.
- La PWA guarda el carrito en `localStorage` y registra un `buyer_id` local para identificar al cliente frente al servidor.

Setup rápido (desarrollo)
-------------------------
Recomendado: crear un entorno virtual en la carpeta `07-App-PWA` para instalar dependencias localmente y evitar caos.

Windows (PowerShell):

```powershell
cd 07-App-PWA
python -m venv .venv
. .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

macOS / Linux:

```bash
cd 07-App-PWA
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Seleccionar intérprete en VS Code
--------------------------------
- Abrir la carpeta `07-App-PWA` en VS Code.
- Pulsar Ctrl+Shift+P → `Python: Select Interpreter` y elegir `07-App-PWA/.venv`.
- De este modo, Pylance y el terminal integrado usan el entorno correcto.

Arrancar servicios para prueba local
-----------------------------------
1) (Opcional) Ticketing service (emite tickets):

```powershell
cd 07-App-PWA
. .venv\Scripts\Activate.ps1
python ticketing_service.py
```

2) Servidor de venta (proporciona API HTTP y socket TCP):

```powershell
cd 07-App-PWA
. .venv\Scripts\Activate.ps1
python servidor.py 1 --no-gui
```

3) Cliente de hilos (genera compradores simulados):

```powershell
cd 07-App-PWA
. .venv\Scripts\Activate.ps1
python cliente.py normal 1
```

4) Servir la PWA (static):

```powershell
cd 07-App-PWA
. .venv\Scripts\Activate.ps1
python -m http.server 8000 --directory webapp
```

La interfaz queda disponible en: http://127.0.0.1:8000
# El Después — Fase 0

PWA-juego (Vite + React + TypeScript). Eres el guardián del Reino del Ahora; tu agenda real es el juego.

```bash
npm install
npm run dev      # desarrollo (http://localhost:5173 y la IP de tu red)
npm test         # pruebas de la lógica (generador, buffers, XP)
npm run build    # versión instalable en dist/
npm run preview  # sirve dist/ para probar la PWA
```

Datos: todo vive en `localStorage` del dispositivo (clave `el-despues`). Exporta copias desde Ajustes.

Estructura:
- `src/logic/` reglas puras: plantilla inicial, generador del día (buffers, replanificación, Rana, choques), XP y clases.
- `src/store.ts` estado del juego (zustand + immer, persistido).
- `src/motor.ts` reloj, generación diaria, "¿Sigues ahí?" y notificaciones.
- `src/pantallas/` Hoy, bloque activo, plantilla semanal, hábitos, tienda, ajustes.
- `src/sw.ts` service worker (offline + botón "Sigo aquí" de la notificación).

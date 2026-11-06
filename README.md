# El Después — Fases 0 a 4

PWA-juego (Vite + React + TypeScript; la aldea usa Phaser 3, las animaciones GSAP y los íconos Phosphor). Eres el guardián del Reino del Ahora; tu agenda real es el juego.

```bash
npm install
npm run dev      # desarrollo (http://localhost:5173 y la IP de tu red)
npm test         # pruebas de la lógica (generador, XP, aldea, El Después, resumen, store)
npm run build    # versión instalable en dist/
npm run preview  # sirve dist/ para probar la PWA
```

Datos: todo vive en `localStorage` del dispositivo (clave `el-despues`). Exporta copias desde Ajustes.

Estructura:
- `src/logic/` reglas puras: plantilla inicial, generador del día (buffers, replanificación, Rana, choques), XP y clases.
- `src/store.ts` estado del juego (zustand + immer, persistido).
- `src/motor.ts` reloj, generación diaria, "¿Sigues ahí?" y notificaciones.
- `src/aldea/` la aldea en Phaser: pixel art dibujado por código (`arte.ts`), escena (`EscenaAldea.ts`), sonidos WebAudio (`sonido.ts`) y lógica pura de edificios/niveles/Rana (`edificios.ts`).
- `src/ui/` íconos (`Icono.tsx`: Phosphor + sprites de pixel art), animaciones GSAP (`animar.ts`: confeti con física, botín que vuela a la cabecera, contadores, rebotes) y celebraciones a pantalla completa (`Celebraciones.tsx`).
- `src/aldea/Libro.tsx` la Crónica como libro ilustrado: seis escenas animadas en pixel art.
- `src/pantallas/` Hoy, bloque activo, plantilla semanal, progreso (resumen semanal + hábitos), tienda (recompensas + cosméticos), ajustes.
- `src/sw.ts` service worker (offline + botón "Sigo aquí" de la notificación).

## Fases

- **Fase 0**: plantilla semanal, bloques fijos/flexibles, clases con check-in/out, Rana, higiene, hábitos, XP, monedas, rachas y tienda.
- **Fase 1**: aldea con Torre del Saber (clases, talleres, estudio, lectura), Forja (empresa), Campamento (Rubik, higiene), Taller (proyectos) y Taberna (descanso, social, familia, hobbies). El guardián sale de expedición al iniciar un bloque y vuelve con botín al completarlo. Cielo según la hora, sonidos y partículas.
- **Fase 2**: La Rana espera en el camino como jefe del día; su vida baja con el temporizador y llega a 0 justo cuando se habilita "Completar" (80 %). Botín doble. Los edificios suben de nivel (3, 10, 25 y 50 expediciones) y ganan adornos.
- **Fase 3**: El Después oscurece un terreno (de 12) con cada "No pude" o salida anticipada de clase, y retrocede uno por cada bloque cumplido. Crónica con capítulos que se revelan por nivel.
- **Fase 4**: cosméticos con monedas (capas, sombreros, mascotas, fuego, estandarte), resumen semanal por categoría y franja horaria, y avisos (5 min antes de cada bloque, Rana de mañana a las 21:00, resumen el domingo a las 15:00).

En desarrollo, la consola expone `juego` (el store) y `aldea` (la instancia de Phaser) para pruebas.

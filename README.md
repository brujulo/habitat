# Habitat 🌴

App de bienes raíces para República Dominicana con **Brisa**, una asesora inmobiliaria virtual.
Hecha con Expo (SDK 58) y Expo Router. Corre en iOS, Android y web.

> Prototipo: los datos de propiedades son de ejemplo y Brisa responde con reglas (sin IA real todavía).

## Qué incluye

- **Explorar**: búsqueda por sector/ciudad, filtros de venta/alquiler, tipo de inmueble y ciudad.
- **Cerca de ti**: ordena las propiedades por distancia usando tu ubicación (si no das permiso, usa el centro de Santo Domingo).
- **Ficha de propiedad**: información sencilla arriba y botón **“Mostrar más”** con descripción, amenidades, datos clave, precio en RD$ y cuota hipotecaria estimada. Botones para ver en el mapa, preguntarle a Brisa y agendar visita (demo).
- **Brisa** (chat): entiende zona, tipo, habitaciones y presupuesto (en US$ o RD$, “200 mil”, “RD$6 millones”…), recomienda hasta 3 propiedades, hace preguntas para calificar al cliente y responde dudas frecuentes: financiamiento, precalificación, impuestos de compra, Confotur, compra en plano, extranjeros, inversión.
- **Favoritos**: guarda propiedades con el corazón (en memoria por ahora).

## Correrla

```bash
npm install
npx expo start
```

Escanea el QR con **Expo Go** en tu teléfono, o presiona `w` para abrirla en el navegador.

## Estructura

```
src/
  app/                  Rutas (Expo Router)
    (tabs)/             Explorar, Cerca de ti, Brisa, Favoritos
    propiedad/[id].tsx  Ficha de propiedad
  screens/              Cuerpo de cada pantalla
    brisa/engine.ts     Lógica de Brisa (aquí se conecta la IA real)
  components/           Tarjeta de propiedad, chips, íconos, tabs
  data/properties.ts    Propiedades de ejemplo
  constants/            Tema (colores, espaciado) y valores de mercado (tasa US$/RD$)
```

## Próximos pasos sugeridos

1. **Brisa con IA real**: crear una ruta de API (`src/app/api/brisa+api.ts`) que llame al modelo de IA con la API key en una variable de entorno, y reemplazar `responderBrisa` en `src/screens/brisa/engine.ts` por un `fetch` a esa ruta. La forma de los mensajes (`texto`, `propiedades`, `sugerencias`) ya está lista.
2. **Datos reales**: mover `PROPIEDADES` a una base de datos (p. ej. Supabase) manteniendo el tipo `Propiedad`.
3. **Mapa**: agregar un mapa con `expo-maps` (requiere development build) en la pestaña “Cerca de ti”.
4. **Favoritos persistentes** con `expo-sqlite/kv-store`.
5. **Agendar visita** real: formulario + WhatsApp o correo al asesor.

## Nota legal

La información sobre impuestos, Confotur y financiamiento es general y referencial. Debe validarse con un abogado, notario o entidad financiera.

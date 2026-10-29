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
- **ARM (Brisa gestiona tus clientes)**: en vez de un CRM que el asesor llena a mano, Brisa lo hace sola. Desde el botón **Panel ARM** en Explorar:
  - Capta del chat el **nombre, WhatsApp, presupuesto, zona, propósito (vivir/invertir), plazo** e interés en financiamiento, y registra cada propiedad que el cliente ve, guarda o pide visitar.
  - **Califica** a cada cliente (0–100: caliente, tibio o frío) y lo mueve por etapas: Nuevo → Calificando → Interesado → Visita agendada → Negociación → Cerrado.
  - Decide la **próxima acción** (enviar opciones, reactivar, confirmar visita…) y redacta el **mensaje de seguimiento** listo para WhatsApp.
  - **Traspasa al asesor humano** solo cuando hace falta: si el cliente lo pide o está listo para cerrar. El asesor puede **tomar el caso** (Brisa pausa sus seguimientos) o **devolvérselo**.
  - Incluye 6 clientes de ejemplo; el cliente que usa la app aparece **en vivo**.

## Modo conectado (Fase 1: Supabase + Claude)

La app funciona en **modo demo** (datos de ejemplo y Brisa por reglas) hasta que la conectas a tu proyecto. Al conectarla:
- las propiedades salen de **Supabase**, con varias inmobiliarias separadas por reglas de seguridad (RLS);
- **Brisa responde con Claude** desde una Edge Function (`supabase/functions/brisa`), con herramientas para buscar propiedades, guardar el perfil del cliente, registrar interés, agendar visitas y traspasar a un asesor;
- el **Panel ARM** pide login y muestra los clientes reales que Brisa gestiona.

👉 Pasos en **[docs/PUESTA-EN-MARCHA.md](docs/PUESTA-EN-MARCHA.md)**.

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
    arm/                Panel del asesor y ficha de cliente
  arm/                  Lógica del ARM: puntaje, etapas, próxima acción, mensajes
  state/arm.tsx         Clientes y eventos (en memoria en el prototipo)
  components/           Tarjeta de propiedad, chips, íconos, tabs
  data/properties.ts    Propiedades de ejemplo
  constants/            Tema (colores, espaciado) y valores de mercado (tasa US$/RD$)
  lib/                  Cliente de Supabase, sesión anónima y llamadas a Brisa
  state/catalogo.tsx    Catálogo (base de datos o ejemplo)
supabase/
  migrations/           Tablas, RLS y funciones SQL
  seed.sql              Datos iniciales (generado con scripts/generar-seed.ts)
  functions/brisa/      Edge Function: Brisa con Claude
  functions/_shared/    Agente, herramientas, prompt y acceso a datos
docs/PUESTA-EN-MARCHA.md
```

## APK para Android

Cada push a `main` compila un APK con GitHub Actions (`.github/workflows/android-apk.yml`) y lo publica en **Releases** del repositorio. Descárgalo en el teléfono e instálalo (Android pedirá permitir "instalar apps desconocidas").

## Próximos pasos sugeridos

1. **WhatsApp Business** (Fase 2): conectar la Meta Cloud API a la misma función de Brisa.
2. **Panel multiinmobiliaria** (Fase 3): alta de inmobiliarias, asesores e importación de propiedades.
3. **Mapa**: agregar un mapa con `expo-maps` (requiere development build) en la pestaña “Cerca de ti”.
4. **Favoritos y clientes persistentes** en una base de datos, con los seguimientos de Brisa ejecutándose desde el servidor (WhatsApp Business API).
5. **Agendar visita** real: formulario + WhatsApp o correo al asesor.

## Nota legal

La información sobre impuestos, Confotur y financiamiento es general y referencial. Debe validarse con un abogado, notario o entidad financiera.

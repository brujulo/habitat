# Puesta en marcha · Fase 1 (Supabase + Claude)

Con esta guía Habitat pasa de "demo" a funcionar con datos reales:
- las propiedades salen de la base de datos;
- Brisa responde con Claude y guarda cada cliente en el ARM;
- los asesores entran al **Panel ARM** con su correo y ven solo los clientes de su inmobiliaria.

Tiempo estimado: 30–45 minutos. Necesitas una computadora con **Node.js 20+**.

---

## 1. Crear el proyecto en Supabase

1. Entra a <https://supabase.com> → **New project**.
2. Nombre: `habitat`. Región: **East US (North Virginia)**, la más cercana a RD. Guarda la contraseña de la base de datos.
3. Cuando termine, ve a **Project Settings → API** y copia:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon / publishable key** (es pública, va en la app)
   - **Project ref** (el `xxxx` de la URL)

## 2. Crear las tablas y cargar las propiedades

En Supabase → **SQL Editor** → **New query**:

1. Pega todo el contenido de `supabase/migrations/20261029000000_fase1_habitat.sql` y presiona **Run**.
2. Abre otra consulta, pega `supabase/seed.sql` y presiona **Run** (carga la inmobiliaria `habitat-demo` con sus 19 propiedades).

> Esto crea las tablas `inmobiliarias`, `miembros`, `propiedades`, `clientes`, `eventos` y `mensajes`, con reglas de seguridad (RLS) para que cada inmobiliaria vea solo lo suyo.

## 3. Obtener la API key de Claude

1. Entra a <https://console.anthropic.com> → **API keys** → **Create key**. Cópiala (empieza con `sk-ant-`).
2. En **Billing** agrega crédito.
3. **Recomendado:** en **Limits** pon un límite de gasto mensual. La función de Brisa es pública (los clientes no inician sesión), así que el límite te protege si alguien abusa del chat.

## 4. Publicar la función de Brisa

En una terminal, dentro de la carpeta del proyecto (`git clone https://github.com/brujulo/habitat.git && cd habitat`):

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-tu-clave
npx supabase functions deploy brisa --no-verify-jwt
```

Opcional, para cambiar el modelo (por defecto `claude-sonnet-5-5`):

```bash
npx supabase secrets set BRISA_MODEL=claude-haiku-5-5   # más económico
```

Prueba rápida (cambia la URL y la anon key):

```bash
curl -X POST https://TU-PROYECTO.supabase.co/functions/v1/brisa \
  -H "Content-Type: application/json" \
  -H "apikey: TU_ANON_KEY" -H "Authorization: Bearer TU_ANON_KEY" \
  -d '{"inmobiliaria":"habitat-demo","canal":"Web","canalId":"prueba-1","mensaje":"Busco apartamento en Piantini hasta 300 mil"}'
```

Debe responder un JSON con `texto`, `propiedades` y `sugerencias`.

## 5. Crear tu usuario de asesor

1. Supabase → **Authentication → Users → Add user → Create new user**. Pon tu correo y una contraseña y marca **Auto Confirm User**.
2. En el **SQL Editor**, vincúlalo a la inmobiliaria (cambia el correo y el nombre):

```sql
insert into public.miembros (inmobiliaria_id, user_id, nombre, rol)
select i.id, u.id, 'Johan Fernández', 'admin'
from public.inmobiliarias i, auth.users u
where i.slug = 'habitat-demo' and u.email = 'tu-correo@ejemplo.com';
```

Repite el paso para cada asesor (con `rol` = `'asesor'`).

## 6. Conectar la app

Usa las mismas tres variables en cada lugar donde corre la app:

| Variable | Valor |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
| `EXPO_PUBLIC_INMOBILIARIA` | `habitat-demo` |

- **En tu computadora:** copia `.env.example` como `.env`, complétalo y corre `npx expo start`.
- **APK de Android:** en GitHub → repo **habitat** → **Settings → Secrets and variables → Actions → Variables → New repository variable**, crea las tres. El próximo push genera un APK conectado (o córrelo a mano en **Actions → APK Android → Run workflow**).
- **Web en Netlify:** en el sitio **habitat-rd** → **Site configuration → Environment variables**, agrega las tres y vuelve a publicar.

Sin estas variables la app sigue funcionando en **modo demo**.

## 7. Probar

1. Abre la app y ve a **Brisa**. La etiqueta arriba a la derecha debe decir **IA**.
2. Escríbele como cliente: zona, presupuesto, tu nombre y un WhatsApp de prueba.
3. Ve a **Explorar → Panel ARM** y entra con tu usuario. Debes ver tu conversación como cliente **En vivo**, con lo que Brisa captó.

---

## Agregar otra inmobiliaria

```sql
insert into public.inmobiliarias (slug, nombre, whatsapp, instrucciones_brisa)
values ('inmobiliaria-ejemplo', 'Inmobiliaria Ejemplo', '809-000-0000',
        'Trabajamos solo en Santo Domingo Este. Ofrecemos asesoría legal gratuita.');
```

Luego carga sus propiedades (con su `inmobiliaria_id`), crea sus asesores (paso 5) y compila la app con `EXPO_PUBLIC_INMOBILIARIA=inmobiliaria-ejemplo`. El panel para hacer todo esto sin SQL es parte de la Fase 3.

## Costos aproximados

- **Supabase:** el plan gratuito alcanza para el piloto. Los proyectos gratuitos se pausan tras una semana sin actividad; para producción conviene el plan Pro.
- **Claude Sonnet 5.5:** US$2 por millón de tokens de entrada y US$10 por millón de salida, con caché de instrucciones. Estimado: **1 a 3 centavos de dólar por mensaje** del cliente (unos US$0.10–0.30 por una conversación de 10 mensajes). Con `claude-haiku-5-5` cuesta bastante menos, con algo de calidad menos.

Precios de Claude: <https://platform.claude.com/docs/es/about-claude/pricing>

## Qué queda para las fases siguientes

- **Fase 2:** WhatsApp Business (Meta Cloud API) en la misma función, seguimientos automáticos con plantillas aprobadas y aviso por WhatsApp al asesor cuando Brisa le traspasa un cliente.
- **Fase 3:** panel web multiinmobiliaria (alta de inmobiliarias y asesores, importar propiedades desde Excel, subir fotos a Supabase Storage), Google Calendar, Instagram y Messenger.
- **Seguridad pendiente:** límite de mensajes por sesión/IP en la función de Brisa y aviso de privacidad (Ley 172-13) visible en el chat.

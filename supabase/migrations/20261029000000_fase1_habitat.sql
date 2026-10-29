-- =====================================================================
-- Habitat · Fase 1
-- Base de datos multiempresa: cada inmobiliaria tiene sus propiedades,
-- clientes y asesores, separados por Row Level Security (RLS).
-- Brisa (Edge Function) escribe con la service_role key; la app lee
-- propiedades públicas con la anon key y los asesores ven solo lo suyo.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table public.inmobiliarias (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  nombre      text not null,
  whatsapp    text,
  -- Instrucciones extra para Brisa propias de esta inmobiliaria (tono, promociones, etc.)
  instrucciones_brisa text,
  activa      boolean not null default true,
  creado      timestamptz not null default now()
);

create table public.miembros (
  inmobiliaria_id uuid not null references public.inmobiliarias(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  nombre          text not null,
  telefono        text,
  rol             text not null default 'asesor' check (rol in ('admin', 'asesor')),
  creado          timestamptz not null default now(),
  primary key (inmobiliaria_id, user_id)
);

create table public.propiedades (
  id               text primary key check (id ~ '^[a-z0-9-]+$'),
  inmobiliaria_id  uuid not null references public.inmobiliarias(id) on delete cascade,
  titulo           text not null,
  tipo             text not null check (tipo in ('Apartamento','Casa','Villa','Penthouse','Solar','Local')),
  operacion        text not null check (operacion in ('Venta','Alquiler')),
  precio           numeric(14,2) not null check (precio > 0),   -- USD (venta) o USD/mes (alquiler)
  ciudad           text not null,
  sector           text not null,
  provincia        text not null,
  latitude         double precision not null,
  longitude        double precision not null,
  habitaciones     int not null default 0,
  banos            numeric(3,1) not null default 0,
  parqueos         int not null default 0,
  metros           numeric(10,2) not null,
  resumen          text not null,
  descripcion      text not null,
  amenidades       text[] not null default '{}',
  cerca_de         text[] not null default '{}',
  ano_construccion int,
  mantenimiento_usd numeric(10,2),
  confotur         boolean not null default false,
  en_plano         boolean not null default false,
  entrega          text,
  imagen           text not null,
  costera          boolean not null default false,
  publicada        boolean not null default true,
  creado           timestamptz not null default now(),
  actualizado      timestamptz not null default now()
);
create index propiedades_inmo_idx on public.propiedades (inmobiliaria_id, publicada);

create table public.clientes (
  id                    uuid primary key default gen_random_uuid(),
  inmobiliaria_id       uuid not null references public.inmobiliarias(id) on delete cascade,
  -- Identificador del canal: id de sesión de la app/web, número de WhatsApp, etc.
  canal                 text not null default 'App' check (canal in ('App','WhatsApp','Instagram','Web','Messenger')),
  canal_id              text not null,
  nombre                text,
  telefono              text,
  criterios             jsonb not null default '{}'::jsonb,
  proposito             text check (proposito in ('Vivir','Invertir')),
  plazo                 text check (plazo in ('Inmediato','1 a 6 meses','Más de 6 meses')),
  interes_financiamiento boolean not null default false,
  propiedades_interes   text[] not null default '{}',
  etapa                 text not null default 'Nuevo'
                        check (etapa in ('Nuevo','Calificando','Interesado','Visita agendada','Negociación','Cerrado','Perdido')),
  control_humano        boolean not null default false,
  traspaso_solicitado   boolean not null default false,
  asesor_id             uuid references auth.users(id) on delete set null,
  consentimiento_datos  boolean not null default false,
  creado                timestamptz not null default now(),
  ultima_actividad      timestamptz not null default now(),
  unique (inmobiliaria_id, canal, canal_id)
);
create index clientes_inmo_idx on public.clientes (inmobiliaria_id, ultima_actividad desc);

create table public.eventos (
  id              uuid primary key default gen_random_uuid(),
  inmobiliaria_id uuid not null references public.inmobiliarias(id) on delete cascade,
  cliente_id      uuid not null references public.clientes(id) on delete cascade,
  tipo            text not null check (tipo in ('mensaje','vista','favorito','visita','seguimiento','traspaso','etapa','nota')),
  autor           text not null check (autor in ('cliente','brisa','asesor')),
  texto           text not null,
  propiedad_id    text references public.propiedades(id) on delete set null,
  fecha           timestamptz not null default now()
);
create index eventos_cliente_idx on public.eventos (cliente_id, fecha);

-- Memoria de conversación de Brisa (texto plano por turno).
create table public.mensajes (
  id              bigint generated always as identity primary key,
  inmobiliaria_id uuid not null references public.inmobiliarias(id) on delete cascade,
  cliente_id      uuid not null references public.clientes(id) on delete cascade,
  rol             text not null check (rol in ('user','assistant')),
  texto           text not null,
  meta            jsonb not null default '{}'::jsonb,   -- propiedades mostradas, sugerencias, uso de tokens
  creado          timestamptz not null default now()
);
create index mensajes_cliente_idx on public.mensajes (cliente_id, id);

-- ---------------------------------------------------------------------
-- Ayudantes
-- ---------------------------------------------------------------------

-- ¿El usuario autenticado pertenece a esta inmobiliaria?
create or replace function public.es_miembro(p_inmobiliaria uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.miembros m
    where m.inmobiliaria_id = p_inmobiliaria and m.user_id = auth.uid()
  );
$$;

create or replace function public.tocar_actualizado()
returns trigger language plpgsql as $$
begin
  new.actualizado := now();
  return new;
end $$;

create trigger propiedades_actualizado before update on public.propiedades
for each row execute function public.tocar_actualizado();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.inmobiliarias enable row level security;
alter table public.miembros      enable row level security;
alter table public.propiedades   enable row level security;
alter table public.clientes      enable row level security;
alter table public.eventos       enable row level security;
alter table public.mensajes      enable row level security;

-- Inmobiliarias: cualquiera puede ver las activas (nombre y slug son públicos).
create policy inmo_publica on public.inmobiliarias
  for select to anon, authenticated using (activa);

-- Miembros: cada usuario ve sus membresías y los compañeros de su inmobiliaria.
create policy miembros_ver on public.miembros
  for select to authenticated using (user_id = auth.uid() or public.es_miembro(inmobiliaria_id));

-- Propiedades: el público ve las publicadas; los miembros gestionan las suyas.
create policy prop_publicas on public.propiedades
  for select to anon, authenticated using (publicada);
create policy prop_miembros_ver on public.propiedades
  for select to authenticated using (public.es_miembro(inmobiliaria_id));
create policy prop_miembros_crear on public.propiedades
  for insert to authenticated with check (public.es_miembro(inmobiliaria_id));
create policy prop_miembros_editar on public.propiedades
  for update to authenticated using (public.es_miembro(inmobiliaria_id)) with check (public.es_miembro(inmobiliaria_id));
create policy prop_miembros_borrar on public.propiedades
  for delete to authenticated using (public.es_miembro(inmobiliaria_id));

-- Clientes, eventos y mensajes: SOLO los miembros de la inmobiliaria. El público no tiene acceso.
create policy clientes_miembros_ver on public.clientes
  for select to authenticated using (public.es_miembro(inmobiliaria_id));
create policy clientes_miembros_editar on public.clientes
  for update to authenticated using (public.es_miembro(inmobiliaria_id)) with check (public.es_miembro(inmobiliaria_id));

create policy eventos_miembros_ver on public.eventos
  for select to authenticated using (public.es_miembro(inmobiliaria_id));
create policy eventos_miembros_crear on public.eventos
  for insert to authenticated
  with check (public.es_miembro(inmobiliaria_id) and autor = 'asesor');

create policy mensajes_miembros_ver on public.mensajes
  for select to authenticated using (public.es_miembro(inmobiliaria_id));

-- Un evento siempre pertenece a la misma inmobiliaria que su cliente.
create or replace function public.validar_evento()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.clientes c where c.id = new.cliente_id and c.inmobiliaria_id = new.inmobiliaria_id) then
    raise exception 'El cliente no pertenece a esta inmobiliaria';
  end if;
  if new.autor = 'asesor' or new.tipo in ('mensaje','seguimiento','traspaso','etapa','nota') then
    update public.clientes set ultima_actividad = now() where id = new.cliente_id;
  end if;
  return new;
end $$;
create trigger eventos_validar before insert on public.eventos
for each row execute function public.validar_evento();

-- ---------------------------------------------------------------------
-- Funciones que usa Brisa (solo service_role)
-- ---------------------------------------------------------------------

-- Búsqueda de propiedades con los mismos criterios que entiende Brisa.
create or replace function public.buscar_propiedades(
  p_inmobiliaria uuid,
  p_criterios jsonb default '{}'::jsonb,
  p_limite int default 5
)
returns setof public.propiedades
language sql stable set search_path = public
as $$
  with c as (
    select
      nullif(p_criterios->>'presupuesto_max_usd','')::numeric as pmax,
      nullif(p_criterios->>'presupuesto_min_usd','')::numeric as pmin,
      nullif(p_criterios->>'habitaciones_min','')::int        as hab,
      nullif(p_criterios->>'tipo','')                          as tipo,
      nullif(p_criterios->>'operacion','')                     as op,
      coalesce((p_criterios->>'cerca_playa')::boolean, false)  as playa,
      coalesce(array(select jsonb_array_elements_text(p_criterios->'ciudades')), '{}') as ciudades,
      coalesce(array(select jsonb_array_elements_text(p_criterios->'sectores')), '{}') as sectores,
      nullif(trim(p_criterios->>'texto'),'')                   as texto
  )
  select p.*
  from public.propiedades p, c
  where p.inmobiliaria_id = p_inmobiliaria
    and p.publicada
    and (c.tipo is null or p.tipo = c.tipo)
    and (c.op is null or p.operacion = c.op)
    and (c.hab is null or p.habitaciones >= c.hab)
    and (c.pmax is null or p.operacion = 'Alquiler' or p.precio <= c.pmax * 1.15)
    and (c.pmin is null or p.operacion = 'Alquiler' or p.precio >= c.pmin)
    and (not c.playa or p.costera)
    and (cardinality(c.ciudades) = 0 or p.ciudad ilike any (c.ciudades))
    and (cardinality(c.sectores) = 0 or p.sector ilike any (c.sectores))
    and (c.texto is null or (p.titulo || ' ' || p.sector || ' ' || p.ciudad || ' ' || p.descripcion) ilike '%' || c.texto || '%')
  order by
    case when c.pmax is not null then abs(c.pmax - p.precio) end asc nulls last,
    case when c.pmin is not null then -p.precio end asc nulls last,
    p.precio asc
  limit greatest(1, least(coalesce(p_limite, 5), 10));
$$;

-- Obtiene o crea el cliente de una conversación.
create or replace function public.brisa_cliente(p_inmobiliaria uuid, p_canal text, p_canal_id text)
returns public.clientes
language plpgsql security definer set search_path = public
as $$
declare r public.clientes;
begin
  insert into public.clientes (inmobiliaria_id, canal, canal_id)
  values (p_inmobiliaria, p_canal, p_canal_id)
  on conflict (inmobiliaria_id, canal, canal_id) do update set ultima_actividad = now()
  returning * into r;
  return r;
end $$;

-- Actualiza el perfil del cliente con lo que Brisa aprendió y recalcula la etapa.
-- p_cambios admite: nombre, telefono, proposito, plazo, interes_financiamiento,
-- criterios (se fusiona), agregar_interes (id de propiedad), etapa,
-- traspaso_solicitado, consentimiento_datos.
create or replace function public.brisa_actualizar_cliente(p_cliente uuid, p_cambios jsonb)
returns public.clientes
language plpgsql security definer set search_path = public
as $$
declare
  r public.clientes;
  orden text[] := array['Nuevo','Calificando','Interesado','Visita agendada','Negociación','Cerrado','Perdido'];
  nueva text;
begin
  update public.clientes c set
    nombre    = coalesce(nullif(p_cambios->>'nombre',''), c.nombre),
    telefono  = coalesce(nullif(p_cambios->>'telefono',''), c.telefono),
    proposito = coalesce(nullif(p_cambios->>'proposito',''), c.proposito),
    plazo     = coalesce(nullif(p_cambios->>'plazo',''), c.plazo),
    interes_financiamiento = c.interes_financiamiento or coalesce((p_cambios->>'interes_financiamiento')::boolean, false),
    criterios = case when p_cambios ? 'criterios'
                     then jsonb_strip_nulls(c.criterios || (p_cambios->'criterios'))
                     else c.criterios end,
    propiedades_interes = case
      when nullif(p_cambios->>'agregar_interes','') is null then c.propiedades_interes
      else array_prepend(p_cambios->>'agregar_interes', array_remove(c.propiedades_interes, p_cambios->>'agregar_interes'))
    end,
    traspaso_solicitado = c.traspaso_solicitado or coalesce((p_cambios->>'traspaso_solicitado')::boolean, false),
    consentimiento_datos = c.consentimiento_datos or coalesce((p_cambios->>'consentimiento_datos')::boolean, false),
    ultima_actividad = now()
  where c.id = p_cliente
  returning * into r;

  if r.id is null then
    raise exception 'Cliente % no existe', p_cliente;
  end if;

  -- Etapa: explícita si viene; si no, avanza sola (nunca retrocede).
  nueva := nullif(p_cambios->>'etapa','');
  if nueva is null and r.etapa in ('Nuevo','Calificando','Interesado') then
    nueva := case
      when cardinality(r.propiedades_interes) > 0 then 'Interesado'
      when r.criterios <> '{}'::jsonb then 'Calificando'
      else r.etapa end;
    if array_position(orden, nueva) < array_position(orden, r.etapa) then
      nueva := r.etapa;
    end if;
  end if;

  if nueva is not null and nueva <> r.etapa then
    update public.clientes set etapa = nueva where id = r.id returning * into r;
  end if;

  return r;
end $$;

-- Solo el backend (service_role) puede ejecutar las funciones de Brisa.
revoke all on function public.brisa_cliente(uuid, text, text) from public, anon, authenticated;
revoke all on function public.brisa_actualizar_cliente(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.brisa_cliente(uuid, text, text) to service_role;
grant execute on function public.brisa_actualizar_cliente(uuid, jsonb) to service_role;
-- La búsqueda respeta RLS (solo publicadas), así que la app también puede usarla.
grant execute on function public.buscar_propiedades(uuid, jsonb, int) to anon, authenticated, service_role;

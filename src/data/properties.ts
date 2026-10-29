/**
 * Datos de ejemplo (ficticios) para el prototipo de Habitat.
 * Reemplazar por un backend real (Supabase, API propia, etc.) más adelante:
 * basta con mantener la forma del tipo `Propiedad`.
 */

export type TipoPropiedad = 'Apartamento' | 'Casa' | 'Villa' | 'Penthouse' | 'Solar' | 'Local';
export type Operacion = 'Venta' | 'Alquiler';

export type Propiedad = {
  id: string;
  titulo: string;
  tipo: TipoPropiedad;
  operacion: Operacion;
  /** Precio en USD (venta) o USD/mes (alquiler). */
  precio: number;
  ciudad: string;
  sector: string;
  provincia: string;
  latitude: number;
  longitude: number;
  habitaciones: number;
  banos: number;
  parqueos: number;
  metros: number;
  /** Una línea: lo esencial para el comprador. */
  resumen: string;
  /** Texto para "Mostrar más". */
  descripcion: string;
  amenidades: string[];
  cercaDe: string[];
  anoConstruccion?: number;
  mantenimientoUSD?: number;
  confotur?: boolean;
  enPlano?: boolean;
  entrega?: string;
  imagen: string;
};

const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=70`;

export const PROPIEDADES: Propiedad[] = [
  {
    id: 'piantini-torre-ambar',
    titulo: 'Apartamento moderno en Torre Ámbar',
    tipo: 'Apartamento',
    operacion: 'Venta',
    precio: 285000,
    ciudad: 'Santo Domingo',
    sector: 'Piantini',
    provincia: 'Distrito Nacional',
    latitude: 18.471,
    longitude: -69.939,
    habitaciones: 2,
    banos: 2.5,
    parqueos: 2,
    metros: 145,
    resumen: 'A pasos de Ágora Mall y Blue Mall, piso alto con vista a la ciudad.',
    descripcion:
      'Apartamento en piso 14 con terminaciones en porcelanato, cocina abierta con isla y área de lavado independiente. El edificio tiene planta eléctrica full, gas común y seguridad 24/7. Ideal para profesionales o inversión en renta corta por su ubicación en el polígono central.',
    amenidades: ['Piscina', 'Gimnasio', 'Planta full', 'Seguridad 24/7', 'Ascensor', 'Lobby'],
    cercaDe: ['Ágora Mall', 'Blue Mall', 'Av. Winston Churchill'],
    anoConstruccion: 2021,
    mantenimientoUSD: 220,
    imagen: img('1522708323590-d24dbb6b0267'),
  },
  {
    id: 'naco-familiar',
    titulo: 'Apartamento familiar en Naco',
    tipo: 'Apartamento',
    operacion: 'Venta',
    precio: 198000,
    ciudad: 'Santo Domingo',
    sector: 'Naco',
    provincia: 'Distrito Nacional',
    latitude: 18.477,
    longitude: -69.93,
    habitaciones: 3,
    banos: 2,
    parqueos: 2,
    metros: 160,
    resumen: '3 habitaciones, calle tranquila y cerca de colegios.',
    descripcion:
      'Amplio apartamento en segundo nivel, con estudio, balcón y cuarto de servicio. Sector residencial consolidado con colegios, supermercados y farmacias a poca distancia. Edificio de 4 niveles con pocas unidades.',
    amenidades: ['Planta full', 'Cisterna', 'Área de servicio', 'Balcón'],
    cercaDe: ['Supermercado', 'Colegios', 'Av. Tiradentes'],
    anoConstruccion: 2012,
    mantenimientoUSD: 120,
    imagen: img('1502672260266-1c1ef2d93688'),
  },
  {
    id: 'bella-vista-penthouse',
    titulo: 'Penthouse con terraza en Bella Vista',
    tipo: 'Penthouse',
    operacion: 'Venta',
    precio: 520000,
    ciudad: 'Santo Domingo',
    sector: 'Bella Vista',
    provincia: 'Distrito Nacional',
    latitude: 18.456,
    longitude: -69.944,
    habitaciones: 3,
    banos: 3.5,
    parqueos: 3,
    metros: 310,
    resumen: 'Dos niveles, terraza privada con jacuzzi y vista al Mirador Sur.',
    descripcion:
      'Penthouse de dos niveles con terraza techada, BBQ y jacuzzi. Habitación principal con walk-in closet y baño tipo spa. Vista despejada hacia el Mirador Sur y el mar Caribe.',
    amenidades: ['Terraza privada', 'Jacuzzi', 'Piscina', 'Gimnasio', 'Planta full', 'Seguridad 24/7'],
    cercaDe: ['Parque Mirador Sur', 'Av. Anacaona', 'Universidades'],
    anoConstruccion: 2019,
    mantenimientoUSD: 380,
    imagen: img('1600607687939-ce8a6c25118c'),
  },
  {
    id: 'evaristo-morales-plano',
    titulo: 'Proyecto en plano en Evaristo Morales',
    tipo: 'Apartamento',
    operacion: 'Venta',
    precio: 165000,
    ciudad: 'Santo Domingo',
    sector: 'Evaristo Morales',
    provincia: 'Distrito Nacional',
    latitude: 18.474,
    longitude: -69.944,
    habitaciones: 1,
    banos: 1.5,
    parqueos: 1,
    metros: 82,
    resumen: 'Entrega en 2028, plan de pagos durante la construcción.',
    descripcion:
      'Unidades de 1 y 2 habitaciones con rooftop social, coworking y piscina. Separas con un monto inicial, pagas un porcentaje durante la construcción y el resto contra entrega, normalmente con financiamiento bancario.',
    amenidades: ['Rooftop', 'Coworking', 'Piscina', 'Gimnasio', 'Lobby'],
    cercaDe: ['Av. Abraham Lincoln', 'Plazas comerciales'],
    enPlano: true,
    entrega: 'Diciembre 2028',
    mantenimientoUSD: 110,
    imagen: img('1545324418-cc1a3fa10c00'),
  },
  {
    id: 'cacicazgos-casa',
    titulo: 'Casa con jardín en Los Cacicazgos',
    tipo: 'Casa',
    operacion: 'Venta',
    precio: 890000,
    ciudad: 'Santo Domingo',
    sector: 'Los Cacicazgos',
    provincia: 'Distrito Nacional',
    latitude: 18.451,
    longitude: -69.958,
    habitaciones: 4,
    banos: 4.5,
    parqueos: 4,
    metros: 520,
    resumen: 'Casa de un nivel con piscina y amplio jardín, calle cerrada.',
    descripcion:
      'Residencia en solar de 900 m², con sala y comedor de doble altura, family room, estudio, piscina y gazebo. Calle cerrada con seguridad privada. Cerca del Mirador Sur y colegios de la zona.',
    amenidades: ['Piscina', 'Jardín', 'Gazebo', 'Seguridad privada', 'Planta full'],
    cercaDe: ['Mirador Sur', 'Colegios', 'Av. Anacaona'],
    anoConstruccion: 2008,
    imagen: img('1564013799919-ab600027ffc6'),
  },
  {
    id: 'arroyo-hondo-casa',
    titulo: 'Casa de dos niveles en Arroyo Hondo',
    tipo: 'Casa',
    operacion: 'Venta',
    precio: 410000,
    ciudad: 'Santo Domingo',
    sector: 'Arroyo Hondo',
    provincia: 'Distrito Nacional',
    latitude: 18.495,
    longitude: -69.958,
    habitaciones: 4,
    banos: 3.5,
    parqueos: 3,
    metros: 340,
    resumen: 'Residencial cerrado, ideal para familia grande.',
    descripcion:
      'Casa en residencial con garita, terraza trasera, cuarto de servicio con baño y cocina remodelada. Acceso rápido a la Av. Jacobo Majluta y a la Av. Kennedy.',
    amenidades: ['Residencial cerrado', 'Terraza', 'Cuarto de servicio', 'Cisterna'],
    cercaDe: ['Jardín Botánico', 'Av. Jacobo Majluta'],
    anoConstruccion: 2014,
    imagen: img('1568605114967-8130f3a36994'),
  },
  {
    id: 'gazcue-alquiler',
    titulo: 'Apartamento amueblado en Gazcue',
    tipo: 'Apartamento',
    operacion: 'Alquiler',
    precio: 950,
    ciudad: 'Santo Domingo',
    sector: 'Gazcue',
    provincia: 'Distrito Nacional',
    latitude: 18.467,
    longitude: -69.902,
    habitaciones: 2,
    banos: 1,
    parqueos: 1,
    metros: 95,
    resumen: 'Amueblado, cerca del Malecón y la Zona Colonial.',
    descripcion:
      'Apartamento en edificio de estilo clásico, techos altos y mucha ventilación. Incluye muebles, línea blanca y aire acondicionado en habitaciones. Contrato mínimo de un año.',
    amenidades: ['Amueblado', 'Aire acondicionado', 'Inversor'],
    cercaDe: ['Malecón', 'Zona Colonial', 'Palacio de Bellas Artes'],
    anoConstruccion: 1995,
    imagen: img('1493809842364-78817add7ffb'),
  },
  {
    id: 'ozama-sde',
    titulo: 'Apartamento económico en Ensanche Ozama',
    tipo: 'Apartamento',
    operacion: 'Venta',
    precio: 89000,
    ciudad: 'Santo Domingo Este',
    sector: 'Ensanche Ozama',
    provincia: 'Santo Domingo',
    latitude: 18.488,
    longitude: -69.87,
    habitaciones: 3,
    banos: 2,
    parqueos: 1,
    metros: 105,
    resumen: 'Primera vivienda, cerca del Metro y la Av. Sabana Larga.',
    descripcion:
      'Buena opción para primera vivienda. Edificio con área de juegos y cisterna. Fácil acceso al Metro de Santo Domingo y a la Av. España.',
    amenidades: ['Área de juegos', 'Cisterna', 'Parqueo techado'],
    cercaDe: ['Metro', 'Megacentro', 'Av. Sabana Larga'],
    anoConstruccion: 2018,
    mantenimientoUSD: 45,
    imagen: img('1460317442991-0ec209397118'),
  },
  {
    id: 'villa-mella-sdn',
    titulo: 'Casa en Villa Mella con patio',
    tipo: 'Casa',
    operacion: 'Venta',
    precio: 72000,
    ciudad: 'Santo Domingo Norte',
    sector: 'Villa Mella',
    provincia: 'Santo Domingo',
    latitude: 18.565,
    longitude: -69.92,
    habitaciones: 3,
    banos: 2,
    parqueos: 2,
    metros: 140,
    resumen: 'Casa de un nivel con patio y marquesina para dos vehículos.',
    descripcion:
      'Casa en proyecto cerrado, con patio trasero y espacio para ampliar en segundo nivel. Cerca de la estación del Metro Mamá Tingó y de la Autopista Duarte por la Circunvalación.',
    amenidades: ['Patio', 'Marquesina', 'Proyecto cerrado', 'Cisterna'],
    cercaDe: ['Metro Mamá Tingó', 'Av. Hermanas Mirabal'],
    anoConstruccion: 2020,
    imagen: img('1570129477492-45c003edd2be'),
  },
  {
    id: 'bavaro-playa',
    titulo: 'Apartamento cerca de la playa en Bávaro',
    tipo: 'Apartamento',
    operacion: 'Venta',
    precio: 175000,
    ciudad: 'Punta Cana',
    sector: 'Bávaro',
    provincia: 'La Altagracia',
    latitude: 18.687,
    longitude: -68.45,
    habitaciones: 2,
    banos: 2,
    parqueos: 1,
    metros: 98,
    resumen: 'A 5 minutos de playa Los Corales, con Confotur.',
    descripcion:
      'Residencial turístico con piscina tipo laguna y seguridad. Muy demandado para renta vacacional. El proyecto cuenta con clasificación Confotur, lo que puede reducir impuestos de transferencia y de propiedad por varios años (confirmar con abogado).',
    amenidades: ['Piscina', 'Seguridad 24/7', 'Club house', 'Amueblado opcional'],
    cercaDe: ['Playa Los Corales', 'Downtown Punta Cana', 'Aeropuerto PUJ'],
    anoConstruccion: 2023,
    mantenimientoUSD: 150,
    confotur: true,
    imagen: img('1512917774080-9991f1c4c750'),
  },
  {
    id: 'cap-cana-villa',
    titulo: 'Villa frente al campo de golf en Cap Cana',
    tipo: 'Villa',
    operacion: 'Venta',
    precio: 1450000,
    ciudad: 'Punta Cana',
    sector: 'Cap Cana',
    provincia: 'La Altagracia',
    latitude: 18.495,
    longitude: -68.38,
    habitaciones: 5,
    banos: 5.5,
    parqueos: 4,
    metros: 680,
    resumen: 'Villa de lujo con piscina infinita y vista al golf.',
    descripcion:
      'Villa contemporánea con piscina infinita, cocina de chef, casa de huéspedes y acceso a la marina y playa privada de la comunidad. Excelente para residencia vacacional o alquiler de lujo.',
    amenidades: ['Piscina infinita', 'Casa de huéspedes', 'Playa privada', 'Marina', 'Golf'],
    cercaDe: ['Playa Juanillo', 'Marina Cap Cana', 'Aeropuerto PUJ'],
    anoConstruccion: 2022,
    confotur: true,
    imagen: img('1613490493576-7fde63acd811'),
  },
  {
    id: 'santiago-cerros',
    titulo: 'Casa en Los Cerros de Gurabo',
    tipo: 'Casa',
    operacion: 'Venta',
    precio: 365000,
    ciudad: 'Santiago',
    sector: 'Los Cerros de Gurabo',
    provincia: 'Santiago',
    latitude: 19.47,
    longitude: -70.67,
    habitaciones: 4,
    banos: 3.5,
    parqueos: 3,
    metros: 360,
    resumen: 'Vista a la ciudad y clima fresco, residencial privado.',
    descripcion:
      'Casa en zona alta de Santiago con vista panorámica, terraza y piscina. Residencial con control de acceso. Cerca de colegios y de la Av. 27 de Febrero.',
    amenidades: ['Piscina', 'Terraza', 'Residencial privado', 'Planta full'],
    cercaDe: ['Monumento', 'Av. 27 de Febrero', 'PUCMM'],
    anoConstruccion: 2016,
    imagen: img('1580587771525-78b9dba3b914'),
  },
  {
    id: 'santiago-villa-olga',
    titulo: 'Apartamento en Villa Olga',
    tipo: 'Apartamento',
    operacion: 'Venta',
    precio: 138000,
    ciudad: 'Santiago',
    sector: 'Villa Olga',
    provincia: 'Santiago',
    latitude: 19.46,
    longitude: -70.695,
    habitaciones: 3,
    banos: 2,
    parqueos: 2,
    metros: 130,
    resumen: 'Sector céntrico, cerca de universidades y plazas.',
    descripcion:
      'Apartamento en tercer nivel con balcón, cocina modular y área de lavado. Edificio con ascensor y planta para áreas comunes.',
    amenidades: ['Ascensor', 'Planta áreas comunes', 'Balcón'],
    cercaDe: ['PUCMM', 'Plazas comerciales', 'Av. Juan Pablo Duarte'],
    anoConstruccion: 2017,
    mantenimientoUSD: 70,
    imagen: img('1600585154340-be6161a56a0c'),
  },
  {
    id: 'las-terrenas',
    titulo: 'Villa tropical en Las Terrenas',
    tipo: 'Villa',
    operacion: 'Venta',
    precio: 340000,
    ciudad: 'Las Terrenas',
    sector: 'Playa Bonita',
    provincia: 'Samaná',
    latitude: 19.32,
    longitude: -69.542,
    habitaciones: 3,
    banos: 3,
    parqueos: 2,
    metros: 210,
    resumen: 'A 200 metros de Playa Bonita, rodeada de cocoteros.',
    descripcion:
      'Villa de estilo caribeño con techos de madera, piscina y jardín tropical. Zona con gran demanda de turismo europeo para renta vacacional.',
    amenidades: ['Piscina', 'Jardín tropical', 'Amueblada', 'Seguridad'],
    cercaDe: ['Playa Bonita', 'Pueblo de Las Terrenas'],
    anoConstruccion: 2015,
    imagen: img('1499793983690-e29da59ef1c2'),
  },
  {
    id: 'sosua-condo',
    titulo: 'Condominio con vista al mar en Sosúa',
    tipo: 'Apartamento',
    operacion: 'Venta',
    precio: 149000,
    ciudad: 'Sosúa',
    sector: 'Sosúa',
    provincia: 'Puerto Plata',
    latitude: 19.755,
    longitude: -70.52,
    habitaciones: 2,
    banos: 2,
    parqueos: 1,
    metros: 110,
    resumen: 'Vista al mar y caminable a la playa de Sosúa.',
    descripcion:
      'Condominio con piscina y terraza en cada unidad. Cerca del aeropuerto de Puerto Plata. Atractivo para retirados y renta vacacional.',
    amenidades: ['Piscina', 'Vista al mar', 'Terraza', 'Seguridad'],
    cercaDe: ['Playa de Sosúa', 'Aeropuerto POP'],
    anoConstruccion: 2010,
    mantenimientoUSD: 130,
    imagen: img('1600566753190-17f0baa2a6c3'),
  },
  {
    id: 'juan-dolio',
    titulo: 'Apartamento frente al mar en Juan Dolio',
    tipo: 'Apartamento',
    operacion: 'Venta',
    precio: 210000,
    ciudad: 'Juan Dolio',
    sector: 'Juan Dolio',
    provincia: 'San Pedro de Macorís',
    latitude: 18.427,
    longitude: -69.43,
    habitaciones: 2,
    banos: 2,
    parqueos: 1,
    metros: 120,
    resumen: 'Primera línea de playa, a una hora de Santo Domingo.',
    descripcion:
      'Torre frente al mar con piscina, gimnasio y acceso directo a la playa. Buena opción de segunda vivienda para familias de la capital.',
    amenidades: ['Frente al mar', 'Piscina', 'Gimnasio', 'Planta full'],
    cercaDe: ['Playa Juan Dolio', 'Autovía del Este'],
    anoConstruccion: 2018,
    mantenimientoUSD: 190,
    confotur: true,
    imagen: img('1600596542815-ffad4c1539a9'),
  },
  {
    id: 'jarabacoa-cabana',
    titulo: 'Cabaña de montaña en Jarabacoa',
    tipo: 'Casa',
    operacion: 'Venta',
    precio: 230000,
    ciudad: 'Jarabacoa',
    sector: 'Jarabacoa',
    provincia: 'La Vega',
    latitude: 19.118,
    longitude: -70.638,
    habitaciones: 3,
    banos: 2,
    parqueos: 2,
    metros: 180,
    resumen: 'Clima de montaña, chimenea y vista al valle.',
    descripcion:
      'Cabaña en madera y piedra dentro de un proyecto de montaña, con chimenea, terraza y senderos. Ideal como casa de descanso o alquiler de fin de semana.',
    amenidades: ['Chimenea', 'Terraza', 'Senderos', 'Proyecto cerrado'],
    cercaDe: ['Río Yaque del Norte', 'Centro de Jarabacoa'],
    anoConstruccion: 2019,
    imagen: img('1449158743715-0a90ebb6d2d8'),
  },
  {
    id: 'piantini-local',
    titulo: 'Local comercial en Piantini',
    tipo: 'Local',
    operacion: 'Alquiler',
    precio: 2800,
    ciudad: 'Santo Domingo',
    sector: 'Piantini',
    provincia: 'Distrito Nacional',
    latitude: 18.469,
    longitude: -69.936,
    habitaciones: 0,
    banos: 1,
    parqueos: 4,
    metros: 120,
    resumen: 'Local a nivel de calle, alto tránsito peatonal.',
    descripcion:
      'Local en plaza comercial con vitrina a la calle, baño y parqueos para clientes. Ideal para oficina, clínica o tienda.',
    amenidades: ['Vitrina', 'Parqueo clientes', 'Planta full'],
    cercaDe: ['Av. Gustavo Mejía Ricart', 'Blue Mall'],
    anoConstruccion: 2015,
    imagen: img('1497366216548-37526070297c'),
  },
  {
    id: 'la-romana-solar',
    titulo: 'Solar residencial cerca de Casa de Campo',
    tipo: 'Solar',
    operacion: 'Venta',
    precio: 95000,
    ciudad: 'La Romana',
    sector: 'Casa de Campo',
    provincia: 'La Romana',
    latitude: 18.41,
    longitude: -68.91,
    habitaciones: 0,
    banos: 0,
    parqueos: 0,
    metros: 800,
    resumen: 'Solar de 800 m² en proyecto con servicios listos.',
    descripcion:
      'Solar con título, en proyecto con calles asfaltadas, electricidad soterrada y agua. Para construir casa de descanso o villa para renta.',
    amenidades: ['Título', 'Calles asfaltadas', 'Electricidad soterrada'],
    cercaDe: ['Casa de Campo', 'Altos de Chavón'],
    imagen: img('1500382017468-9049fed747ef'),
  },
];

/**
 * Catálogo activo. En modo demo son las propiedades de arriba; cuando la app está
 * conectada a Supabase, CatalogoProvider lo reemplaza por las de la base de datos.
 */
let catalogoActual: Propiedad[] = PROPIEDADES;

export function setCatalogoActual(lista: Propiedad[]) {
  catalogoActual = lista;
}

export function getCatalogoActual() {
  return catalogoActual;
}

export function getPropiedad(id: string) {
  return catalogoActual.find((p) => p.id === id) ?? PROPIEDADES.find((p) => p.id === id);
}

export const CIUDADES = Array.from(new Set(PROPIEDADES.map((p) => p.ciudad)));
export const TIPOS: TipoPropiedad[] = ['Apartamento', 'Casa', 'Villa', 'Penthouse', 'Solar', 'Local'];

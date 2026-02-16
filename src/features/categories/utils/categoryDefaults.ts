/**
 * Auto-asignacion de icono y color para categorias.
 *
 * - El icono se sugiere segun el nombre del rubro (keywords en español).
 * - El color se elige aleatoriamente de una paleta predefinida, evitando
 *   repetir colores ya usados por rubros existentes.
 */

import type { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// ── Paleta de colores para categorias ───────────────────────────────────────

export const CATEGORY_COLORS = [
  '#C41E3A', // rojo Independiente
  '#2563eb', // azul
  '#16a34a', // verde
  '#d97706', // ambar
  '#7c3aed', // violeta
  '#0891b2', // cian
  '#db2777', // rosa
  '#ea580c', // naranja
  '#4f46e5', // indigo
  '#0d9488', // teal
  '#84cc16', // lima
  '#be123c', // rubi
  '#6366f1', // lavanda
  '#ca8a04', // dorado
  '#059669', // esmeralda
  '#9333ea', // purpura
  '#dc2626', // rojo fuerte
  '#0284c7', // celeste
  '#65a30d', // oliva
  '#c026d3', // fucsia
] as const;

/**
 * Elige un color aleatorio que no este en uso por categorias existentes.
 * Si todos estan en uso, elige uno aleatorio de la paleta completa.
 */
export function pickUnusedColor(usedColors: string[]): string {
  const usedSet = new Set(usedColors.map((c) => c?.toLowerCase()));
  const available = CATEGORY_COLORS.filter(
    (c) => !usedSet.has(c.toLowerCase()),
  );

  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  // Fallback: todos en uso, elegir aleatorio
  return CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];
}

// ── Mapeo de keywords a iconos ──────────────────────────────────────────────

interface KeywordMapping {
  keywords: string[];
  icon: IconName;
}

const KEYWORD_MAPPINGS: KeywordMapping[] = [
  // Alimentacion
  {
    keywords: ['comida', 'alimento', 'alimentos', 'alimentacion', 'comedor', 'cocina', 'restaurante', 'almuerzo', 'cena', 'desayuno', 'merienda', 'snack', 'catering', 'buffet'],
    icon: 'food-fork-drink',
  },
  {
    keywords: ['cafe', 'cafeteria', 'coffee'],
    icon: 'coffee',
  },
  {
    keywords: ['bebida', 'bebidas', 'agua', 'jugo', 'gaseosa'],
    icon: 'cup',
  },
  // Transporte
  {
    keywords: ['transporte', 'auto', 'vehiculo', 'nafta', 'combustible', 'garage', 'estacionamiento', 'peaje', 'viaje', 'viatico', 'movilidad'],
    icon: 'car',
  },
  {
    keywords: ['colectivo', 'bondi', 'bus', 'micro', 'omnibus'],
    icon: 'bus',
  },
  // Hogar / Servicios
  {
    keywords: ['hogar', 'casa', 'alquiler', 'expensas', 'inmueble', 'propiedad', 'vivienda'],
    icon: 'home',
  },
  {
    keywords: ['luz', 'electricidad', 'energia', 'edenor', 'edesur'],
    icon: 'flash',
  },
  {
    keywords: ['gas', 'garrafa', 'metrogas'],
    icon: 'fire',
  },
  {
    keywords: ['internet', 'wifi', 'telefono', 'celular', 'comunicacion', 'cable'],
    icon: 'wifi',
  },
  {
    keywords: ['limpieza', 'higiene', 'lavanderia'],
    icon: 'broom',
  },
  // Salud
  {
    keywords: ['salud', 'medico', 'medicina', 'farmacia', 'hospital', 'clinica', 'obra social', 'prepaga', 'mutual'],
    icon: 'hospital-building',
  },
  {
    keywords: ['remedio', 'medicamento', 'pastilla'],
    icon: 'pill',
  },
  // Educacion
  {
    keywords: ['educacion', 'colegio', 'escuela', 'universidad', 'facultad', 'curso', 'capacitacion', 'estudio', 'clase', 'taller', 'cuota escolar', 'utiles', 'libreria'],
    icon: 'school',
  },
  {
    keywords: ['libro', 'libros', 'lectura', 'biblioteca'],
    icon: 'book-open-page-variant',
  },
  // Deportes
  {
    keywords: ['deporte', 'deportes', 'gimnasio', 'gym', 'entrenamiento', 'fitness'],
    icon: 'dumbbell',
  },
  {
    keywords: ['basket', 'basquet', 'basketball', 'basquetbol'],
    icon: 'basketball',
  },
  {
    keywords: ['futbol', 'football', 'cancha'],
    icon: 'soccer',
  },
  {
    keywords: ['natacion', 'pileta', 'piscina'],
    icon: 'swim',
  },
  {
    keywords: ['torneo', 'campeonato', 'competencia', 'copa', 'premio', 'trofeo'],
    icon: 'trophy',
  },
  // Entretenimiento
  {
    keywords: ['entretenimiento', 'recreacion', 'ocio', 'diversion', 'salida', 'salidas'],
    icon: 'party-popper',
  },
  {
    keywords: ['cine', 'pelicula', 'streaming', 'netflix', 'disney'],
    icon: 'movie-open',
  },
  {
    keywords: ['musica', 'spotify', 'instrumento', 'banda'],
    icon: 'music',
  },
  {
    keywords: ['juego', 'juegos', 'videojuego', 'play'],
    icon: 'gamepad-variant',
  },
  // Compras / Indumentaria
  {
    keywords: ['ropa', 'vestimenta', 'indumentaria', 'calzado', 'zapatilla'],
    icon: 'tshirt-crew',
  },
  {
    keywords: ['compra', 'compras', 'shopping', 'supermercado', 'super', 'mercado', 'almacen', 'kiosco'],
    icon: 'cart',
  },
  {
    keywords: ['regalo', 'regalos', 'cumpleanos', 'navidad', 'fiesta'],
    icon: 'gift',
  },
  // Finanzas
  {
    keywords: ['banco', 'bancario', 'transferencia', 'cuota', 'credito', 'debito', 'financiero'],
    icon: 'bank',
  },
  {
    keywords: ['tarjeta', 'visa', 'mastercard'],
    icon: 'credit-card',
  },
  {
    keywords: ['impuesto', 'impuestos', 'afip', 'monotributo', 'iibb', 'abl', 'patente'],
    icon: 'receipt',
  },
  {
    keywords: ['seguro', 'seguros', 'poliza'],
    icon: 'shield',
  },
  {
    keywords: ['ahorro', 'inversion', 'plazo fijo', 'dolar', 'cripto'],
    icon: 'piggy-bank',
  },
  {
    keywords: ['sueldo', 'salario', 'ingreso', 'honorario', 'facturacion'],
    icon: 'cash',
  },
  // Trabajo
  {
    keywords: ['trabajo', 'oficina', 'empleo', 'laboral'],
    icon: 'briefcase',
  },
  {
    keywords: ['equipo', 'equipamiento', 'herramienta', 'herramientas', 'material', 'materiales', 'insumo', 'insumos'],
    icon: 'tools',
  },
  // Club / Institucional
  {
    keywords: ['club', 'institucion', 'sede', 'cancha', 'vestuario'],
    icon: 'soccer',
  },
  {
    keywords: ['cuota social', 'membresia', 'socio', 'socios'],
    icon: 'account-group',
  },
  {
    keywords: ['evento', 'eventos', 'organizacion', 'actividad', 'actividades'],
    icon: 'calendar',
  },
  {
    keywords: ['donacion', 'donaciones', 'sponsor', 'auspicio', 'auspiciante', 'patrocinio'],
    icon: 'hand-coin',
  },
  // Mascota
  {
    keywords: ['mascota', 'perro', 'gato', 'veterinario', 'veterinaria'],
    icon: 'paw',
  },
  // Hijos / Familia
  {
    keywords: ['hijo', 'hija', 'bebe', 'guarderia', 'jardin', 'maternal', 'pediatra'],
    icon: 'baby-carriage',
  },
  // Mantenimiento
  {
    keywords: ['mantenimiento', 'reparacion', 'arreglo', 'plomero', 'electricista', 'pintura'],
    icon: 'wrench',
  },
  // Varios / General
  {
    keywords: ['varios', 'otro', 'otros', 'general', 'miscelaneo', 'extra', 'contingencia'],
    icon: 'dots-horizontal',
  },
];

/**
 * Sugiere un icono basado en el nombre del rubro.
 * Busca coincidencias de keywords en el nombre (case-insensitive).
 * Devuelve null si no encuentra coincidencia.
 */
export function suggestIcon(name: string): IconName | null {
  if (!name || name.trim().length < 2) return null;

  const normalized = name.toLowerCase().trim();

  // Buscar coincidencia exacta de keyword en el nombre
  for (const mapping of KEYWORD_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (normalized.includes(keyword)) {
        return mapping.icon;
      }
    }
  }

  return null;
}

# Cuentas Claras

App movil para la gestion financiera de la subcomision de basquet de menores del Club Independiente.

## Stack Tecnologico

- **Frontend**: React Native + Expo SDK 54
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Estado**: TanStack Query (servidor) + Zustand (local)
- **UI**: React Native Paper (MD3) + NativeWind (Tailwind CSS)
- **Graficos**: Victory Native
- **Navegacion**: Expo Router

## Requisitos

- Node.js >= 20.19.4
- npm >= 10
- Expo Go (en el celular para testing)
- Cuenta Supabase (gratis en supabase.com)

## Instalacion

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Iniciar el servidor de desarrollo
npm start
```

## Estructura del Proyecto

```
app/            # Pantallas (Expo Router file-based routing)
  (auth)/       # Login, Registro
  (tabs)/       # Dashboard, Movimientos, Rubros, Reportes, Ajustes
src/
  core/         # Config, providers, hooks, tipos, utilidades
  features/     # Modulos por funcionalidad
  shared/       # Componentes y tema compartidos
  sync/         # Motor de sincronizacion offline
supabase/
  migrations/   # Esquema de base de datos
  functions/    # Edge Functions
```

## Scripts

- `npm start` - Inicia el servidor de desarrollo
- `npm run android` - Abre en Android
- `npm run ios` - Abre en iOS
- `npm run web` - Abre en navegador
- `npm run lint` - Ejecuta ESLint
- `npm run format` - Formatea codigo con Prettier

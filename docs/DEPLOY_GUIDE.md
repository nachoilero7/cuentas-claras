# Cuentas Claras - Guia de Deploy

Guia paso a paso para desplegar la app desde cero en Android e iOS.

---

## Indice

1. [Prerequisitos](#1-prerequisitos)
2. [Configurar Supabase (Base de datos)](#2-configurar-supabase)
3. [Configurar variables de entorno](#3-configurar-variables-de-entorno)
4. [Configurar EAS (Expo Application Services)](#4-configurar-eas)
5. [Build Android](#5-build-android)
6. [Build iOS](#6-build-ios)
7. [Setup inicial de la app (primer admin)](#7-setup-inicial)
8. [Distribuir a usuarios](#8-distribuir-a-usuarios)
9. [Actualizaciones OTA](#9-actualizaciones-ota)
10. [Publicar en stores](#10-publicar-en-stores)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisitos

### Cuentas necesarias

| Cuenta | Para que | Costo |
|--------|----------|-------|
| [Supabase](https://supabase.com) | Base de datos, auth, storage | Gratis (hasta 500MB DB, 1GB storage) |
| [Expo](https://expo.dev) | Builds en la nube, updates OTA | Gratis (30 builds/mes) |
| [Google Play Console](https://play.google.com/console) | Publicar en Play Store | USD 25 (unico pago) |
| [Apple Developer Program](https://developer.apple.com) | Publicar en App Store | USD 99/anio |

> **Nota**: Para distribucion interna (sin stores), solo necesitas Supabase + Expo.
> Apple Developer es necesario incluso para distribucion interna en iOS (TestFlight).

### Software en tu maquina

```bash
# Node.js (ya lo tenes: v24.13.1)
node --version

# EAS CLI
npm install -g eas-cli

# Verificar instalacion
eas --version

# (Opcional) Supabase CLI - para automatizar migraciones
npm install -g supabase
```

---

## 2. Configurar Supabase

### 2.1 Crear proyecto (si es nuevo)

1. Ir a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Elegir nombre: `cuentas-claras`
4. Elegir region: `South America (Sao Paulo)` (la mas cercana)
5. Crear una password segura para la DB (guardarla)
6. Click "Create new project" y esperar ~2 minutos

### 2.2 Obtener credenciales

1. Ir a **Settings > API** en el dashboard de Supabase
2. Copiar:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIs...` (la key larga)

> **IMPORTANTE**: La `anon key` es publica y va en el codigo. La `service_role key` es SECRETA y NUNCA debe ir en la app.

### 2.3 Ejecutar migraciones

Las migraciones crean todas las tablas, triggers, RLS y funciones.

#### Opcion A: Manual (SQL Editor)

1. Ir a **SQL Editor** en el dashboard de Supabase
2. Ejecutar cada archivo **en este orden exacto** (copiar y pegar el contenido):

```
supabase/migrations/00001_initial_schema.sql      → Tablas base
supabase/migrations/00002_triggers_functions.sql   → Triggers y funciones
supabase/migrations/00003_rls_policies.sql         → Seguridad (RLS)
supabase/migrations/00004_views_rpc.sql            → Vistas y RPCs del dashboard
supabase/migrations/00005_storage.sql              → Buckets de archivos
supabase/migrations/00006_payment_alias_method.sql → Alias de pago
supabase/migrations/20260212_recurring_transactions.sql → Transacciones recurrentes
```

3. Verificar que no haya errores despues de cada ejecucion

#### Opcion B: Supabase CLI (automatizado)

```bash
# Linkear tu proyecto local con Supabase remoto
supabase link --project-ref TU_PROJECT_REF

# TU_PROJECT_REF es la parte antes de .supabase.co en tu URL
# Ejemplo: si tu URL es https://uxejutfjoiepvnjmcddx.supabase.co
# entonces el ref es: uxejutfjoiepvnjmcddx

# Pushear todas las migraciones
supabase db push
```

### 2.4 Configurar Auth

1. Ir a **Authentication > Providers** en Supabase
2. **Email**: ya viene habilitado por defecto
3. **Google** (opcional):
   - Habilitar el provider
   - Configurar OAuth credentials desde Google Cloud Console
   - Agregar el Client ID y Client Secret

### 2.5 Verificar storage

1. Ir a **Storage** en Supabase
2. Verificar que exista el bucket `attachments`
3. Si no existe, ejecutar `00005_storage.sql` de nuevo

---

## 3. Configurar variables de entorno

### 3.1 Archivo .env local (para desarrollo)

```bash
# Copiar el ejemplo
cp .env.example .env
```

Editar `.env` con tus valores reales:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...tu-anon-key
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...  # opcional
```

### 3.2 Variables en EAS (para builds en la nube)

Los builds en la nube de EAS NO leen tu `.env` local. Hay que configurar las variables como secrets:

```bash
# Configurar cada variable
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://tu-proyecto.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "tu-anon-key-aqui"

# (Opcional) Sentry
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "tu-dsn-aqui"

# Verificar que se guardaron
eas secret:list
```

---

## 4. Configurar EAS

### 4.1 Login

```bash
eas login
# Ingresar email y password de tu cuenta expo.dev
```

### 4.2 Configurar el proyecto

```bash
# Esto linkea tu proyecto local con Expo
eas build:configure

# Si te pregunta por el project ID, aceptar la creacion
```

### 4.3 Entender los perfiles de build

El archivo `eas.json` ya tiene 3 perfiles:

- **development**: Para desarrollo con Expo Dev Client. Genera un APK de debug.
- **preview**: Para distribucion interna a testers. Genera un APK instalable.
- **production**: Para publicar en stores. Genera un AAB (Android App Bundle).

---

## 5. Build Android

### 5.1 Build Preview (distribucion interna - RECOMENDADO para empezar)

```bash
eas build --profile preview --platform android
```

Esto:
1. Sube el codigo a los servidores de Expo
2. Compila la app en la nube (~10-15 minutos)
3. Te da un link para descargar el `.apk`

```
Build complete!
APK: https://expo.dev/artifacts/eas/xxxxx.apk
```

Ese link se puede compartir directamente con los usuarios para que lo instalen.

### 5.2 Build Production (para Play Store)

```bash
eas build --profile production --platform android
```

Genera un `.aab` (Android App Bundle) optimizado para Play Store.

### 5.3 Instalar el APK

Los usuarios necesitan:
1. Abrir el link desde el celular
2. Descargar el APK
3. Android va a pedir permiso para "instalar de fuentes desconocidas" → Permitir
4. Instalar y abrir

---

## 6. Build iOS

### 6.1 Prerequisitos iOS

- **Apple Developer Account** (USD 99/anio) - obligatorio incluso para testing
- Registrar los dispositivos de testing (hasta 100 por anio)

### 6.2 Registrar dispositivos

```bash
# Registrar dispositivos para distribucion interna
eas device:create

# Esto genera un link que cada tester abre desde su iPhone
# para registrar su UDID automaticamente
```

### 6.3 Build Preview (TestFlight interno)

```bash
eas build --profile preview --platform ios
```

En el primer build, EAS te va a pedir:
1. Login con tu Apple ID
2. Seleccionar tu Team
3. EAS genera automaticamente los certificados y provisioning profiles

### 6.4 Build Production (para App Store)

```bash
eas build --profile production --platform ios
```

### 6.5 Distribuir via TestFlight

```bash
# Subir el build a App Store Connect
eas submit --platform ios

# Los testers reciben una invitacion por email para instalar via TestFlight
```

---

## 7. Setup inicial

Una vez que la app esta instalada y la base de datos configurada:

### 7.1 Primer registro

1. Abrir la app
2. Registrarse con el email del futuro admin
3. Verificar el email (Supabase envia un mail de confirmacion)
4. Loguearse

### 7.2 Promover a admin

Ir al **SQL Editor** de Supabase y ejecutar:

```sql
-- Reemplazar con el email real del admin
UPDATE profiles SET role = 'admin'
WHERE email = 'tu-email-real@gmail.com';

-- Verificar
SELECT id, email, full_name, role FROM profiles WHERE role = 'admin';
```

O usar el script completo: `supabase/seed.sql` (editando el email primero).

### 7.3 Configuracion desde la app

Ahora como admin podras:
1. Crear la primera temporada (si no usaste el seed)
2. Crear categorias (rubros)
3. Invitar a otros usuarios a registrarse
4. Asignarles roles desde **Usuarios > [usuario] > Cambiar rol**

---

## 8. Distribuir a usuarios

### Opcion A: APK directo (Android - mas simple)

1. Buildear con `eas build --profile preview --platform android`
2. Compartir el link del APK por WhatsApp/email
3. Los usuarios lo instalan directamente

**Ventajas**: Rapido, sin costo extra, sin review de Google
**Desventajas**: Hay que compartir un APK nuevo para cada build nativo

### Opcion B: Google Play Store (Android - profesional)

1. Crear cuenta en [Google Play Console](https://play.google.com/console) (USD 25)
2. Crear la app en la consola
3. Buildear: `eas build --profile production --platform android`
4. Subir: `eas submit --platform android`
5. Los usuarios la descargan del Play Store

**Prerequisitos para submit**:
- Generar `google-services.json` (service account key) en Google Cloud Console
- Poner el archivo en la raiz del proyecto
- Ya esta configurado en `eas.json` bajo `submit.production.android`

### Opcion C: TestFlight (iOS)

1. Buildear: `eas build --profile production --platform ios`
2. Subir: `eas submit --platform ios`
3. Los testers reciben invitacion por email
4. Instalan via la app TestFlight

### Opcion D: App Store (iOS - profesional)

Mismo flow que TestFlight pero luego envias a revision de Apple (~24-48hs).

---

## 9. Actualizaciones OTA

Para cambios que **NO** modifican codigo nativo (solo JS/TS/assets), podes pushear updates instantaneos sin rebuild:

```bash
# Actualizar el canal preview (para testers)
eas update --branch preview --message "fix: corregir colores en dark mode"

# Actualizar el canal production (para usuarios finales)
eas update --branch production --message "feat: nueva pantalla de reportes"
```

Los usuarios reciben la actualizacion la proxima vez que abren la app (no necesitan descargar nada).

### Cuando SI necesitas un nuevo build nativo

- Agregar/actualizar una dependencia nativa (ej: nueva version de expo-camera)
- Cambiar permisos en `app.json`
- Cambiar plugins de Expo
- Actualizar la version de Expo SDK

### Cuando alcanza con OTA

- Cambios en pantallas, componentes, estilos
- Nuevas features en JS/TS
- Bug fixes
- Cambios en servicios/hooks

---

## 10. Publicar en stores

### Google Play Store

```bash
# 1. Build production
eas build --profile production --platform android

# 2. Submit (necesita google-services.json)
eas submit --platform android

# O todo junto:
eas build --profile production --platform android --auto-submit
```

**Primera vez**: Hay que completar la ficha de la app en Play Console (screenshots, descripcion, etc.) antes de poder publicar.

### Apple App Store

```bash
# 1. Build production
eas build --profile production --platform ios

# 2. Submit
eas submit --platform ios

# O todo junto:
eas build --profile production --platform ios --auto-submit
```

**Primera vez en eas.json**: Completar los campos vacios:
```json
"ios": {
  "appleId": "tu-apple-id@icloud.com",
  "ascAppId": "123456789"  // App Store Connect App ID
}
```

El `ascAppId` se obtiene al crear la app en [App Store Connect](https://appstoreconnect.apple.com).

---

## 11. Troubleshooting

### "No se puede conectar al servidor"
- Verificar que `EXPO_PUBLIC_SUPABASE_URL` sea correcto
- Verificar que el proyecto de Supabase este activo (los proyectos gratuitos se pausan despues de 7 dias sin actividad)

### "Error de autenticacion"
- Verificar que `EXPO_PUBLIC_SUPABASE_ANON_KEY` sea la anon key (NO la service role key)
- Verificar que el provider de email este habilitado en Supabase

### Build falla en EAS
- Verificar que los secrets esten configurados: `eas secret:list`
- Revisar los logs del build en expo.dev
- Verificar compatibilidad de versiones: `npx expo install --check`

### "Fuentes desconocidas" en Android
- Es normal para APKs fuera del Play Store
- Configuracion > Seguridad > Permitir fuentes desconocidas

### La app no se actualiza (OTA)
- El update se aplica en el **segundo** inicio de la app (no el primero despues del update)
- Verificar que el channel del build coincida con el branch del update

### Proyecto de Supabase pausado
- Los proyectos gratuitos se pausan despues de 7 dias de inactividad
- Ir al dashboard de Supabase y click "Restore project"
- Para evitarlo: configurar un cron job o upgrade a plan Pro (USD 25/mes)

---

## Resumen rapido

```bash
# === SETUP (una sola vez) ===
npm install -g eas-cli
eas login
eas build:configure
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."

# === BUILD Y DISTRIBUIR ===
# Android (APK para compartir)
eas build --profile preview --platform android

# iOS (TestFlight)
eas build --profile preview --platform ios
eas submit --platform ios

# === ACTUALIZAR (sin rebuild) ===
eas update --branch preview --message "descripcion del cambio"
```

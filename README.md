# 🌍 Quiniela Mundial 2026

Aplicación web para apostar con amigos en el Mundial 2026.

## Stack
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS)
- **Deploy**: Vercel (gratis)

## Sistema de puntos
| Apuesta | Puntos |
|---------|--------|
| Signo correcto (1X2) | 2 pts |
| Resultado exacto | 5 pts (2 signo + 3 bonus) |
| Clasificado de grupo correcto | 3 pts por equipo |
| Apuesta especial correcta | 6–15 pts según dificultad |

---

## 🚀 Instalación paso a paso

### 1. Instalar dependencia de Supabase SSR

```bash
npm install @supabase/ssr
```

### 2. Configurar Supabase

Ve a tu proyecto en [supabase.com](https://supabase.com) y:

1. Entra al **SQL Editor**
2. Copia todo el contenido de `supabase_schema.sql`
3. Pégalo en el editor y ejecuta

Esto crea todas las tablas, políticas de seguridad, y datos iniciales.

### 3. Copiar archivos al proyecto

Copia estos archivos/carpetas a tu proyecto `quiniela-mundial/`:

```
middleware.ts           → raíz del proyecto
types/index.ts          → carpeta types/
lib/supabase/client.ts  → carpeta lib/supabase/
lib/supabase/server.ts  → carpeta lib/supabase/
app/layout.tsx          → reemplaza el existente
app/globals.css         → reemplaza el existente  
app/page.tsx            → reemplaza el existente
app/auth/login/page.tsx
app/auth/register/page.tsx
app/partidos/page.tsx
app/apuestas-previas/page.tsx
app/grupos/page.tsx
app/ranking/page.tsx
app/admin/page.tsx
components/layout/Navbar.tsx
```

### 4. Verificar .env.local

Asegúrate de que tienes estas variables (las tienes de Supabase → Settings → API):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### 5. Ejecutar en local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### 6. Deploy en Vercel

1. Sube los cambios a GitHub: `git add . && git commit -m "feat: quiniela mundial" && git push`
2. Ve a [vercel.com](https://vercel.com) → tu proyecto
3. En **Environment Variables**, añade las mismas variables del `.env.local`
4. Haz un nuevo deploy

---

## 👑 Crear cuenta de administrador

Después de crear una cuenta normal, ve al **SQL Editor** de Supabase y ejecuta:

```sql
UPDATE public.profiles 
SET is_admin = true 
WHERE username = 'TU_USERNAME';
```

El admin puede:
- Añadir partidos
- Introducir resultados (calcula puntos automáticamente)
- Corregir apuestas especiales

---

## 🔧 Personalización

### Actualizar equipos del Mundial
Los equipos en `supabase_schema.sql` son aproximados. Cuando se confirme el sorteo oficial, actualiza la tabla `teams` en Supabase directamente o desde el panel de administración.

### Cambiar puntuación
Edita los valores en los archivos correspondientes:
- Partidos (1X2 = 2pts, exacto = 3pts bonus): `app/admin/page.tsx` función `handleSaveResult`
- Grupos (3pts): la lógica está en el admin (por implementar si quieres automatizarlo)
- Especiales: los puntos se configuran por pregunta en la tabla `special_questions`

---

## 📱 Funcionalidades

- ✅ Registro y login con email/contraseña
- ✅ Apuestas previas al mundial (quién gana, MVP, goleador, etc.)
- ✅ Apuestas 1X2 por partido
- ✅ Resultado exacto por partido  
- ✅ Clasificados de cada grupo
- ✅ Ranking en tiempo real
- ✅ Panel de administración
- ✅ Diseño responsivo (móvil y escritorio)
- ✅ Seguridad con Row Level Security (RLS)

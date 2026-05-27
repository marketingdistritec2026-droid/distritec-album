# Álbum Digital Distritec 2026

## Estructura del proyecto

```
distritec-album/
├── index.html              ← Álbum principal
├── admin.html              ← Panel administración (próximo)
├── js/
│   ├── supabase.js         ← Conexión BD y funciones
│   ├── motor.js            ← Lógica sobre 7 láminas
│   └── auth.js             ← (próximo)
├── data/
│   └── colaboradores.js    ← Los 198 colaboradores
└── assets/
    └── styles.css          ← Estilos
```

## Setup inicial

### 1. Supabase
- Las tablas ya están creadas con el script `supabase_setup.sql`
- Cargar los 198 colaboradores ejecutando en SQL Editor:
  ```js
  // Abrir data/colaboradores.js en el navegador y ejecutar generarSQL()
  // Copiar el resultado y ejecutarlo en Supabase SQL Editor
  ```

### 2. Desarrollo local
- Abrir carpeta en VS Code
- Clic derecho en `index.html` → Open with Live Server
- El álbum corre en `http://127.0.0.1:5500`

### 3. Deploy en Cloudflare Pages
1. Push al repo de GitHub
2. Cloudflare Pages → New project → conectar repo
3. Build settings: ninguno (HTML estático)
4. Deploy automático en cada push

## Credenciales Supabase
- URL: `https://pokkdyilcwhhpxgcqwun.supabase.co`
- Anon key: ver `js/supabase.js`

## Fases del proyecto
- [x] Fase 1: Motor de sobre + Panel admin básico
- [ ] Fase 2: Backend real Supabase + Login por cédula
- [ ] Fase 3: Gamificación + Leaderboard
- [ ] Fase 4: Intercambio entre colaboradores
- [ ] Fase 5: Deploy Cloudflare + PWA
- [ ] Fase 6: Fotos reales de colaboradores

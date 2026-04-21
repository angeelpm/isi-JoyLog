# JoyLog - Documento de Capacidades y Hoja de Ruta (Sprint 2+)

## 🎯 Visión General
[cite_start]JoyLog es un diario de juego social diseñado para centralizar bibliotecas fragmentadas, realizar un seguimiento del historial del jugador y ofrecer alertas de ofertas en tiempo real[cite: 7, 35, 48].

## 🛠️ Stack Tecnológico
- **Lenguaje:** TypeScript (Tipado estricto para modelos y APIs).
- **Backend:** Node.js con Express (arquitectura RESTful).
- **Base de Datos:** MongoDB Atlas (Mongoose) para persistencia de usuarios, bibliotecas y reseñas.
- **Integraciones de Terceros:**
  - RAWG API: Fuente principal de metadatos de videojuegos.
  - IsThereAnyDeal API: Seguimiento de precios y ofertas.
- [cite_start]**Testing:** Jest / Supertest (Backend) y Testing Library (Frontend)[cite: 3].

## 🏗️ Estructura del Proyecto (Planificación)

### 1. Backend (Lógica de Negocio y Datos)
- **Modelos:** Implementar esquemas de Mongoose basados en `interfaces.ts`.
- **Controladores de API:** - `AuthController`: Registro y login de usuarios.
  - `LibraryController`: CRUD de `GameEntry` (jugando, completado, etc.).
  - [cite_start]`SocialController`: Gestión de seguidores, reseñas y likes[cite: 12, 22].
  - `DealController`: Lógica para filtrar ofertas de IsThereAnyDeal.
- **Servicios:** Clases dedicadas para encapsular las llamadas a RAWG y ITAD, gestionando la caché para evitar límites de tasa de la API.

### 2. Frontend (Interfaz de Usuario)
- [cite_start]**Dashboard:** Vista unificada de la biblioteca del usuario[cite: 21].
- [cite_start]**Motor de Búsqueda:** Interfaz para buscar juegos en RAWG e integrarlos a la colección[cite: 57].
- **Perfil Público:** Visualización de estadísticas (horas jugadas, juegos completados) y insignias (`Badges`).
- [cite_start]**Sección de Ofertas:** Dashboard interactivo con los descuentos vigentes de ITAD[cite: 35, 43].

### 3. Testing (Calidad y Estabilidad)
- **Unit Tests:** Validación de funciones de cálculo (ej. tasa de completado, conversión de moneda).
- **Integration Tests:** Pruebas de flujo completo desde la petición de la API hasta la inserción en MongoDB.
- **E2E Tests:** Pruebas de usuario (ej. "Un usuario puede añadir un juego y marcarlo como completado").

## 🚀 Roadmap de Desarrollo

- **Sprint 2 (Actual):** Consolidación de prototipos de API (RAWG/ITAD) y modelos de datos iniciales.
- **Sprint 3 (Core):** Sistema de autenticación JWT y gestión básica de la biblioteca (Añadir/Editar estado de juego).
- **Sprint 4 (Social & Ofertas):** Sistema de reseñas, seguidores y alertas de precio.
- [cite_start]**Sprint 5 (Estadísticas & Pulido):** Generación de estadísticas avanzadas, sistema de logros (Badges) y optimización de UI[cite: 66].

## 🛠️ Stack Tecnológico
- **Lenguaje:** TypeScript (Tipado estricto para modelos y APIs).
- **Backend:** Node.js con Express (arquitectura RESTful).
- **Base de Datos:** MongoDB Atlas / MongoDB local en Docker para desarrollo.
- **Integraciones de Terceros:** RAWG API e IsThereAnyDeal API.
- **Infraestructura y Contenedores:** Docker y Docker Compose para la orquestación de entornos (Backend, Frontend y BD local).
- **Testing:** Jest / Supertest (Backend) y Testing Library (Frontend).

## 🏗️ Estructura del Proyecto (Planificación)
*(...Resto de la estructura igual...)*
- **Infraestructura (Docker):** - `docker-compose.yml` en la raíz para levantar los tres servicios de desarrollo simultáneamente.
  - `Dockerfile` individuales y multi-stage para optimizar el peso de las imágenes en producción.

## Organización de los directorios


    joylog/
    ├── docker-compose.yml         # Orquestador para levantar Backend, Frontend y MongoDB en local
    ├── docs/
    │   └── skills.md              # Documento de planificación actualizado
    ├── shared/
    │   └── types/
    │       └── interfaces.ts      # Tipos compartidos
    ├── services/
    │   ├── api-gateway/           # Proxy y Router principal (Puerto 3000)
    │   ├── auth-service/          # Microservicio de logueo/registro
    │   │   ├── src/
    │   │   │   ├── config/db.ts              # Conexión a Mongoose
    │   │   │   ├── controllers/authController.ts # Lógica login/registro con BCrypt
    │   │   │   ├── models/User.ts            # Esquema de Usuario
    │   │   │   ├── routes/authRoutes.ts      # Rutas Express
    │   │   │   └── index.ts                  # Entrada del servicio
    │   │   ├── Dockerfile
    │   │   └── package.json
    │   └── library-service/       # Microservicio del CRUD de videojuegos
    ├── frontend/
    │   ├── Dockerfile             # Receta para construir la imagen del Frontend
    │   ├── .dockerignore
    │   ├── src/
    │   │   ├── components/
    │   │   ├── pages/
    │   │   ├── services/
    │   │   └── hooks/
    │   ├── tests/
    │   └── package.json
    └── README.md

## 🤖 Registro de Cambios y Contexto para IA (AI Context & Roadmap)
> **Instrucción obligatoria para IAs futuras:** Revisa siempre esta sección para conocer el estado preciso del proyecto antes de generar código. Cada vez que realices un cambio estructural o agregues una nueva funcionalidad, DEBES agregar una entrada a este historial explicando brevemente los ficheros modificados y su función en el código.

### [Sprint 3] - Inicialización y Containerización
* **Fecha:** Abril 2026
* **Funciones implementadas y contexto de código:**
  - `docker-compose.yml`: Orquesta la infraestructura de la app mediante 3 contenedores separados (`mongodb`, `backend`, `frontend`) bajo una misma red (`joylog-net`).
  - `/backend/...` y `/frontend/...`: Se ha definido la jerarquía de carpetas necesaria para un patrón MVC (backend) y basado en componentes (frontend). Ambas cuentan con un `Dockerfile` base de desarrollo (`node:20-alpine`).
  - `/shared/types/interfaces.ts`: Punto único de verdad para las definiciones de TypeScript compartidas entre el cliente (React) y la API (Mongoose).

### [Sprint 3] - Migración Arquitectónica a Microservicios
* **Fecha:** Abril 2026
* **Funciones implementadas y contexto de código:**
  - Se ha abandonado la carpeta monolítica `/backend` en favor del paradigma de microservicios alojados en la carpeta `/services`.
  - `/services/api-gateway/`: Construido con Node Express y `http-proxy-middleware`, actúa como router y puerta de entrada en el puerto local `:3000`. Recibe tráfico principal y redirige a los otros servicios bajo la red de docker interna.
  - `/services/auth-service/` y `/services/library-service/`: Microservicios individuales cada uno con su propio `package.json`, conexión a MongoDB y `Dockerfile` bajo `node:20-alpine`, orquestados independientemente.
  - `docker-compose.yml`: Actualizado para lanzar la nueva arquitectura repartida en cinco servicios (`mongodb`, `api-gateway`, `auth-service`, `library-service`, `frontend`).

### [Sprint 3] - Autenticación JWT y Modelo de Usuarios
* **Fecha:** Abril 2026
* **Funciones implementadas y contexto de código:**
  - **Auth Service (`/services/auth-service/`)**: Implementado en su totalidad el CRUD de autenticación.
  - El esquema de datos reside en `src/models/User.ts` con tipado fuerte en Mongoose (`IUser`).
  - Lógica de Hasheo: Utiliza `bcryptjs` en `authController.ts` antes de persistir las contraseñas.
  - Rutas y Proxy Funcionales: El Gateway redirige el puerto externo `:3000` de forma limpia hacia el puerto `:3001` interno, omitiendo subrutas inyectadas. Entrar en `localhost:3000/api/auth/register` impacta directamente al middleware de login y te devuelve un JWT (provisto por `jsonwebtoken`) válido.
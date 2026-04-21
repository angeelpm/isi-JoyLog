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
├── backend/
│   ├── Dockerfile             # Receta para construir la imagen de Node.js
│   ├── .dockerignore          # Para evitar copiar node_modules e ignorar archivos pesados
│   ├── src/
│   │   ├── models/            # Esquemas de Mongoose
│   │   ├── controllers/
│   │   ├── services/          # Wrappers para APIs
│   │   ├── routes/
│   │   └── middleware/
│   ├── tests/
│   ├── package.json
│   └── .env
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
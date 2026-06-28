# JoyLog — Listado de requisitos / funcionalidad (Sprint 2)

## Autenticación

- [x] Registro de usuario (email + contraseña) — `true`
- [x] Login con JWT — `true`
- [x] Obtener / actualizar perfil propio (bio, avatar) — `true`

## Librería de juegos

- [x] Buscar juegos (integración RAWG API) — `true`
- [x] Añadir / actualizar / eliminar entrada de librería — `true`
- [x] Estados de juego (jugando, completado, backlog, dropped, wishlist) — `true`
- [x] Reseñas y diario de reseñas (`reviewLogs`) por entrada — `true`
- [x] Estadísticas de librería (propias y públicas) — `true`
- [x] Precios de juegos (integración IsThereAnyDeal) — `true`

## Social

- [x] Seguir / dejar de seguir usuarios — `true`
- [x] Listado de seguidores / seguidos — `true`
- [x] Perfil público de usuario — `true`
- [x] Likes en reseñas de comunidad — `true`
- [x] Comentarios en reseñas — `true`
- [x] Feed de actividad de usuarios seguidos — `true`
- [x] Diario cronológico propio — `true` 
- [x] Juegos favoritos con portada e id RAWG — `true` 
- [x] Juegos en común entre dos usuarios — `true`
- [x] Listas colaborativas de juegos — `true` 

## IA

- [x] Recomendaciones de juegos (Gemini API) — `true`

## Infraestructura

- [x] API Gateway con proxy a microservicios — `true`
- [x] Despliegue local vía Docker Compose — `true`
- [x] Tests automatizados (Vitest, backend y frontend) — `true`

---

| Área | Requisito | Estado |
|---|---|---|
| Autenticación | Registro de usuario | true |
| Autenticación | Login con JWT | true |
| Autenticación | Perfil propio (GET/PUT) | true |
| Librería | Búsqueda de juegos (RAWG) | true |
| Librería | CRUD de entradas de librería | true |
| Librería | Estados de juego | true |
| Librería | Reseñas / diario (reviewLogs) | true |
| Librería | Estadísticas propias y públicas | true |
| Librería | Precios (ITAD) | true |
| Social | Follow / unfollow | true |
| Social | Followers / following | true |
| Social | Perfil público | true |
| Social | Likes en reseñas | true |
| Social | Comentarios en reseñas | true |
| Social | Feed de actividad | true |
| Social | Diario cronológico propio | true |
| Social | Favoritos (objeto con portada) | true |
| Social | Juegos en común | true |
| Social | Listas colaborativas | true |
| IA | Recomendaciones (Gemini) | true |
| Infraestructura | API Gateway | true |
| Infraestructura | Docker Compose | true |
| Infraestructura | Tests automatizados | true |

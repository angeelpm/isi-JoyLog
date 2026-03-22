# JoyLog – Listado de Requisitos

## Requisitos Funcionales

### Autenticación y Usuarios
- [ ] RF-01: Registro de usuario con email y contraseña
- [ ] RF-02: Login de usuario con JWT
- [ ] RF-03: Logout y expiración de sesión
- [ ] RF-04: Edición de perfil (avatar, bio, nombre)
- [ ] RF-05: Perfil público visible para otros usuarios

### Biblioteca de Juegos
- [ ] RF-06: Añadir juego a biblioteca personal
- [ ] RF-07: Seleccionar plataforma del juego (PC, PS5, Xbox, Switch, Móvil)
- [ ] RF-08: Asignar estado al juego (Jugando, Completado, Pendiente, Abandonado, 100%)
- [ ] RF-09: Registrar horas jugadas
- [ ] RF-10: Asignar puntuación personal (1-10)
- [ ] RF-11: Registrar fecha de inicio y fecha de fin
- [ ] RF-12: Eliminar juego de la biblioteca
- [ ] RF-13: Editar datos de un juego en la biblioteca

### Búsqueda y Fichas de Juegos
- [ ] RF-14: Buscar juegos por nombre usando RAWG API
- [ ] RF-15: Ver ficha detallada del juego (título, portada, género, plataformas, descripción, metacritic)
- [ ] RF-16: Ver capturas de pantalla del juego
- [ ] RF-17: Añadir juego directamente desde la ficha a la biblioteca

### Filtros y Organización
- [ ] RF-18: Filtrar biblioteca por estado (Jugando, Completado, Pendiente, etc.)
- [ ] RF-19: Filtrar biblioteca por plataforma
- [ ] RF-20: Filtrar biblioteca por género
- [ ] RF-21: Filtrar por duración estimada (menos de 5h, 5-20h, más de 20h)
- [ ] RF-22: Ordenar biblioteca por nota, fecha de adición, nombre

### Reseñas
- [ ] RF-23: Escribir reseña de un juego con texto y puntuación
- [ ] RF-24: Editar reseña propia
- [ ] RF-25: Eliminar reseña propia
- [ ] RF-26: Ver reseñas de otros usuarios en la ficha del juego
- [ ] RF-27: Valorar reseñas de otros usuarios (like)

### Ofertas y Precios
- [ ] RF-28: Ver precios actuales del juego en distintas tiendas (IsThereAnyDeal API)
- [ ] RF-29: Ver histórico de precios mínimos
- [ ] RF-30: Enlace directo a la tienda con mejor precio

### Social
- [ ] RF-31: Seguir a otros usuarios
- [ ] RF-32: Ver feed de actividad de usuarios seguidos
- [ ] RF-33: Compartir reseña en perfil público
- [ ] RF-34: Ver estadísticas de otros usuarios en su perfil público

### Estadísticas y Logros
- [ ] RF-35: Dashboard con estadísticas personales (total juegos, horas, % completados)
- [ ] RF-36: Gráficos por género, plataforma, año
- [ ] RF-37: Sistema de logros internos (e.g., "10 juegos completados", "Primera reseña")
- [ ] RF-38: Badges visibles en perfil

## Requisitos No Funcionales

- [ ] RNF-01: Tiempo de respuesta del servidor < 2 segundos
- [ ] RNF-02: Frontend responsive (desktop y móvil)
- [ ] RNF-03: Contraseñas hasheadas con bcrypt
- [ ] RNF-04: Autenticación segura con JWT (tokens expiran en 24h)
- [ ] RNF-05: Base de datos en la nube (MongoDB Atlas)
- [ ] RNF-06: API REST documentada
- [ ] RNF-07: Código versionado en GitHub
- [ ] RNF-08: Variables de entorno para claves API y URI de BD
- [ ] RNF-09: Mínimo 2 APIs externas integradas (RAWG + IsThereAnyDeal)
- [ ] RNF-10: Caché de fichas de juegos para reducir llamadas a la API

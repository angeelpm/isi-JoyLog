# Análisis de viabilidad de JoyLog

## 1. Descripción del proyecto

JoyLog es un "Letterboxd para videojuegos": una app web donde el usuario registra los juegos que juega, les pone nota, escribe reseñas con bitácora (varios "logs" por juego, no solo una nota final), lleva estadísticas de su librería (horas, completados, por estado) y tiene una capa social encima (seguir a otros usuarios, perfiles públicos, likes y comentarios en reseñas, feed de actividad, listas colaborativas de juegos).

**Problema que resuelve:** no existe un sitio centrado *solo* en videojuegos con el formato de diario + comunidad que tienen Letterboxd (cine) o Backloggd (el equivalente directo en juegos). Steam tiene reseñas pero no diario ni estadísticas reales; RAWG es una base de datos, no una red social.

**A quién va dirigido:** jugadores que ya catalogan sus partidas mentalmente o en notas sueltas y quieren algo social y visual para hacerlo. Nicho, no masa.

**Stack:** React 19 + TypeScript + Vite (frontend), Node/Express + MongoDB en microservicios (`api-gateway`, `auth-service`, `library-service`, `ai-service`), Docker Compose para todo el entorno. APIs externas: RAWG (catálogo de juegos), IsThereAnyDeal (precios), Google Gemini (recomendaciones IA).

**Recursos disponibles:** 2 personas (backend y frontend en paralelo), proyecto académico (ISI), sin presupuesto, plazo de semanas por sprint.

---

## 2. Análisis de mercado

**Competencia directa:** Backloggd existe y hace exactamente esto (diario, listas, reseñas, social, gratis) y ya tiene base de usuarios. Esa es la comparación obligada y JoyLog hoy no le aporta nada que Backloggd no tenga ya. HowLongToBeat cubre tiempos de juego, Steam cubre reseñas y comunidad dentro de su propio ecosistema.

**Diferenciación actual:** Las dos piezas que distinguen a JoyLog frente a Backloggd son el comparador de precios en tiempo real vía ITAD (muestra el precio más barato en Steam, Epic, Humble, etc.) y las recomendaciones personalizadas por IA con Google Gemini (por biblioteca del usuario o por temática libre). Ambas están completamente implementadas.

**Conclusión de mercado:** como producto comercial nuevo, no hay ángulo de entrada claro. Como proyecto para aprender a construir un sistema completo (microservicios, auth, integraciones externas, capa social), el mercado es irrelevante: el valor está en el ejercicio, no en captar usuarios reales.

---

## 3. Viabilidad técnica

Sí es viable técnicamente, y de hecho está completamente construido y funcionando. El stack es estándar y conocido por el equipo. Incluye suite de tests (unitarios e integración) para frontend y backend, pipeline de CI con GitHub Actions, y setup de despliegue a producción con Docker + Cloudflare Tunnel.

Puntos débiles técnicos reales:
- Microservicios para esta escala es sobre-ingeniería: un monolito modular habría sido más rápido de construir y mantener con 2 personas, pero la elección está justificada académicamente (demuestra arquitectura distribuida).
- Sin tests de carga ni monitoring real más allá de `/health`, no se sabe cómo se comporta bajo uso real.

Para un entorno académico o un MVP cerrado a un grupo pequeño, la arquitectura aguanta perfectamente. Para producción con usuarios reales necesitaría observabilidad, rate-limiting en las APIs externas (RAWG/ITAD tienen límites) y caché.

---

## 4. Viabilidad financiera

**Costes de desarrollo:** ya hundidos (tiempo de 2 estudiantes, sin coste monetario directo más allá de su tiempo).

**Costes de operación si saliera a producción:**
- Hosting de 4 servicios + MongoDB: con algo barato (Render, Railway, Fly.io) ronda 15–40 €/mes para tráfico bajo. Self-hosted en una VPS, 5–10 €/mes.
- RAWG: gratis hasta cierto volumen de peticiones, después de pago.
- ITAD: gratis con límite de rate.
- Gemini API: de pago por token, bajo coste a poco volumen pero escala con uso si la IA se usa mucho.
- Dominio: ~10 €/año.

Estimación realista para un MVP con tráfico bajo: **20–60 €/mes**.

**Fuente de ingresos:** modelo definido como freemium (funcionalidad base gratuita, capa premium de pago: perfiles avanzados, estadísticas extra, sin publicidad, al estilo Letterboxd), pero **no implementado** porque para el alcance del proyecto académico no aporta valor: no hay pasarela de pago, no hay distinción de tiers en el código, no hay lógica de feature-gating. Es una decisión consciente, no un olvido; implementarlo ahora sería esfuerzo sin retorno mientras no haya usuarios reales que monetizar.

**Tiempo a rentabilidad:** Indefinido. Sin base de usuarios, sin canal de captación definido y con Backloggd como alternativa gratuita ya instalada, no hay forma realista de proyectar cuándo podría cubrir sus propios costes operativos (20–60 €/mes). El breakeven mensual es bajo en papel, pero llegar a la tracción que lo justifique es el obstáculo real, no el dinero.

**Veredicto financiero:** Los costes son manejables. El modelo freemium está bien pensado. El problema no es financiero: es que sin usuarios no hay nada que monetizar, y conseguir esos usuarios requiere una diferenciación que hoy no existe.

---

## 5. Viabilidad operativa

Para el alcance académico (entrega de sprint, demo, repositorio activo) sí es viable con 2 personas: el reparto backend/frontend en ramas paralelas con contrato de API acordado está funcionando bien y permite avanzar sin bloquearse mutuamente.

Para sostenerlo como producto real con usuarios:
- 2 personas sin presupuesto no pueden cubrir soporte, moderación de contenido social (comentarios, listas colaborativas son superficie de abuso/spam) ni operación continua a la vez que mantienen sus estudios/trabajos.
- No hay plan de moderación, ni política de contenido, ni gestión de incidentes, necesarios en cuanto hay usuarios reales interactuando entre sí (comentarios, listas, perfiles públicos).

**Veredicto operativo:** sostenible como proyecto de curso con el equipo actual. No sostenible como producto vivo sin ampliar el equipo o reducir drásticamente el alcance social.

---

## 6. Riesgos principales

1. **La diferenciación frente a Backloggd existe pero no está probada en mercado.** El comparador de precios y las recomendaciones por IA están implementados, pero que sean suficientes para que alguien elija JoyLog sobre la alternativa gratuita ya establecida es una hipótesis, no un hecho demostrado.
2. **Dependencia de APIs externas gratuitas con límites.** RAWG e ITAD pueden cambiar condiciones, bajar límites o empezar a cobrar; el producto no funciona sin catálogo de juegos.
3. **Superficie social sin moderación.** Comentarios, listas colaborativas y perfiles públicos abren la puerta a spam/abuso en cuanto hay usuarios reales, y no hay nadie ni nada (ni equipo ni herramientas) para gestionarlo.
4. **Sobre-ingeniería para el tamaño del equipo.** Microservicios + Docker para 2 desarrolladores aumenta la complejidad operativa (4 servicios que mantener, desplegar, monitorizar) sin que el volumen de uso lo justifique fuera del valor académico de demostrarlo.
5. **El freemium no tiene plan de captación de usuarios detrás.** El modelo de ingresos está definido pero no implementado, y eso está bien para el alcance académico. El problema real es que sin una base de usuarios, el freemium no tiene nada que convertir. Implementarlo antes de tener tracción sería esfuerzo desperdiciado.

---

## 7. Conclusión

Como proyecto académico: completamente logrado. La app está terminada y funcional de principio a fin: autenticación propia, librería con diario de partidas, capa social completa (follows, feed, likes, comentarios, listas colaborativas), comparador de precios, recomendaciones por IA, búsqueda de juegos vía RAWG, tests automatizados, CI con GitHub Actions y setup de despliegue a producción con Docker + Cloudflare Tunnel. Para los objetivos del sprint, sobra.

Como producto comercial: el problema sigue siendo de mercado, no técnico. La diferenciación frente a Backloggd (precios + IA) ya está construida, lo que antes era solo una hipótesis ahora al menos es una propuesta concreta. Pero si existe o no demanda real para eso es algo que solo se puede saber lanzándolo y midiendo.

**Veredicto final:** técnicamente, el proyecto está bien ejecutado y terminado. El siguiente paso, si hubiera intención de sacarlo del ámbito académico, no sería escribir más código sino conseguir los primeros usuarios reales y ver si el comparador de precios y la IA son suficiente razón para usarlo sobre Backloggd.

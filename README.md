# ✈️ English Quest

Juego web para aprender inglés con temática de viajes: responde preguntas, gana XP, mantén rachas y colecciona sellos en tu pasaporte.

## 🚀 Cómo ejecutarlo

1. Abre la carpeta `english-quest` en VS Code
2. Instala la extensión **Live Server** (si no la tienes)
3. Clic derecho sobre `index.html` → **Open with Live Server**
4. También funciona abriendo `index.html` directamente en el navegador

## 📁 Estructura

```
english-quest/
├── index.html          → estructura de las 4 pantallas
├── css/
│   └── style.css       → estilos (tema pasaporte/viaje)
├── js/
│   └── app.js           → lógica del juego (XP, rachas, sellos, guardado)
├── data/
│   └── questions.json   → banco de preguntas, se carga en runtime con fetch()
└── README.md
```

## ➕ Cómo agregar o cambiar preguntas

El juego ya no trae las preguntas incrustadas en el código: `app.js` las carga en
runtime desde `data/questions.json` (con `fetch`, sin caché). Ese archivo es la
copia **pública** de un banco que vive en el repo privado `portfolio-`
(carpeta `english-quest/questions.json`), y se sincroniza automáticamente hacia
aquí mediante un GitHub Action cada vez que cambia — ya sea porque lo editas a
mano o porque un flujo de Make.com lo actualiza. Formato de cada pregunta:

```json
{
  "type": "Grammar",
  "difficulty": 2,
  "q": "Tu pregunta en inglés",
  "options": ["A", "B", "C", "D"],
  "answer": 1,
  "explain": { "es": "Explicación en español", "pt": "Explicação em português" }
}
```

`type` puede ser Grammar, Vocabulary o Reading. `answer` es el índice correcto
(0=A, 1=B, 2=C, 3=D). `difficulty` es un número (1=fácil, 2=medio, 3=difícil,
o los niveles que quieras agregar): dentro de cada destino, el juego ordena
las preguntas de menor a mayor dificultad, mezclando el orden dentro de cada
nivel — así cada partida escala en dificultad y nunca se repite igual.
`explain` es un objeto `{ es, pt }`: el juego muestra el texto según el idioma
elegido en la pantalla de bienvenida.

## 🌍 Cómo agregar un destino nuevo

Edita `data/questions.json` (o su fuente en el repo privado) y agrega un
bloque completo `{ "id", "flag", "name", "level", "desc", "questions" }`, donde
`name`, `level` y `desc` también son objetos `{ es, pt }`. Usa un `id` único.
El pasaporte y el menú se actualizan solos.

## 🌐 Idiomas

Al entrar, el juego pide elegir español o portugués (se guarda en
`localStorage` y se puede cambiar después con el enlace "Cambiar idioma" en
la pantalla de inicio). Esa elección solo cambia el idioma de la interfaz y
de las explicaciones — las preguntas y alternativas siempre están en inglés,
porque es el idioma que se está aprendiendo.

## 🎮 Mecánicas

- **XP**: 10 por respuesta correcta + bonus de racha (hasta +10)
- **Racha (streak)**: se reinicia al fallar
- **Sello**: se gana con 70% o más de aciertos en un destino
- **Guardado**: el progreso se guarda en tu navegador (localStorage)

## 📡 Publicar en GitHub Pages

Igual que tu portafolio: sube la carpeta a un repo, activa Pages en Settings → Pages → branch `main`, y listo.

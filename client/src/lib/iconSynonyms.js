// Los íconos (Tabler, Lucide, Fluent Emoji, Noto) tienen nombre y etiquetas
// en inglés. Este diccionario traduce términos comunes en español a palabras
// clave en inglés para que la búsqueda "bombillo" también encuentre
// "bulb"/"light", "fiesta" encuentre "party", etc. No pretende ser
// exhaustivo: cubre conceptos frecuentes en un contexto educativo/institucional
// y del vocabulario típico de emojis. Se puede seguir ampliando con el tiempo.
export const ICON_SYNONYMS = {
  // Casa y lugares
  casa: ['house', 'home'],
  hogar: ['house', 'home'],
  edificio: ['building'],
  escuela: ['school'],
  colegio: ['school'],
  universidad: ['school', 'building'],
  biblioteca: ['book', 'library'],
  oficina: ['building', 'briefcase'],
  hospital: ['hospital', 'medical'],
  tienda: ['shopping', 'store', 'cart'],
  banco: ['bank', 'building-bank'],
  ciudad: ['building', 'city'],
  puerta: ['door'],
  ventana: ['window'],

  // Luz / ideas
  bombillo: ['bulb', 'light', 'lamp'],
  bombilla: ['bulb', 'light', 'lamp'],
  foco: ['bulb', 'light', 'lamp'],
  lampara: ['lamp', 'light', 'bulb'],
  idea: ['bulb', 'idea'],
  luz: ['light', 'bulb', 'sun'],

  // Personas y emociones
  persona: ['user', 'person'],
  gente: ['users', 'people'],
  usuario: ['user'],
  equipo: ['users', 'team'],
  familia: ['home', 'users', 'heart'],
  nino: ['baby', 'child'],
  bebe: ['baby'],
  hombre: ['man'],
  mujer: ['woman'],
  amor: ['heart'],
  corazon: ['heart'],
  feliz: ['mood-happy', 'smile'],
  triste: ['mood-sad'],
  enojado: ['mood-angry'],
  sorpresa: ['mood-surprised'],

  // Aprendizaje / trabajo
  libro: ['book'],
  cuaderno: ['notebook'],
  lapiz: ['pencil'],
  lapicero: ['pen'],
  boligrafo: ['pen'],
  examen: ['file-text', 'clipboard'],
  tarea: ['checklist', 'clipboard'],
  nota: ['note', 'file-text'],
  meta: ['target', 'flag'],
  objetivo: ['target', 'flag'],
  logro: ['trophy', 'award'],
  premio: ['trophy', 'award', 'medal'],
  medalla: ['medal', 'award'],
  trofeo: ['trophy'],
  grafica: ['chart'],
  grafico: ['chart'],
  reporte: ['report', 'file-text'],
  presentacion: ['presentation'],
  pizarra: ['blackboard', 'presentation'],
  calculadora: ['calculator'],
  matematicas: ['math'],
  ciencia: ['flask', 'atom'],
  microscopio: ['microscope'],

  // Tiempo
  reloj: ['clock'],
  tiempo: ['clock', 'hourglass'],
  calendario: ['calendar'],
  fecha: ['calendar'],
  alarma: ['alarm', 'bell'],
  cronometro: ['clock', 'stopwatch'],

  // Comunicación / tecnología
  telefono: ['phone'],
  celular: ['device-mobile', 'phone'],
  correo: ['mail'],
  email: ['mail'],
  mensaje: ['message'],
  chat: ['message', 'chat'],
  computador: ['device-desktop', 'computer'],
  computadora: ['device-desktop', 'computer'],
  portatil: ['device-laptop'],
  camara: ['camera'],
  video: ['video'],
  microfono: ['microphone'],
  altavoz: ['speaker', 'volume'],
  internet: ['world', 'wifi'],
  wifi: ['wifi'],
  candado: ['lock'],
  llave: ['key'],
  configuracion: ['settings'],
  ajustes: ['settings'],
  buscar: ['search'],
  guardar: ['device-floppy', 'save'],
  compartir: ['share'],
  enviar: ['send'],
  subir: ['upload'],
  descargar: ['download'],
  editar: ['edit', 'pencil'],
  eliminar: ['trash', 'delete'],
  borrar: ['trash', 'delete', 'eraser'],
  copiar: ['copy'],
  imprimir: ['printer'],
  conectar: ['plug', 'link'],

  // Naturaleza / clima
  sol: ['sun'],
  luna: ['moon'],
  estrella: ['star'],
  nube: ['cloud'],
  lluvia: ['rain'],
  nieve: ['snow'],
  arbol: ['tree'],
  flor: ['flower'],
  planta: ['plant'],
  fuego: ['flame', 'fire'],
  agua: ['droplet', 'water'],
  montana: ['mountain'],
  playa: ['beach'],
  tierra: ['world', 'earth'],
  planeta: ['world', 'planet'],

  // Animales
  perro: ['dog'],
  gato: ['cat'],
  pajaro: ['bird'],
  pez: ['fish'],

  // Comida
  comida: ['food'],
  manzana: ['apple'],
  cafe: ['coffee'],
  pizza: ['pizza'],
  pan: ['bread'],

  // Transporte
  carro: ['car'],
  auto: ['car'],
  bus: ['bus'],
  bicicleta: ['bike', 'bicycle'],
  avion: ['plane'],
  tren: ['train'],
  barco: ['ship', 'boat'],

  // Salud
  salud: ['health', 'medical'],
  medico: ['medical', 'stethoscope'],
  doctor: ['medical', 'stethoscope'],
  medicina: ['pill', 'medical'],
  corazonsalud: ['heart', 'heartbeat'],
  vacuna: ['vaccine'],

  // Dinero / compras
  dinero: ['cash', 'coin', 'money'],
  pago: ['cash', 'credit-card'],
  tarjeta: ['credit-card'],
  compra: ['shopping-cart', 'cart'],
  carrito: ['cart', 'shopping-cart'],
  regalo: ['gift'],

  // Símbolos / formas
  bandera: ['flag'],
  mapa: ['map'],
  ubicacion: ['map-pin', 'location'],
  pin: ['map-pin'],
  flecha: ['arrow'],
  circulo: ['circle'],
  cuadrado: ['square'],
  triangulo: ['triangle'],
  mas: ['plus'],
  menos: ['minus'],
  correcto: ['check'],
  incorrecto: ['x'],
  pregunta: ['question', 'help'],
  ayuda: ['help', 'question', 'life-buoy'],
  informacion: ['info'],
  advertencia: ['alert-triangle', 'warning'],
  candela: ['candle'],
  escudo: ['shield'],
  herramienta: ['tool', 'wrench'],
  engranaje: ['settings', 'gear'],

  // Sondeo / actividad (vocabulario propio de la app)
  habito: ['habit', 'repeat', 'target'],
  estrategia: ['bulb', 'target', 'chess'],
  apoyo: ['heart-handshake', 'users', 'life-buoy'],
  compromiso: ['handshake', 'check'],

  // Celebraciones / emociones (frecuente en los sets de emoji a color)
  fiesta: ['party', 'confetti', 'celebration'],
  celebracion: ['party', 'confetti', 'celebration'],
  cumpleanos: ['birthday', 'cake', 'party'],
  torta: ['cake'],
  pastel: ['cake'],
  globo: ['balloon'],
  risa: ['laughing', 'grinning', 'joy'],
  reir: ['laughing', 'grinning', 'joy'],
  llorar: ['crying', 'sad'],
  beso: ['kiss', 'kissing'],
  abrazo: ['hug', 'hugging'],
  aplauso: ['clapping'],
  saludo: ['wave', 'waving'],
  pulgar: ['thumbs-up', 'thumbsup'],
  pirotecnia: ['fireworks'],
  musica: ['music', 'musical-note'],
  baile: ['dancing', 'dancer'],
  deporte: ['sport', 'ball', 'trophy'],
  futbol: ['soccer', 'football'],
  baloncesto: ['basketball'],
  natacion: ['swim', 'swimming'],

  // Viajes / clima
  viaje: ['travel', 'suitcase', 'airplane'],
  maleta: ['suitcase', 'luggage'],
  vacaciones: ['beach', 'palm-tree', 'travel'],
  arcoiris: ['rainbow'],
  tormenta: ['storm', 'lightning', 'cloud'],
  rayo: ['bolt', 'lightning'],
  viento: ['wind'],
  paraguas: ['umbrella'],

  // Comida (frecuente en emoji)
  helado: ['ice-cream', 'ice-cream-cone'],
  hamburguesa: ['hamburger', 'burger'],
  ensalada: ['salad', 'green-salad'],
  fruta: ['fruit'],
  verdura: ['vegetable'],
  chocolate: ['chocolate'],
  dulce: ['candy', 'sweet'],
  bebida: ['drink', 'beverage'],
  jugo: ['juice'],
  cerveza: ['beer'],
  vino: ['wine'],

  // Cuerpo / gestos
  mano: ['hand'],
  ojo: ['eye'],
  cara: ['face'],
  cerebro: ['brain'],
  diente: ['tooth'],
  hueso: ['bone'],
  musculo: ['muscle', 'flexed-biceps'],
};

/** Expande una búsqueda escrita en español con sus equivalentes en inglés. */
export function expandSearchTerms(query) {
  const words = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes: "bombilla" y "bombílla" buscan igual
    .split(/\s+/)
    .filter(Boolean);
  const terms = new Set(words);
  for (const w of words) {
    const syns = ICON_SYNONYMS[w];
    if (syns) syns.forEach((s) => terms.add(s));
  }
  return [...terms];
}

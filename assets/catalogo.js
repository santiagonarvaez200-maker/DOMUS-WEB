/* Catálogo de muebles nuevos a medida.
   Para cada mueble:
   - nombre: nombre corto.
   - descripcion: una frase directa (los muebles se hacen a la medida del cliente).
   - precio: texto que se muestra, por ejemplo "Desde $1.200.000".
   - foto: ruta de la imagen, por ejemplo "assets/fotos/cocina-integral.jpg". Vacío = recuadro "Foto pendiente".
   - referencia: true muestra la etiqueta "Foto de referencia" (para fotos que no son de trabajos propios).
   Para agregar un mueble, copia un bloque { ... } dentro de la categoría. */
window.DOMUS_CATALOGO = [
  {
    id: "cocina",
    nombre: "Cocina",
    items: [
      { nombre: "Cocina integral", descripcion: "Muebles altos y bajos pensados para tu cocina, en la madera y el color que elijas.", precio: "Desde $1.200.000 el metro lineal", foto: "assets/fotos/cocina-integral.jpg", referencia: true },
      { nombre: "Alacena", descripcion: "Espacio de guardado para tu despensa y tu vajilla.", precio: "Desde $1.200.000", foto: "assets/fotos/alacena.jpg", referencia: true },
      { nombre: "Barra desayunadora", descripcion: "Una barra que aprovecha el espacio y separa la cocina de la sala.", precio: "Desde $1.100.000", foto: "https://images.unsplash.com/photo-1788217158679-5f7a52049ecc?w=1000&q=80&auto=format&fit=crop", referencia: true },
      { nombre: "Repisas de cocina", descripcion: "Repisas abiertas para tener a la mano lo que más usas.", precio: "Desde $180.000", foto: "assets/fotos/repisas-de-cocina.jpg", referencia: true }
    ]
  },
  {
    id: "banos",
    nombre: "Baños",
    items: [
      { nombre: "Mueble de lavamanos", descripcion: "Mueble bajo el lavamanos con puertas o cajones, terminado para resistir la humedad.", precio: "Desde $650.000", foto: "assets/fotos/mueble-de-lavamanos.jpg", referencia: true },
      { nombre: "Gabinete de pared", descripcion: "Gabinete con o sin espejo para ordenar lo del día a día.", precio: "Desde $350.000", foto: "assets/fotos/gabinete-de-pared.jpg", referencia: true },
      { nombre: "Repisa de baño", descripcion: "Repisa sencilla para toallas y accesorios.", precio: "Desde $150.000", foto: "assets/fotos/repisa-de-bano.jpg", referencia: true }
    ]
  },
  {
    id: "habitaciones",
    nombre: "Habitaciones",
    items: [
      { nombre: "Clóset", descripcion: "Clóset de piso a techo, con la distribución que necesitas.", precio: "Desde $1.500.000", foto: "assets/fotos/closet.jpg", referencia: true },
      { nombre: "Cama", descripcion: "Base de cama con o sin cajones y cabecero a juego.", precio: "Desde $1.300.000", foto: "assets/fotos/cama.jpg", referencia: true },
      { nombre: "Mesa de noche", descripcion: "Mesa de noche con cajón, a juego con tu cama.", precio: "Desde $280.000", foto: "assets/fotos/mesa-de-noche.jpg", referencia: true },
      { nombre: "Cómoda", descripcion: "Cómoda de cajones para completar tu habitación.", precio: "Desde $750.000", foto: "assets/fotos/comoda.jpg", referencia: true }
    ]
  },
  {
    id: "salas",
    nombre: "Salas",
    items: [
      { nombre: "Mueble de TV", descripcion: "Centro de entretenimiento con espacio para equipos y decoración.", precio: "Desde $850.000", foto: "assets/fotos/mueble-de-tv.jpg", referencia: true },
      { nombre: "Mesa de centro", descripcion: "Mesa de centro en madera maciza, con o sin repisa.", precio: "Desde $450.000", foto: "assets/fotos/mesa-de-centro.jpg", referencia: true },
      { nombre: "Biblioteca", descripcion: "Biblioteca abierta o con puertas, para libros y objetos.", precio: "Desde $750.000", foto: "assets/fotos/biblioteca.jpg", referencia: true },
      { nombre: "Aparador", descripcion: "Aparador para el comedor o la entrada de tu casa.", precio: "Desde $700.000", foto: "assets/fotos/aparador.jpg", referencia: true }
    ]
  },
  {
    id: "estudio",
    nombre: "Estudio y oficina",
    items: [
      { nombre: "Escritorio", descripcion: "Escritorio para trabajar en casa, ajustado a tu espacio.", precio: "Desde $650.000", foto: "assets/fotos/escritorio.jpg", referencia: true },
      { nombre: "Estantería de oficina", descripcion: "Estantería para archivo, libros y equipos.", precio: "Desde $700.000", foto: "assets/fotos/estanteria-oficina.jpg", referencia: true },
      { nombre: "Mesa de reuniones", descripcion: "Mesa para tu oficina o espacio de trabajo compartido.", precio: "Desde $1.500.000", foto: "assets/fotos/mesa-de-reuniones.jpg", referencia: true }
    ]
  }
];

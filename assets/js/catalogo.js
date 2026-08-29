const grid = document.getElementById("pokemonGrid");
const totalPokemon = document.getElementById("totalPokemon");
const modal = document.getElementById("pokemonModal");
const cerrarModal = document.getElementById("cerrarModal");
const detalleImagen = document.getElementById("detalleImagen");
const detalleNumero = document.getElementById("detalleNumero");
const detalleNombre = document.getElementById("detalleNombre");
const detalleTipos = document.getElementById("detalleTipos");
const detalleDescripcion = document.getElementById("detalleDescripcion");
const detalleAltura = document.getElementById("detalleAltura");
const detallePeso = document.getElementById("detallePeso");
const detalleHabilidades = document.getElementById("detalleHabilidades");
const modalColeccion = document.getElementById("modalColeccion");
const cargarMas = document.getElementById("cargarMas");
const buscarPokemon = document.getElementById("buscarPokemon");
const botonBuscar = document.getElementById("botonBuscar");
const limpiarBusqueda = document.getElementById("limpiarBusqueda");

let modoBusqueda = false;
const coleccionIds = new Set();
const limite = 12;
let offset = 0;
let totalDisponible = 0;
let cargandoPokemon = false;
let pokemonSeleccionado = null;

function cargarEstadoColeccion() {
    try {
        const coleccion = JSON.parse(localStorage.getItem("pokemon_coleccion")) || [];
        coleccionIds.clear();
        coleccion.forEach(p => coleccionIds.add(Number(p.id)));
    } catch (error) {
        console.error("Error leyendo colección:", error);
    }
}

async function obtenerDetallesBasicos(url) {
    const res = await fetch(url);
    const data = await res.json();
    return {
        id: data.id,
        nombre: data.name.charAt(0).toUpperCase() + data.name.slice(1),
        imagen: data.sprites.other["official-artwork"].front_default || data.sprites.front_default,
        tipos: data.types.map(t => t.type.name),
        altura: data.height / 10,
        peso: data.weight / 10,
        habilidades: data.abilities.map(a => ({
            nombre: a.ability.name.replace("-", " "),
            oculta: a.is_hidden
        }))
    };
}

async function cargarPokemon(reiniciar = false) {
    if (cargandoPokemon) return;
    cargandoPokemon = true;
    cargarMas.disabled = true;
    cargarMas.textContent = "Cargando...";

    if (reiniciar) {
        offset = 0;
        grid.innerHTML = `<div class="loading">Cargando Pokémon...</div>`;
    }

    try {
        const respuesta = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limite}&offset=${offset}`);
        const resultado = await respuesta.json();

        totalDisponible = resultado.count;
        totalPokemon.textContent = totalDisponible;

        if (reiniciar) grid.innerHTML = "";

        const pokemonPromises = resultado.results.map(p => obtenerDetallesBasicos(p.url));
        const pokemonList = await Promise.all(pokemonPromises);

        pokemonList.forEach(pokemon => {
            const card = crearPokemonCard(pokemon);
            grid.appendChild(card);
        });

        offset += pokemonList.length;
        cargarMas.style.display = offset >= totalDisponible ? "none" : "";
    } catch (error) {
        console.error(error);
        if (reiniciar) {
            grid.innerHTML = `<div class="loading">Error al cargar Pokémon</div>`;
        }
    } finally {
        cargandoPokemon = false;
        cargarMas.disabled = false;
        cargarMas.textContent = "Cargar más Pokémon";
    }
}

function crearPokemonCard(pokemon) {
    const card = document.createElement("article");
    card.className = "pokemon-card";
    card.style.setProperty("--pokemon-glow", obtenerColorTipo(pokemon.tipos[0]));

    const tipos = pokemon.tipos
        .map(tipo => `<span class="type-badge">${tipo}</span>`)
        .join("");

    const urlGif = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemon.id}.gif`;
    card.innerHTML = `
        <span class="pokemon-number">#${String(pokemon.id).padStart(3, "0")}</span>
        <h2 class="pokemon-name">${pokemon.nombre}</h2>
        <div class="pokemon-image">
            <img src="${urlGif}" alt="${pokemon.nombre}" loading="lazy" decoding="async">
        </div>
        <div class="pokemon-types">${tipos}</div>
        <div class="pokemon-actions">
            <button class="btn-card" data-id="${pokemon.id}">Ver detalles</button>
            <button class="btn-card btn-collection" data-id="${pokemon.id}">+ Colección</button>
        </div>
    `;

    const imgElement = card.querySelector(".pokemon-image img");
    const nombreLimpio = pokemon.nombre.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Precargar GIF en memoria para que no haya retraso al pasar el cursor
    const preloadGif = new Image();
    preloadGif.src = urlGif;

    const botonDetalle = card.querySelector(".btn-card:not(.btn-collection)");
    const botonColeccion = card.querySelector(".btn-collection");

    if (coleccionIds.has(Number(pokemon.id))) {
        botonColeccion.textContent = "✓ En colección";
        botonColeccion.classList.add("saved");
        botonColeccion.disabled = true;
    }

    botonColeccion.addEventListener("click", () => {
        agregarColeccion(pokemon, botonColeccion);
    });

    botonDetalle.addEventListener("click", () => {
        abrirDetalle(pokemon.id);
    });

    return card;
}

function obtenerColorTipo(tipo) {
    const colores = {
        fire: "rgba(239, 68, 68, .65)",
        water: "rgba(59, 130, 246, .65)",
        electric: "rgba(250, 204, 21, .65)",
        grass: "rgba(34, 197, 94, .60)",
        poison: "rgba(168, 85, 247, .60)",
        psychic: "rgba(236, 72, 153, .60)",
        ice: "rgba(34, 211, 238, .60)",
        dragon: "rgba(99, 102, 241, .60)",
        dark: "rgba(71, 85, 105, .60)",
        fairy: "rgba(244, 114, 182, .60)",
        normal: "rgba(148, 163, 184, .50)"
    };
    return colores[tipo] ?? "rgba(255,255,255,.10)";
}

async function abrirDetalle(id) {
    try {
        const resPokemon = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const dataPokemon = await resPokemon.json();

        let descripcion = "Información no disponible.";
        try {
            const resSpecies = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
            const dataSpecies = await resSpecies.json();
            const flavor = dataSpecies.flavor_text_entries.find(e => e.language.name === "es");
            if (flavor) {
                descripcion = flavor.flavor_text.replace(/\f/g, " ");
            }
        } catch (e) {}

        const pokemon = {
            id: dataPokemon.id,
            nombre: dataPokemon.name.charAt(0).toUpperCase() + dataPokemon.name.slice(1),
            imagen: dataPokemon.sprites.other["official-artwork"].front_default || dataPokemon.sprites.front_default,
            tipos: dataPokemon.types.map(t => t.type.name),
            altura: dataPokemon.height / 10,
            peso: dataPokemon.weight / 10,
            descripcion: descripcion,
            habilidades: dataPokemon.abilities.map(a => ({
                nombre: a.ability.name.replace("-", " "),
                oculta: a.is_hidden
            }))
        };

        pokemonSeleccionado = pokemon;
        const estaGuardado = coleccionIds.has(Number(pokemon.id));

        modalColeccion.disabled = estaGuardado;
        modalColeccion.textContent = estaGuardado ? "✓ Guardado en tu colección" : "+ Agregar a mi colección";
        modalColeccion.classList.toggle("saved", estaGuardado);

        const nombreLimpio = pokemon.nombre.toLowerCase().replace(/[^a-z]/g, "");
        detalleImagen.onerror = function () {
            this.src = pokemon.imagen;
        };
        detalleImagen.src = `https://projectpokemon.org/images/normal-sprite/${nombreLimpio}.gif`;
        detalleImagen.alt = pokemon.nombre;

        detalleNumero.textContent = `N.º ${String(pokemon.id).padStart(3, "0")}`;
        detalleNombre.textContent = pokemon.nombre;
        detalleTipos.innerHTML = pokemon.tipos.map(tipo => `<span class="type-badge">${tipo}</span>`).join("");
        detalleDescripcion.textContent = pokemon.descripcion;
        detalleAltura.textContent = `${pokemon.altura} m`;
        detallePeso.textContent = `${pokemon.peso} kg`;
        detalleHabilidades.innerHTML = pokemon.habilidades.map(h => `
            <div class="ability-item">
                <strong>${h.nombre}</strong>
                <span>${h.oculta ? "Oculta" : "Principal"}</span>
            </div>
        `).join("");

        modal.classList.add("open");
        document.body.style.overflow = "hidden";
    } catch (error) {
        console.error(error);
    }
}

function cerrarDetalle() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
}

cerrarModal.addEventListener("click", cerrarDetalle);
modal.querySelector(".modal-backdrop").addEventListener("click", cerrarDetalle);
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal.classList.contains("open")) {
        cerrarDetalle();
    }
});

function agregarColeccion(pokemon, boton = null) {
    try {
        const coleccion = JSON.parse(localStorage.getItem("pokemon_coleccion")) || [];
        const existe = coleccion.some(p => p.id === pokemon.id);

        if (!existe) {
            coleccion.push({
                id: pokemon.id,
                nombre: pokemon.nombre,
                imagen: pokemon.imagen,
                tipos: pokemon.tipos
            });
            localStorage.setItem("pokemon_coleccion", JSON.stringify(coleccion));
        }

        coleccionIds.add(Number(pokemon.id));

        if (boton) {
            boton.textContent = "✓ En colección";
            boton.classList.add("saved");
            boton.disabled = true;
        }

        if (modal.classList.contains("open")) {
            modalColeccion.textContent = "✓ Guardado en tu colección";
            modalColeccion.classList.add("saved");
            modalColeccion.disabled = true;
        }
    } catch (error) {
        console.error("Error guardando en colección:", error);
    }
}

modalColeccion.addEventListener("click", () => {
    if (pokemonSeleccionado) {
        agregarColeccion(pokemonSeleccionado);
    }
});

cargarMas.addEventListener("click", () => cargarPokemon());

async function ejecutarBusqueda() {
    const termino = buscarPokemon.value.trim().toLowerCase();
    if (termino === "") return;

    modoBusqueda = true;
    botonBuscar.disabled = true;
    botonBuscar.textContent = "...";
    cargarMas.style.display = "none";
    limpiarBusqueda.classList.add("visible");
    grid.innerHTML = `<div class="loading">Buscando Pokémon...</div>`;

    try {
        const respuesta = await fetch(`https://pokeapi.co/api/v2/pokemon/${termino}`);
        if (!respuesta.ok) throw new Error("No encontrado");

        const data = await respuesta.json();
        const pokemon = {
            id: data.id,
            nombre: data.name.charAt(0).toUpperCase() + data.name.slice(1),
            imagen: data.sprites.other["official-artwork"].front_default || data.sprites.front_default,
            tipos: data.types.map(t => t.type.name),
            altura: data.height / 10,
            peso: data.weight / 10,
            habilidades: data.abilities.map(a => ({
                nombre: a.ability.name.replace("-", " "),
                oculta: a.is_hidden
            }))
        };

        grid.innerHTML = "";
        grid.appendChild(crearPokemonCard(pokemon));
    } catch (error) {
        grid.innerHTML = `
            <div class="search-empty">
                <strong>Pokémon no encontrado</strong>
                Verifica el nombre o ID ingresado.
            </div>
        `;
    } finally {
        botonBuscar.disabled = false;
        botonBuscar.textContent = "Buscar";
    }
}

async function restaurarCatalogo() {
    modoBusqueda = false;
    buscarPokemon.value = "";
    limpiarBusqueda.classList.remove("visible");
    cargarMas.style.display = "";
    await cargarPokemon(true);
}

function iniciarCatalogo() {
    cargarEstadoColeccion();
    cargarPokemon(true);
}

botonBuscar.addEventListener("click", ejecutarBusqueda);
buscarPokemon.addEventListener("keydown", event => {
    if (event.key === "Enter") ejecutarBusqueda();
});
limpiarBusqueda.addEventListener("click", restaurarCatalogo);

iniciarCatalogo();
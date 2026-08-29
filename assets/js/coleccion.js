const grid = document.getElementById("collectionGrid");
const totalColeccion = document.getElementById("totalColeccion");
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

function obtenerColeccionLocal() {
    try {
        return JSON.parse(localStorage.getItem("pokemon_coleccion")) || [];
    } catch (e) {
        return [];
    }
}

function guardarColeccionLocal(coleccion) {
    localStorage.setItem("pokemon_coleccion", JSON.stringify(coleccion));
}

function cargarColeccion() {
    const coleccion = obtenerColeccionLocal();

    totalColeccion.textContent = coleccion.length;

    if (coleccion.length === 0) {
        mostrarColeccionVacia();
        return;
    }

    grid.innerHTML = "";

    coleccion.forEach(pokemon => {
        grid.appendChild(crearCard(pokemon));
    });
}

function crearCard(pokemon) {
    const card = document.createElement("article");
    card.className = "collection-card";
    card.style.setProperty("--pokemon-glow", obtenerColorTipo(pokemon.tipos[0]));

    const tipos = pokemon.tipos
        .map(tipo => `<span class="type-badge">${tipo}</span>`)
        .join("");

    card.innerHTML = `
        <div class="collection-card-header">
            <strong>${pokemon.nombre}</strong>
            <span>N.º ${String(pokemon.id).padStart(3, "0")}</span>
        </div>

        <div class="collection-image">
            <img src="${pokemon.imagen}" alt="${pokemon.nombre}" loading="lazy" decoding="async">
        </div>

        <div class="pokemon-types">${tipos}</div>

        <div class="collection-actions">
            <button class="btn-card btn-detail">Ver detalles</button>
            <button class="btn-remove">Eliminar</button>
        </div>
    `;

    const imgElement = card.querySelector(".collection-image img");
    const imagenEstatica = pokemon.imagen;
    const nombreLimpio = pokemon.nombre.toLowerCase().replace(/[^a-z0-9]/g, "");
    const urlGif = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemon.id}.gif`;

    const preloadGif = new Image();
    preloadGif.src = urlGif;

    card.addEventListener("mouseenter", () => {
        imgElement.src = urlGif;
        imgElement.onerror = () => {
            imgElement.src = imagenEstatica;
        };
    });

    card.addEventListener("mouseleave", () => {
        imgElement.src = imagenEstatica;
    });

    const botonDetalle = card.querySelector(".btn-detail");
    const botonEliminar = card.querySelector(".btn-remove");

    botonDetalle.addEventListener("click", () => {
        mostrarDetalle(pokemon.id);
    });

    botonEliminar.addEventListener("click", () => {
        eliminarPokemon(pokemon.id, pokemon.nombre, card);
    });

    return card;
}

async function mostrarDetalle(id) {
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

        const nombreLimpio = dataPokemon.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const urlGif = `https://play.pokemonshowdown.com/sprites/ani/${nombreLimpio}.gif`;

        detalleImagen.onerror = function () {
            this.onerror = null;
            this.src = dataPokemon.sprites.other["official-artwork"].front_default || dataPokemon.sprites.front_default;
        };

        detalleImagen.src = urlGif;
        detalleImagen.alt = dataPokemon.name;

        detalleNumero.textContent = `N.º ${String(dataPokemon.id).padStart(3, "0")}`;
        detalleNombre.textContent = dataPokemon.name.charAt(0).toUpperCase() + dataPokemon.name.slice(1);

        detalleTipos.innerHTML = dataPokemon.types
            .map(t => `<span class="type-badge">${t.type.name}</span>`)
            .join("");

        detalleDescripcion.textContent = descripcion;
        detalleAltura.textContent = `${dataPokemon.height / 10} m`;
        detallePeso.textContent = `${dataPokemon.weight / 10} kg`;

        detalleHabilidades.innerHTML = dataPokemon.abilities
            .map(h => `
                <div class="ability-item">
                    <strong>${h.ability.name.replace("-", " ")}</strong>
                    <span>${h.is_hidden ? "Oculta" : "Principal"}</span>
                </div>
            `)
            .join("");

        modal.classList.add("open");
        document.body.style.overflow = "hidden";
    } catch (error) {
        console.error("Error al cargar detalles:", error);
    }
}

function eliminarPokemon(id, nombre, card) {
    const confirmar = window.confirm(`¿Eliminar a ${nombre} de tu colección?`);
    if (!confirmar) return;

    let coleccion = obtenerColeccionLocal();
    coleccion = coleccion.filter(p => Number(p.id) !== Number(id));
    guardarColeccionLocal(coleccion);

    card.remove();

    const nuevoTotal = coleccion.length;
    totalColeccion.textContent = nuevoTotal;

    if (nuevoTotal === 0) {
        mostrarColeccionVacia();
    }
}

function mostrarColeccionVacia() {
    grid.innerHTML = `
        <div class="empty-collection">
            <h2>Tu colección está vacía</h2>
            <p>Explora el catálogo y agrega tus primeros Pokémon.</p>
            <a href="index.html">Explorar catálogo</a>
        </div>
    `;
}

function cerrarDetalle() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
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

cerrarModal.addEventListener("click", cerrarDetalle);
modal.querySelector(".modal-backdrop").addEventListener("click", cerrarDetalle);
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal.classList.contains("open")) {
        cerrarDetalle();
    }
});

cargarColeccion();
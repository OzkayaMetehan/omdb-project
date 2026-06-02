const OMDB_BASE_URL = "https://www.omdbapi.com/";
const STORAGE_KEYS = {
  apiKey: "omdb_api_key",
  lastSearch: "omdb_last_search",
  lastMovieId: "omdb_last_movie_id",
};

const elements = {
  form: document.querySelector("#search-form"),
  query: document.querySelector("#search-input"),
  type: document.querySelector("#type-filter"),
  year: document.querySelector("#year-filter"),
  apiKeyInput: document.querySelector("#api-key-input"),
  saveApiKey: document.querySelector("#save-api-key"),
  clearApiKey: document.querySelector("#clear-api-key"),
  settingsPanel: document.querySelector("#settings-panel"),
  status: document.querySelector("#status-region"),
  results: document.querySelector("#results-list"),
  resultCount: document.querySelector("#result-count"),
  detail: document.querySelector("#movie-detail"),
};

const state = {
  cache: new Map(),
  activeMovieId: "",
};

document.addEventListener("DOMContentLoaded", () => {
  createIcons();
  hydrateApiKey();
  restoreLastView();
});

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const search = getSearchFromForm();
  if (!search.query) {
    showStatus("Please enter a movie title.", true);
    return;
  }

  await searchMovies(search);
});

elements.saveApiKey.addEventListener("click", () => {
  const key = elements.apiKeyInput.value.trim();
  if (!key) {
    showStatus("Paste your OMDb API key before saving.", true);
    return;
  }

  localStorage.setItem(STORAGE_KEYS.apiKey, key);
  elements.apiKeyInput.value = "";
  elements.settingsPanel.open = false;
  showStatus("API key saved. You can start searching now.");
});

elements.clearApiKey.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEYS.apiKey);
  elements.settingsPanel.open = true;
  showStatus("API key removed from this browser.");
});

function hydrateApiKey() {
  const hasKey = Boolean(getApiKey());
  elements.settingsPanel.open = !hasKey;
  if (!hasKey) {
    showStatus("Add your OMDb API key to run live searches.");
  }
}

function getApiKey() {
  return localStorage.getItem(STORAGE_KEYS.apiKey) || "";
}

function getSearchFromForm() {
  return {
    query: elements.query.value.trim(),
    type: elements.type.value,
    year: elements.year.value.trim(),
  };
}

async function restoreLastView() {
  const params = new URLSearchParams(window.location.search);
  const movieIdFromUrl = params.get("i");
  const savedMovieId = movieIdFromUrl || localStorage.getItem(STORAGE_KEYS.lastMovieId);
  const savedSearch = readStoredSearch();

  if (savedSearch) {
    elements.query.value = savedSearch.query || "";
    elements.type.value = savedSearch.type || "";
    elements.year.value = savedSearch.year || "";
  }

  if (!getApiKey()) return;

  if (savedSearch?.query) {
    await searchMovies(savedSearch, { silent: true, selectedId: savedMovieId });
    return;
  }

  if (savedMovieId) {
    await loadMovieDetails(savedMovieId);
  }
}

function readStoredSearch() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.lastSearch));
  } catch {
    return null;
  }
}

async function searchMovies(search, options = {}) {
  if (!ensureApiKey()) return;

  const params = new URLSearchParams({
    apikey: getApiKey(),
    s: search.query,
  });

  if (search.type) params.set("type", search.type);
  if (search.year) params.set("y", search.year);

  setLoading("Searching OMDb...");

  try {
    const data = await fetchJson(params);
    if (data.Response === "False") {
      renderResults([]);
      showStatus(data.Error || "No movies found for this search.", true);
      return;
    }

    const movies = data.Search || [];
    localStorage.setItem(STORAGE_KEYS.lastSearch, JSON.stringify(search));
    renderResults(movies, options.selectedId);
    showStatus(`Found ${movies.length} result${movies.length === 1 ? "" : "s"} for "${search.query}".`);

    const movieToOpen = options.selectedId || movies[0]?.imdbID;
    if (movieToOpen) {
      await loadMovieDetails(movieToOpen, { updateUrl: !options.silent });
    }
  } catch (error) {
    showStatus(error.message, true);
  }
}

function renderResults(movies, selectedId = "") {
  elements.resultCount.textContent = `${movies.length} found`;

  if (!movies.length) {
    elements.results.innerHTML = '<p class="empty-state">No matching titles were found.</p>';
    renderEmptyDetail();
    return;
  }

  elements.results.innerHTML = movies
    .map((movie) => {
      const poster = movie.Poster && movie.Poster !== "N/A"
        ? `<img src="${escapeHtml(movie.Poster)}" alt="${escapeHtml(movie.Title)} poster" loading="lazy" />`
        : '<span class="poster-fallback">No poster</span>';

      return `
        <button
          class="result-card"
          type="button"
          data-id="${escapeHtml(movie.imdbID)}"
          aria-current="${movie.imdbID === selectedId ? "true" : "false"}"
        >
          ${poster}
          <span>
            <h3>${escapeHtml(movie.Title)}</h3>
            <p>${escapeHtml(movie.Year)} - ${escapeHtml(movie.Type)}</p>
          </span>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll(".result-card").forEach((button) => {
    button.addEventListener("click", () => loadMovieDetails(button.dataset.id));
  });
}

async function loadMovieDetails(imdbID, options = {}) {
  if (!ensureApiKey()) return;
  if (!imdbID) return;

  state.activeMovieId = imdbID;
  markActiveResult(imdbID);
  setLoading("Loading movie details...");

  try {
    const movie = state.cache.has(imdbID)
      ? state.cache.get(imdbID)
      : await fetchJson(
          new URLSearchParams({
            apikey: getApiKey(),
            i: imdbID,
            plot: "full",
          })
        );

    if (movie.Response === "False") {
      showStatus(movie.Error || "Movie details could not be loaded.", true);
      return;
    }

    state.cache.set(imdbID, movie);
    localStorage.setItem(STORAGE_KEYS.lastMovieId, imdbID);
    renderMovieDetails(movie);

    if (options.updateUrl !== false) {
      const url = new URL(window.location.href);
      url.searchParams.set("i", imdbID);
      window.history.replaceState({}, "", url);
    }

    showStatus(`Showing details for ${movie.Title}.`);
  } catch (error) {
    showStatus(error.message, true);
  }
}

async function fetchJson(params) {
  const response = await fetch(`${OMDB_BASE_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`OMDb request failed with status ${response.status}.`);
  }

  return response.json();
}

function renderMovieDetails(movie) {
  const poster = movie.Poster && movie.Poster !== "N/A"
    ? `<img class="movie-poster" src="${escapeHtml(movie.Poster)}" alt="${escapeHtml(movie.Title)} poster" />`
    : '<div class="movie-fallback">No poster available</div>';

  const ratings = Array.isArray(movie.Ratings) && movie.Ratings.length
    ? `
      <div class="ratings" aria-label="Ratings">
        ${movie.Ratings.map(
          (rating) =>
            `<span class="rating-pill">${escapeHtml(rating.Source)}: ${escapeHtml(rating.Value)}</span>`
        ).join("")}
      </div>
    `
    : "";

  elements.detail.innerHTML = `
    <article class="movie-layout">
      <div>${poster}</div>
      <div>
        <ul class="movie-meta">
          <li>${escapeHtml(movie.Year)}</li>
          <li>${escapeHtml(movie.Genre)}</li>
          <li>${escapeHtml(movie.Runtime)}</li>
          <li>${escapeHtml(movie.Rated)}</li>
        </ul>
        <h2 class="movie-title">${escapeHtml(movie.Title)}</h2>
        <p class="plot">${escapeHtml(movie.Plot)}</p>

        <div class="fact-grid">
          ${renderFact("Director", movie.Director)}
          ${renderFact("Writer", movie.Writer)}
          ${renderFact("Actors", movie.Actors)}
          ${renderFact("Released", movie.Released)}
          ${renderFact("Language", movie.Language)}
          ${renderFact("Awards", movie.Awards)}
        </div>
        ${ratings}
      </div>
    </article>
  `;
}

function renderFact(label, value) {
  return `
    <div class="fact">
      <span>${label}</span>
      <strong>${escapeHtml(value && value !== "N/A" ? value : "Unknown")}</strong>
    </div>
  `;
}

function renderEmptyDetail() {
  elements.detail.innerHTML = `
    <div class="detail-empty">
      <i data-lucide="film" aria-hidden="true"></i>
      <h2>Movie details will appear here.</h2>
      <p>Select a result to view title, year, genre, director, poster, and more.</p>
    </div>
  `;
  createIcons();
}

function markActiveResult(imdbID) {
  document.querySelectorAll(".result-card").forEach((button) => {
    button.setAttribute("aria-current", String(button.dataset.id === imdbID));
  });
}

function ensureApiKey() {
  if (getApiKey()) return true;

  elements.settingsPanel.open = true;
  showStatus("An OMDb API key is required before searching.", true);
  return false;
}

function setLoading(message) {
  elements.status.classList.remove("status--error");
  elements.status.innerHTML = `<strong>${message}</strong>`;
}

function showStatus(message, isError = false) {
  elements.status.classList.toggle("status--error", isError);
  elements.status.textContent = message;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

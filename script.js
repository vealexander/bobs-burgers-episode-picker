var episodesPool = [];
const ratingsStorageKey = "bobs-burgers-episode-ratings";
let episodeRatings = loadEpisodeRatings();
let currentEpisode = null;
let activeFilter = "all";

async function fetchEpisodes() {
  const generateButton = document.getElementById("generate-btn");

  try {
    const response = await fetch("https://api.tvmaze.com/shows/107/episodes");
    if (!response.ok) {
      throw new Error(`TVMaze request failed: ${response.status}`);
    }

    const fetchedEpisodes = await response.json();
    if (!Array.isArray(fetchedEpisodes)) {
      throw new Error("TVMaze response was not an episodes array.");
    }

    episodesPool = fetchedEpisodes;
    generateButton.removeAttribute("disabled");
    renderRatedEpisodes();
  } catch (error) {
    console.error("Unable to load Bob's Burgers episodes.", error);
  }
}

function loadEpisodeRatings() {
  try {
    const storedRatings = localStorage.getItem(ratingsStorageKey);
    if (storedRatings === null) {
      return {};
    }

    const parsedRatings = JSON.parse(storedRatings);
    if (
      parsedRatings === null ||
      typeof parsedRatings !== "object" ||
      Array.isArray(parsedRatings)
    ) {
      throw new Error("Saved episode ratings are not a valid object.");
    }

    return Object.fromEntries(
      Object.entries(parsedRatings).filter(
        ([, rating]) => rating === "liked" || rating === "disliked"
      )
    );
  } catch (error) {
    console.error("Unable to load saved episode ratings.", error);
    return {};
  }
}

function saveEpisodeRatings() {
  try {
    localStorage.setItem(ratingsStorageKey, JSON.stringify(episodeRatings));
  } catch (error) {
    console.error("Unable to save episode ratings.", error);
  }
}

function updateRating(episode) {
  const average = episode.rating?.average;
  const ratingText =
    average !== null && average !== undefined
      ? `★ ${average}/10`
      : "Rating N/A";

  document.getElementById("rating").textContent = ratingText;
}

function updateVoteButtons() {
  const episodeRating = currentEpisode
    ? episodeRatings[currentEpisode.id]
    : undefined;
  const likeButton = document.getElementById("like-btn");
  const dislikeButton = document.getElementById("dislike-btn");

  likeButton.disabled = currentEpisode === null;
  dislikeButton.disabled = currentEpisode === null;
  likeButton.setAttribute("aria-pressed", String(episodeRating === "liked"));
  dislikeButton.setAttribute(
    "aria-pressed",
    String(episodeRating === "disliked")
  );
  likeButton.classList.toggle("text-[#D83A32]", episodeRating === "liked");
  dislikeButton.classList.toggle("text-[#D83A32]", episodeRating === "disliked");
  likeButton.classList.toggle("text-[#9A8D85]", episodeRating !== "liked");
  dislikeButton.classList.toggle("text-[#9A8D85]", episodeRating !== "disliked");
}

function showEpisode(episode) {
  currentEpisode = episode;
  const synopsis = (episode.summary ?? "").replace(/<[^>]*>/g, "");

  document.getElementById("title").textContent = episode.name;
  document.getElementById(
    "season-ep"
  ).textContent = `Season ${episode.season}, Episode ${episode.number}`;
  document.getElementById("synopsis").textContent = synopsis;

  const imageUrl = episode.image?.medium;
  const episodeImage = document.getElementById("episode-image");
  const imagePlaceholder = document.getElementById("image-placeholder");

  if (imageUrl) {
    episodeImage.src = imageUrl;
    episodeImage.alt = episode.name;
    episodeImage.classList.remove("hidden");
    imagePlaceholder.classList.add("hidden");
  } else {
    episodeImage.classList.add("hidden");
    episodeImage.removeAttribute("src");
    episodeImage.alt = "";
    imagePlaceholder.classList.remove("hidden");
    imagePlaceholder.textContent = "No artwork available";
  }

  updateRating(episode);
  updateVoteButtons();
}

function generateRandomEpisode() {
  if (episodesPool.length === 0) {
    return;
  }

  const randomIndex = Math.floor(Math.random() * episodesPool.length);
  showEpisode(episodesPool[randomIndex]);
}

function rateCurrentEpisode(rating) {
  if (currentEpisode === null) {
    return;
  }

  const episodeId = currentEpisode.id;
  if (episodeRatings[episodeId] === rating) {
    delete episodeRatings[episodeId];
  } else {
    episodeRatings[episodeId] = rating;
  }

  saveEpisodeRatings();
  updateVoteButtons();
  renderRatedEpisodes();
}

function setActiveFilter(filter) {
  activeFilter = filter;
  const showingAll = filter === "all";
  document
    .getElementById("generator-section")
    .classList.toggle("hidden", !showingAll);
  document
    .getElementById("rated-episodes-section")
    .classList.toggle("hidden", showingAll);

  for (const name of ["all", "liked", "disliked"]) {
    const button = document.getElementById(`filter-${name}`);
    button.setAttribute("aria-pressed", String(name === filter));
  }

  renderRatedEpisodes();
}

function renderRatedEpisodes() {
  const section = document.getElementById("rated-episodes-section");
  const heading = document.getElementById("rated-episodes-heading");
  const emptyMessage = document.getElementById("rated-episodes-empty");
  const list = document.getElementById("rated-episodes-list");
  const ratedEpisodes = Object.entries(episodeRatings)
    .filter(([, rating]) => activeFilter === "all" || rating === activeFilter)
    .map(([id, rating]) => ({
      episode: episodesPool.find((item) => String(item.id) === id),
      rating,
    }))
    .filter(({ episode }) => episode !== undefined);

  list.replaceChildren();
  heading.textContent =
    activeFilter === "all"
      ? "Your Rated Episodes"
      : `${activeFilter === "liked" ? "Liked" : "Disliked"} Episodes`;
  emptyMessage.textContent =
    activeFilter === "all"
      ? "Rate an episode to see it here."
      : `No ${activeFilter} episodes yet.`;

  for (const { episode, rating } of ratedEpisodes) {
    const listItem = document.createElement("li");
    const episodeButton = document.createElement("button");
    const episodeText = document.createElement("span");
    const ratingText = document.createElement("span");

    episodeButton.type = "button";
    episodeButton.className =
      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#FFF7E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D83A32]";
    episodeText.className = "font-medium text-[#241C18]";
    episodeText.textContent = `${episode.name} · Season ${episode.season}, Episode ${episode.number}`;
    ratingText.className =
      "shrink-0 text-sm font-semibold text-[#D83A32]";
    ratingText.textContent = rating === "liked" ? "Liked" : "Disliked";
    episodeButton.append(episodeText, ratingText);
    episodeButton.addEventListener("click", () => {
      setActiveFilter("all");
      showEpisode(episode);
    });
    listItem.append(episodeButton);
    list.append(listItem);
  }

  emptyMessage.classList.toggle("hidden", ratedEpisodes.length > 0);
  section.classList.toggle("hidden", activeFilter === "all");
  document
    .getElementById("generator-section")
    .classList.toggle("hidden", activeFilter !== "all");
}

document
  .getElementById("generate-btn")
  .addEventListener("click", generateRandomEpisode);
document
  .getElementById("like-btn")
  .addEventListener("click", () => rateCurrentEpisode("liked"));
document
  .getElementById("dislike-btn")
  .addEventListener("click", () => rateCurrentEpisode("disliked"));
document
  .getElementById("filter-all")
  .addEventListener("click", () => setActiveFilter("all"));
document
  .getElementById("filter-liked")
  .addEventListener("click", () => setActiveFilter("liked"));
document
  .getElementById("filter-disliked")
  .addEventListener("click", () => setActiveFilter("disliked"));

renderRatedEpisodes();
fetchEpisodes();

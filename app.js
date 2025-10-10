/** Minimal client for the Virtual Farm API
 *  - Maintains an anon user id in localStorage
 *  - Calls /api/state, /api/plant, /api/harvest
 *  - Renders a 6x6 grid of plots (IDs: 0..35)
 */

const API_BASE = "/api"; // CloudFront routes this path to API Gateway

// Create or load anon user id
function getUserId() {
  let id = localStorage.getItem("vf_user_id");
  if (!id) {
   if (crypto && typeof crypto.randomUUID === "function" {
    id = crypto.randomUUID();
   } else {
     id = "u-" + Date.now().tostring(36) + "-" + Math.random().toString(36).slice(2);
   }
    localStorage.setItem("vf_user_id", id);
  }
  return String(id);
}

const userId = getUserId();

// Simple helper for fetch with headers
async function api(path, opts = {}) {
  const url = `${API_BASE}${path}`; //ensures leading slash in calls = api("/state")
  const headers = new Headers(opts.headers || {})
  headers.set("x-user-id", userId);
  if (opts.method && opts.method !-- "GET") {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
} 

const gridEl = document.getElementById("grid");
const statusEl = document.getElementById("status");
const cropSel = document.getElementById("crop");
const plantBtn = document.getElementById("plant");
const harvestBtn = document.getElementById("harvest");

let selectedPlot = 0; // default selection
const PLOTS = Array.from({ length: 36 }, (_, i) => i);

function renderGrid(state = {}) {
  gridEl.innerHTML = "";
  PLOTS.forEach((id) => {
    const plot = document.createElement("div");
    plot.className = "plot" + (id === selectedPlot ? " selected" : "");
    plot.dataset.plotId = id;

    const item = state[id];
    if (item) {
      plot.classList.add("planted");
      const crop = document.createElement("div");
      crop.className = "crop";
      crop.textContent = cropEmoji(item.crop);
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = `${item.crop} • ${timeAgo(item.plantedAt)}`;
      plot.appendChild(crop);
      plot.appendChild(name);
    } else {
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = "(empty)";
      plot.appendChild(name);
    }

    plot.addEventListener("click", () => {
      selectedPlot = id;
      document.querySelectorAll(".plot").forEach((el) => el.classList.remove("selected"));
      plot.classList.add("selected");
    });

    gridEl.appendChild(plot);
  });
}

function cropEmoji(crop) {
  switch (crop) {
    case "lettuce": return "🥬";
    case "basil": return "🌿";
    case "radish": return "🌶️"; // close enough for demo
    case "wheat": return "🌾";
    default: return "🌱";
  }
}

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

async function refresh() {
  statusEl.textContent = "Loading…";
  try {
    const data = await api(`/state`);
    // Server returns array of plot items → index by plotId for quick lookup
    const byId = {};
    for (const item of data.items) byId[item.plotId] = item;
    renderGrid(byId);
    statusEl.textContent = "";
  } catch (e) {
    renderGrid();
    statusEl.textContent = e.message;
  }
}

plantBtn.addEventListener("click", async () => {
  const crop = cropSel.value;
  statusEl.textContent = "Planting…";
  try {
    await api(`/plant`, {
      method: "POST",
      body: JSON.stringify({ plotId: selectedPlot, crop }),
    });
    await refresh();
  } catch (e) {
    statusEl.textContent = e.message;
  }
});

harvestBtn.addEventListener("click", async () => {
  statusEl.textContent = "Harvesting…";
  try {
    await api(`/harvest`, {
      method: "POST",
      body: JSON.stringify({ plotId: selectedPlot }),
    });
    await refresh();
  } catch (e) {
    statusEl.textContent = e.message;
  }
});

renderGrid();
refresh();

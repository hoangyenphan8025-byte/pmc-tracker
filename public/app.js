const REFRESH_INTERVAL = 60;
const API_URL = "/api/data";
const API_REFRESH_URL = "/api/refresh";

let countdownSeconds = REFRESH_INTERVAL;
let countdownTimer = null;
let previousData = null;

const cardsGrid = document.getElementById("cardsGrid");
const lastUpdateEl = document.getElementById("lastUpdate");
const countdownEl = document.getElementById("countdown");
const refreshBtn = document.getElementById("refreshBtn");

function createParticles() {
  const container = document.getElementById("particles");
  const colors = ["#f59e0b", "#ef4444", "#ec4899", "#a855f7", "#3b82f6"];
  for (let i = 0; i < 25; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    const size = Math.random() * 4 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const duration = Math.random() * 20 + 15;
    const delay = Math.random() * 20;
    particle.style.cssText = `width:${size}px;height:${size}px;background:${color};left:${left}%;animation-duration:${duration}s;animation-delay:-${delay}s;`;
    container.appendChild(particle);
  }
}

async function fetchData(forceRefresh = false) {
  try {
    refreshBtn.classList.add("spinning");
    const url = forceRefresh ? API_REFRESH_URL : API_URL;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    renderData(data);
    previousData = data;
    lastUpdateEl.textContent = data.fetchedAtVN || new Date().toLocaleString("vi-VN");
    countdownSeconds = REFRESH_INTERVAL;
    updateCountdown();
  } catch (error) {
    console.error("Fetch error:", error);
    cardsGrid.innerHTML = `<div class="error-card"><p>⚠️ Lỗi kết nối: ${error.message}</p><p style="margin-top:8px;font-size:0.8rem;color:var(--text-muted)">Sẽ tự thử lại sau ${REFRESH_INTERVAL} giây...</p></div>`;
  } finally {
    refreshBtn.classList.remove("spinning");
  }
}

function renderData(data) {
  if (!data.categories || data.categories.length === 0) {
    cardsGrid.innerHTML = '<div class="error-card"><p>Không có dữ liệu</p></div>';
    return;
  }

  const categoryIcons = { "sea-female": "🌏", "female-artiste": "🎤", "song-of-year": "🎵" };

  const html = data.categories.map((cat) => {
    if (cat.error) {
      return `<div class="category-card"><div class="card-header"><div><div class="card-category">${categoryIcons[cat.categoryId] || "🏆"} HẠNG MỤC</div><div class="card-category-name">${cat.categoryName}</div></div></div><div class="error-card"><p>⚠️ Lỗi: ${cat.error}</p></div></div>`;
    }

    const target = cat.target;
    if (!target) {
      return `<div class="category-card"><div class="card-header"><div><div class="card-category">${categoryIcons[cat.categoryId] || "🏆"} HẠNG MỤC</div><div class="card-category-name">${cat.categoryName}</div></div></div><div class="error-card"><p>Không tìm thấy Phương Mỹ Chi</p></div></div>`;
    }

    const maxVotes = cat.top5.length > 0 ? Math.max(...cat.top5.map((n) => n.count), target.count) : target.count;

    let displayList = [...cat.top5];
    const pmcInTop5 = displayList.some((n) => n.name.toUpperCase().includes("PHƯƠNG MỸ CHI") || n.name.toUpperCase().includes("PHUONG MY CHI"));

    if (!pmcInTop5 && target) {
      displayList.push({ separator: true });
      displayList.push({ ...target, isPMC: true });
    }

    const listHtml = displayList.map((item, idx) => {
      if (item.separator) return `<div style="text-align:center;padding:4px 0;color:var(--text-muted);font-size:0.7rem;">• • •</div>`;
      const isPMC = item.isPMC || item.name.toUpperCase().includes("PHƯƠNG MỸ CHI") || item.name.toUpperCase().includes("PHUONG MY CHI");
      const rank = item.rank || idx + 1;
      const rankClass = rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "rank-other";
      const barWidth = maxVotes > 0 ? (item.count / maxVotes) * 100 : 0;
      const songDisplay = item.song ? `<div class="top5-song-name">${item.song}</div>` : "";
      return `<div class="top5-item ${isPMC ? "is-pmc" : ""}"><div class="top5-rank ${rankClass}">${rank}</div><img class="top5-avatar" src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.style.display='none'" /><div class="top5-info"><div class="top5-name">${item.name}</div>${songDisplay}</div><div><span class="top5-votes">${item.count.toLocaleString("vi-VN")}</span><span class="top5-votes-label">votes</span></div><div class="vote-bar-wrap"><div class="vote-bar" style="width:${barWidth}%"></div></div></div>`;
    }).join("");

    let gapHtml = "";
    if (cat.gapToAbove !== null && cat.gapToAbove !== undefined) {
      gapHtml += `<div class="gap-item gap-above"><span class="gap-arrow">▲</span> Cách ${truncateName(cat.aboveName)}: <strong>${cat.gapToAbove.toLocaleString("vi-VN")}</strong> votes</div>`;
    }
    if (cat.gapToBelow !== null && cat.gapToBelow !== undefined) {
      gapHtml += `<div class="gap-item gap-below"><span class="gap-arrow">▼</span> Hơn ${truncateName(cat.belowName)}: <strong>${cat.gapToBelow.toLocaleString("vi-VN")}</strong> votes</div>`;
    }

    return `<div class="category-card"><div class="card-header"><div><div class="card-category">${categoryIcons[cat.categoryId] || "🏆"} HẠNG MỤC</div><div class="card-category-name">${cat.categoryName}</div></div><div class="card-badge badge-rank">🏅 Hạng ${target.rank}/${cat.totalNominees}</div></div><div class="pmc-spotlight"><img class="pmc-avatar" src="${target.image}" alt="Phương Mỹ Chi" onerror="this.style.display='none'" /><div class="pmc-info"><div class="pmc-name">${target.name}</div>${target.song ? `<div class="pmc-song">🎶 ${target.song}</div>` : ""}<div class="pmc-stats"><div class="stat-item"><span class="stat-value votes">${target.count.toLocaleString("vi-VN")}</span><span class="stat-label">Tổng votes</span></div><div class="stat-item"><span class="stat-value">#${target.rank}</span><span class="stat-label">Thứ hạng</span></div><div class="stat-item"><span class="stat-value">${cat.totalNominees}</span><span class="stat-label">Tổng ứng viên</span></div></div></div>${gapHtml ? `<div class="gap-indicators">${gapHtml}</div>` : ""}</div><div class="top5-section"><div class="top5-title">Bảng xếp hạng Top ${Math.min(5, cat.top5.length)}${!pmcInTop5 ? " & Phương Mỹ Chi" : ""}</div><div class="top5-list">${listHtml}</div></div></div>`;
  }).join("");

  cardsGrid.innerHTML = html;
  document.querySelectorAll(".category-card").forEach((card) => {
    card.classList.add("flash");
    setTimeout(() => card.classList.remove("flash"), 600);
  });
}

function truncateName(name) {
  if (!name) return "...";
  return name.length > 15 ? name.substring(0, 15) + "…" : name;
}

function updateCountdown() {
  countdownEl.textContent = `${countdownSeconds}s`;
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdownSeconds--;
    updateCountdown();
    if (countdownSeconds <= 0) {
      countdownSeconds = REFRESH_INTERVAL;
      fetchData();
    }
  }, 1000);
}

refreshBtn.addEventListener("click", () => fetchData(true));

document.addEventListener("DOMContentLoaded", () => {
  createParticles();
  fetchData();
  startCountdown();
});

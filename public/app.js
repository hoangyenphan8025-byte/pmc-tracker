const REFRESH_INTERVAL = 60;
const API_URL = "/api/data";
const API_REFRESH_URL = "/api/refresh";

let countdownSeconds = REFRESH_INTERVAL;
let countdownTimer = null;
let previousData = null;
let historyData = null; // Lưu trữ dữ liệu lịch sử

const cardsGrid = document.getElementById("cardsGrid");
const historyCardsGrid = document.getElementById("historyCardsGrid");
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
    cardsGrid.innerHTML = `<div class="error-card"><p>⚠️ Lỗi kết nối: ${error.message}</p><p style="margin-top:8px;font-size:0.8rem;color:var(--text-muted)">Sẽ tự thử lại sau ${REFRESH_INTERVAL} giây...</p></div>`;
  } finally {
    refreshBtn.classList.remove("spinning");
  }
}

function getTrendHtml(currentRank, name, categoryId) {
  if (!previousData) return '<span class="trend-none" title="Đang chờ dữ liệu cũ">-</span>';
  const prevCat = previousData.categories.find(c => c.categoryId === categoryId);
  if (!prevCat || !prevCat.allNominees) return '<span class="trend-none">-</span>';
  const prevNominee = prevCat.allNominees.find(n => n.name === name);
  if (!prevNominee) return '<span class="trend-none">-</span>';
  const prevRank = prevNominee.rank;
  if (currentRank < prevRank) return `<span class="trend-up">▲${prevRank - currentRank}</span>`;
  else if (currentRank > prevRank) return `<span class="trend-down">▼${currentRank - prevRank}</span>`;
  else return `<span class="trend-none">-</span>`;
}

function getVoteTrendHtml(currentVotes, name, categoryId) {
  if (!previousData) return '<span class="vote-trend-none">(+0)</span>';
  const prevCat = previousData.categories.find(c => c.categoryId === categoryId);
  if (!prevCat || !prevCat.allNominees) return '<span class="vote-trend-none">(+0)</span>';
  const prevNominee = prevCat.allNominees.find(n => n.name === name);
  if (!prevNominee) return '<span class="vote-trend-none">(+0)</span>';
  const diff = currentVotes - prevNominee.count;
  if (diff > 0) return `<span class="vote-trend-up">(+${diff.toLocaleString("vi-VN")})</span>`;
  else if (diff < 0) return `<span class="vote-trend-down">(${diff.toLocaleString("vi-VN")})</span>`;
  else return `<span class="vote-trend-none">(+0)</span>`;
}

function renderData(data) {
  if (!data.categories) return;
  const categoryIcons = { "sea-female": "🌏", "female-artiste": "🎤", "song-of-year": "🎵", "album-of-year": "💿" };

  const html = data.categories.map((cat) => {
    if (cat.error || !cat.target) return "";
    const target = cat.target;
    const maxVotes = cat.top5.length > 0 ? Math.max(...cat.top5.map((n) => n.count), target.count) : target.count;

    let displayList = [...cat.top5];
    const targetInTop5 = displayList.some((n) => n.name.toUpperCase().includes(cat.target.name.toUpperCase()));
    if (!targetInTop5 && target) { displayList.push({ separator: true }); displayList.push({ ...target, isTarget: true }); }

    const listHtml = displayList.map((item, idx) => {
      if (item.separator) return `<div style="text-align:center;padding:4px 0;color:var(--text-muted);font-size:0.7rem;">• • •</div>`;
      const isTarget = item.isTarget || item.name.toUpperCase().includes(cat.target.name.toUpperCase());
      const rank = item.rank || idx + 1;
      const rankClass = rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "rank-other";
      const barWidth = maxVotes > 0 ? (item.count / maxVotes) * 100 : 0;
      return `<div class="top5-item ${isTarget ? "is-pmc" : ""}"><div class="top5-rank ${rankClass}">${rank}</div><img class="top5-avatar" src="${item.image}" onerror="this.style.display='none'" /><div class="top5-info"><div class="top5-name">${item.name}</div>${item.song ? `<div class="top5-song-name">${item.song}</div>` : ""}</div><div class="top5-trend">${getTrendHtml(rank, item.name, cat.categoryId)}</div><div><span class="top5-votes">${item.count.toLocaleString("vi-VN")}</span>${getVoteTrendHtml(item.count, item.name, cat.categoryId)}<span class="top5-votes-label">votes</span></div><div class="vote-bar-wrap"><div class="vote-bar" style="width:${barWidth}%"></div></div></div>`;
    }).join("");

    let gapHtml = "";
    if (cat.gapToAbove !== null) gapHtml += `<div class="gap-item gap-above"><span class="gap-arrow">▲</span> Cách người trên: <strong>${cat.gapToAbove.toLocaleString("vi-VN")}</strong> votes</div>`;
    if (cat.gapToBelow !== null) gapHtml += `<div class="gap-item gap-below"><span class="gap-arrow">▼</span> Hơn người dưới: <strong>${cat.gapToBelow.toLocaleString("vi-VN")}</strong> votes</div>`;

    return `<div class="category-card"><div class="card-header"><div><div class="card-category">${categoryIcons[cat.categoryId] || "🏆"} HẠNG MỤC</div><div class="card-category-name">${cat.categoryName}</div></div><div class="card-badge badge-rank">🏅 Hạng ${target.rank}/${cat.totalNominees}</div></div><div class="pmc-spotlight"><img class="pmc-avatar" src="${target.image}" onerror="this.style.display='none'" /><div class="pmc-info"><div class="pmc-name">${target.name}</div>${target.song ? `<div class="pmc-song">🎶 ${target.song}</div>` : ""}<div class="pmc-stats"><div class="stat-item"><span class="stat-value votes">${target.count.toLocaleString("vi-VN")} ${getVoteTrendHtml(target.count, target.name, cat.categoryId)}</span><span class="stat-label">Tổng votes</span></div><div class="stat-item"><span class="stat-value">#${target.rank} <span class="pmc-trend">${getTrendHtml(target.rank, target.name, cat.categoryId)}</span></span><span class="stat-label">Thứ hạng</span></div></div></div>${gapHtml ? `<div class="gap-indicators">${gapHtml}</div>` : ""}</div><div class="top5-section"><div class="top5-title">Top 5</div><div class="top5-list">${listHtml}</div></div></div>`;
  }).join("");

  cardsGrid.innerHTML = html;
}

// LOGIC XỬ LÝ TAB & LỊCH SỬ
document.getElementById("tabLive").addEventListener("click", () => {
  document.getElementById("tabLive").classList.add("active");
  document.getElementById("tabHistory").classList.remove("active");
  document.getElementById("liveView").style.display = "block";
  document.getElementById("historyView").style.display = "none";
});

document.getElementById("tabHistory").addEventListener("click", () => {
  document.getElementById("tabHistory").classList.add("active");
  document.getElementById("tabLive").classList.remove("active");
  document.getElementById("liveView").style.display = "none";
  document.getElementById("historyView").style.display = "block";
  if (!historyData) loadHistory();
});

async function loadHistory() {
  try {
    const res = await fetch(`/history.json?t=${Date.now()}`);
    if (res.ok) {
      historyData = await res.json();
      renderHistory();
    } else {
      historyCardsGrid.innerHTML = "<div class='error-card'><p>Chưa có dữ liệu lịch sử. Dữ liệu sẽ tự động có vào lúc 22:00 tối nay!</p></div>";
    }
  } catch (e) {
    historyCardsGrid.innerHTML = "<div class='error-card'><p>Đang chờ bản ghi đầu tiên...</p></div>";
  }
}

function renderHistory() {
  if (!historyData || historyData.length === 0) return;
  const cats = [
     { id: "sea-female", name: "Most Influential Southeast Asian Artiste - Female", icon: "🌏" },
     { id: "female-artiste", name: "Female Artiste of the Year", icon: "🎤" },
     { id: "song-of-year", name: "Song of the Year", icon: "🎵" },
     { id: "album-of-year", name: "Album of the Year", icon: "💿" }
  ];

  const html = cats.map(catDef => {
    let scrollerHtml = "";
    const sorted = [...historyData].sort((a,b) => b.timestamp - a.timestamp); // Xếp ngày mới nhất lên đầu
    
    sorted.forEach((dayObj, idx) => {
       const catData = dayObj.categories.find(c => c.categoryId === catDef.id);
       if (!catData || !catData.target) return;
       const target = catData.target;
       const top5 = catData.top5 || []; // Fallback nếu dữ liệu cũ chưa có top5
       
       let displayList = [...top5];
       const targetInTop5 = displayList.some(n => n.name === target.name);
       if (!targetInTop5 && target) {
         displayList.push({ separator: true });
         displayList.push({ ...target, isTarget: true });
       }

       let rowsHtml = displayList.map(item => {
           if (item.separator) return `<div style="text-align:center;color:var(--text-muted);font-size:0.7rem;margin:4px 0;">• • •</div>`;
           
           const isTarget = item.isTarget || item.name === target.name;
           let diffHtml = '<span class="vote-trend-none">(+0)</span>';
           
           if (idx < sorted.length - 1) { // So sánh với ngày hôm trước
              const prevDayObj = sorted[idx + 1];
              const prevCat = prevDayObj.categories.find(c => c.categoryId === catDef.id);
              if (prevCat) {
                 const prevItem = (prevCat.top5 || []).find(n => n.name === item.name) || (prevCat.target && prevCat.target.name === item.name ? prevCat.target : null);
                 if (prevItem) {
                    const diff = item.count - prevItem.count;
                    if (diff > 0) diffHtml = `<span class="vote-trend-up">(+${diff.toLocaleString("vi-VN")})</span>`;
                    else if (diff < 0) diffHtml = `<span class="vote-trend-down">(${diff.toLocaleString("vi-VN")})</span>`;
                 }
              }
           }
           
           const rClass = item.rank === 1 ? 'r1' : item.rank === 2 ? 'r2' : item.rank === 3 ? 'r3' : '';
           return `
             <div class="history-item-row ${isTarget ? 'is-target' : ''}">
               <div class="hist-rank ${rClass}">#${item.rank}</div>
               <div class="hist-name">${item.name}</div>
               <div class="hist-votes">${item.count.toLocaleString("vi-VN")} ${diffHtml}</div>
             </div>
           `;
       }).join("");

       if (!rowsHtml && target) {
           // Fallback cho ngày hôm qua (chưa lưu top5)
           rowsHtml = `<div class="history-item-row is-target"><div class="hist-rank">#${target.rank}</div><div class="hist-name">${target.name}</div><div class="hist-votes">${target.count.toLocaleString("vi-VN")}</div></div>`;
       }

       // Dùng class history-day-card thay vì block
       scrollerHtml += `<div class="history-day-card"><div class="history-day-header">📅 ${dayObj.date}</div>${rowsHtml}</div>`;
    });

    if (!scrollerHtml) return "";
    return `<div class="category-card"><div class="card-header"><div><div class="card-category">${catDef.icon} LỊCH SỬ CHỐT VOTE 22H</div><div class="card-category-name">${catDef.name}</div></div></div><div class="history-scroller">${scrollerHtml}</div></div>`;
  }).join("");

  historyCardsGrid.innerHTML = html;
}

function updateCountdown() { countdownEl.textContent = `${countdownSeconds}s`; }
function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdownSeconds--; updateCountdown();
    if (countdownSeconds <= 0) { countdownSeconds = REFRESH_INTERVAL; fetchData(); }
  }, 1000);
}

refreshBtn.addEventListener("click", () => fetchData(true));
document.addEventListener("DOMContentLoaded", () => { createParticles(); fetchData(); startCountdown(); });

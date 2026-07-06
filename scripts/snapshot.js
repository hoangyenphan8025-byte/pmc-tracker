const { parse } = require("node-html-parser");
const fs = require("fs");
const path = require("path");

const CATEGORIES = [
  { id: "sea-female", name: "Most Influential Southeast Asian Artiste - Female", slug: "music-video-of-the-year", targetName: "PHƯƠNG MỸ CHI" },
  { id: "female-artiste", name: "Female Artiste of the Year", slug: "female-artiste-of-the-year", targetName: "PHƯƠNG MỸ CHI" },
  { id: "song-of-year", name: "Song of the Year", slug: "jupiter-music-awards-2025-song-of-the-year", targetName: "Phương Mỹ Chi", targetSong: "ẾCH NGOÀI ĐÁY GIẾNG" },
  { id: "album-of-year", name: "Album of the Year", slug: "ca-si-nam-hay-nhat", targetName: "DTAP" }
];

async function run() {
  console.log("Fetching live data for 22:00 snapshot...");
  const results = await Promise.all(CATEGORIES.map(async (category) => {
    const url = "https://jupitermusicawards.com/nominees/?category=" + category.slug;
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }});
    const html = await response.text();
    const root = parse(html);
    
    const nominees = [];
    root.querySelectorAll(".nominees_list").forEach((el, index) => {
      const name = el.querySelector(".name")?.text?.trim() || "";
      const count = parseInt(el.querySelector(".count")?.text?.trim() || "0");
      nominees.push({ rank: index + 1, name, count });
    });

    let target = null;
    const targetIndex = nominees.findIndex((n) => n.name.toUpperCase().includes(category.targetName.toUpperCase()));
    if (targetIndex >= 0) target = { ...nominees[targetIndex], rank: targetIndex + 1 };
    
    return { categoryId: category.id, target };
  }));
  
  const historyPath = path.join(__dirname, "../public/history.json");
  let history = [];
  if (fs.existsSync(historyPath)) {
    try { history = JSON.parse(fs.readFileSync(historyPath, "utf8")); } catch(e){}
  }
  
  const vnTime = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  const dateStr = vnTime.getDate().toString().padStart(2, '0') + '/' + (vnTime.getMonth()+1).toString().padStart(2, '0') + '/' + vnTime.getFullYear();
  
  const snapshot = { date: dateStr, timestamp: Date.now(), categories: results };
  
  const existingIndex = history.findIndex(h => h.date === dateStr);
  if (existingIndex >= 0) history[existingIndex] = snapshot;
  else history.push(snapshot);
  
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  console.log("Successfully saved snapshot for", dateStr);
}

run();

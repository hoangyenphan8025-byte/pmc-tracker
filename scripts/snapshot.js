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
    
    const top5 = nominees.slice(0, 5); // Lấy Top 5
    
    return { categoryId: category.id, target, top5 };
  }));
  
  const historyPath = path.join(__dirname, "../public/history.json");
  let history = [];
  if (fs.existsSync(historyPath)) {
    try { history = JSON.parse(fs.readFileSync(historyPath, "utf8")); } catch(e){}
  }
  
  // Hàm lấy chuẩn ngày tháng năm theo múi giờ Việt Nam
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const dateStr = formatter.format(new Date()); 
  
  const snapshot = { date: dateStr, timestamp: Date.now(), categories: results };
  
  const existingIndex = history.findIndex(h => h.date === dateStr);
  if (existingIndex >= 0) history[existingIndex] = snapshot;
  else history.push(snapshot);
  
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  console.log("Successfully saved snapshot (with Top 5) for", dateStr);
}

run();

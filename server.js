const express = require("express");
const { parse } = require("node-html-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Categories to track for Phương Mỹ Chi
const CATEGORIES = [
  {
    id: "sea-female",
    name: "Most Influential Southeast Asian Artiste - Female",
    slug: "music-video-of-the-year",
    targetName: "PHƯƠNG MỸ CHI",
  },
  {
    id: "female-artiste",
    name: "Female Artiste of the Year",
    slug: "female-artiste-of-the-year",
    targetName: "PHƯƠNG MỸ CHI",
  },
  {
    id: "song-of-year",
    name: "Song of the Year",
    slug: "jupiter-music-awards-2025-song-of-the-year",
    targetName: "Phương Mỹ Chi",
    targetSong: "ẾCH NGOÀI ĐÁY GIẾNG",
  },
];

const BASE_URL = "https://jupitermusicawards.com/nominees/?category=";

// Cache for data
let cachedData = null;
let lastFetchTime = null;

async function fetchCategory(category) {
  const url = `${BASE_URL}${category.slug}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const root = parse(html);

    const nominees = [];
    const nomineeElements = root.querySelectorAll(".nominees_list");

    nomineeElements.forEach((el, index) => {
      const name = el.querySelector(".name")?.text?.trim() || "";
      const count = parseInt(el.querySelector(".count")?.text?.trim() || "0");
      const serial = el.querySelector(".serial")?.text?.trim() || "";
      const song = el.querySelector(".song")?.text?.trim() || "";
      const imgEl = el.querySelector(".image");
      const image = imgEl ? imgEl.getAttribute("src") : "";

      nominees.push({ rank: index + 1, serial, name, song, count, image });
    });

    let target = null;
    const targetIndex = nominees.findIndex((n) => {
      const nameMatch = n.name
        .toUpperCase()
        .includes(category.targetName.toUpperCase());
      if (category.targetSong) {
        return (
          nameMatch ||
          n.song.toUpperCase().includes(category.targetSong.toUpperCase())
        );
      }
      return nameMatch;
    });

    if (targetIndex >= 0) {
      target = { ...nominees[targetIndex], rank: targetIndex + 1 };
    }

    const top5 = nominees.slice(0, 5);

    let gapToAbove = null;
    let gapToBelow = null;
    if (target && targetIndex > 0) {
      gapToAbove = nominees[targetIndex - 1].count - target.count;
    }
    if (target && targetIndex < nominees.length - 1) {
      gapToBelow = target.count - nominees[targetIndex + 1].count;
    }

    return {
      categoryId: category.id,
      categoryName: category.name,
      totalNominees: nominees.length,
      target,
      top5,
      allNominees: nominees,
      gapToAbove,
      gapToBelow,
      aboveName: targetIndex > 0 ? nominees[targetIndex - 1].name : null,
      belowName:
        targetIndex < nominees.length - 1
          ? nominees[targetIndex + 1].name
          : null,
    };
  } catch (error) {
    console.error(`Error fetching ${category.name}:`, error.message);
    return {
      categoryId: category.id,
      categoryName: category.name,
      error: error.message,
    };
  }
}

async function fetchAllData() {
  console.log(`[${new Date().toLocaleString("vi-VN")}] Fetching data...`);

  const results = await Promise.all(CATEGORIES.map(fetchCategory));

  cachedData = {
    categories: results,
    fetchedAt: new Date().toISOString(),
    fetchedAtVN: new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  };
  lastFetchTime = Date.now();

  console.log(
    `[${new Date().toLocaleString("vi-VN")}] Data fetched successfully.`
  );
  return cachedData;
}

// API endpoint
app.get("/api/data", async (req, res) => {
  try {
    if (cachedData && lastFetchTime && Date.now() - lastFetchTime < 30000) {
      return res.json(cachedData);
    }
    const data = await fetchAllData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Force refresh endpoint
app.get("/api/refresh", async (req, res) => {
  try {
    lastFetchTime = null;
    const data = await fetchAllData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`PMC Tracker running at http://0.0.0.0:${PORT}`);
  fetchAllData();
});

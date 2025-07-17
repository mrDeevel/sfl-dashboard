// Render recent picks as cards in the sidebar/section
async function renderRecentPicksCards() {
  // Show and populate recent picks card section
  const section = document.getElementById('recent-picks-section');
  if (!section) return;
  section.style.display = '';
  // Fetch recent picks and render as cards
  try {
    const picksUrl = 'https://sfl-dashboard.onrender.com/api/picks';
    const playersUrl = 'https://sfl-dashboard.onrender.com/api/players';
    // Fetch picks and players in parallel
    const [picksRes, playersRes] = await Promise.all([
      fetch(picksUrl),
      fetch(playersUrl)
    ]);
    const picksData = await picksRes.json();
    const playersData = await playersRes.json();
    const rows = picksData.values || [];
    const playerRows = playersData.values || [];
    // Build player ADP and image lookup: key = id|name|position
    const adpMap = {};
    const imgMap = {};
    for (let i = 1; i < playerRows.length; i++) {
      // Expecting: [id, name, position, team, unused, imgUrl, adp]
      const id = playerRows[i][0] ? playerRows[i][0].trim().toLowerCase() : '';
      const name = playerRows[i][1] ? playerRows[i][1].trim().toLowerCase() : '';
      const position = playerRows[i][2] ? playerRows[i][2].trim().toLowerCase() : '';
      const imgUrl = playerRows[i][5] ? playerRows[i][5].trim() : '';
      const adpValue = playerRows[i][6];
      if (id && name && position) {
        const key = `${id}|${name}|${position}`;
        if (adpValue) adpMap[key] = parseFloat(adpValue);
        if (imgUrl) imgMap[key] = imgUrl;
      }
    }
    console.log('ADP keys:', Object.keys(adpMap));
    if (rows.length < 2) {
      section.innerHTML = '<div class="card">No recent picks found.</div>';
      return;
    }
    const recent = rows.slice(-6); // last 6 picks
    section.innerHTML = recent.map(row => {
      // row[4] = player id, row[5] = player name, row[6] = position
      const round = parseInt(row[2], 10);
      const slot = parseInt(row[3], 10);
      const playerId = row[4] ? row[4].trim().toLowerCase() : '';
      const playerName = row[5] ? row[5].trim().toLowerCase() : '';
      const position = row[6] ? row[6].trim().toLowerCase() : '';
      const key = `${playerId}|${playerName}|${position}`;
      let adp = null;
      let imgUrl = imgMap[key] || '';
      // Debug: log lookup attempts
      console.log('Looking up ADP for:', key);
      if (adpMap.hasOwnProperty(key)) {
        adp = adpMap[key];
        console.log('Found ADP by full key:', adp);
      } else {
        // fallback: try by name and position only
        for (const k in adpMap) {
          if (k.includes(`|${playerName}|${position}`)) {
            adp = adpMap[k];
            imgUrl = imgMap[k] || imgUrl;
            console.log('Found ADP by name+position:', adp, k);
            break;
          }
        }
      }
      let adpDisplay = '';
      if (adp !== null && !isNaN(adp)) {
        adpDisplay = `<span style=\"margin-left:8px;color:#1976d2;font-size:0.95em;\">ADP ${adp.toFixed(2)}</span>`;
      }
      let badge = '';
      if (adp && !isNaN(round)) {
        if (round > adp + 1) {
          badge = '<span class="badge green white-text" style="margin-left:8px;">Steal</span>';
        } else if (round < adp - 1) {
          badge = '<span class="badge red white-text" style="margin-left:8px;">Reach</span>';
        }
      }
      return `
        <div class=\"card recent-pick-card\" style=\"margin-bottom:8px;padding:8px 12px;box-shadow:none;\">
          <div class=\"card-content\" style=\"padding:8px 0;display:flex;align-items:center;justify-content:space-between;\">
            <div style=\"display:flex;align-items:center;\">
              ${imgUrl ? `<img src=\"${imgUrl}\" alt=\"${row[5]} headshot\" style=\"width:32px;height:32px;border-radius:50%;margin-right:10px;object-fit:cover;\" />` : ''}
              <span class=\"recent-pick-main\" style=\"font-weight:600;font-size:1em;\">${row[5]} (${row[6]}, ${row[7]})${adpDisplay ? ' ' + adpDisplay : ''}</span>
              ${badge}
            </div>
            <div style=\"font-size:0.95em;text-align:right;\">
              <span style=\"color:#1976d2;font-weight:500;\">${row[0]}</span>
              <span style=\"margin-left:8px;\">${row[8]}</span>
              <span style=\"margin-left:8px;color:#388e3c;font-weight:600;\">${row[2]}.${row[3]}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    section.innerHTML = '<div class="card">Failed to load recent picks.</div>';
  }
}
// Fetch recent picks and cycle them in the ticker
let recentPicks = [];
let recentPickIndex = 0;
let recentPicksMode = false;

async function fetchAndShowRecentPicksInTicker() {
  const url = 'https://sfl-dashboard.onrender.com/api/picks';
  try {
    const res = await fetch(url);
    const data = await res.json();
    const rows = data.values || [];
    if (rows.length < 2) return;
    // Get last 5 picks (skip header)
    recentPicks = rows.slice(-5);
    recentPickIndex = 0;
    recentPicksMode = true;
    cycleRecentPicksTicker();
  } catch (err) {
    console.error('Failed to fetch recent picks:', err);
  }
}

function cycleRecentPicksTicker() {
  if (!recentPicks.length) return;
  const pick = recentPicks[recentPickIndex];
  const tickerHeaderEl = document.getElementById('ticker-header-content');
  const tickerItemEl = document.getElementById('ticker-item-content');
  if (tickerHeaderEl && tickerItemEl) {
    tickerHeaderEl.textContent = 'Recent Pick';
    tickerHeaderEl.style.animation = 'none';
    void tickerHeaderEl.offsetWidth;
    tickerHeaderEl.style.animation = 'ticker-header-scroll 1.2s cubic-bezier(0.4,0,0.2,1) 1';
    tickerHeaderEl.style.animationFillMode = 'forwards';
    tickerItemEl.textContent = '';
    tickerItemEl.style.animation = 'none';
    void tickerItemEl.offsetWidth;
    setTimeout(() => {
      const msg = `${pick[5]} (${pick[6]}, ${pick[7]}) by ${pick[8]} [Round ${pick[2]}, Pick ${pick[1]}]`;
      tickerItemEl.textContent = msg;
      tickerItemEl.style.animation = 'ticker-item-scroll 12s linear 1';
      tickerItemEl.style.animationFillMode = 'forwards';
      tickerNewsTimeout = setTimeout(() => {
        recentPickIndex = (recentPickIndex + 1) % recentPicks.length;
        cycleRecentPicksTicker();
      }, 12000);
    }, 1200);
  }
}

// Fetch all ticker news and cycle through them

let tickerNewsItems = [];
let tickerNewsIndex = 0;
let tickerNewsTimeout = null;
let lastTickerHeader = null;
let headerItemCount = 0;

async function fetchAndShowTickerNews(initial = false) {
  const url = 'https://sfl-dashboard.onrender.com/api/news';
  try {
    const res = await fetch(url);
    const data = await res.json();
    const rows = data.values || [];
    if (rows.length < 2) return; // No news
    tickerNewsItems = rows.slice(1); // skip header
    if (initial) cycleTickerNews(); // Only start ticker on initial load
  } catch (err) {
    console.error('Failed to fetch ticker news:', err);
  }
}

function cycleTickerNews() {
  if (!tickerNewsItems.length) return;
  const [timestamp, type, tickerNews, tickerHeader] = tickerNewsItems[tickerNewsIndex];
  const tickerHeaderEl = document.getElementById('ticker-header-content');
  const tickerItemEl = document.getElementById('ticker-item-content');
  if (tickerHeaderEl && tickerItemEl) {
    let headerChanged = tickerHeader !== lastTickerHeader;
    const showTickerItem = () => {
      tickerItemEl.textContent = '';
      tickerItemEl.style.animation = 'none';
      void tickerItemEl.offsetWidth;
      setTimeout(() => {
        tickerItemEl.textContent = tickerNews || '';
        tickerItemEl.style.animation = 'ticker-item-scroll 12s linear 1';
        tickerItemEl.style.animationFillMode = 'forwards';
        tickerNewsTimeout = setTimeout(() => {
          tickerNewsIndex = (tickerNewsIndex + 1) % tickerNewsItems.length;
          cycleTickerNews();
        }, 12000);
      }, 10);
    };
    if (headerChanged) {
      tickerHeaderEl.textContent = tickerHeader || 'News';
      tickerHeaderEl.style.animation = 'none';
      void tickerHeaderEl.offsetWidth;
      tickerHeaderEl.style.animation = 'ticker-header-scroll 1.2s cubic-bezier(0.4,0,0.2,1) 1';
      tickerHeaderEl.style.animationFillMode = 'forwards';
      lastTickerHeader = tickerHeader;
      setTimeout(showTickerItem, 1200);
    } else {
      setTimeout(showTickerItem, 10);
    }
  }
}
// Show Draft Progress section only when menu item is clicked
document.addEventListener('DOMContentLoaded', function() {
  var elems = document.querySelectorAll('.sidenav');
  M.Sidenav.init(elems);

  var draftProgressLink = document.querySelector('a[href="#draft-progress-section"]');
  if (draftProgressLink) {
    draftProgressLink.addEventListener('click', function(e) {
      e.preventDefault();
      var draftSection = document.getElementById('draft-progress-section');
      draftSection.classList.remove('hidden-section');
      draftSection.style.display = 'block'; // Ensure visible
      // Hide recent picks section
      var recentPicksSection = document.getElementById('recent-picks-section');
      if (recentPicksSection) recentPicksSection.style.display = 'none';
      // Optionally hide other sections here
      var sidenav = document.querySelector('.sidenav');
      var instance = M.Sidenav.getInstance(sidenav);
      if (instance) instance.close();
      // Render draft progress if needed
      if (typeof renderDraftProgress === "function") renderDraftProgress();
      // Scroll draft progress below the welcome banner
      setTimeout(function() {
        var welcomeBanner = document.getElementById('welcome-banner');
        if (welcomeBanner && draftSection) {
          // Scroll to just below the welcome banner
          var bannerRect = welcomeBanner.getBoundingClientRect();
          window.scrollTo({
            top: window.scrollY + bannerRect.bottom,
            behavior: 'smooth'
          });
        } else if (draftSection) {
          draftSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    });
  }
});

function logoutSFL() {
  localStorage.clear();
  window.location.href = "index.html";
}
const sheetId = "1t2dHCRVavwyX2Vl2ZwjHR8oyLmVMnNVmc8mDmAKVseU";
const apiKey = "AIzaSyAq-IXRgQL7khW_s4UG_L8aEeNd3jooKuk";
const range = "Data!C:E"; // C = Team Name, D = User ID, E = Avatar URL (no row numbers, grabs all rows)

async function loadTeamInfo(username) {
  const url = 'https://sfl-dashboard.onrender.com/api/players'; // Use proxy for player/team info
  const avatarImg = document.getElementById('team-avatar');
  const banner = document.querySelector('.welcome-banner');
  // If username is missing or empty, show default
  if (!username) {
    avatarImg.src = "assets/avatars/default.png";
    avatarImg.alt = "Default avatar";
    if (banner) {
      banner.innerHTML = `<img id="team-avatar" src="assets/avatars/default.png" alt="Default avatar" class="avatar" />
        <div class="user-header-info">
          <div class="user-header-username">Coach</div>
          <div class="user-header-league">League: N/A</div>
        </div>`;
    }
    return;
  }

  let teamDisplayName = username;
  let avatarUrl = "assets/avatars/default.png";
  try {
    const res = await fetch(url);
    const data = await res.json();
    const rows = data.values || [];
    for (let row of rows) {
      const [teamName, userId, avatar] = row;
      if (userId && teamName.toLowerCase() === username.toLowerCase()) {
        avatarUrl = avatar || "assets/avatars/default.png";
        teamDisplayName = teamName || username;
        break;
      }
    }
  } catch (err) {
    // fallback to default avatar
  }

  // Find league letter from draft data
  let leagueLetter = '';
  try {
    const draftData = await fetchDraftProgress();
    if (draftData && draftData.length > 1) {
      let startIdx = draftData[0][0] === 'League Letter' ? 1 : 0;
      for (let i = startIdx; i < draftData.length; i++) {
        const row = draftData[i];
        if (row[8] && row[8].toLowerCase().trim() === username.toLowerCase().trim()) {
          leagueLetter = row[0];
          break;
        }
      }
    }
  } catch (err) {
    // fallback to blank league letter
  }

  if (banner) {
    // Prepare current pick and countdown info
    let currentPickInfo = '';
    let picksTillUser = '';
    let draftSlot = '';
    try {
      const draftData = await fetchDraftProgress();
      if (draftData && draftData.length > 1) {
        let startIdx = draftData[0][0] === 'League Letter' ? 1 : 0;
        const picks = draftData.slice(startIdx);
        // Find user's league letter
        let userLeague = '';
        for (let i = 0; i < picks.length; i++) {
          if (picks[i][8] && picks[i][8].toLowerCase().trim() === username.toLowerCase().trim()) {
            userLeague = picks[i][0];
            draftSlot = picks[i][3];
            break;
          }
        }
        // Filter picks for user's league
        const leaguePicks = userLeague ? picks.filter(row => row[0] === userLeague) : [];
        // Current pick info: last pick from user's league
        const latestLeaguePick = leaguePicks.length ? leaguePicks[leaguePicks.length - 1] : null;
        if (latestLeaguePick && latestLeaguePick.length >= 9) {
          const pickAbbr = `${latestLeaguePick[2]}.${latestLeaguePick[3]}`;
          currentPickInfo = `<div class=\"user-header-current-pick\" style=\"font-size:1em;margin-top:4px;\">Current Pick: <b>${pickAbbr}</b> - ${latestLeaguePick[5]} (${latestLeaguePick[6]}, ${latestLeaguePick[7]}) by ${latestLeaguePick[8]}</div>`;
        }
        // Calculate picks till user's next pick using 12-team snake draft logic
        if (userLeague && draftSlot) {
          const numTeams = 12;
          const pickSet = new Set(leaguePicks.map(row => `${row[2]}.${row[3]}`));
          let userSlot = parseInt(draftSlot, 10);
          let lastPick = leaguePicks.length ? leaguePicks[leaguePicks.length - 1] : null;
          let lastRound = lastPick ? parseInt(lastPick[2], 10) : 1;
          let nextRound = lastRound + 1;
          let nextSlot = (nextRound % 2 === 1) ? userSlot : (numTeams - userSlot + 1);
          // Find the next pick for this slot after the last pick
          while (pickSet.has(`${nextRound}.${nextSlot}`)) {
            nextRound++;
            nextSlot = (nextRound % 2 === 1) ? userSlot : (numTeams - userSlot + 1);
          }
          // Calculate picks away
          let picksAway = 0;
          let lastPickNum = leaguePicks.length;
          let totalDrafted = leaguePicks.length;
          let found = false;
          for (let r = lastRound + 1; r <= 16 && !found; r++) {
            let slot = (r % 2 === 1) ? userSlot : (numTeams - userSlot + 1);
            if (!pickSet.has(`${r}.${slot}`)) {
              // How many picks between last pick and this pick?
              let picksSinceLast = (r - lastRound - 1) * numTeams + ((slot > (lastPick ? parseInt(lastPick[3], 10) : 0)) ? slot - (lastPick ? parseInt(lastPick[3], 10) : 0) : numTeams - ((lastPick ? parseInt(lastPick[3], 10) : 0) - slot));
              picksAway = picksSinceLast;
              found = true;
              let nextPickAbbr = `${r}.${slot}`;
              picksTillUser = `<div class=\"user-header-picks-till\" style=\"font-size:1em;color:#388e3c;margin-top:2px;\">Your next pick: <b>${nextPickAbbr}</b> (${picksAway} picks away)</div>`;
            }
          }
        } else {
          picksTillUser = `<div class=\"user-header-picks-till\" style=\"font-size:1em;color:#388e3c;margin-top:2px;\">No draft slot found</div>`;
        }
        leagueLetter = userLeague || leagueLetter;
      }
    } catch (err) {
      // fallback to blank
    }
    banner.innerHTML = `<img id=\"team-avatar\" src=\"${avatarUrl}\" alt=\"${teamDisplayName} avatar\" class=\"avatar\" />
      <div class=\"user-header-info\" style=\"display:inline-block;vertical-align:middle;margin-left:16px;text-align:left;\">
        <div class=\"user-header-username\" style=\"font-size:1.3em;font-weight:600;\">${teamDisplayName}</div>
        <div class=\"user-header-league\" style=\"font-size:1em;color:#1976d2;\">League: ${leagueLetter || 'N/A'}${draftSlot ? ` &nbsp;|&nbsp; Draft Slot: <b>${draftSlot}</b>` : ''}</div>
        ${currentPickInfo}
        ${picksTillUser}
      </div>`;
  }
}

async function fetchDraftProgress() {
  const url = `https://sfl-dashboard.onrender.com/api/picks?timestamp=${Date.now()}`; // Cache-busting query parameter
  let res, data;
  try {
    res = await fetch(url);
    data = await res.json();
    console.log("Fetched draft data:", data); // Debugging
  } catch (err) {
    console.error("Failed to fetch draft data:", err);
    return [];
  }
  return data.values || [];
}

async function updateDraftProgress() {
  const draftData = await fetchDraftProgress();
  if (!draftData.length) {
    console.error("No draft data available.");
    return;
  }

  console.log("Draft data received:", draftData); // Debugging

  let startIdx = 0;
  if (draftData[0][0] === "League Letter") startIdx = 1;

  const latestPick = draftData[draftData.length - 1];
  console.log("Latest pick:", latestPick); // Debugging

  if (!latestPick || latestPick.length < 9) {
    console.error("Invalid pick data:", latestPick);
    return;
  }

  const pickDetails = {
    league: latestPick[0],
    player: latestPick[5],
    position: latestPick[6],
    team: latestPick[7],
    round: latestPick[2],
    slot: latestPick[3],
    pick: latestPick[1],
    teamName: latestPick[8],
    comment: "Great pick!" // Replace with AI-generated comment if available
  };

  console.log("Pick details for ticker:", pickDetails); // Debugging

  const picksPerLeague = {};
  for (let i = startIdx; i < draftData.length; i++) {
    const league = draftData[i][0];
    picksPerLeague[league] = (picksPerLeague[league] || 0) + 1;
  }

  console.log("Updated picks per league:", picksPerLeague); // Debugging

  renderDraftProgress(picksPerLeague);
}



function renderDraftProgress(picksPerLeague = {}) {
  console.log("Picks per league:", picksPerLeague); // Debugging

  // --- Enhanced Visual Draft Progress Grid ---
  const leagueLetters = [
    'A', 'B', 'C', 'D', 'E', 'F',
    'G', 'H', 'I', 'J', 'K', 'L',
    'M', 'N', 'O', 'P', 'Q', 'R',
    'Z', 'Y', 'X', 'W', 'V', 'U'
  ];
  const accentColors = [
    '#1976d2', '#388e3c', '#fbc02d', '#d32f2f', '#7b1fa2', '#0288d1',
    '#c2185b', '#ffa000', '#388e3c', '#1976d2', '#fbc02d', '#d32f2f',
    '#7b1fa2', '#0288d1', '#c2185b', '#ffa000', '#388e3c', '#1976d2',
    '#fbc02d', '#d32f2f', '#7b1fa2', '#0288d1', '#c2185b', '#ffa000'
  ];
  const totalRounds = 16;
  let numTeams = 12;
  for (const league in picksPerLeague) {
    const picks = picksPerLeague[league];
    if (picks > 0) {
      numTeams = Math.max(numTeams, Math.ceil(picks / totalRounds));
      break;
    }
  }
  const totalPicks = numTeams * totalRounds;
  const draftSection = document.getElementById('draft-progress-section');
  if (draftSection) {
    draftSection.style.display = '';
    // Inject enhanced CSS for grid and cards
    if (!document.getElementById('sfl-draft-progress-style')) {
      const style = document.createElement('style');
      style.id = 'sfl-draft-progress-style';
      style.innerHTML = `
        #draft-progress-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 24px 24px;
          width: 100vw;
          max-width: 100vw;
          box-sizing: border-box;
          padding: 0 2vw 60px 2vw;
          margin: 0 auto 0 auto;
        }
        @media (max-width: 1200px) {
          #draft-progress-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 900px) {
          #draft-progress-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 600px) {
          #draft-progress-grid { grid-template-columns: 1fr; }
        }
        .league-progress-card {
          border-radius: 18px;
          box-shadow: 0 2px 12px #0002;
          background: linear-gradient(135deg, #e3eafc 0%, #f5f7fa 100%);
          margin: 0;
          padding: 18px 18px 14px 18px;
          transition: transform 0.18s, box-shadow 0.18s;
          cursor: pointer;
          position: relative;
          min-width: 160px;
          max-width: 340px;
        }
        .league-progress-card:hover {
          transform: scale(1.045);
          box-shadow: 0 8px 32px #1976d2a0;
        }
        .league-header {
          display: flex;
          align-items: center;
          font-size: 1.18em;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .league-icon {
          font-size: 1.3em;
          margin-right: 10px;
        }
        .league-letter {
          font-size: 1.18em;
          font-weight: 700;
          margin-right: 8px;
        }
        .league-status {
          margin-left: auto;
          font-size: 1.08em;
          font-weight: 600;
          color: #fff;
          background: #1976d2;
          border-radius: 8px;
          padding: 2px 10px;
          box-shadow: 0 1px 6px #1976d2a0;
        }
        .progress-bar {
          height: 22px;
          background: #e0e0e0;
          border-radius: 11px;
          overflow: hidden;
          margin-bottom: 10px;
          position: relative;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #1976d2 60%, #42a5f5 100%);
          border-radius: 11px 0 0 11px;
          transition: width 0.5s;
          box-shadow: 0 0 12px #1976d2a0 inset;
        }
        .progress-percent {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 22px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.05em; font-weight: 700; color: #fff;
          text-shadow: 0 1px 4px #1976d2a0; pointer-events: none;
        }
        .league-details {
          font-size: 0.98em;
          color: #1976d2;
          display: flex;
          justify-content: space-between;
          margin-top: 2px;
        }
      `;
      document.head.appendChild(style);
    }
    let html = '<h5 style="margin-bottom:10px;font-size:1.15em;font-weight:600;letter-spacing:0.5px;">Draft Progress</h5>';
    html += `<div id="draft-progress-grid">`;
    let allDraftData = window._lastDraftData || [];
    if (!allDraftData.length && typeof fetchDraftProgress === 'function') {
      fetchDraftProgress().then(data => { window._lastDraftData = data; });
    }
    // --- Calculate draft rates for all leagues ---
    let leagueRates = [];
    for (let i = 0; i < leagueLetters.length; i++) {
      const league = leagueLetters[i];
      if (picksPerLeague[league]) {
        // Find picks for this league
        let leagueRows = [];
        if (allDraftData.length) {
          let startIdx = allDraftData[0][0] === "League Letter" ? 1 : 0;
          leagueRows = allDraftData.slice(startIdx).filter(row => row[0] === league);
        }
        // Parse timestamps from column E (index 4), format 'YYYY-MM-DD HH:mm'
        let firstTs = null, lastTs = null;
        for (let row of leagueRows) {
          let ts = row[4];
          if (ts && typeof ts === 'string') {
            let isoTs = ts.replace(' ', 'T');
            let d = new Date(isoTs);
            if (!isNaN(d.getTime())) {
              if (!firstTs || d < firstTs) firstTs = d;
              if (!lastTs || d > lastTs) lastTs = d;
            }
          }
        }
        let rate = 0;
        if (firstTs && lastTs && leagueRows.length > 1) {
          let hours = (lastTs - firstTs) / 1000 / 3600;
          rate = hours > 0 ? leagueRows.length / hours : 0;
        }
        leagueRates.push({ league, rate, index: i });
      }
    }
    // Sort by rate descending for fastest, ascending for slowest
    let fastest = [...leagueRates].sort((a, b) => b.rate - a.rate).slice(0, 5).map(lr => lr.league);
    let slowest = [...leagueRates].sort((a, b) => a.rate - b.rate).slice(0, 5).map(lr => lr.league);
    // Trophy: league with most picks
    let mostPicks = 0;
    let trophyLeagues = [];
    for (let i = 0; i < leagueLetters.length; i++) {
      const league = leagueLetters[i];
      if (picksPerLeague[league] && picksPerLeague[league] > mostPicks) {
        mostPicks = picksPerLeague[league];
      }
    }
    for (let i = 0; i < leagueLetters.length; i++) {
      const league = leagueLetters[i];
      if (picksPerLeague[league] === mostPicks) trophyLeagues.push(league);
    }
    // Finish line: leagues starting round 16
    let finishLeagues = [];
    for (let i = 0; i < leagueLetters.length; i++) {
      const league = leagueLetters[i];
      if (picksPerLeague[league]) {
        // Find picks for this league
        let leagueRows = [];
        if (allDraftData.length) {
          let startIdx = allDraftData[0][0] === "League Letter" ? 1 : 0;
          leagueRows = allDraftData.slice(startIdx).filter(row => row[0] === league);
        }
        // Check if any pick in round 16 exists
        if (leagueRows.some(row => parseInt(row[2], 10) === 16)) {
          finishLeagues.push(league);
        }
      }
    }
    // --- Render cards ---
    for (let i = 0; i < leagueLetters.length; i++) {
      const league = leagueLetters[i];
      if (picksPerLeague[league]) {
        const picks = picksPerLeague[league];
        const percent = Math.min(100, Math.round((picks / totalPicks) * 100));
        // Find picks for this league
        let leagueRows = [];
        if (allDraftData.length) {
          let startIdx = allDraftData[0][0] === "League Letter" ? 1 : 0;
          leagueRows = allDraftData.slice(startIdx).filter(row => row[0] === league);
        }
        // Parse timestamps from column E (index 4), format 'YYYY-MM-DD HH:mm'
        let firstTs = null, lastTs = null;
        for (let row of leagueRows) {
          let ts = row[4];
          if (ts && typeof ts === 'string') {
            let isoTs = ts.replace(' ', 'T');
            let d = new Date(isoTs);
            if (!isNaN(d.getTime())) {
              if (!firstTs || d < firstTs) firstTs = d;
              if (!lastTs || d > lastTs) lastTs = d;
            }
          }
        }
        let picksHr = '';
        let eta = '';
        let rate = 0;
        if (firstTs && lastTs && leagueRows.length > 1) {
          let hours = (lastTs - firstTs) / 1000 / 3600;
          rate = hours > 0 ? leagueRows.length / hours : 0;
          picksHr = `Rate: <b>${rate.toFixed(2)}</b> picks/hr`;
          let remaining = totalPicks - picks;
          let etaDate = new Date(lastTs.getTime() + (remaining / (rate || 1)) * 3600 * 1000);
          const monthAbbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          let etaDateStr = `${monthAbbr[etaDate.getMonth()]} ${etaDate.getDate()}`;
          let nflStart = new Date('2025-09-04');
          let etaColor = etaDate > nflStart ? 'color:#d32f2f;font-weight:600;' : 'color:#388e3c;font-weight:600;';
          eta = `ETA: <b style="${etaColor}">${etaDateStr}</b>`;
        } else {
          picksHr = 'Rate: N/A';
          eta = 'ETA: N/A';
        }
        // Color accent for each league
        const accent = accentColors[i % accentColors.length];
        // Icon logic (priority: trophy > finish > fire/ice > football)
        let icon = '🏈';
        if (trophyLeagues.includes(league)) icon = '🏆';
        else if (finishLeagues.includes(league)) icon = '🏁';
        else if (fastest.includes(league)) icon = '🔥';
        else if (slowest.includes(league)) icon = '❄️';
        html += `
          <div class="league-progress-card" data-league="${league}" style="border-top:5px solid ${accent};">
            <div class="league-header">
              <span class="league-icon">${icon}</span>
              <span class="league-letter" style="color:${accent};">${league}</span>
              <span class="league-status" style="background:${accent};">${percent}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${percent}%;background:linear-gradient(90deg,${accent} 60%,#42a5f5 100%);"></div>
              <span class="progress-percent">${percent}%</span>
            </div>
            <div class="league-details">
              <span>${picksHr}</span>
              <span>${eta}</span>
            </div>
          </div>
        `;
      }
    }
    html += '</div>';
    draftSection.innerHTML = html;
    // Add click listeners to show drafted players modal
    const cards = draftSection.querySelectorAll('.league-progress-card');
    cards.forEach(card => {
      card.addEventListener('click', function() {
        const league = this.getAttribute('data-league');
        showDraftPicks(league);
      });
    });
  }
}


async function showDraftPicks(league) {
  const draftData = await fetchDraftProgress();
  if (!draftData.length) return;

  // Skip header row if present
  let startIdx = 0;
  if (draftData[0][0] === "League Letter") startIdx = 1;

  // Filter picks for the selected league
  const leaguePicks = draftData.slice(startIdx).filter((row) => row[0] === league);

  // Populate the modal
  const modalTitle = document.getElementById('modal-league-title');
  const modalPicks = document.getElementById('modal-draft-picks');
  modalTitle.textContent = `Draft Picks for League ${league}`;
  modalPicks.innerHTML = leaguePicks
    .map(
      (row) => `
    <li class="collection-item">
      ${row[1]}: ${row[5]}, ${row[6]} ${row[7]} - ${row[8]}
    </li>
  `
    )
    .join('');

  // Open the modal
  const modalElem = document.getElementById('draft-picks-modal');
  const modalInstance = M.Modal.getInstance(modalElem);
  if (modalInstance) {
    modalInstance.open();
  } else {
    console.error("Modal instance not found.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded event fired"); // Debugging

  const username = localStorage.getItem('sfl-username');
  if (!username) {
    console.error("No username found in localStorage.");
    alert("No username found. Please log in again.");
    window.location.href = "index.html"; // Redirect back to the login page
    return;
  }

  loadTeamInfo(username);

  // Initialize Materialize modal
  const modalElems = document.querySelectorAll('.modal');
  M.Modal.init(modalElems);

  // Add manual refresh button functionality
  const refreshButton = document.getElementById('refresh-draft-data');
  if (refreshButton) {
    refreshButton.addEventListener('click', async () => {
      console.log("Manual refresh triggered");
      await updateDraftProgress();
    });
  }

  // Make welcome banner float at top and stay fixed while scrolling, with 3D effect
  const banner = document.getElementById('welcome-banner');
  if (banner) {
    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.width = '100%';
    banner.style.zIndex = '1000';
    banner.style.background = 'linear-gradient(135deg, #e3eafc 0%, #f5f7fa 100%)';
    banner.style.boxShadow = '0 4px 24px #1976d2a0, 0 1.5px 0 #fff inset, 0 0 0 2px #1976d2 inset';
    banner.style.padding = '18px 0 16px 0';
    banner.style.borderRadius = '0 0 36px 36px';
    banner.style.transform = 'perspective(600px) translateZ(0)';
    banner.style.backdropFilter = 'blur(2px)';
    banner.style.borderBottom = '2px solid #1976d2';
  }
  // Add margin-top to main content so it doesn't hide under banner
  const mainContent = document.querySelector('.main-content');
  if (mainContent && banner) {
    mainContent.style.marginTop = banner.offsetHeight + 'px';
  }

  // Start polling for all dashboard sections
  fetchAndShowTickerNews(true); // Start ticker on initial load
  startPollingDashboard();
});

let pollInterval = null;

function startPollingDashboard() {
  // Initial fetch for all sections
  updateDraftProgress();
  renderRecentPicksCards();
  fetchAndShowTickerNews(); // No initial param, so does not restart ticker
  // Set interval for all
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => {
    updateDraftProgress();
    renderRecentPicksCards();
    fetchAndShowTickerNews(); // No initial param, so does not restart ticker
  }, 60000); // Poll every 60 seconds instead of 15 seconds
}

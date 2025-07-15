// Render recent picks as cards in the sidebar/section
async function renderRecentPicksCards() {
  // Show and populate recent picks card section
  const section = document.getElementById('recent-picks-section');
  if (!section) return;
  section.style.display = '';
  // Fetch recent picks and render as cards
  try {
    const picksRange = "Picks!A:J";
    const picksUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${picksRange}?key=${apiKey}`;
    const playersRange = "Players!A:G";
    const playersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${playersRange}?key=${apiKey}`;
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
        if (round < adp - 1) {
          badge = '<span class=\"badge green white-text\" style=\"margin-left:8px;\">Steal</span>';
        } else if (round > adp + 1) {
          badge = '<span class=\"badge red white-text\" style=\"margin-left:8px;\">Reach</span>';
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
  const range = "Picks!A:J";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
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

async function fetchAndShowTickerNews() {
  const newsRange = 'TickerNews!A:D';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${newsRange}?key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const rows = data.values || [];
    if (rows.length < 2) return; // No news
    tickerNewsItems = rows.slice(1); // skip header
    tickerNewsIndex = 0;
    cycleTickerNews();
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
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
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
    try {
      const draftData = await fetchDraftProgress();
      if (draftData && draftData.length > 1) {
        let startIdx = draftData[0][0] === 'League Letter' ? 1 : 0;
        const picks = draftData.slice(startIdx);
        const userPicks = picks.filter(row => row[8] && row[8].toLowerCase().trim() === username.toLowerCase().trim());
        // Find next pick for user
        let nextUserPickIdx = -1;
        for (let i = 0; i < picks.length; i++) {
          if (picks[i][8] && picks[i][8].toLowerCase().trim() === username.toLowerCase().trim()) {
            nextUserPickIdx = i;
            break;
          }
        }
        // Current pick info
        const latestPick = picks[picks.length - 1];
        if (latestPick && latestPick.length >= 9) {
          const pickAbbr = `${latestPick[2]}.${latestPick[3]}`;
          const currentPickNum = picks.length;
          currentPickInfo = `<div class="user-header-current-pick" style="font-size:1em;margin-top:4px;">Current Pick: <b>${pickAbbr}</b> - ${latestPick[5]} (${latestPick[6]}, ${latestPick[7]}) by ${latestPick[8]}</div>`;
        }
        // Calculate picks till user's next pick using draft slot
        let picksTillUser = '';
        if (typeof draftSlot !== 'undefined' && draftSlot !== null && draftSlot !== '') {
          let nextPickRow = null;
          let picksAway = null;
          for (let i = picks.length; i < draftData.length; i++) {
            const row = draftData[i];
            // Compare as string and number
            if (row[3] != null && row[3].toString().trim() === draftSlot.toString().trim()) {
              nextPickRow = row;
              picksAway = i - picks.length;
              break;
            }
          }
          if (nextPickRow) {
            const nextPickAbbr = `${nextPickRow[2]}.${nextPickRow[3]}`;
            picksTillUser = `<div class="user-header-picks-till" style="font-size:1em;color:#388e3c;margin-top:2px;">Your next pick: <b>${nextPickAbbr}</b> (${picksAway} picks away)</div>`;
          } else {
            picksTillUser = `<div class=\"user-header-picks-till\" style=\"font-size:1em;color:#388e3c;margin-top:2px;\">No more picks for you in this draft</div>`;
          }
        } else {
          picksTillUser = `<div class=\"user-header-picks-till\" style=\"font-size:1em;color:#388e3c;margin-top:2px;\">No draft slot found</div>`;
        }
      }
    } catch (err) {
      // fallback to blank
    }
    // Find user's draft slot from Picks sheet, column D (index 3)
    let draftSlot = '';
    try {
      const draftData = await fetchDraftProgress();
      if (draftData && draftData.length > 1) {
        let startIdx = draftData[0][0] === 'League Letter' ? 1 : 0;
        const picksRows = draftData.slice(startIdx);
        for (let row of picksRows) {
          if (row[8] && row[8].toLowerCase().trim() === username.toLowerCase().trim()) {
            draftSlot = row[3];
            break;
          }
        }
      }
    } catch (err) {
      draftSlot = '';
    }
    banner.innerHTML = `<img id="team-avatar" src="${avatarUrl}" alt="${teamDisplayName} avatar" class="avatar" />
      <div class="user-header-info" style="display:inline-block;vertical-align:middle;margin-left:16px;text-align:left;">
        <div class="user-header-username" style="font-size:1.3em;font-weight:600;">${teamDisplayName}</div>
        <div class="user-header-league" style="font-size:1em;color:#1976d2;">League: ${leagueLetter || 'N/A'}${draftSlot ? ` &nbsp;|&nbsp; Draft Slot: <b>${draftSlot}</b>` : ''}</div>
        ${currentPickInfo}
        ${picksTillUser}
      </div>`;
  }
}

async function fetchDraftProgress() {
  const range = "Picks!A:J"; // Adjust range if needed
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
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

  const leagueLetters = [
    'A', 'B', 'C', 'D', 'E', 'F',
    'G', 'H', 'I', 'J', 'K', 'L',
    'M', 'N', 'O', 'P', 'Q', 'R',
    'Z', 'Y', 'X', 'W', 'V', 'U'
  ];
  const totalPicks = 192;
  // Hide draft progress section
  const draftSection = document.getElementById('draft-progress-section');
  if (draftSection) draftSection.style.display = 'none';
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

  // ...existing code...

  // Initialize Materialize modal
  const modalElems = document.querySelectorAll('.modal');
  M.Modal.init(modalElems);

  // Call updateDraftProgress to fetch and display the latest draft data
  updateDraftProgress();

  // Fetch and show ticker news (default)
  fetchAndShowTickerNews();

  // Render recent picks sidebar/section
  renderRecentPicksCards();
});

let pollInterval = null;

function startPollingDraftProgress() {
  updateDraftProgress(); // Initial fetch
  pollInterval = setInterval(updateDraftProgress, 15000);
}

function loadDraftProgress() {
  const draftSection = document.getElementById('draft-progress-section');

  // Show the draft progress section
  draftSection.style.display = '';

  // Fetch and update the draft progress
  updateDraftProgress();

  // Optional: Start polling for updates
  if (!pollInterval) {
    pollInterval = setInterval(updateDraftProgress, 15000);
  }
}

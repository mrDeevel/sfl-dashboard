
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
      document.getElementById('draft-progress-section').classList.remove('hidden-section');
      // Optionally hide other sections here
      var sidenav = document.querySelector('.sidenav');
      var instance = M.Sidenav.getInstance(sidenav);
      if (instance) instance.close();
      // Render draft progress if needed
      if (typeof renderDraftProgress === "function") renderDraftProgress();
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

  // If username is missing or empty, show default
  if (!username) {
    avatarImg.src = "assets/avatars/default.png";
    avatarImg.alt = "Default avatar";
    return;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    const rows = data.values || [];
    let found = false;
    let teamDisplayName = username;

    for (let row of rows) {
      const [teamName, userId, avatarUrl] = row;
      if (userId && teamName.toLowerCase() === username.toLowerCase()) {
        avatarImg.src = avatarUrl || "assets/avatars/default.png";
        avatarImg.alt = `${teamName || username} avatar`;
        teamDisplayName = teamName || username;
        found = true;
        break;
      }
    }


    // Set dual ticker: header and item
    const tickerHeader = document.getElementById('ticker-header-content');
    const tickerItem = document.getElementById('ticker-item-content');
    if (tickerHeader && tickerItem) {
      const headerMsg = `Welcome`;
      const itemMsg = `${teamDisplayName}, this is the SFL Dashboard.`;
      tickerHeader.textContent = headerMsg;
      tickerHeader.style.animation = 'ticker-header-scroll 1.2s cubic-bezier(0.4,0,0.2,1) 1';
      tickerHeader.style.animationFillMode = 'forwards';
      tickerItem.textContent = '';
      setTimeout(() => {
        tickerItem.textContent = itemMsg;
        tickerItem.style.animation = 'ticker-item-scroll 12s linear 1';
        tickerItem.style.animationFillMode = 'forwards';
      }, 1200);
    }

    if (!found) {
      avatarImg.src = "assets/avatars/default.png";
      avatarImg.alt = "Default avatar";
      // Set default ticker message for dual ticker
      if (tickerHeader && tickerItem) {
        tickerHeader.textContent = 'Welcome';
        tickerHeader.style.animation = 'ticker-header-scroll 1.2s cubic-bezier(0.4,0,0.2,1) 1';
        tickerHeader.style.animationFillMode = 'forwards';
        tickerItem.textContent = '';
        setTimeout(() => {
          tickerItem.textContent = 'Coach, this is the SFL Dashboard.';
          tickerItem.style.animation = 'ticker-item-scroll 12s linear 1';
          tickerItem.style.animationFillMode = 'forwards';
        }, 1200);
      }
    }
  } catch (err) {
    avatarImg.src = "assets/avatars/default.png";
    avatarImg.alt = "Default avatar";
    const tickerHeader = document.getElementById('ticker-header-content');
    const tickerItem = document.getElementById('ticker-item-content');
    if (tickerHeader && tickerItem) {
      tickerHeader.textContent = 'Welcome';
      tickerHeader.style.animation = 'ticker-header-scroll 1.2s cubic-bezier(0.4,0,0.2,1) 1';
      tickerHeader.style.animationFillMode = 'forwards';
      tickerItem.textContent = '';
      setTimeout(() => {
        tickerItem.textContent = 'Coach, this is the SFL Dashboard.';
        tickerItem.style.animation = 'ticker-item-scroll 12s linear 1';
        tickerItem.style.animationFillMode = 'forwards';
      }, 1200);
    }
    console.error("Error fetching team info from Google Sheets:", err);
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
  const container = document.getElementById('draft-summary-tiers');
  container.innerHTML = `
    <div class="draft-summary-row">
      ${leagueLetters.map(letter => {
        const picksMade = picksPerLeague[letter] || 0;
        const percent = Math.round((picksMade / totalPicks) * 100);
        return `
          <div class="draft-summary-league" data-league="${letter}" onclick="showDraftPicks('${letter}')">
            <div class="draft-summary-bar">
              <div class="draft-summary-bar-inner" style="width:${percent}%"></div>
            </div>
            <div class="draft-summary-league-label">${letter}</div>
            <div class="draft-summary-league-count">${picksMade}/${totalPicks}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
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

  // Call updateDraftProgress to fetch and display the latest draft data
  updateDraftProgress();

  // Fetch and show ticker news
  fetchAndShowTickerNews();
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

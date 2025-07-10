const sheetId = "1t2dHCRVavwyX2Vl2ZwjHR8oyLmVMnNVmc8mDmAKVseU";
const apiKey = "AIzaSyAq-IXRgQL7khW_s4UG_L8aEeNd3jooKuk";
const range = "Data!C:E"; // C = Team Name, D = User ID, E = Avatar URL (no row numbers, grabs all rows)

async function loadTeamInfo(username) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
  const avatarImg = document.getElementById('team-avatar');
  const welcomeMsg = document.getElementById('welcome-message');

  // If username is missing or empty, show default
  if (!username) {
    avatarImg.src = "assets/avatars/default.png";
    avatarImg.alt = "Default avatar";
    welcomeMsg.textContent = "Welcome Coach";
    return;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    const rows = data.values || [];
    let found = false;

    for (let row of rows) {
      const [teamName, userId, avatarUrl] = row;
      if (userId && teamName.toLowerCase() === username.toLowerCase()) {
        avatarImg.src = avatarUrl || "assets/avatars/default.png";
        avatarImg.alt = `${teamName || username} avatar`;
        welcomeMsg.textContent = `Welcome ${teamName || username}`;
        found = true;
        break;
      }
    }

    if (!found) {
      avatarImg.src = "assets/avatars/default.png";
      avatarImg.alt = "Default avatar";
      welcomeMsg.textContent = "Welcome Coach";
    }
  } catch (err) {
    avatarImg.src = "assets/avatars/default.png";
    avatarImg.alt = "Default avatar";
    welcomeMsg.textContent = "Welcome Coach";
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

  // Skip header row if present
  let startIdx = 0;
  if (draftData[0][0] === "League Letter") startIdx = 1;

  // Get the latest pick
  const latestPick = draftData[draftData.length - 1];
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

  console.log("Latest pick details:", pickDetails); // Debugging

  updateTicker(pickDetails); // Update the ticker
}

function updateTicker(pickDetails) {
  const tickerContent = document.querySelector('.ticker-content');
  if (!tickerContent) {
    console.error("Ticker content element not found.");
    return;
  }

  if (!pickDetails || !pickDetails.player) {
    tickerContent.innerHTML = "No draft data available.";
    return;
  }

  tickerContent.innerHTML = `BREAKING: ${pickDetails.teamName} (${pickDetails.league}) selects ${pickDetails.player}, ${pickDetails.position} (${pickDetails.team}) - Round ${pickDetails.round} Pick ${pickDetails.pick}`;
}

function renderDraftProgress(picksPerLeague = {}) {
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
  const leaguePicks = draftData.slice(startIdx).filter(row => row[0] === league);

  // Populate the modal
  const modalTitle = document.getElementById('modal-league-title');
  const modalPicks = document.getElementById('modal-draft-picks');
  modalTitle.textContent = `Draft Picks for League ${league}`;
  modalPicks.innerHTML = leaguePicks.map(row => `
    <li class="collection-item">
      ${row[1]}: ${row[5]}, ${row[6]} ${row[7]} - ${row[8]}
    </li>
  `).join('');

  // Open the modal
  const modalElem = document.getElementById('draft-picks-modal');
  const modalInstance = M.Modal.getInstance(modalElem);
  modalInstance.open();
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

  // Call updateDraftProgress to fetch and display the latest draft data
  updateDraftProgress();
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

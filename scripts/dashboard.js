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

function renderDraftProgress(picksPerLeague = {}) {
  // List all league letters in your draft
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
          <div class="draft-summary-league">
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

document.addEventListener("DOMContentLoaded", () => {
  let username = localStorage.getItem("sfl-username");
  if (!username && window.location.hash) {
    username = decodeURIComponent(window.location.hash.substring(1));
    if (username) localStorage.setItem("sfl-username", username);
  }
  loadTeamInfo(username);

  // Start polling for draft progress
  startPollingDraftProgress();
});

let pollInterval = null;

async function fetchDraftProgress() {
  const range = "Picks!A:I"; // Adjust range if needed
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
  let res, data;
  try {
    res = await fetch(url);
    data = await res.json();
    console.log("Fetched draft data:", data);
  } catch (err) {
    console.error("Failed to fetch draft data:", err);
    return [];
  }
  return data.values || [];
}

async function updateDraftProgress() {
  const draftData = await fetchDraftProgress();
  if (!draftData.length) return;

  // Skip header row if present
  let startIdx = 0;
  if (draftData[0][0] === "League Letter") startIdx = 1;

  // Count picks made per league
  const picksPerLeague = {};
  for (let i = startIdx; i < draftData.length; i++) {
    const row = draftData[i];
    const league = row[0];
    const timestamp = row[4];
    if (!league) continue;
    if (!picksPerLeague[league]) picksPerLeague[league] = 0;
    if (timestamp && timestamp.trim() !== "") picksPerLeague[league]++;
  }

  // Render the updated progress
  renderDraftProgress(picksPerLeague);
}

function startPollingDraftProgress() {
  // Poll every 15 seconds (adjust as needed)
  updateDraftProgress(); // Initial fetch
  pollInterval = setInterval(updateDraftProgress, 15000);
}

function stopPollingDraftProgress() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = null;
}

// Service worker registration for push notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(registration => {
      console.log('Service worker registered:', registration);
      // Subscribe to push notifications
      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BN6z...your_public_vapid_key...'
      });
    })
    .then(subscription => {
      console.log('Push notification subscribed:', subscription);
      // Send subscription to server if needed
    })
    .catch(err => {
      console.error('Service worker or push notification registration failed:', err);
    });
}

// Handle push notifications
navigator.serviceWorker.addEventListener('message', event => {
  const data = event.data.json();
  console.log('Push notification received:', data);

  // Show a toast or notification UI
  M.toast({html: `New draft update: ${data.message}`, displayLength: 5000});
});

// Request notification permission on button click
document.getElementById('enable-notifications').addEventListener('click', () => {
  Notification.requestPermission()
    .then(permission => {
      if (permission === 'granted') {
        console.log('Notification permission granted');
        // Optionally, subscribe to push notifications here
      } else {
        console.log('Notification permission denied');
      }
    })
    .catch(err => {
      console.error('Failed to request notification permission:', err);
    });
});

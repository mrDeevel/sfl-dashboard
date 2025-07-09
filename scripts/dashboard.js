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

function renderDraftProgress() {
  const leagueLetters = [
    ['A', 'B', 'C', 'D', 'E', 'F'],         // Tier 1
    ['G', 'H', 'I', 'J', 'K', 'L'],         // Tier 2
    ['M', 'N', 'O', 'P', 'Q', 'R'],         // Tier 3
    ['Z', 'Y', 'X', 'W', 'V', 'U']          // Tier 4 (reversed)
  ];
  const totalPicks = 216;

  const container = document.getElementById('draft-summary-tiers');
  container.innerHTML = leagueLetters.map((tier, i) => `
    <li>
      <div class="collapsible-header"><strong>Tier ${i + 1}</strong></div>
      <div class="collapsible-body">
        <div class="draft-summary-row">
          ${tier.map(letter => {
            const picks = Math.floor(Math.random() * totalPicks); // mock data
            const percent = Math.round((picks / totalPicks) * 100);
            return `
              <div class="draft-summary-league" style="min-width:70px;max-width:90px;">
                <div class="draft-summary-bar">
                  <div class="draft-summary-bar-inner" style="width:${percent}%"></div>
                </div>
                <div class="draft-summary-league-label">${letter}</div>
                <div style="font-size:0.8em;">${picks}/${totalPicks}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </li>
  `).join('');

  // Initialize Materialize collapsible
  var elems = document.querySelectorAll('.collapsible');
  M.Collapsible.init(elems);
}

document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("sfl-username");
  loadTeamInfo(username);
  renderDraftProgress();
});

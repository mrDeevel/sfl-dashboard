function saveUser() {
  const username = document.getElementById("usernameInput").value.trim();
  if (!username) {
    alert("Please enter your Sleeper username.");
    return;
  }
  localStorage.setItem("sflUser", username);
  alert(`Welcome, ${username}!`);
  // Future: redirect to dashboard.html
}

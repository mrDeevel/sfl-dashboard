function saveUserAndRedirect() {
  const username = document.getElementById("usernameInput").value.trim();
  if (username) {
    localStorage.setItem("sfl-username", username);
    window.location.href = "dashboard.html#" + encodeURIComponent(username);
  }
}
function saveUserAndRedirect() {
  const username = document.getElementById('usernameInput').value.trim();
  if (username) {
    localStorage.setItem('sfl-username', username); // Save username for dashboard use
    window.location.href = 'dashboard.html'; // Redirect to dashboard
  } else {
    if (typeof M !== "undefined" && M.toast) {
      M.toast({html: 'Please enter your Sleeper username', classes: 'red'});
    } else {
      alert('Please enter your Sleeper username');
    }
  }
}
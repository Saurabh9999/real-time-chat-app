async function register() {
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  const res = await fetch("http://localhost:3000/api/user/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, email, password })
  });

  const data = await res.json();

  if (data.success) {
    alert("Registration successful");
    window.location.href = "login.html";
  } else {
    alert("Registration failed");
  }
}

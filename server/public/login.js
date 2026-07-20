async function login() {
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch("http://localhost:3000/api/user/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  console.log(data)
  if (data.success) {
    localStorage.setItem("token",data.token);
    localStorage.setItem("user",JSON.stringify(data.user))
    window.location.href = "chat.html";
  } else {
    alert("Login failed");
  }
}
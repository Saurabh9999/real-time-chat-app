// =========================
// 1️⃣ GLOBAL STATE
// =========================
let socket;
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));
let currentRoom = null;
let onlineUsers = [];
 let typingElement = null

console.log(user)
// =========================
// 2️⃣ REDIRECT IF NOT LOGGED IN
// =========================
if (!token) {
  window.location.href = "login.html";
}else{
  socket = io("http://localhost:3000", {
  auth: { token }
});
}

// =========================
// 3️⃣ SOCKET INITIALIZATION (VERY IMPORTANT)
// =========================

// =========================
// 4️⃣ SOCKET LISTENERS
// =========================
socket.on("connect", () => {
  console.log("Connected");
});

// =========================
// 5️⃣ FUNCTIONS BELOW THIS
// =========================

socket.on("onlineUsers", (users) => {
  onlineUsers = users;
  // loadUsers(); // refresh user list
});

socket.on("receiveMessage", msg => {

   if (typingElement) {
      typingElement.remove();
      typingElement = null;
   }

  // const div = document.createElement("div");
  // div.classList.add("message");

  const messageBox = document.getElementById("messages");

  const messageElement = renderMessage(msg);
  messageBox.appendChild(messageElement);

  // const user = JSON.parse(localStorage.getItem("user"));
  // console.log(user)
  // if (msg.sender._id.toString() === user._id.toString()) {
  //   console.log(msg.sender)
  //   div.classList.add("sent");
  //   div.textContent = msg.text;
  // } else {
  //   div.classList.add("received");
  //   div.textContent = msg.sender.name + ": " + msg.text;
  // }

  // const messageBox = document.getElementById("messages");
  // messageBox.appendChild(div);

  // auto scroll
  messageBox.scrollTop = messageBox.scrollHeight;
});

function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value;
  console.log(text)

  if (!currentRoom) return alert("Select a user");
  if (!text.trim()) return;

  socket.emit("sendMessage", { roomId: currentRoom, text });

  input.value = "";
}

// let currentRoom = null;

async function loadUsers() {
  const res = await fetch("http://localhost:3000/api/user/all", {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  });

  const users = await res.json();
  // console.log(users)

  const userList = document.getElementById("userList");
  userList.innerHTML = "";

  users.forEach(user => {
  const li = document.createElement("div");
  li.classList.add("user-item");
  li.style.cursor = "pointer";

  // 🔵 status dot
  const status = document.createElement("span");
  status.classList.add("status-dot");

  if (onlineUsers.includes(user._id.toString())) {
    status.classList.add("online");
  }

  // username text
  const name = document.createElement("span");
  name.textContent = user.name;

  li.appendChild(status);
  li.appendChild(name);

  li.onclick = () => startChat(user._id, user.name);

  userList.appendChild(li);

  // console.log("User object:",user)
  // console.log("Online users:",onlineUsers)
});
}

async function startChat(userId, name) {
  console.log("START CHAT CALLED");

  try {
    const res = await fetch("http://localhost:3000/api/conversation/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ userId })
    });
    
    // console.log("Emitting start chat with:", userId);
    // socket.emit("start chat", userId);

    console.log("Fetch response:", res);

    const convo = await res.json();
    console.log("Conversation response:", convo);

    if (!convo || !convo._id) {
      console.error("Invalid conversation response");
      return;
    }

    currentRoom = convo._id;

    // console.log("currentRoom",currentRoom)

    document.getElementById("messages").innerHTML = "";

    await loadMessages(currentRoom);

    socket.emit("joinRoom", currentRoom);

  } catch (error) {
    console.error("Fetch error:", error);
  }
}
 async function loadMessages(roomId) {
  const res = await fetch(
    `http://localhost:3000/api/user/message/${roomId}`,
    {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      }
    }
  );

  const messages = await res.json();
  const messageBox = document.getElementById("messages");
  messageBox.innerHTML = "";

  const currentUser = JSON.parse(localStorage.getItem("user"));
  // console.log(currentUser)
  messages.forEach(msg => {

    const messageElement = renderMessage(msg);
    messageBox.appendChild(messageElement);
  //   const div = document.createElement("div");
  //   div.classList.add("message");
  //   div.id = msg._id;

  // //  console.log("msg.sender._id",msg.sender._id)
  // //  console.log(currentUser._id)

  //   if (String(msg.sender._id) === String(currentUser._id)) {
  //     div.classList.add("sent");
  //     // div.textContent = msg.text;
  //     div.innerHTML = `
  //     <div class="message-content">
  //       <div class="message-text">${msg.text}</div>
  //       <div class="message-time">${formatTime(msg.createdAt)}</div>
  //       ${
  //         String(msg.sender._id) === String(currentUser._id) ? `
        
  //       <div class="menu">
  //       <span class="menu-icon" onclick="toggleMenu(event)">⋮</span>
  //       <div class="dropdown">
  //         <div onclick="deleteMessage('${msg._id}')">Delete</div>
  //       </div>
  //     </div>
  //     `
  //         : ""
  //       }
  //       </div>
  //     `;
      
  //   } else {
  //     div.classList.add("received");
  //     // div.textContent = msg.sender.name + ": " + msg.text;
  //     div.innerHTML = `
  //     <div class = "message-text">${msg.sender.name}: ${msg.text}</div>
  //     <div class="message-time">${formatTime(msg.createdAt)}</div>
  //     `;
  //   }

  //   messageBox.appendChild(div);
  });

  messageBox.scrollTop = messageBox.scrollHeight;
}

const messageInput = document.getElementById("messageInput")
let typingTimeout;

messageInput.addEventListener("input", () =>{
  const currentUser = JSON.parse(localStorage.getItem("user"));
  console.log(currentUser.name)
  socket.emit("typing",{
    roomId:currentRoom,
    senderName:currentUser.name
  })

  clearTimeout(typingTimeout)

  typingTimeout=setTimeout(()=>{
    socket.emit("stopTyping",{
      roomId:currentRoom
    })
  },15000)
})

// const typingindicator=document.getElementById("typingindicator")

// socket.on("Typing",({senderName})=>{
//   typingindicator.innerText = senderName + "is typing...."
// })

// socket.on("stopTyping",()=>{
//    typingindicator.innerText = ""
// })

//  let typingElement = null
//   const messages = document.getElementById("messages")

// const typingBubble = document.createElement("div");
//  typingBubble.className = "typing-bubble"
//  typingBubble.style.display = "none"

//  typingBubble.innerHTML = `
//   <div class = "dot"></div>
//   <div class = "dot"></div>
//   <div class = "dot"></div>
//  `;
  
//   messages.appendChild(typingBubble)

socket.on("typing", () => {
  // console.log("typing indicator")
  //  typingBubble.style.display = "flex";
  //  messages.appendChild(typingBubble)

  if(typingElement) return

  typingElement = document.createElement("div")
  typingElement.classList.add("message","left")
  typingElement.id="typingBubble"

   typingElement.innerHTML = `
      <div class="typing-bubble">
         <div class="dot"></div>
         <div class="dot"></div>
         <div class="dot"></div>
      </div>
   `;

   document.getElementById("messages").appendChild(typingElement);

   scrollToBottom();
});

socket.on("stopTyping", () => {
   if (typingElement) {
      typingElement.remove();
      typingElement = null;
   }
})

function scrollToBottom() {
  const messages = document.getElementById("messages")
  // messages.scrollTop = messages.scrollHeight
  messages.scrollTo({
    top:messages.scrollHeight,
    behavior:"smooth"
  })
}
function deleteMessage(messageId) {
  socket.emit("deleteMessage", { messageId, roomId: currentRoom });
}

socket.on("messageDeleted", ({ messageId }) => {
  const messageElement = document.getElementById(messageId);
  if (messageElement) {
    messageElement.remove();
  }
});

function formatTime(dateString) {
  const date = new Date(dateString);
  const today = new Date();

  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear(); 

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString()
    }
}
  function toggleMenu(event) {
    event.stopPropagation();
    
    document.querySelectorAll(".dropdown").forEach(drop => {
      drop.style.display = "none";  
    });

    const dropdown = event.currentTarget.nextElementSibling;

    if (dropdown.style.display === "block") {
      dropdown.style.display = "none";
    } else {
      dropdown.style.display = "block";
    } 
  }

  function renderMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.id = msg._id;
  // console.log("div.id",div.id)
  // console.log("msg._id",msg._id)

  const user = JSON.parse(localStorage.getItem("user"));

  if (String(msg.sender._id) === String(user._id)) {
    div.classList.add("sent");

    div.innerHTML = `
      <div class="message-content">
        <div class="message-text">${msg.text}</div>
        <div class="message-time">${formatTime(msg.createdAt)}</div>

        <div class="menu">
          <span class="menu-icon" onclick="toggleMenu(event)">⋮</span>
          <div class="dropdown">
            <div onclick="deleteMessage('${msg._id}')">Delete</div>
          </div>
        </div>
      </div>
    `;
  } else {
    div.classList.add("received");

    div.innerHTML = `
      <div class="message-content">
        <div class="message-text">${msg.text}</div>
        <div class="message-time">${formatTime(msg.createdAt)}</div>
      </div>
    `;
  }

  return div;
}

  document.addEventListener("click", function(){
    document.querySelectorAll(".dropdown").forEach(menu => {
      menu.style.display = "none";
    }); 
  });
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("sendBtn")
    .addEventListener("click", sendMessage);

  document.getElementById("loadBtn")
    .addEventListener("click", loadUsers);
})

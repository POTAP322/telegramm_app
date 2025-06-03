window.Telegram.WebApp.expand();

const authPage = document.querySelector(".container");
const homePage = document.getElementById("home-page");

const profilePage = document.getElementById("profile-page");
const profileNickname = document.getElementById("profile-nickname");
const gamesList = document.getElementById("games-list");
const profileActions = document.getElementById("profile-actions");
const settingsPage = document.getElementById("settings-page");

const newGameInput = document.getElementById("new-game");
const addGameBtn = document.getElementById("add-game-btn");
const settingsBtn = document.getElementById("settings-btn");

const settingsBackBtn = document.getElementById("settings-back-btn");
const backBtn = document.getElementById("back-btn");

let pageHistory = [];

// Пользователь
const currentUser = {
  id: null,
  telegram_id: "",
  username: "",
  games: []
};

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  document.getElementById(pageId).classList.remove("hidden");
  pageHistory.push(pageId);
}

function goBack() {
  pageHistory.pop(); // текущая
  const prevPage = pageHistory.pop(); // предыдущая
  if (prevPage) {
    showPage(prevPage);
  }
}

function renderCards(users) {
  const list = document.getElementById("cards-list");
  list.innerHTML = "";
  users.forEach(user => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>${user.username}</h3><p>ID: ${user.id}</p>`;
    list.appendChild(card);
  });
}

// Подключение Telegram Login Widget
document.getElementById("telegram-login-container").innerHTML = `
  <script async src="https://telegram.org/js/telegram-widget.js?22"
    data-telegram-login="findmate_service_bot"
    data-size="medium"
    data-onauth="onTelegramAuth(user)"
    data-request-access="write">
  </script>
`;

function onTelegramAuth(user) {
  console.log("Telegram Auth:", user);
  localStorage.setItem("telegram_user", JSON.stringify(user));
  document.getElementById("terms").disabled = false;
  document.getElementById("sign-up").disabled = false;
}

document.getElementById("sign-up").addEventListener("click", async () => {
  const termsChecked = document.getElementById("terms").checked;
  if (!termsChecked) {
    alert("Please agree to the terms.");
    return;
  }

  const telegramUserStr = localStorage.getItem("telegram_user");
  if (!telegramUserStr) {
    alert("Login through Telegram first!");
    return;
  }

  const telegramUser = JSON.parse(telegramUserStr);

  try {
    // Получаем или создаём пользователя
    const res = await fetch("http://127.0.0.1:8000/users/by_telegram_id/" + telegramUser.id);
    let user;

    if (res.ok) {
      user = await res.json();
    } else {
      const newUserRes = await fetch("http://127.0.0.1:8000/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: telegramUser.id.toString(),
          username: telegramUser.username || telegramUser.first_name,
          description: "",
          account_status: "standard"
        })
      });

      user = await newUserRes.json();
    }

    Object.assign(currentUser, {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      games: []
    });

    // Загружаем игры
    const userGamesRes = await fetch(`http://127.0.0.1:8000/usergames?user_id=${currentUser.id}`);
    const userGames = await userGamesRes.json();

    for (const ug of userGames) {
      const gameRes = await fetch(`http://127.0.0.1:8000/games/${ug.game_id}`);
      const game = await gameRes.json();
      currentUser.games.push(game.name);
    }

    authPage.classList.add("hidden");
    homePage.classList.remove("hidden");
    pageHistory = ["home-page"];
    loadRequests();
  } catch (err) {
    console.error(err);
    alert("Error fetching user from server");
  }
});

async function loadRequests() {
  const res = await fetch("http://127.0.0.1:8000/partner-requests");
  const requests = await res.json();

  const list = document.getElementById("cards-list");
  list.innerHTML = "";

  for (const req of requests) {
    const userRes = await fetch(`http://127.0.0.1:8000/users/${req.user_id}`);
    const user = await userRes.json();

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${user.username}</h3>
      <p>Looking for ${req.required_players} players</p>
      <p>${req.description || "No description"}</p>
    `;
    list.appendChild(card);
  }
}

addGameBtn.addEventListener("click", async () => {
  const gameName = newGameInput.value.trim();
  if (!gameName) return;

  let gameId;

  const gamesRes = await fetch("http://127.0.0.1:8000/games");
  const games = await gamesRes.json();

  let existingGame = games.find(g => g.name === gameName);

  if (!existingGame) {
    const createGameRes = await fetch("http://127.0.0.1:8000/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: gameName })
    });
    existingGame = await createGameRes.json();
  }

  gameId = existingGame.id;

  const userGameRes = await fetch("http://127.0.0.1:8000/usergames", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: currentUser.id,
      game_id: gameId
    })
  });

  const userGame = await userGameRes.json();
  currentUser.games.push(existingGame.name);

  openProfile(currentUser, true);
});

document.getElementById("create-request-btn").addEventListener("click", async () => {
  const gameName = document.getElementById("game-name").value.trim();
  const playersNeeded = parseInt(document.getElementById("players-needed").value);
  const requestDescription = document.getElementById("request-description").value.trim();
  const lifetime = parseInt(document.getElementById("lifetime").value);
  const platform = document.getElementById("platform").value;

  if (!gameName || !playersNeeded || !lifetime) {
    alert("Fill all required fields");
    return;
  }

  let gameId;

  const gamesRes = await fetch("http://127.0.0.0.1:8000/games");
  const games = await gamesRes.json();

  let existingGame = games.find(g => g.name === gameName);

  if (!existingGame) {
    const createGameRes = await fetch("http://127.0.0.0.1:8000/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: gameName })
    });
    existingGame = await createGameRes.json();
  }

  gameId = existingGame.id;

  const requestRes = await fetch("http://127.0.0.0.1:8000/partner-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: currentUser.id,
      game_id: gameId,
      required_players: playersNeeded,
      description: requestDescription,
      lifetime: lifetime,
      platform: platform
    })
  });

  const request = await requestRes.json();
  alert("Request created successfully!");

  showPage("home-page");
});

function openProfile(user, isCurrentUser = false) {
  profileNickname.value = user.username;
  gamesList.innerHTML = "";

  user.games.forEach(game => {
    const p = document.createElement("p");
    p.textContent = game;
    gamesList.appendChild(p);
  });

  profileActions.classList.toggle("hidden", !isCurrentUser);
  showPage("profile-page");
}

// Тема
const toggleDark = document.getElementById("toggle-dark");
function applyTheme() {
  const dark = localStorage.getItem("darkTheme") === "true";
  document.body.classList.toggle("dark", dark);
  toggleDark.checked = dark;
}
toggleDark.addEventListener("change", () => {
  localStorage.setItem("darkTheme", toggleDark.checked);
  applyTheme();
});
applyTheme();
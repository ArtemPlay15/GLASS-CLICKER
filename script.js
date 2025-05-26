// --- GAME STATE ---
let count = 0;
let multiplier = 1;
let achievements = [];
let nextUpgradeCost = 50;
let activePet = null;
let ownedPets = [];
let ownedSkins = [];
let activeSkin = null;
let wheelLastSpin = 0;

// --- PETS DATA ---
const pets = [
  {
    id: 1, name: "Котик", avatar: "🐱",
    desc: "+1 клик/сек", price: 300, level: 1, maxLevel: 5,
    bonus: pet => { return { type: "autoclick", value: pet.level }; }
  },
  {
    id: 2, name: "Дрон", avatar: "🤖",
    desc: "+5% к каждому клику", price: 700, level: 1, maxLevel: 5,
    bonus: pet => { return { type: "clickboost", value: 0.05 * pet.level }; }
  }
];

// --- SKINS DATA ---
const skins = [
  { id: 1, name: "Звёздная кнопка", demo: "⭐", desc: "Кнопка со звездой", price: 200, type: "button" },
  { id: 2, name: "Космос", demo: "🌌", desc: "Космический фон", price: 400, type: "background" }
];

// --- ACHIEVEMENTS ---
const achievementList = [
  { clicks: 10, text: "Десятка!" },
  { clicks: 50, text: "Полтинник!" },
  { clicks: 100, text: "Сотня!" },
  { clicks: 500, text: "Полтысячи!" },
  { clicks: 1000, text: "Тысяча! УРА!" }
];

// --- DOM ---
const counterElem = document.getElementById("counter");
const clickerBtn = document.getElementById("clicker");
const clickLabel = document.getElementById("click-label");
const multiplierElem = document.getElementById("multiplier");
const upgradeBtn = document.getElementById("upgrade");
const achievementsPanel = document.getElementById("achievements");
const themeToggleBtn = document.getElementById("theme-toggle");
const petsListElem = document.getElementById("pets-list");
const skinsListElem = document.getElementById("skins-list");
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const wheelBtn = document.getElementById("spin-btn");
const wheelResultElem = document.getElementById("wheel-result");
const wheelCooldownElem = document.getElementById("wheel-cooldown");

// --- GAME LOGIC ---

function updateCounter() {
  counterElem.textContent = count;
}

function animateCounter() {
  counterElem.style.background = getComputedStyle(document.body).getPropertyValue('--count-bg-active');
  counterElem.style.transform = "scale(1.13)";
  setTimeout(() => {
    counterElem.style.background = getComputedStyle(document.body).getPropertyValue('--count-bg');
    counterElem.style.transform = "scale(1)";
  }, 130);
}

function checkUpgrade() {
  upgradeBtn.disabled = count < nextUpgradeCost;
  upgradeBtn.textContent = "Улучшить (" + nextUpgradeCost + ")";
}

upgradeBtn.onclick = () => {
  if (count >= nextUpgradeCost) {
    count -= nextUpgradeCost;
    multiplier++;
    multiplierElem.textContent = "x" + multiplier;
    updateCounter();
    checkUpgrade();
    showAchievement("Множитель x" + multiplier + "!");
    nextUpgradeCost = 50 + (multiplier - 1) * 30;
    checkUpgrade();
  }
};

clickerBtn.onclick = () => {
  let bonus = getClickBonus();
  count += Math.floor(multiplier * bonus);
  updateCounter();
  checkUpgrade();
  checkAchievements();
  animateCounter();
};

function getClickBonus() {
  let bonus = 1;
  ownedPets.forEach(pid => {
    let pet = pets.find(p => p.id === pid.id);
    if (pet && pid.active) {
      let b = pet.bonus(pid);
      if (b.type === "clickboost") bonus += b.value;
    }
  });
  return bonus;
}

function autoClickLoop() {
  let autoclick = 0;
  ownedPets.forEach(pid => {
    let pet = pets.find(p => p.id === pid.id);
    if (pet && pid.active) {
      let b = pet.bonus(pid);
      if (b.type === "autoclick") autoclick += b.value;
    }
  });
  if (autoclick > 0) {
    count += autoclick;
    updateCounter();
    checkUpgrade();
    checkAchievements();
  }
  setTimeout(autoClickLoop, 1000);
}
autoClickLoop();

function checkAchievements() {
  achievementList.forEach(a => {
    if (count >= a.clicks && !achievements.includes(a.clicks)) {
      showAchievement(a.text);
      achievements.push(a.clicks);
    }
  });
}

function showAchievement(text) {
  const el = document.createElement("div");
  el.className = "achievement";
  el.textContent = "✨ " + text;
  achievementsPanel.appendChild(el);
  setTimeout(() => { el.remove(); }, 3500);
}

// --- Питомцы ---
function renderPets() {
  petsListElem.innerHTML = "";
  pets.forEach(pet => {
    let owned = ownedPets.find(p => p.id === pet.id);
    const card = document.createElement("div");
    card.className = "pet-card";
    card.innerHTML = `
      <span class="pet-avatar">${pet.avatar}</span>
      <div class="pet-desc">
        <b>${pet.name}</b> <span class="pet-lvl">Ур. ${owned ? owned.level : 1}</span><br>
        <span>${pet.desc}</span>
      </div>
    `;
    const btn = document.createElement("button");
    btn.className = "glass-btn mini pet-btn";
    if (!owned) {
      btn.textContent = `Купить (${pet.price})`;
      btn.onclick = () => buyPet(pet.id);
      btn.disabled = count < pet.price;
    } else if (!owned.active) {
      btn.textContent = "Активировать";
      btn.onclick = () => activatePet(pet.id);
    } else if (owned.level < pet.maxLevel) {
      btn.textContent = `Прокачать (${pet.price * (owned.level + 1)})`;
      btn.onclick = () => upgradePet(pet.id);
      btn.disabled = count < pet.price * (owned.level + 1);
    } else {
      btn.textContent = "Макс. уровень";
      btn.disabled = true;
    }
    card.appendChild(btn);
    petsListElem.appendChild(card);
  });
}
function buyPet(id) {
  let pet = pets.find(p => p.id === id);
  if (count >= pet.price) {
    count -= pet.price;
    ownedPets.push({ id: pet.id, level: 1, active: false });
    showAchievement(`Ты купил питомца: ${pet.name}!`);
    renderPets();
    updateCounter();
    saveGame();
  }
}
function activatePet(id) {
  ownedPets.forEach(p => p.active = false);
  let pet = ownedPets.find(p => p.id === id);
  if (pet) pet.active = true;
  renderPets();
  saveGame();
}
function upgradePet(id) {
  let pet = pets.find(p => p.id === id);
  let owned = ownedPets.find(p => p.id === id);
  let price = pet.price * (owned.level + 1);
  if (owned && owned.level < pet.maxLevel && count >= price) {
    count -= price;
    owned.level++;
    showAchievement(`Питомец ${pet.name} теперь ур. ${owned.level}!`);
    renderPets();
    updateCounter();
    saveGame();
  }
}

// --- Скины ---
function renderSkins() {
  skinsListElem.innerHTML = "";
  skins.forEach(skin => {
    let owned = ownedSkins.includes(skin.id);
    const card = document.createElement("div");
    card.className = "skin-card";
    card.innerHTML = `
      <span class="skin-demo">${skin.demo}</span>
      <div class="skin-desc">
        <b>${skin.name}</b><br><span>${skin.desc}</span>
      </div>
    `;
    const btn = document.createElement("button");
    btn.className = "glass-btn mini skin-btn";
    if (!owned) {
      btn.textContent = `Купить (${skin.price})`;
      btn.onclick = () => buySkin(skin.id);
      btn.disabled = count < skin.price;
    } else if (activeSkin === skin.id) {
      btn.textContent = "Используется";
      btn.disabled = true;
    } else {
      btn.textContent = "Выбрать";
      btn.onclick = () => selectSkin(skin.id);
    }
    card.appendChild(btn);
    skinsListElem.appendChild(card);
  });
}
function buySkin(id) {
  let skin = skins.find(s => s.id === id);
  if (count >= skin.price) {
    count -= skin.price;
    ownedSkins.push(skin.id);
    showAchievement(`Открыт скин: ${skin.name}`);
    renderSkins();
    updateCounter();
    saveGame();
  }
}
function selectSkin(id) {
  activeSkin = id;
  applySkin();
  renderSkins();
  saveGame();
}
function applySkin() {
  if (activeSkin === 1) { // Кнопка со звездой
    clickLabel.textContent = "⭐ Клик! ⭐";
  } else {
    clickLabel.textContent = "Клик!";
  }
  if (activeSkin === 2) { // Космический фон
    document.querySelector(".main-bg").style.background = "linear-gradient(135deg, #212245 0%, #4b006e 100%)";
  } else {
    document.querySelector(".main-bg").style.background = "";
  }
}

// --- Колесо удачи ---
function canSpinWheel() {
  const DAY = 1000 * 60 * 60 * 24;
  return Date.now() - wheelLastSpin >= DAY;
}
function updateWheelCooldown() {
  if (canSpinWheel()) {
    wheelCooldownElem.textContent = "";
    wheelBtn.disabled = false;
  } else {
    let left = 24 * 60 * 60 * 1000 - (Date.now() - wheelLastSpin);
    let h = Math.floor(left / (1000 * 60 * 60));
    let m = Math.floor((left % (1000 * 60 * 60)) / (1000 * 60));
    let s = Math.floor((left % (1000 * 60)) / 1000);
    wheelCooldownElem.textContent = `Доступно через: ${h}ч ${m}м ${s}с`;
    wheelBtn.disabled = true;
    setTimeout(updateWheelCooldown, 1000);
  }
}
wheelBtn.onclick = spinWheel;
function spinWheel() {
  if (!canSpinWheel()) return;
  const prizes = [
    { type: "clicks", value: 100, text: "+100 кликов!" },
    { type: "clicks", value: 300, text: "+300 кликов!" },
    { type: "skin", value: 1, text: "Скин: Звёздная кнопка!" },
    { type: "pet", value: 2, text: "Питомец: Дрон!" }
  ];
  const prize = prizes[Math.floor(Math.random() * prizes.length)];
  if (prize.type === "clicks") {
    count += prize.value;
    updateCounter();
    wheelResultElem.textContent = `🎁 ${prize.text}`;
  }
  if (prize.type === "skin" && !ownedSkins.includes(prize.value)) {
    ownedSkins.push(prize.value);
    renderSkins();
    wheelResultElem.textContent = `🎁 ${prize.text}`;
  }
  if (prize.type === "pet" && !ownedPets.some(p => p.id === prize.value)) {
    ownedPets.push({ id: prize.value, level: 1, active: false });
    renderPets();
    wheelResultElem.textContent = `🎁 ${prize.text}`;
  }
  wheelLastSpin = Date.now();
  updateWheelCooldown();
  saveGame();
}

// --- ТАБЫ ---
tabBtns.forEach(btn => {
  btn.onclick = function() {
    tabBtns.forEach(b => b.classList.remove("active"));
    tabContents.forEach(tab => tab.classList.remove("show"));
    this.classList.add("active");
    document.getElementById('tab-' + this.dataset.tab).classList.add("show");
    if (this.dataset.tab === "pets") renderPets();
    if (this.dataset.tab === "skins") renderSkins();
    if (this.dataset.tab === "minigame") {
      updateWheelCooldown();
      wheelResultElem.textContent = "";
    }
  }
});

// --- ТЕМА ---
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark'); themeToggleBtn.textContent = '☀️';
  } else {
    document.body.classList.remove('dark'); themeToggleBtn.textContent = '🌙';
  }
  localStorage.setItem('clickerTheme', theme);
}
function initTheme() {
  let theme = localStorage.getItem('clickerTheme');
  if (!theme) {
    const h = new Date().getHours();
    theme = (h >= 21 || h < 8) ? 'dark' : 'light';
  }
  applyTheme(theme);
}
themeToggleBtn.onclick = () => {
  const isDark = document.body.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
};

// --- СОХРАНЕНИЕ ---
function saveGame() {
  localStorage.glassClicker3 = JSON.stringify({
    count, multiplier, achievements, nextUpgradeCost,
    ownedPets, ownedSkins, activeSkin, wheelLastSpin
  });
}
function loadGame() {
  if (localStorage.glassClicker3) {
    try {
      const save = JSON.parse(localStorage.glassClicker3);
      count = save.count || 0;
      multiplier = save.multiplier || 1;
      achievements = save.achievements || [];
      nextUpgradeCost = save.nextUpgradeCost || 50 + (multiplier - 1) * 30;
      ownedPets = save.ownedPets || [];
      ownedSkins = save.ownedSkins || [];
      activeSkin = save.activeSkin || null;
      wheelLastSpin = save.wheelLastSpin || 0;
      multiplierElem.textContent = "x" + multiplier;
      updateCounter(); checkUpgrade(); applySkin();
    } catch {}
  }
}
window.onload = () => {
  initTheme();
  loadGame();
  renderPets();
  renderSkins();
  updateWheelCooldown();
};
window.onbeforeunload = saveGame;

// --- Клавиша пробел
window.addEventListener("keydown", e => {
  if (e.code === "Space" && document.getElementById("tab-main").classList.contains("show")) {
    clickerBtn.click();
  }
});

// --- Эффекты кнопки
clickerBtn.addEventListener("click", function(e) {
  this.classList.remove("ring");
  void this.offsetWidth; // reflow
  this.classList.add("ring");
  setTimeout(() => this.classList.remove("ring"), 330);
});

// --- Стартовые вызовы
updateCounter(); checkUpgrade();
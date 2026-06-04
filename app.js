const today = new Date("2026-06-01T09:00:00");
const DAY_MS = 24 * 60 * 60 * 1000;

const compatibility = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

const state = {
  donors: [
    { id: 1, name: "Elena Fischer", bloodType: "O-", city: "Vienna", distance: 5, lastDonation: null },
    { id: 2, name: "Jonas Weber", bloodType: "A+", city: "Vienna", distance: 12, lastDonation: "2026-05-18" },
    { id: 3, name: "Sara Novak", bloodType: "A-", city: "Graz", distance: 37, lastDonation: null },
    { id: 4, name: "Amir Khan", bloodType: "B+", city: "Linz", distance: 44, lastDonation: "2026-04-20" },
  ],
  requests: [
    { id: 101, patient: "Nina Hart", bloodType: "A+", units: 2, urgency: "Critical", status: "Open" },
    { id: 102, patient: "Oscar Klein", bloodType: "O+", units: 1, urgency: "Urgent", status: "Open" },
  ],
  inventory: {
    "O-": 3,
    "O+": 7,
    "A-": 2,
    "A+": 6,
    "B-": 1,
    "B+": 5,
    "AB-": 1,
    "AB+": 4,
  },
  notifications: [
    "System started with real-time donor matching.",
    "A+ request opened for Nina Hart.",
    "B- inventory is below safety threshold.",
  ],
};

const titles = {
  overview: "Platform Overview",
  donor: "Donor Management",
  receiver: "Receiver Requests",
  hospital: "Hospital Inventory",
  admin: "Admin Safety Console",
};

function getFreeze(donor) {
  if (!donor.lastDonation) return { frozen: false, daysLeft: 0, availableOn: "Available now" };
  const donatedAt = new Date(`${donor.lastDonation}T09:00:00`);
  const elapsed = Math.floor((today - donatedAt) / DAY_MS);
  const daysLeft = Math.max(0, 30 - elapsed);
  const availableDate = new Date(donatedAt.getTime() + 30 * DAY_MS);

  return {
    frozen: daysLeft > 0,
    daysLeft,
    availableOn: daysLeft > 0 ? availableDate.toLocaleDateString() : "Available now",
  };
}

function getMatches(request) {
  const compatibleTypes = compatibility[request.bloodType];
  return state.donors
    .filter((donor) => compatibleTypes.includes(donor.bloodType))
    .map((donor) => ({ ...donor, freeze: getFreeze(donor) }))
    .filter((donor) => !donor.freeze.frozen)
    .sort((a, b) => a.distance - b.distance);
}

function addNotification(message) {
  state.notifications.unshift(message);
  state.notifications = state.notifications.slice(0, 7);
}

function tag(text, tone = "") {
  return `<span class="tag ${tone}">${text}</span>`;
}

function renderMetrics() {
  const frozen = state.donors.filter((donor) => getFreeze(donor).frozen).length;
  const active = state.donors.length - frozen;
  const units = Object.values(state.inventory).reduce((sum, value) => sum + value, 0);
  const open = state.requests.filter((request) => request.status === "Open").length;

  document.querySelector("#active-donors").textContent = active;
  document.querySelector("#frozen-donors").textContent = frozen;
  document.querySelector("#blood-units").textContent = units;
  document.querySelector("#open-requests").textContent = open;
}

function renderMatches() {
  const container = document.querySelector("#match-list");
  container.innerHTML = state.requests
    .map((request) => {
      const matches = getMatches(request);
      const hospitalUnits = state.inventory[request.bloodType] || 0;
      return `
        <article class="item">
          <div class="item-row">
            <div>
              <h4>${request.patient} needs ${request.units} unit(s) ${request.bloodType}</h4>
              <p>${matches.length} eligible donor(s), ${hospitalUnits} hospital unit(s)</p>
            </div>
            ${tag(request.urgency, request.urgency === "Critical" ? "red" : "amber")}
          </div>
          <div class="tag-row">
            ${matches.slice(0, 4).map((donor) => tag(`${donor.name} - ${donor.distance}km`, "green")).join("") || tag("No donor match", "red")}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderNotifications() {
  document.querySelector("#notification-list").innerHTML = state.notifications
    .map((note) => `
      <article class="item">
        <div class="item-row">
          <div>
            <h4>${note}</h4>
            <p>Updated just now</p>
          </div>
        </div>
      </article>
    `)
    .join("");
}

function renderDonors() {
  document.querySelector("#donor-list").innerHTML = state.donors
    .map((donor) => {
      const freeze = getFreeze(donor);
      return `
        <article class="item">
          <div class="item-row">
            <div>
              <h4>${donor.name}</h4>
              <p>${donor.city} - ${donor.distance}km from request center</p>
            </div>
            ${tag(donor.bloodType, "red")}
          </div>
          <div class="tag-row">
            ${freeze.frozen ? tag(`${freeze.daysLeft} freeze day(s) left`, "amber") : tag("Eligible", "green")}
            ${tag(freeze.availableOn, freeze.frozen ? "blue" : "")}
          </div>
          <button class="mini-button" data-donate="${donor.id}" type="button">Confirm donation</button>
        </article>
      `;
    })
    .join("");
}

function renderRequests() {
  document.querySelector("#request-list").innerHTML = state.requests
    .map((request) => `
      <article class="item">
        <div class="item-row">
          <div>
            <h4>${request.patient}</h4>
            <p>${request.units} unit(s) ${request.bloodType} - ${request.status}</p>
          </div>
          ${tag(request.urgency, request.urgency === "Critical" ? "red" : "amber")}
        </div>
        <div class="tag-row">
          ${tag(`${getMatches(request).length} donor matches`, "green")}
          ${tag(`${state.inventory[request.bloodType] || 0} hospital units`, "blue")}
        </div>
      </article>
    `)
    .join("");
}

function renderInventory() {
  document.querySelector("#inventory-grid").innerHTML = Object.entries(state.inventory)
    .map(([type, units]) => `
      <article class="blood-card ${units <= 2 ? "low" : ""}">
        <strong>${type}</strong>
        <span>${units} unit(s)</span>
      </article>
    `)
    .join("");
}

function renderAdmin() {
  const frozen = state.donors.filter((donor) => getFreeze(donor).frozen).length;
  const lowStock = Object.entries(state.inventory)
    .filter(([, units]) => units <= 2)
    .map(([type]) => type)
    .join(", ");

  const rows = [
    ["Donor eligibility", "Healthy", `${frozen} donor(s) frozen`, "Freeze checks active"],
    ["Matching engine", "Online", `${state.requests.length} request(s) scanned`, "Distance ranking active"],
    ["Hospital inventory", lowStock ? "Needs attention" : "Healthy", lowStock || "All stocked", "Low-stock monitor active"],
    ["Notifications", "Online", `${state.notifications.length} recent event(s)`, "Realtime alerts active"],
  ];

  document.querySelector("#admin-table").innerHTML = rows
    .map(([module, status, signal, action]) => `
      <tr>
        <td>${module}</td>
        <td>${tag(status, status === "Needs attention" ? "amber" : "green")}</td>
        <td>${signal}</td>
        <td>${action}</td>
      </tr>
    `)
    .join("");
}

function renderAll() {
  renderMetrics();
  renderMatches();
  renderNotifications();
  renderDonors();
  renderRequests();
  renderInventory();
  renderAdmin();
  if (window.lucide) lucide.createIcons();
}

document.querySelectorAll(".nav-tab").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    document.querySelectorAll(".nav-tab").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${view}-view`).classList.add("active");
    document.querySelector("#view-title").textContent = titles[view];
  });
});

document.querySelector("#donor-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  state.donors.push({
    id: Date.now(),
    name: data.name,
    bloodType: data.bloodType,
    city: data.city,
    distance: Number(data.distance),
    lastDonation: null,
  });
  addNotification(`${data.name} registered as an eligible ${data.bloodType} donor.`);
  renderAll();
});

document.querySelector("#request-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  state.requests.unshift({
    id: Date.now(),
    patient: data.patient,
    bloodType: data.bloodType,
    units: Number(data.units),
    urgency: data.urgency,
    status: "Open",
  });
  addNotification(`${data.urgency} ${data.bloodType} request opened for ${data.patient}.`);
  renderAll();
});

document.querySelector("#inventory-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  state.inventory[data.bloodType] += Number(data.units);
  addNotification(`Hospital added ${data.units} ${data.bloodType} unit(s) to inventory.`);
  renderAll();
});

document.querySelector("#donor-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-donate]");
  if (!button) return;

  const donor = state.donors.find((item) => item.id === Number(button.dataset.donate));
  const freeze = getFreeze(donor);
  if (freeze.frozen) {
    addNotification(`${donor.name} is still frozen until ${freeze.availableOn}.`);
  } else {
    donor.lastDonation = today.toISOString().slice(0, 10);
    addNotification(`${donor.name} donated successfully and is frozen for 30 days.`);
  }
  renderAll();
});

renderAll();

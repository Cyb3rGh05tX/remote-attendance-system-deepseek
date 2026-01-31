const scriptURL = "https://script.google.com/macros/s/AKfycbwO7rRBaZT_PvPDNVd7HHyTvldn9n3abxFYikvJ_pHoILH27XDWO6hZb88HOH8Xw-Tr/exec";

let currentUser = {};

async function login() {
  const userId = document.getElementById("userId").value.trim();
  if (!userId) {
    alert("Enter UserID");
    return;
  }

  const res = await fetch(`${scriptURL}?action=checkUser&userId=${userId}`);
  const data = await res.json();

  if (!data.exists) {
    alert("User not found");
    return;
  }

  currentUser = { userId: data.userId, userName: data.userName };
  document.getElementById("loginContainer").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("displayName").innerText = data.userName;

  loadAttendance();
  loadTasks();
}

function getUTCNow() {
  return new Date().toISOString();
}

function formatLocalTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleString();
}

async function checkIn() {
  const payload = {
    action: "checkIn",
    userId: currentUser.userId,
    userName: currentUser.userName,
    time: getUTCNow()
  };
  await postData(payload);
  loadAttendance();
}

async function checkOut() {
  const payload = {
    action: "checkOut",
    userId: currentUser.userId,
    userName: currentUser.userName,
    time: getUTCNow()
  };
  await postData(payload);
  loadAttendance();
}

async function addTask() {
  const taskTitle = document.getElementById("taskTitle").value.trim();
  const status = document.getElementById("taskStatus").value;

  if (!taskTitle) {
    alert("Enter task title");
    return;
  }

  const payload = {
    action: "addTask",
    userId: currentUser.userId,
    userName: currentUser.userName,
    taskTitle,
    status,
    time: getUTCNow()
  };
  await postData(payload);
  loadTasks();
}

async function loadAttendance() {
  const res = await fetch(`${scriptURL}?action=getAttendance&userId=${currentUser.userId}`);
  const data = await res.json();
  const log = document.getElementById("attendanceLog");
  log.innerHTML = data.map(row =>
    `<p>${row.Date}: In ${formatLocalTime(row.CheckIn)} Out ${formatLocalTime(row.CheckOut)}</p>`
  ).join("");
}

async function loadTasks() {
  const res = await fetch(`${scriptURL}?action=getTasks&userId=${currentUser.userId}`);
  const data = await res.json();
  const list = document.getElementById("taskList");
  list.innerHTML = data.map(row =>
    `<p>${row.TaskTitle} - ${row.Status} (Updated: ${formatLocalTime(row.LastUpdated)})</p>`
  ).join("");
}

async function postData(payload) {
  await fetch(scriptURL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

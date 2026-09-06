const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const storeKey = "case-study-work-journal";

let cases = JSON.parse(localStorage.getItem(storeKey) || "[]");
let activeId = null;
let currentFilter = "all";

const today = () => new Date().toISOString().slice(0, 10);

const esc = value =>
  String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[character]));

function save() {
  localStorage.setItem(storeKey, JSON.stringify(cases));
  render();
}

function openDialog() {
  const form = $("#caseForm");
  form.reset();
  form.date.value = today();
  $("#caseDialog").showModal();
}

["newCaseTop", "newCaseHero", "newCaseEmpty"].forEach(id => {
  $("#" + id).addEventListener("click", openDialog);
});

$("#caseForm").addEventListener("submit", event => {
  event.preventDefault();

  const formData = new FormData(event.target);

  const newCase = {
    id: crypto.randomUUID(),
    title: formData.get("title"),
    date: formData.get("date"),
    category: formData.get("category"),
    status: formData.get("status"),
    location: formData.get("location"),
    people: formData.get("people"),
    summary: formData.get("summary"),
    events: []
  };

  cases.unshift(newCase);
  activeId = newCase.id;

  $("#caseDialog").close();
  save();
});

function render() {
  const query = $("#search").value.toLowerCase();

  const visibleCases = cases.filter(item => {
    const matchesFilter =
      currentFilter === "all" || item.status === currentFilter;

    const searchableText =
      `${item.title} ${item.category} ${item.location} ${item.people}`.toLowerCase();

    return matchesFilter && searchableText.includes(query);
  });

  if (visibleCases.length) {
    $("#caseList").innerHTML = visibleCases.map(item => `
      <div class="case-item ${item.id === activeId ? "active" : ""}" data-id="${item.id}">
        <h3>${esc(item.title)}</h3>
        <div class="case-meta">
          <i class="status-dot ${item.status}"></i>
          ${esc(item.category)} · ${esc(item.date)}
        </div>
      </div>
    `).join("");
  } else {
    $("#caseList").innerHTML =
      '<p class="case-meta">No matching cases yet.</p>';
  }

  $$(".case-item").forEach(item => {
    item.onclick = () => {
      activeId = item.dataset.id;
      render();
    };
  });

  $("#caseCount").textContent = cases.length;

  $("#openCount").textContent =
    cases.filter(item => item.status !== "closed").length;

  $("#eventCount").textContent =
    cases.reduce((total, item) => total + item.events.length, 0);

  renderDetail();
}

function renderDetail() {
  const currentCase = cases.find(item => item.id === activeId);

  if (!currentCase) {
    $("#emptyDetail").hidden = false;
    $("#caseDetail").hidden = true;
    return;
  }

  $("#emptyDetail").hidden = true;
  $("#caseDetail").hidden = false;

  const timeline = currentCase.events.length
    ? currentCase.events
        .slice()
        .reverse()
        .map(event => `
          <article class="entry">
            <div class="entry-date">${esc(event.date)}</div>
            <h4>${esc(event.title)}</h4>
            <p>${esc(event.body)}</p>
          </article>
        `)
        .join("")
    : `
      <p class="case-meta">
        No timeline entries yet. Record what happened while it is fresh.
      </p>
    `;

  $("#caseDetail").innerHTML = `
    <div class="detail-head">
      <div>
        <span class="eyebrow">
          ${esc(currentCase.category)} · ${esc(currentCase.status)}
        </span>

        <h2>${esc(currentCase.title)}</h2>

        <div class="meta-row">
          <span>📅 ${esc(currentCase.date)}</span>
          <span>📍 ${esc(currentCase.location || "Location not added")}</span>
          <span>👥 ${esc(currentCase.people || "People not added")}</span>
        </div>
      </div>

      <div class="detail-actions">
        <button class="tiny-button" id="exportCase">Export</button>
        <button class="tiny-button" id="deleteCase">Delete</button>
      </div>
    </div>

    <div class="summary">
      ${esc(currentCase.summary || "No summary added.")}
    </div>

    <div class="timeline-head">
      <h3>Timeline</h3>
      <span class="case-meta">${currentCase.events.length} entries</span>
    </div>

    <div>${timeline}</div>

    <form class="add-entry" id="entryForm">
      <textarea
        name="body"
        rows="4"
        required
        placeholder="Write what happened. Use observable facts, exact words, time, and witnesses."
      ></textarea>

      <div class="add-entry-row">
        <input name="date" type="date" value="${today()}" required>
        <input name="title" required placeholder="Entry title, e.g. Follow-up with HR">
        <button class="primary">Add entry</button>
      </div>
    </form>
  `;

  $("#entryForm").onsubmit = event => {
    event.preventDefault();

    const formData = new FormData(event.target);

    currentCase.events.push({
      date: formData.get("date"),
      title: formData.get("title"),
      body: formData.get("body")
    });

    save();
  };

  $("#deleteCase").onclick = () => {
    if (confirm("Delete this case and its timeline?")) {
      cases = cases.filter(item => item.id !== currentCase.id);
      activeId = null;
      save();
    }
  };

  $("#exportCase").onclick = () => {
    download(
      `case-${slug(currentCase.title)}.json`,
      JSON.stringify(currentCase, null, 2),
      "application/json"
    );
  };
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "case";
}

function download(filename, data, type) {
  const link = document.createElement("a");

  link.href = URL.createObjectURL(
    new Blob([data], { type })
  );

  link.download = filename;
  link.click();

  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

$("#exportAll").onclick = () => {
  download(
    "case-study-journal.json",
    JSON.stringify(cases, null, 2),
    "application/json"
  );
};

$("#search").oninput = render;

$$(".filter").forEach(button => {
  button.onclick = () => {
    $$(".filter").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    currentFilter = button.dataset.filter;
    render();
  };
});

$(".parallax-zone").addEventListener("pointermove", event => {
  const area = event.currentTarget.getBoundingClientRect();

  const x = (event.clientX - area.left) / area.width - 0.5;
  const y = (event.clientY - area.top) / area.height - 0.5;

  $(".hero-art").style.transform =
    `translate(${x * 18}px, ${y * 18}px)`;

  $(".hero-copy").style.transform =
    `translate(${x * -5}px, ${y * -5}px)`;
});

$(".parallax-zone").addEventListener("pointerleave", () => {
  $(".hero-art").style.transform = "";
  $(".hero-copy").style.transform = "";
});

render();
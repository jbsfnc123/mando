(() => {
  "use strict";

  const data = window.cvData;
  if (!data) {
    console.error("CV data tidak ditemukan. Pastikan content.js dimuat sebelum script.js.");
    return;
  }

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);
  const setText = (selector, value) => {
    const element = $(selector);
    if (element) element.textContent = value;
  };
  const escapeHtml = (value = "") =>
    String(value).replace(
      /[&<>'"]/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
          character
        ],
    );

  const initials = data.personal.name
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  $$('[data-initials]').forEach((element) => (element.textContent = initials));
  setText("[data-short-name]", data.personal.name);
  setText("[data-name]", data.personal.name);
  setText("[data-role]", data.personal.role);
  setText("[data-status]", data.personal.status);
  setText("[data-summary]", data.personal.summary);
  setText("[data-location]", data.personal.location);
  setText("[data-experience-years]", data.personal.experienceYears);
  setText("[data-focus]", data.personal.focus);
  setText("[data-footer-name]", data.personal.name);
  setText("[data-current-year]", new Date().getFullYear());
  document.title = `${data.personal.name} — ${data.personal.role}`;

  const emailLink = $("[data-email-link]");
  emailLink.href = `mailto:${data.personal.email}`;

  $("[data-contacts]").innerHTML = [
    ["Email", data.personal.email, `mailto:${data.personal.email}`],
    ["Telepon", data.personal.phone, `tel:${data.personal.phone.replace(/\s/g, "")}`],
    ["Lokasi", data.personal.location, null],
  ]
    .map(
      ([label, value, href]) => `
        <div class="contact-item">
          <span class="contact-item__icon" aria-hidden="true">${label[0]}</span>
          <div>
            <span>${escapeHtml(label)}</span>
            ${
              href
                ? `<a href="${escapeHtml(href)}">${escapeHtml(value)}</a>`
                : `<strong>${escapeHtml(value)}</strong>`
            }
          </div>
        </div>`,
    )
    .join("");

  $("[data-experience]").innerHTML = data.experience
    .map(
      (item) => `
        <article class="experience-card">
          <div class="experience-card__top">
            <div>
              <p class="experience-card__company">${escapeHtml(item.company)}</p>
              <h3>${escapeHtml(item.role)}</h3>
            </div>
            <span class="period">${escapeHtml(item.period)}</span>
          </div>
          <p>${escapeHtml(item.intro)}</p>
          <span class="location-label">⌖ ${escapeHtml(item.location)}</span>
        </article>`,
    )
    .join("");

  $("[data-expertise]").innerHTML = data.expertise
    .map(
      (item) => `
        <article class="expertise-card">
          <span>${escapeHtml(item.number)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </article>`,
    )
    .join("");

  $("[data-education]").innerHTML = data.education
    .map(
      (item) => `
        <article class="education-item">
          <span>${escapeHtml(item.period)}</span>
          <h3>${escapeHtml(item.degree)}</h3>
          <p>${escapeHtml(item.school)}</p>
        </article>`,
    )
    .join("");

  $("[data-skills]").innerHTML = `
    <div class="skill-group">
      <h3>Technical</h3>
      <div class="tag-list">${data.skills.technical
        .map((skill) => `<span>${escapeHtml(skill)}</span>`)
        .join("")}</div>
    </div>
    <div class="skill-group">
      <h3>Professional</h3>
      <div class="tag-list">${data.skills.professional
        .map((skill) => `<span>${escapeHtml(skill)}</span>`)
        .join("")}</div>
    </div>`;

  $("#printButton").addEventListener("click", () => window.print());

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    $$(".reveal").forEach((element) => observer.observe(element));
  } else {
    $$(".reveal").forEach((element) => element.classList.add("is-visible"));
  }
})();

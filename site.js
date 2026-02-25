/* eslint-env browser */

(() => {
  // year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // mobile nav toggle
  const btn = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (btn && nav) {
    btn.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(isOpen));
    });
  }

  // highlight active page link
  const path = (location.pathname || "/").toLowerCase();
  document.querySelectorAll(".nav a").forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (!href || href.startsWith("http")) return;

    const cleanHref = href.replace("./", "/");

    // home match
    if (
      (path === "/" || path.endsWith("/index.html")) &&
      (cleanHref === "/" || cleanHref.endsWith("index.html"))
    ) {
      a.classList.add("active");
      return;
    }

    // other pages match
    if (cleanHref !== "/" && path.endsWith(cleanHref)) {
      a.classList.add("active");
    }
  });
})();

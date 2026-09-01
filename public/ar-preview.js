(() => {
  "use strict";
  const config = window.PROPERTY_CONFIG || {};
  const name = config.name || "Desert Pearl Residences";
  const page = document.querySelector("[data-ar-page]");
  const trigger = document.querySelector("[data-place-trigger]");
  const label = document.querySelector("[data-placement-label]");
  const video = document.querySelector("[data-ar-video]");

  document.querySelectorAll("[data-property-name]").forEach((element) => { element.textContent = name; });
  document.querySelectorAll("[data-property-location]").forEach((element) => { element.textContent = config.location || "Dubai, United Arab Emirates"; });
  document.querySelectorAll("[data-property-logo]").forEach((image) => { if (config.logo) image.src = config.logo; image.alt = `${name} logo`; });
  document.title = `AR Experience | ${name}`;

  trigger?.addEventListener("click", async () => {
    page?.classList.add("is-ar-active");
    if (label) label.textContent = "AR experience active · looping preview";
    if (video) {
      video.currentTime = 0;
      video.loop = true;
      try { await video.play(); } catch { page?.classList.remove("is-ar-active"); }
    }
  });

  video?.addEventListener("play", () => page?.classList.add("is-ar-active"));
})();

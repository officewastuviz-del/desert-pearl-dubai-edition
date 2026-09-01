(() => {
  "use strict";

  const config = window.PROPERTY_CONFIG || {};
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  const currentPage = document.body.dataset.page || "home";
  const navItems = [
    ["home", "index.html", "Home"], ["vision", "vision.html", "Vision"],
    ["residences", "residences.html", "Residences"], ["amenities", "amenities.html", "Amenities"],
    ["gallery", "gallery.html", "Gallery"], ["experience", "experience.html", "Immersive"]
  ];
  const headerHost = document.querySelector("[data-site-header]");
  if (headerHost) headerHost.outerHTML = `<header class="site-header" data-header>
    <a class="property-brand" href="index.html" aria-label="Desert Pearl home"><img data-property-logo src="media/images/property-logo.svg" alt=""><span><strong data-property-name>Desert Pearl Residences</strong><small data-property-location>Dubai, United Arab Emirates</small></span></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation"><span>Menu</span><i></i><i></i></button>
    <nav id="site-navigation" class="site-navigation" aria-label="Primary navigation">${navItems.map(([key, href, label]) => `<a href="${href}"${key === currentPage ? ' aria-current="page"' : ""}>${label}</a>`).join("")}<button class="nav-enquire" type="button" data-open-enquire>Enquire</button></nav>
  </header>`;

  const footerHost = document.querySelector("[data-site-footer]");
  if (footerHost) footerHost.outerHTML = `<footer class="site-footer"><a class="property-brand footer-brand" href="index.html"><img data-property-logo src="media/images/property-logo.svg" alt=""><span><strong data-property-name>Desert Pearl Residences</strong><small data-property-location>Dubai, United Arab Emirates</small></span></a><p>Conceptual visualisation for presentation purposes.</p><div><a href="vision.html">Vision</a><a href="gallery.html">Gallery</a><a href="experience.html">Immersive</a><button type="button" data-open-enquire>Enquire</button></div></footer>`;

  const dialogsHost = document.querySelector("[data-site-dialogs]");
  if (dialogsHost) dialogsHost.outerHTML = `<dialog class="enquire-dialog" data-enquire-dialog><button class="dialog-close" type="button" data-close-enquire aria-label="Close enquiry form">×</button><div class="dialog-intro"><p class="eyebrow">Private presentation</p><h2>Discover <span data-property-name>Desert Pearl Residences</span>.</h2><p>Share your details and the project team can arrange a personalised presentation.</p></div><form class="enquire-form" action="lead-capture.php" method="post" data-enquire-form><label><span>Name</span><input name="name" autocomplete="name" required></label><label><span>Phone</span><input name="phone" autocomplete="tel" inputmode="tel" required></label><label><span>Email</span><input name="email" autocomplete="email" type="email"></label><label class="full"><span>Interest</span><select name="configuration"><option>Private presentation</option><option>Residence details</option><option>Investment information</option><option>AR / 360° demonstration</option></select></label><button class="button button-primary full" type="submit"><span>Send enquiry</span><i>↗</i></button><p class="form-status full" aria-live="polite"></p></form></dialog><dialog class="lightbox" data-lightbox-dialog><button type="button" data-lightbox-close aria-label="Close image">×</button><img src="" alt="Expanded property view" data-lightbox-image></dialog>`;

  const setText = (selector, value) => {
    if (!value) return;
    document.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
  };

  setText("[data-property-name]", config.name);
  setText("[data-property-location]", config.location);
  setText("[data-property-edition]", config.edition);
  setText("[data-property-description]", config.description);
  document.querySelectorAll("[data-property-logo]").forEach((image) => {
    if (config.logo) image.src = config.logo;
    image.alt = config.name ? `${config.name} logo` : "Property logo";
  });
  document.querySelectorAll("[data-config-href]").forEach((link) => {
    const key = link.dataset.configHref;
    if (config[key]) link.href = config[key];
  });
  if (config.name) {
    document.title = currentPage === "home" ? `${config.name} | ${config.location || "Dubai"}` : `${document.title.split("|")[0].trim()} | ${config.name}`;
    const description = document.querySelector('meta[name="description"]');
    if (description && config.description) description.content = config.description;
  }

  const header = document.querySelector("[data-header]");
  const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 28);
  updateHeader();
  window.addEventListener("scroll", updateHeader, {passive: true});

  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".site-navigation");
  const closeMenu = () => {
    menuToggle?.setAttribute("aria-expanded", "false");
    navigation?.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  };
  menuToggle?.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(open));
    navigation?.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  });
  navigation?.querySelectorAll("a,button").forEach((item) => item.addEventListener("click", closeMenu));

  const revealElements = [...document.querySelectorAll("[data-reveal]")];
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {threshold: .14, rootMargin: "0px 0px -7%"});
    revealElements.forEach((element) => revealObserver.observe(element));
  }

  const heroMedia = document.querySelector("[data-parallax]");
  if (heroMedia && !reducedMotion && !coarsePointer) {
    let ticking = false;
    const updateParallax = () => {
      const movement = Math.min(window.scrollY * .075, 58);
      heroMedia.style.transform = `translate3d(0,${movement}px,0) scale(1.04)`;
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) requestAnimationFrame(updateParallax);
      ticking = true;
    }, {passive: true});
  }

  if (!reducedMotion && !coarsePointer) {
    document.querySelectorAll(".magnetic").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * .08;
        const y = (event.clientY - rect.top - rect.height / 2) * .12;
        element.style.transform = `translate3d(${x}px,${y}px,0)`;
      });
      element.addEventListener("pointerleave", () => { element.style.transform = ""; });
    });
  }

  const enquiryDialog = document.querySelector("[data-enquire-dialog]");
  const openEnquiry = () => {
    if (!enquiryDialog) return;
    enquiryDialog.showModal();
    document.body.classList.add("dialog-open");
  };
  const closeEnquiry = () => {
    enquiryDialog?.close();
    document.body.classList.remove("dialog-open");
  };
  document.querySelectorAll("[data-open-enquire]").forEach((button) => button.addEventListener("click", openEnquiry));
  document.querySelector("[data-close-enquire]")?.addEventListener("click", closeEnquiry);
  enquiryDialog?.addEventListener("click", (event) => { if (event.target === enquiryDialog) closeEnquiry(); });
  enquiryDialog?.addEventListener("close", () => document.body.classList.remove("dialog-open"));

  const enquiryForm = document.querySelector("[data-enquire-form]");
  enquiryForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = enquiryForm.querySelector(".form-status");
    const submit = enquiryForm.querySelector('[type="submit"]');
    if (status) status.textContent = "Sending your request…";
    submit?.setAttribute("disabled", "");
    try {
      const response = await fetch(enquiryForm.action, {method: "POST", body: new FormData(enquiryForm)});
      if (!response.ok) throw new Error("Request could not be sent");
      enquiryForm.reset();
      if (status) status.textContent = "Thank you. The project team will contact you shortly.";
    } catch {
      if (status) status.textContent = "Your details are ready. Please connect with the project team to complete the enquiry.";
    } finally {
      submit?.removeAttribute("disabled");
    }
  });

  const lightbox = document.querySelector("[data-lightbox-dialog]");
  const lightboxImage = document.querySelector("[data-lightbox-image]");
  document.querySelectorAll("[data-lightbox]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!lightbox || !lightboxImage) return;
      lightboxImage.src = button.dataset.lightbox;
      lightboxImage.alt = button.querySelector("img")?.alt || "Expanded property view";
      lightbox.showModal();
    });
  });
  document.querySelector("[data-lightbox-close]")?.addEventListener("click", () => lightbox?.close());
  lightbox?.addEventListener("click", (event) => { if (event.target === lightbox) lightbox.close(); });

  const residenceData = {
    one: {title: "One Bedroom", copy: "A calm, light-filled home for effortless waterfront living, with an open kitchen and a private balcony.", image: "media/images/dubai/06-interior-living-dining-golden-hour.png", area: "82 m²", rooms: "1", outlook: "Canal"},
    two: {title: "Two Bedroom", copy: "Generous living spaces and two serene suites create a balanced residence for daily life and entertaining.", image: "media/images/dubai/07-interior-primary-suite-dawn.png", area: "134 m²", rooms: "2", outlook: "Waterfront"},
    three: {title: "Three Bedroom", copy: "An expansive corner residence with private arrival, panoramic glazing and a dedicated dining salon.", image: "media/images/dubai/12-luxury-private-dining-evening.png", area: "218 m²", rooms: "3", outlook: "Panoramic"}
  };
  const residenceSelector = document.querySelector("[data-residence-selector]");
  residenceSelector?.querySelectorAll("[data-residence]").forEach((button) => button.addEventListener("click", () => {
    const item = residenceData[button.dataset.residence];
    if (!item) return;
    residenceSelector.classList.add("is-changing");
    residenceSelector.querySelectorAll("[data-residence]").forEach((tab) => tab.classList.toggle("is-active", tab === button));
    window.setTimeout(() => {
      residenceSelector.querySelector("[data-residence-title]").textContent = item.title;
      residenceSelector.querySelector("[data-residence-copy]").textContent = item.copy;
      residenceSelector.querySelector("[data-residence-image]").src = item.image;
      residenceSelector.querySelector("[data-spec-area]").textContent = item.area;
      residenceSelector.querySelector("[data-spec-rooms]").textContent = item.rooms;
      residenceSelector.querySelector("[data-spec-view]").textContent = item.outlook;
      residenceSelector.classList.remove("is-changing");
    }, 220);
  }));

  const amenityData = {
    pool: {title: "Infinity Pool", copy: "A horizon-edge pool framed by palms, private cabanas and uninterrupted sunset views.", image: "media/images/dubai/03-amenity-infinity-pool-sunset.png"},
    spa: {title: "Wellness Spa", copy: "Warm stone, restorative water rituals and quiet treatment spaces flow between indoors and landscape.", image: "media/images/dubai/10-wellness-spa-indoor-outdoor.png"},
    lounge: {title: "Sky Lounge", copy: "An intimate residents-only salon above the city, designed for effortless evening gatherings.", image: "media/images/dubai/04-amenity-sky-lounge-blue-hour.png"}
  };
  const amenitySwitcher = document.querySelector("[data-amenity-switcher]");
  amenitySwitcher?.querySelectorAll("[data-amenity]").forEach((button) => button.addEventListener("click", () => {
    const item = amenityData[button.dataset.amenity];
    if (!item) return;
    amenitySwitcher.classList.add("is-changing");
    amenitySwitcher.querySelectorAll("[data-amenity]").forEach((tab) => tab.classList.toggle("is-active", tab === button));
    window.setTimeout(() => {
      amenitySwitcher.querySelector("[data-amenity-title]").textContent = item.title;
      amenitySwitcher.querySelector("[data-amenity-copy]").textContent = item.copy;
      amenitySwitcher.querySelector("[data-amenity-image]").src = item.image;
      amenitySwitcher.classList.remove("is-changing");
    }, 220);
  }));
  document.querySelectorAll(".time-tabs [data-amenity]").forEach((button) => button.addEventListener("click", () => {
    amenitySwitcher?.querySelector(`[data-amenity="${button.dataset.amenity}"]`)?.click();
    document.querySelectorAll(".time-tabs [data-amenity]").forEach((tab) => tab.classList.toggle("is-active", tab === button));
    amenitySwitcher?.scrollIntoView({behavior: reducedMotion ? "auto" : "smooth", block: "center"});
  }));

  document.querySelectorAll("[data-gallery-filter]").forEach((button) => button.addEventListener("click", () => {
    const filter = button.dataset.galleryFilter;
    document.querySelectorAll("[data-gallery-filter]").forEach((tab) => tab.classList.toggle("is-active", tab === button));
    document.querySelectorAll("[data-gallery-category]").forEach((card) => card.classList.toggle("is-hidden", filter !== "all" && card.dataset.galleryCategory !== filter));
  }));

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(() => {}), {once: true});
  }
})();

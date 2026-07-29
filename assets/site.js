const toggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-primary-nav]");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

const walkthroughs = document.querySelectorAll("[data-walkthrough]");
const walkthroughControllers = [];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

for (const walkthrough of walkthroughs) {
  const steps = [...walkthrough.querySelectorAll("[data-step]")];
  const scenes = [...walkthrough.querySelectorAll("[data-scene]")];
  if (!steps.length || !scenes.length) continue;

  const progress = document.createElement("div");
  progress.className = "walkthrough-progress";
  progress.setAttribute("role", "tablist");
  progress.setAttribute("aria-label", "Walkthrough steps");
  progress.style.setProperty("--step-count", steps.length);
  walkthrough.querySelector(".walkthrough-stage")?.after(progress);

  const buttons = steps.map((step, index) => {
    const key = step.dataset.step;
    const button = document.createElement("button");
    const panelId = `${walkthrough.closest("section")?.id || "walkthrough"}-${key}-step`;
    const sceneId = `${walkthrough.closest("section")?.id || "walkthrough"}-${key}-scene`;

    step.id = panelId;
    step.setAttribute("role", "tabpanel");
    step.setAttribute("aria-labelledby", `${panelId}-tab`);
    scenes.find((scene) => scene.dataset.scene === key)?.setAttribute("id", sceneId);

    button.type = "button";
    button.id = `${panelId}-tab`;
    button.dataset.number = String(index + 1);
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", `${panelId} ${sceneId}`);
    button.setAttribute("aria-label", `Step ${index + 1}: ${step.querySelector("h3")?.textContent || ""}`);
    progress.append(button);
    return button;
  });

  let activeIndex = 0;
  const activate = (index, moveFocus = false) => {
    const step = steps[index];
    if (!step) return;
    activeIndex = index;
    const key = step.dataset.step;

    for (const step of steps) {
      step.classList.toggle("is-active", step.dataset.step === key);
    }
    for (const scene of scenes) {
      scene.classList.toggle("is-active", scene.dataset.scene === key);
    }
    for (const [buttonIndex, button] of buttons.entries()) {
      const active = buttonIndex === index;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    }
    if (moveFocus) buttons[index].focus();
  };

  const stepRail = walkthrough.querySelector(".walkthrough-steps");
  let scrollTargetIndex = null;
  const scrollToStep = (index, behavior = "smooth") => {
    scrollTargetIndex = index;
    activate(index);
    stepRail?.scrollTo({ left: steps[index].offsetLeft, behavior });
  };
  let scrollFrame;
  stepRail?.addEventListener(
    "scroll",
    () => {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        if (scrollTargetIndex !== null) {
          const distance = Math.abs(steps[scrollTargetIndex].offsetLeft - stepRail.scrollLeft);
          if (distance < 3) scrollTargetIndex = null;
          return;
        }
        const closest = steps.reduce(
          (best, step, index) => {
            const distance = Math.abs(step.offsetLeft - stepRail.scrollLeft);
            return distance < best.distance ? { index, distance } : best;
          },
          { index: 0, distance: Number.POSITIVE_INFINITY },
        );
        activate(closest.index);
      });
    },
    { passive: true },
  );

  for (const [index, button] of buttons.entries()) {
    button.addEventListener("click", () => {
      scrollToStep(index);
    });
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let next = activeIndex;
      if (event.key === "ArrowLeft") next = Math.max(0, activeIndex - 1);
      if (event.key === "ArrowRight") next = Math.min(steps.length - 1, activeIndex + 1);
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = steps.length - 1;
      scrollToStep(next);
      buttons[next].focus();
    });
  }

  activate(0);
  walkthroughControllers.push({
    element: walkthrough,
    canMove(direction) {
      return direction > 0 ? activeIndex < steps.length - 1 : activeIndex > 0;
    },
    move(direction) {
      scrollToStep(Math.max(0, Math.min(steps.length - 1, activeIndex + direction)));
    },
    captureDistance(direction) {
      const rect = walkthrough.getBoundingClientRect();
      const top = Number.parseFloat(getComputedStyle(walkthrough).top);
      if (Math.abs(rect.top - top) < 8) return 0;
      if (direction > 0 && rect.top > top) return rect.top - top;
      if (direction < 0 && rect.top < top) return top - rect.top;
      return Number.POSITIVE_INFINITY;
    },
    pin() {
      const rect = walkthrough.getBoundingClientRect();
      const top = Number.parseFloat(getComputedStyle(walkthrough).top);
      if (Math.abs(rect.top - top) < 2) return;
      window.scrollTo({ top: window.scrollY + rect.top - top, behavior: "instant" });
    },
    isPinned() {
      const rect = walkthrough.getBoundingClientRect();
      const top = Number.parseFloat(getComputedStyle(walkthrough).top);
      return Math.abs(rect.top - top) < 8 && rect.bottom > top + 100;
    },
  });
}

let wheelAccumulator = 0;
let wheelCooldownUntil = 0;

window.addEventListener(
  "wheel",
  (event) => {
    if (reducedMotion.matches) return;
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (Math.abs(delta) < 1) return;
    const direction = delta > 0 ? 1 : -1;
    const controller = walkthroughControllers
      .filter((item) => item.canMove(direction))
      .map((item) => ({ item, distance: item.captureDistance(direction) }))
      .filter(({ distance }) => distance <= Math.abs(delta) + 48)
      .sort((a, b) => a.distance - b.distance)[0]?.item;

    if (!controller) {
      wheelAccumulator = 0;
      return;
    }

    event.preventDefault();
    if (Date.now() < wheelCooldownUntil) return;
    wheelAccumulator += delta;
    if (Math.abs(wheelAccumulator) < 28) return;

    controller.pin();
    controller.move(direction);
    wheelAccumulator = 0;
    wheelCooldownUntil = Date.now() + 460;
  },
  { passive: false },
);

for (const controller of walkthroughControllers) {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchDirection = 0;
  let touchCaptured = false;

  controller.element.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches[0];
      if (!touch || reducedMotion.matches || !controller.isPinned()) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchDirection = 0;
      touchCaptured = false;
    },
    { passive: true },
  );

  controller.element.addEventListener(
    "touchmove",
    (event) => {
      const touch = event.touches[0];
      if (!touch || !controller.isPinned()) return;
      const deltaX = touchStartX - touch.clientX;
      const deltaY = touchStartY - touch.clientY;
      const delta = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;
      if (Math.abs(delta) < 8) return;
      touchDirection = delta > 0 ? 1 : -1;
      if (!controller.canMove(touchDirection)) return;
      event.preventDefault();
      touchCaptured = true;
    },
    { passive: false },
  );

  controller.element.addEventListener("touchend", () => {
    if (touchCaptured && touchDirection) controller.move(touchDirection);
    touchCaptured = false;
    touchDirection = 0;
  });
}

/* eslint-env browser */

(() => {
  const TARGET_FORM_SELECTOR = "form[data-netlify='true']";

  const forms = Array.from(document.querySelectorAll(TARGET_FORM_SELECTOR));
  if (!forms.length) return;

  function validateForm(form) {
    if (form.id !== "trial-form") return true;
    const usageBoxes = form.querySelectorAll("input[name='usage']");
    const hasUsage = Array.from(usageBoxes).some((box) => box.checked);
    if (hasUsage) return true;

    const firstUsage = usageBoxes[0];
    if (firstUsage) {
      firstUsage.setCustomValidity("Choose at least one usage option.");
      form.reportValidity();
      firstUsage.setCustomValidity("");
    }
    return false;
  }

  async function submitToNetlify(form) {
    // Send the submission to Netlify Forms (your real lead capture).
    // Netlify records any POST to "/" that includes the hidden form-name field,
    // which these forms already have.
    const body = new URLSearchParams(new FormData(form)).toString();

    const response = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      throw new Error("Netlify post failed: " + response.status);
    }
  }

  forms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      if (form.dataset.submitting === "true") {
        event.preventDefault();
        return;
      }

      event.preventDefault();

      if (!validateForm(form)) {
        return;
      }

      form.dataset.submitting = "true";

      const submitButton = form.querySelector("button[type='submit'], input[type='submit']");
      const isInputSubmit = submitButton && submitButton.tagName === "INPUT";
      const originalLabel = submitButton
        ? isInputSubmit
          ? submitButton.value
          : submitButton.textContent
        : "";

      if (submitButton) {
        submitButton.disabled = true;
        if (isInputSubmit) {
          submitButton.value = "Sending...";
        } else {
          submitButton.textContent = "Sending...";
        }
      }

      try {
        await submitToNetlify(form);
        const done = document.createElement("div");
        done.className = "form-success";
        done.setAttribute("role", "status");
        done.style.cssText = "padding:1.5rem 0;text-align:center;font-family:var(--sans,inherit);";
        done.innerHTML = "<p style='margin:0;font-size:1.05rem;line-height:1.6;'>Thanks &mdash; we&rsquo;ve received your message and will reply within one business day.</p>";
        form.replaceWith(done);
      } catch (error) {
        console.error("Netlify AJAX failed, falling back to native submit:", error);
        form.submit();
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          if (isInputSubmit) {
            submitButton.value = originalLabel;
          } else {
            submitButton.textContent = originalLabel;
          }
        }
        form.dataset.submitting = "false";
      }
    });
  });
})();

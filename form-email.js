/* eslint-env browser */

(() => {
  const EMAIL_ENDPOINT = "https://formsubmit.co/ajax/support@hrcompliancecompass.com";
  const TARGET_FORM_SELECTOR = "form[data-email-support='true']";
  const THANKS_PAGE = "thanks.html";
  const SENDING_LABEL = "Sending...";
  const FORWARD_TIMEOUT_MS = 12000;

  const forms = Array.from(document.querySelectorAll(TARGET_FORM_SELECTOR));
  if (!forms.length) {
    return;
  }

  async function forwardToSupport(form) {
    const formData = new FormData(form);
    const formName = (form.getAttribute("name") || "submission").trim();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS);

    formData.set("_subject", `HRCC form submission: ${formName}`);
    formData.set("_template", "table");
    formData.set("_captcha", "false");

    const response = await fetch(EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
      signal: controller.signal,
    }).finally(() => {
      window.clearTimeout(timeoutId);
    });

    if (!response.ok) {
      throw new Error(`Email forward failed: ${response.status}`);
    }
  }

  forms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      if (form.dataset.submitting === "true") {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      form.dataset.submitting = "true";

      const submitButton = form.querySelector("button[type='submit'], input[type='submit']");
      const originalLabel = submitButton ? submitButton.textContent : "";

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = SENDING_LABEL;
      }

      try {
        await forwardToSupport(form);
        window.location.href = THANKS_PAGE;
      } catch (error) {
        console.error(error);
        form.submit();
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalLabel;
        }
        form.dataset.submitting = "false";
      }
    });
  });
})();

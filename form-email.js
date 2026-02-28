/* eslint-env browser */

(() => {
  const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxg-MyKPVdNQnMiV6hzGheP7q-TZmYHT6-sq21Ma-idDDm03wv6ECPqBatT2sj-XohV2A/exec";
  const THANKS_PAGE = "thanks.html";
  const TARGET_FORM_SELECTOR = "form[data-netlify='true']";

  const forms = Array.from(document.querySelectorAll(TARGET_FORM_SELECTOR));
  if (!forms.length) return;

  async function sendToSheet(form) {
    const formData = new FormData(form);
    const data = { formName: form.getAttribute("name") || "contact" };

    formData.forEach((value, key) => {
      if (key === "bot-field") return;
      if (data[key]) {
        // handle multiple checkboxes with same name
        data[key] = data[key] + ", " + value;
      } else {
        data[key] = value;
      }
    });

    const response = await fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Sheet post failed: " + response.status);
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
        submitButton.textContent = "Sending...";
      }

      try {
        await sendToSheet(form);
        window.location.href = THANKS_PAGE;
      } catch (error) {
        console.error("Sheet error, falling back to native submit:", error);
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

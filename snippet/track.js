(function () {
  try {
    var endpoint = "https://analytics.example.invalid/e";
    var params = new URLSearchParams(location.search);
    var referrer = "";
    try {
      referrer = document.referrer ? new URL(document.referrer).hostname : "";
    } catch (err) {}
    var body = JSON.stringify({
      path: location.pathname + location.search + location.hash,
      referrer: referrer,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign")
    });
    var sent = false;
    if (typeof navigator.sendBeacon === "function") {
      sent = navigator.sendBeacon(endpoint, new Blob([body], { type: "text/plain" }));
    }
    if (!sent) {
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: body,
        keepalive: true
      }).then(function () {}, function () {});
    }
  } catch (err) {}
})();

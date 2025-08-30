const API_BASE = "https://script.google.com/macros/s/AKfycb.../exec";

async function sendRequest(data) {
  const res = await fetch(API_BASE, {
    method: "POST",
    mode: "no-cors",   // 👈 disables CORS blocking, but response.body will be empty
    body: JSON.stringify(data)
  });
}

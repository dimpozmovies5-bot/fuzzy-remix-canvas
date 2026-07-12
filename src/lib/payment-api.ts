const API_BASE = "https://relworx-api.arthurdimpoz.workers.dev/api";

export async function requestPayment(msisdn: string, amount: number, description: string) {
  const res = await fetch(`${API_BASE}/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msisdn, amount, description }),
  });
  return res.json();
}

export async function sendPayment(msisdn: string, amount: number, description: string) {
  const res = await fetch(`${API_BASE}/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msisdn, amount, description }),
  });
  return res.json();
}

export async function checkRequestStatus(internalReference: string) {
  const res = await fetch(`${API_BASE}/request-status?internal_reference=${internalReference}`);
  return res.json();
}

export async function getWalletBalance() {
  const res = await fetch(`${API_BASE}/wallet/balance`);
  return res.json();
}

export async function getTransactions() {
  const res = await fetch(`${API_BASE}/transactions`);
  return res.json();
}

export async function validatePhone(msisdn: string) {
  const res = await fetch(`${API_BASE}/validate-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msisdn }),
  });
  return res.json();
}

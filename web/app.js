const NETWORK = "Test SDF Network ; September 2015";
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const FRIEND_BOT = "https://friendbot.stellar.org?addr=";
const STORAGE_KEY = "emergency-fund-trigger.records.v1";

const els = {
  form: document.querySelector("#authorizationForm"),
  walletStatus: document.querySelector("#walletStatus"),
  connectWallet: document.querySelector("#connectWallet"),
  senderPublic: document.querySelector("#senderPublic"),
  recipientPublic: document.querySelector("#recipientPublic"),
  amount: document.querySelector("#amount"),
  asset: document.querySelector("#asset"),
  expiryHours: document.querySelector("#expiryHours"),
  reason: document.querySelector("#reason"),
  fundSender: document.querySelector("#fundSender"),
  records: document.querySelector("#records"),
  clearRecords: document.querySelector("#clearRecords"),
  toast: document.querySelector("#toast"),
  activeCount: document.querySelector("#activeCount"),
  totalAuthorized: document.querySelector("#totalAuthorized"),
  paidCount: document.querySelector("#paidCount"),
  amountPreview: document.querySelector("#amountPreview"),
  expiryPreview: document.querySelector("#expiryPreview"),
  filters: document.querySelectorAll("[data-filter]"),
  quickAmounts: document.querySelectorAll("[data-amount]"),
};

let walletAddress = "";
let records = loadRecords();
let freighterModule = null;
let stellarModule = null;
let horizonServer = null;
let activeFilter = "all";

renderRecords();
updatePreview();
updateMetrics();

els.connectWallet.addEventListener("click", connectWallet);
els.fundSender.addEventListener("click", fundSender);
els.clearRecords.addEventListener("click", () => {
  records = [];
  saveRecords();
  renderRecords();
  updateMetrics();
  toast("Local emergency records cleared.");
});

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createAuthorization();
});

[els.amount, els.expiryHours].forEach((input) => {
  input.addEventListener("input", updatePreview);
  input.addEventListener("change", updatePreview);
});

els.quickAmounts.forEach((button) => {
  button.addEventListener("click", () => {
    els.amount.value = button.dataset.amount;
    els.quickAmounts.forEach((item) => item.classList.toggle("is-selected", item === button));
    updatePreview();
  });
});

els.filters.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    els.filters.forEach((item) => item.classList.toggle("is-active", item === button));
    renderRecords();
  });
});

async function getFreighter() {
  if (freighterModule) return freighterModule;
  if (window.freighterApi) {
    freighterModule = window.freighterApi;
    return freighterModule;
  }
  try {
    freighterModule = await import("https://esm.sh/@stellar/freighter-api@6.3.1?bundle");
    return freighterModule;
  } catch (error) {
    throw new Error("Freighter API could not load. Check your browser network connection.");
  }
}

async function getStellar() {
  if (stellarModule && horizonServer) {
    return { StellarSdk: stellarModule, server: horizonServer };
  }
  if (window.StellarSdk) {
    stellarModule = window.StellarSdk;
    horizonServer = new stellarModule.Horizon.Server(HORIZON_URL);
    return { StellarSdk: stellarModule, server: horizonServer };
  }

  try {
    stellarModule = await import("https://esm.sh/@stellar/stellar-sdk@15.0.0?bundle");
    horizonServer = new stellarModule.Horizon.Server(HORIZON_URL);
    return { StellarSdk: stellarModule, server: horizonServer };
  } catch (error) {
    throw new Error("Stellar SDK could not load. Check your browser network connection.");
  }
}

async function connectWallet() {
  setBusy(els.connectWallet, true, "Connecting");
  try {
    const freighter = await getFreighter();
    const availability = await freighter.isConnected();
    const isAvailable = typeof availability === "boolean" ? availability : availability.isConnected;
    if (!isAvailable) {
      throw new Error("Freighter is not detected or not unlocked.");
    }

    const access = await freighter.requestAccess();
    if (access?.error) {
      throw new Error(readableFreighterError(access.error));
    }
    const addressResult = await freighter.getAddress();
    if (addressResult?.error) {
      throw new Error(readableFreighterError(addressResult.error));
    }
    walletAddress = addressResult?.address || access?.address || access;
    if (!isPublicKey(walletAddress)) {
      throw new Error("Freighter did not return a valid Stellar public key.");
    }
    els.senderPublic.value = walletAddress;
    els.walletStatus.textContent = shortKey(walletAddress);
    els.walletStatus.className = "status-dot status-ready";
    toast("Freighter connected on Stellar testnet.");
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.connectWallet, false, "Connect Freighter");
  }
}

async function fundSender() {
  const publicKey = els.senderPublic.value.trim();
  if (!isPublicKey(publicKey)) {
    toast("Enter a valid sender public key first.");
    return;
  }

  setBusy(els.fundSender, true, "Funding");
  try {
    const response = await fetch(`${FRIEND_BOT}${encodeURIComponent(publicKey)}`);
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Friendbot funding failed.");
    }
    toast("Sender funded on testnet.");
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.fundSender, false, "Fund sender testnet");
  }
}

async function createAuthorization() {
  const sender = els.senderPublic.value.trim();
  const recipient = els.recipientPublic.value.trim();
  const amount = normalizeAmount(els.amount.value);
  const expiryHours = Number.parseInt(els.expiryHours.value, 10);
  const reason = els.reason.value.trim() || "Family emergency";

  if (!isPublicKey(sender) || !isPublicKey(recipient)) {
    toast("Sender and recipient must be valid Stellar public keys.");
    return;
  }
  if (!amount) {
    toast("Enter a valid amount.");
    return;
  }

  setBusy(document.querySelector("#createAuthorization"), true, "Building");
  try {
    const { StellarSdk, server } = await getStellar();
    const account = await server.loadAccount(sender);
    const expiresAt = Math.floor(Date.now() / 1000) + expiryHours * 60 * 60;
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK,
      timebounds: {
        minTime: "0",
        maxTime: String(expiresAt),
      },
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: recipient,
          asset: StellarSdk.Asset.native(),
          amount,
        }),
      )
      .addMemo(StellarSdk.Memo.text(reason.slice(0, 28)))
      .build();

    const signedXdr = await signWithFreighter(transaction, sender);
    const hash = transaction.hash().toString("hex");

    records.unshift({
      id: crypto.randomUUID(),
      status: "ready",
      sender,
      recipient,
      amount,
      asset: "XLM",
      reason,
      expiresAt,
      createdAt: Math.floor(Date.now() / 1000),
      hash,
      signedXdr,
      resultHash: "",
      error: "",
    });

    saveRecords();
    renderRecords();
    updateMetrics();
    toast("Emergency authorization signed and stored locally.");
  } catch (error) {
    showError(error);
  } finally {
    setBusy(document.querySelector("#createAuthorization"), false, "Sign authorization");
  }
}

async function signWithFreighter(transaction, signer) {
  const freighter = await getFreighter();
  const signed = await freighter.signTransaction(transaction.toXDR(), {
    networkPassphrase: NETWORK,
    address: signer,
  });
  if (signed?.error) {
    throw new Error(readableFreighterError(signed.error));
  }
  return signed.signedTxXdr || signed;
}

async function triggerAuthorization(id) {
  const record = records.find((item) => item.id === id);
  if (!record) return;

  if (Date.now() / 1000 > record.expiresAt) {
    record.status = "expired";
    record.error = "This authorization has expired.";
    saveRecords();
    renderRecords();
    updateMetrics();
    return;
  }

  const button = document.querySelector(`[data-trigger="${id}"]`);
  setBusy(button, true, "Submitting");
  try {
    const { StellarSdk, server } = await getStellar();
    const tx = StellarSdk.TransactionBuilder.fromXDR(record.signedXdr, NETWORK);
    const result = await server.submitTransaction(tx);
    record.status = "paid";
    record.resultHash = result.hash;
    record.error = "";
    saveRecords();
    updateMetrics();
    toast("Emergency payout submitted to Stellar testnet.");
  } catch (error) {
    record.status = "error";
    record.error = readableStellarError(error);
    saveRecords();
    updateMetrics();
    showError(error);
  } finally {
    renderRecords();
    setBusy(button, false, "Trigger payout");
  }
}

function renderRecords() {
  const visibleRecords = records.filter((record) => {
    const status = getRecordStatus(record);
    return activeFilter === "all" || status === activeFilter;
  });

  if (!records.length) {
    els.records.innerHTML = `<div class="empty">No emergency authorizations yet. Create one from the sender setup panel.</div>`;
    return;
  }
  if (!visibleRecords.length) {
    els.records.innerHTML = `<div class="empty">No ${activeFilter} authorizations found.</div>`;
    return;
  }

  els.records.innerHTML = visibleRecords
    .map((record) => {
      const status = getRecordStatus(record);
      const explorer = record.resultHash
        ? `<a href="https://stellar.expert/explorer/testnet/tx/${record.resultHash}" target="_blank" rel="noreferrer">View transaction</a>`
        : "";

      return `
        <article class="record status-${status}">
          <div class="record-head">
            <div class="record-title">
              <h3>${escapeHtml(record.reason)}</h3>
              <p>${record.amount} ${record.asset} emergency payout</p>
            </div>
            <span class="status-dot status-${status}">${labelStatus(status)}</span>
          </div>
          <div class="meta">
            <span>Sender</span><span class="mono">${record.sender}</span>
            <span>Recipient</span><span class="mono">${record.recipient}</span>
            <span>Expires</span><span>${formatTime(record.expiresAt)}</span>
            <span>Tx hash</span><span class="mono">${record.hash}</span>
            ${record.error ? `<span>Error</span><span>${escapeHtml(record.error)}</span>` : ""}
            ${explorer ? `<span>Explorer</span><span>${explorer}</span>` : ""}
          </div>
          <div class="record-actions">
            <button data-trigger="${record.id}" type="button" ${status !== "ready" ? "disabled" : ""}>Trigger payout</button>
            <button data-copy="${record.id}" class="secondary" type="button">Copy signed XDR</button>
          </div>
        </article>
      `;
    })
    .join("");

  els.records.querySelectorAll("[data-trigger]").forEach((button) => {
    button.addEventListener("click", () => triggerAuthorization(button.dataset.trigger));
  });

  els.records.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const record = records.find((item) => item.id === button.dataset.copy);
      if (!record) return;
      await navigator.clipboard.writeText(record.signedXdr);
      toast("Signed XDR copied.");
    });
  });
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function updatePreview() {
  const amount = normalizeAmount(els.amount.value) || "0";
  const selected = els.expiryHours.options[els.expiryHours.selectedIndex];
  els.amountPreview.textContent = `${amount} ${els.asset.value}`;
  els.expiryPreview.textContent = selected ? selected.textContent : "24 hours";
  els.quickAmounts.forEach((button) => {
    button.classList.toggle("is-selected", Number(button.dataset.amount) === Number(els.amount.value));
  });
}

function updateMetrics() {
  const now = Date.now() / 1000;
  const ready = records.filter((record) => getRecordStatus(record, now) === "ready");
  const paid = records.filter((record) => getRecordStatus(record, now) === "paid");
  const total = ready.reduce((sum, record) => sum + Number.parseFloat(record.amount || "0"), 0);
  els.activeCount.textContent = String(ready.length);
  els.totalAuthorized.textContent = `${formatAmount(total)} XLM`;
  els.paidCount.textContent = String(paid.length);
}

function getRecordStatus(record, now = Date.now() / 1000) {
  if (record.status === "ready" && now > record.expiresAt) return "expired";
  return record.status;
}

function setBusy(button, busy, label) {
  if (!button) return;
  button.disabled = busy;
  button.textContent = label;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 3200);
}

function showError(error) {
  toast(readableStellarError(error));
}

function readableStellarError(error) {
  const extras = error?.response?.data?.extras?.result_codes;
  if (extras) {
    return `Stellar rejected the transaction: ${JSON.stringify(extras)}`;
  }
  return error?.message || "Something went wrong.";
}

function readableFreighterError(error) {
  if (typeof error === "string") return error;
  return error?.message || "Freighter rejected the request.";
}

function isPublicKey(value) {
  return /^G[A-Z2-7]{55}$/.test(value);
}

function normalizeAmount(value) {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number) || number <= 0) return "";
  return number.toFixed(7).replace(/0+$/, "").replace(/\.$/, "");
}

function shortKey(key) {
  return `${key.slice(0, 6)}...${key.slice(-6)}`;
}

function formatTime(epochSeconds) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(epochSeconds * 1000));
}

function formatAmount(value) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 7,
  }).format(value);
}

function labelStatus(status) {
  return {
    ready: "Ready",
    paid: "Paid",
    expired: "Expired",
    error: "Error",
  }[status] || status;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const itemsBody = $("itemsBody");
  const printArea = $("printArea");
  let rowCounter = 0;
  let toastTimer;

  const money = (value) => "Rs. " + (Number.isFinite(value) ? value : 0).toLocaleString("en-PK", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const getInvoiceNumber = () => {
    const now = new Date();
    return "SB-" + String(now.getFullYear()).slice(-2) + String(now.getMonth()+1).padStart(2,"0") + String(now.getDate()).padStart(2,"0") + "-" + Math.floor(1000 + Math.random()*9000);
  };
  $("invoiceNumber").textContent = getInvoiceNumber();
  $("invoiceDate").textContent = new Date().toLocaleDateString("en-PK", {day:"2-digit",month:"short",year:"numeric"});
  $("year").textContent = new Date().getFullYear();

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function addRow(name = "", quantity = "1", price = "") {
    rowCounter++;
    const row = document.createElement("tr");
    row.dataset.rowId = String(rowCounter);
    row.innerHTML = `
      <td><input class="item-input item-name" type="text" maxlength="100" placeholder="Enter product name" aria-label="Product name"></td>
      <td><input class="item-input qty-input" type="number" min="0" step="any" inputmode="decimal" value="${quantity}" aria-label="Quantity"></td>
      <td><input class="item-input price-input" type="number" min="0" step="any" inputmode="decimal" placeholder="0.00" aria-label="Unit price"></td>
      <td class="line-total">${money(0)}</td>
      <td><button class="remove-btn" type="button" aria-label="Remove item" title="Remove item">×</button></td>`;
    row.querySelector(".item-name").value = name;
    row.querySelector(".price-input").value = price;
    itemsBody.appendChild(row);
    $("emptyHint").hidden = true;
    updateTotals();
    row.querySelector(".item-name").focus();
  }

  function getRows() {
    return [...itemsBody.querySelectorAll("tr")].map((row) => {
      const name = row.querySelector(".item-name").value.trim();
      const quantity = Math.max(0, Number(row.querySelector(".qty-input").value) || 0);
      const price = Math.max(0, Number(row.querySelector(".price-input").value) || 0);
      return {name, quantity, price, total: quantity * price};
    });
  }

  function validItems() {
    return getRows().filter(item => item.name && item.quantity > 0 && item.price >= 0);
  }

  function updateTotals() {
    let totalQuantity = 0;
    let total = 0;
    let count = 0;
    [...itemsBody.querySelectorAll("tr")].forEach(row => {
      const qty = Math.max(0, Number(row.querySelector(".qty-input").value) || 0);
      const price = Math.max(0, Number(row.querySelector(".price-input").value) || 0);
      const line = qty * price;
      row.querySelector(".line-total").textContent = money(line);
      if (row.querySelector(".item-name").value.trim()) count++;
      totalQuantity += qty;
      total += line;
    });
    $("totalItems").textContent = count;
    $("totalQuantity").textContent = totalQuantity.toLocaleString("en-PK", {maximumFractionDigits:3});
    $("grandTotal").textContent = money(total);
    $("emptyHint").hidden = itemsBody.children.length > 0;
  }

  function collectBill() {
    const rows = getRows();
    const products = rows.filter(item => item.name && item.quantity > 0);
    if (!products.length) {
      showToast("Please add at least one product with a name and quantity.");
      return null;
    }
    const subtotal = products.reduce((sum, item) => sum + item.total, 0);
    return {
      shop: $("shopName").value.trim(),
      customer: $("customerName").value.trim(),
      phone: $("shopPhone").value.trim(),
      invoice: $("invoiceNumber").textContent,
      date: $("invoiceDate").textContent,
      products,
      subtotal,
      totalQuantity: products.reduce((sum, item) => sum + item.quantity, 0),
      total: subtotal
    };
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }

  function buildBillHTML(bill, mode = "a4") {
    const receiptClass = mode === "receipt" ? " receipt-mode" : "";
    const shopName = bill.shop ? escapeHTML(bill.shop) : "Your Shop";
    const rows = bill.products.map(item => `
      <tr><td>${escapeHTML(item.name)}</td><td>${item.quantity.toLocaleString("en-PK",{maximumFractionDigits:3})}</td><td>${money(item.price)}</td><td>${money(item.total)}</td></tr>`).join("");
    return `<div class="bill-document${receiptClass}">
      <div class="bill-doc-head"><div><div class="bill-doc-brand">${shopName}</div><div class="bill-doc-sub">${bill.phone ? "Phone: " + escapeHTML(bill.phone) : "Sales receipt / invoice"}</div></div>
      <div class="bill-doc-meta"><strong>${mode === "receipt" ? "RECEIPT" : "INVOICE"}</strong><br>Invoice: ${escapeHTML(bill.invoice)}<br>Date: ${escapeHTML(bill.date)}</div></div>
      <div class="bill-doc-customer"><div><strong>Bill to</strong>${bill.customer ? escapeHTML(bill.customer) : "Walk-in customer"}</div><div><strong>Items</strong>${bill.products.length} product line(s)</div></div>
      <table class="bill-doc-table"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="bill-doc-total"><div><span>Subtotal</span><strong>${money(bill.subtotal)}</strong></div><div class="grand"><span>Grand Total</span><strong>${money(bill.total)}</strong></div></div>
      <div class="bill-doc-thanks">Thank you for your business!</div></div>`;
  }

  function openPreview() {
    const bill = collectBill();
    if (!bill) return;
    $("previewPaper").innerHTML = buildBillHTML(bill, "a4");
    $("previewModal").classList.add("open");
    $("previewModal").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closePreview() {
    $("previewModal").classList.remove("open");
    $("previewModal").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  function printBill(mode) {
    const bill = collectBill();
    if (!bill) return;
    printArea.innerHTML = buildBillHTML(bill, mode);
    document.body.classList.toggle("printing-receipt", mode === "receipt");
    window.print();
  }
  function copyBill() {
    const bill = collectBill();
    if (!bill) return;
    const lines = [
      bill.shop || "Your Shop",
      bill.phone ? "Phone: " + bill.phone : "",
      "Invoice: " + bill.invoice,
      "Date: " + bill.date,
      bill.customer ? "Customer: " + bill.customer : "",
      "--------------------------------",
      "Product | Qty | Price | Total",
      ...bill.products.map(item => `${item.name} | ${item.quantity} | ${money(item.price)} | ${money(item.total)}`),
      "--------------------------------",
      "Grand Total: " + money(bill.total),
      "Thank you for your business!"
    ].filter(Boolean).join("\n");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(lines).then(() => showToast("Bill details copied to clipboard.")).catch(() => fallbackCopy(lines));
    } else fallbackCopy(lines);
  }
  function fallbackCopy(text) {
    const area = document.createElement("textarea");
    area.value = text; area.style.position = "fixed"; area.style.opacity = "0";
    document.body.appendChild(area); area.select();
    try { document.execCommand("copy"); showToast("Bill details copied to clipboard."); }
    catch { showToast("Copy is not available in this browser."); }
    area.remove();
  }
  function clearAll() {
    if (!confirm("Clear all bill details and product rows?")) return;
    $("shopName").value = "";
    $("customerName").value = "";
    $("shopPhone").value = "";
    itemsBody.innerHTML = "";
    $("invoiceNumber").textContent = getInvoiceNumber();
    $("invoiceDate").textContent = new Date().toLocaleDateString("en-PK", {day:"2-digit",month:"short",year:"numeric"});
    updateTotals();
    showToast("The bill has been cleared.");
  }

  $("addItemBtn").addEventListener("click", () => addRow());
  itemsBody.addEventListener("input", updateTotals);
  itemsBody.addEventListener("click", event => {
    const button = event.target.closest(".remove-btn");
    if (!button) return;
    button.closest("tr").remove();
    updateTotals();
  });
  $("previewBtn").addEventListener("click", openPreview);
  $("receiptBtn").addEventListener("click", () => printBill("receipt"));
  $("invoiceBtn").addEventListener("click", () => printBill("a4"));
  $("copyBtn").addEventListener("click", copyBill);
  $("pdfBtn").addEventListener("click", () => printBill("a4"));
  $("clearBtn").addEventListener("click", clearAll);
  $("closePreview").addEventListener("click", closePreview);
  $("previewModal").addEventListener("click", event => { if (event.target === $("previewModal")) closePreview(); });
  $("previewReceipt").addEventListener("click", () => printBill("receipt"));
  $("previewA4").addEventListener("click", () => printBill("a4"));
  document.addEventListener("keydown", event => { if (event.key === "Escape") closePreview(); });
  $("menuToggle").addEventListener("click", () => {
    const open = $("navLinks").classList.toggle("open");
    $("menuToggle").setAttribute("aria-expanded", String(open));
  });
  $("navLinks").addEventListener("click", event => {
    if (event.target.closest("a")) {
      $("navLinks").classList.remove("open");
      $("menuToggle").setAttribute("aria-expanded", "false");
    }
  });
  window.addEventListener("afterprint", () => document.body.classList.remove("printing-receipt"));
  updateTotals();
})();

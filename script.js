// 실제 관리자 전송을 사용할 경우 서버 또는 Google Apps Script 배포 주소를 입력하세요.
const ORDER_ENDPOINT = 
"https://script.google.com/macros/s/AKfycbyG4z7tqqetII2WP6CGUYawQq5DduMo_yH-RbidwmYjFOGEHemg8ArR8D3P6iHBauHoyw/exec";
const ACCOUNT_NUMBER = "3561368790623";

const menuItems = [
  { id:"tteok", name:"떡꼬치", description:"쫀득쫀득, 매콤한 떡꼬치", price:3000, image:"assets/ttek.png", quantity:0 },
  { id:"ssg", name:"소세지꼬치", description:"육즙 가득한 소세지꼬치", price:4000, image:"assets/ssg.png", quantity:0 },
  { id:"chick", name:"닭꼬치", description:"노릇노릇 맛있게 구운 닭꼬치", price:5000, image:"assets/chick.png", quantity:0 },
  { id:"ade", name:"에이드", description:"시원하고 상큼한 에이드", price:3000, image:"assets/ade.png", quantity:0 },
  { id:"set a", name:"세트A", description:"꼬치 3종 + 에이드", price:13000, image:"assets/sset.png", quantity:0 },
  { id:"set b", name:"세트B", description:"닭꼬치+에이드", price:7000, image:"assets/setb.png", quantity:0 }
];

const menuScreen = document.querySelector("#menu-screen");
const successScreen = document.querySelector("#success-screen");
const orderSheet = document.querySelector("#order-sheet");
const menuList = document.querySelector("#menu-list");
const totalPrice = document.querySelector("#total-price");
const reviewItems = document.querySelector("#review-items");
const reviewTotal = document.querySelector("#review-total");
const customerForm = document.querySelector("#customer-form");
const formError = document.querySelector("#form-error");
const submitButton = document.querySelector("#submit-order-button");
const toast = document.querySelector("#toast");
const numberFormat = new Intl.NumberFormat("ko-KR");

function selectedItems() { return menuItems.filter((item) => item.quantity > 0); }
function totalAmount() { return selectedItems().reduce((sum,item) => sum + item.price * item.quantity, 0); }
function totalCount() { return selectedItems().reduce((sum,item) => sum + item.quantity, 0); }

function renderMenu() {
  menuList.innerHTML = menuItems.map((item) => `
    <article class="menu-card">
      <div class="menu-main">
        <img class="food-image" src="${item.image}" alt="${item.name}" />
        <div class="menu-info">
          <h2>${item.name}</h2>
          <p>${item.description}</p>
          <strong><small>₩</small> ${numberFormat.format(item.price)}</strong>
        </div>
      </div>
      <div class="stepper" aria-label="${item.name} 수량 조절">
        <button type="button" data-action="decrease" data-id="${item.id}" aria-label="${item.name} 수량 줄이기"></button>
        <span class="quantity ${item.quantity === 0 ? "is-zero" : ""}">${item.quantity}</span>
        <button type="button" data-action="increase" data-id="${item.id}" aria-label="${item.name} 수량 늘리기"></button>
      </div>
    </article>
  `).join("");
}

function renderOrder() {
  const total = totalAmount();
  totalPrice.textContent = numberFormat.format(total);
  reviewTotal.textContent = numberFormat.format(total);
  reviewItems.innerHTML = selectedItems().map((item) => `
    <div class="receipt-item">
      <div><span>${item.name}</span><small>× ${item.quantity}개</small></div>
      <strong>₩ ${numberFormat.format(item.price * item.quantity)}</strong>
    </div>
  `).join("");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1600);
}

function openOrderSheet() { renderOrder(); orderSheet.hidden = false; }
function closeOrderSheet() { orderSheet.hidden = true; formError.textContent = ""; }
function showMenu() { successScreen.hidden = true; menuScreen.hidden = false; }
function showSuccess() { closeOrderSheet(); menuScreen.hidden = true; successScreen.hidden = false; }

function formatPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0,11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
}

function makeOrderNumber() {
  const now = new Date();
  const month = String(now.getMonth()+1).padStart(2,"0");
  const day = String(now.getDate()).padStart(2,"0");
  return `#MIS-${month}${day}-01`;
}

function saveLocally(order) {
  const orders = JSON.parse(localStorage.getItem("mis_orders") || "[]");
  orders.push(order);
  localStorage.setItem("mis_orders", JSON.stringify(orders));
}

async function sendOrder(order) {
  if (!ORDER_ENDPOINT) {
    saveLocally(order);
    return;
  }

  await fetch(ORDER_ENDPOINT, {
    method: "POST",
    body: new URLSearchParams({
      payload: JSON.stringify(order),
    }),
  });
}

menuList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const item = menuItems.find((entry) => entry.id === button.dataset.id);
  if (!item) return;
  if (button.dataset.action === "increase") item.quantity += 1;
  if (button.dataset.action === "decrease" && item.quantity > 0) item.quantity -= 1;
  renderMenu(); renderOrder();
});

document.querySelector("#order-button").addEventListener("click", () => {
  if (totalCount() === 0) { showToast("메뉴를 먼저 선택해주세요."); return; }
  openOrderSheet();
});

document.querySelector("#sheet-close-button").addEventListener("click", closeOrderSheet);
document.querySelector("#sheet-backdrop").addEventListener("click", closeOrderSheet);
document.querySelector("#add-more-button").addEventListener("click", closeOrderSheet);
document.querySelector("#customer-phone").addEventListener("input", (event) => { event.target.value = formatPhone(event.target.value); });

customerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.querySelector("#customer-name").value.trim();
  const phone = document.querySelector("#customer-phone").value.trim();
  const request = document.querySelector("#customer-request").value.trim();
  const phoneDigits = phone.replace(/\D/g, "");

  if (!name) { formError.textContent = "주문자 성함을 입력해주세요."; document.querySelector("#customer-name").focus(); return; }
  if (!/^01\d{8,9}$/.test(phoneDigits)) { formError.textContent = "연락처를 정확히 입력해주세요."; document.querySelector("#customer-phone").focus(); return; }

  const order = {
    orderNumber:makeOrderNumber(),
    createdAt:new Date().toISOString(),
    customer:{ name, phone, request },
    items:selectedItems().map(({id,name:itemName,price,quantity}) => ({id,name:itemName,price,quantity})),
    total:totalAmount(),
  };

  submitButton.disabled = true;
  try {
    await sendOrder(order);
    document.querySelector("#order-number").textContent = order.orderNumber;
    document.querySelector("#success-total").textContent = numberFormat.format(order.total);
    document.querySelector("#success-phone").textContent = phone;
    showSuccess();
  } catch {
    formError.textContent = "주문을 전송하지 못했습니다. 다시 시도해주세요.";
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector("#copy-account-button").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(ACCOUNT_NUMBER); showToast("계좌 번호를 복사했습니다."); }
  catch { showToast(ACCOUNT_NUMBER); }
});

document.querySelector("#new-order-button").addEventListener("click", () => {
  menuItems.forEach((item,index) => { item.quantity = index === 0 ? 1 : 0; });
  customerForm.reset(); renderMenu(); renderOrder(); showMenu();
});

document.querySelector("#review-again-button").addEventListener("click", () => { showMenu(); openOrderSheet(); });

renderMenu();
renderOrder();
showMenu();

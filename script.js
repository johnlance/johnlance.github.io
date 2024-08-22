// Store cards in local storage
let cards = JSON.parse(localStorage.getItem('cards')) || [];

// DOM elements
const addCardForm = document.getElementById('add-card-form');
const cardList = document.getElementById('card-list');
const alertList = document.getElementById('alert-list');
const lastUpdateSpan = document.querySelector('#last-update span');
const nextUpdateSpan = document.querySelector('#next-update span');
const updateIntervalInput = document.getElementById('update-interval');
const setIntervalBtn = document.getElementById('set-interval');
const loadingOverlay = document.getElementById('loading-overlay');

let updateInterval = 60 * 60 * 1000; // Default: 60 minutes
let nextUpdateTime;

// Add card form submission
addCardForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const cardName = document.getElementById('card-name').value;
    const userEnteredPrice = document.getElementById('current-price').value;
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    const targetIncrease = document.getElementById('target-increase').value;

    showLoading();
    try {
        const cardData = await fetchCardData(cardName);
        if (cardData) {
            const initialPrice = userEnteredPrice !== "" ? parseFloat(userEnteredPrice) : cardData.current_price;
            addCard(cardName, initialPrice, targetIncrease, cardData.current_price, cardData.image_uri, quantity);
            addCardForm.reset();
            updateCardList();
        } else {
            alert('Card not found or price information unavailable.');
        }
    } catch (error) {
        console.error('Error adding card:', error);
        alert('An error occurred while adding the card. Please try again.');
    } finally {
        hideLoading();
    }
});

// Fetch card data from Scryfall API
async function fetchCardData(cardName) {
    try {
        const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`);
        const data = await response.json();
        if (data.object === 'card') {
            return {
                current_price: parseFloat(data.prices.usd) || 0,
                image_uri: data.image_uris ? data.image_uris.small : (data.card_faces && data.card_faces[0].image_uris ? data.card_faces[0].image_uris.small : null)
            };
        } else {
            console.log('Card information not available for:', cardName);
            return null;
        }
    } catch (error) {
        console.error('Error fetching card data:', error);
        return null;
    }
}

// Add a new card
function addCard(name, purchasePrice, targetIncrease, currentPrice, imageUri, quantity) {
    const finalName = name; // The name is already the selected or typed value

    const card = {
        id: Date.now(),
        name: finalName,
        purchasePrice: purchasePrice,
        currentPrice: currentPrice,
        targetIncrease: targetIncrease !== "" ? parseFloat(targetIncrease) : null,
        imageUri: imageUri,
        quantity: quantity,
        lastAlertPrice: null
    };
    cards.push(card);
    saveCards();
}

// Save cards to local storage
function saveCards() {
    localStorage.setItem('cards', JSON.stringify(cards));
}

// Helper function to safely format prices
function formatPrice(price) {
    return (price !== undefined && price !== null) ? `$${parseFloat(price).toFixed(2)}` : 'N/A';
}

// Helper function to calculate and format price change
function formatPriceChange(currentPrice, purchasePrice) {
    if (currentPrice === null || purchasePrice === null) return 'N/A';
    const change = currentPrice - purchasePrice;
    const percentage = ((change / purchasePrice) * 100).toFixed(2);
    const sign = change >= 0 ? '+' : '';
    return `${sign}${formatPrice(change)} (${sign}${percentage}%)`;
}
// Update the card list display
function updateCardList() {
    cardList.innerHTML = '';
    cards.forEach(card => {
        const row = document.createElement('tr');
        const totalValue = card.currentPrice * card.quantity;
        row.innerHTML = `
            <td data-label="Card Image"><img src="${card.imageUri || 'https://via.placeholder.com/146x204.png?text=No+Image'}" alt="${card.name}" onerror="this.onerror=null; this.src='https://via.placeholder.com/146x204.png?text=Error+Loading+Image';"></td>
            <td data-label="Card Name">${card.name}</td>
            <td data-label="Purchase Price">${formatPrice(card.purchasePrice)}</td>
            <td data-label="Current Price">${formatPrice(card.currentPrice)}</td>
            <td data-label="Quantity">${card.quantity}</td>
            <td data-label="Total Value">${formatPrice(totalValue)}</td>
            <td data-label="Price Change">${formatPriceChange(card.currentPrice, card.purchasePrice)}</td>
            <td data-label="Target Increase">${card.targetIncrease !== null ? card.targetIncrease + '%' : 'N/A'}</td>
            <td data-label="Actions"><button onclick="removeCard(${card.id})">Remove</button></td>
        `;
        cardList.appendChild(row);
    });
}

// Remove a card
function removeCard(id) {
    const card = cards.find(card => card.id === id);
    if (confirm(`Are you sure you want to remove ${card.name} from your tracked cards?`)) {
        cards = cards.filter(card => card.id !== id);
        saveCards();
        updateCardList();
    }
}

// Update prices
async function updatePrices() {
    showLoading();
    for (let card of cards) {
        const cardData = await fetchCardData(card.name);
        if (cardData) {
            const oldPrice = card.currentPrice;
            card.currentPrice = cardData.current_price;
            // Check if price increase meets or exceeds target (if set)
            if (card.targetIncrease !== null) {
                const targetPrice = card.purchasePrice * (1 + card.targetIncrease / 100);
                if (card.currentPrice >= targetPrice && card.currentPrice !== card.lastAlertPrice) {
                    createAlert(card);
                    card.lastAlertPrice = card.currentPrice;
                }
            }
        }
    }
    saveCards();
    updateCardList();
    updateLastUpdateTime();
    scheduleNextUpdate();
    hideLoading();
}

// Create a price alert
function createAlert(card) {
    const alertDiv = document.createElement('div');
    alertDiv.classList.add('alert', 'new');
    
    const timestamp = new Date().toLocaleString();
    
    alertDiv.innerHTML = `
        <div>${card.name} has reached ${formatPrice(card.currentPrice)}, meeting or exceeding the target increase of ${card.targetIncrease}%</div>
        <div class="alert-timestamp">${timestamp}</div>
    `;
    
    alertList.insertBefore(alertDiv, alertList.firstChild);
    
    // Remove 'new' class and add 'viewed' class after 5 minutes
    setTimeout(() => {
        alertDiv.classList.remove('new');
        alertDiv.classList.add('viewed');
    }, 5 * 60 * 1000);
}

// Update the last update time
function updateLastUpdateTime() {
    const now = new Date();
    lastUpdateSpan.textContent = now.toLocaleTimeString();
}

// Schedule the next update
function scheduleNextUpdate() {
    clearTimeout(window.updateTimeout);
    nextUpdateTime = new Date(Date.now() + updateInterval);
    updateNextUpdateTime();
    window.updateTimeout = setTimeout(updatePrices, updateInterval);
}

// Update the next update time display
function updateNextUpdateTime() {
    nextUpdateSpan.textContent = nextUpdateTime.toLocaleTimeString();
}

// Update the countdown timer
function updateCountdown() {
    const now = new Date();
    const timeLeft = nextUpdateTime - now;
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    nextUpdateSpan.textContent = `${minutes}m ${seconds}s`;
}

// Show loading overlay
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Set update interval
setIntervalBtn.addEventListener('click', function() {
    const newInterval = parseInt(updateIntervalInput.value);
    if (newInterval && newInterval > 0) {
        updateInterval = newInterval * 60 * 1000;
        scheduleNextUpdate();
        alert(`Update interval set to ${newInterval} minutes.`);
    } else {
        alert('Please enter a valid number of minutes.');
    }
});

const cardNameInput = document.getElementById('card-name');
let awesomplete;

document.addEventListener('DOMContentLoaded', () => {
    awesomplete = new Awesomplete(cardNameInput, {
        minChars: 4,
        maxItems: 10,
        autoFirst: true
    });

    cardNameInput.addEventListener('input', debounce(updateSuggestions, 300));
});

async function updateSuggestions() {
    const input = cardNameInput.value;
    if (input.length < 4) {
        awesomplete.list = [];
        return;
    }

    try {
        const response = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(input)}`);
        const data = await response.json();
        
        awesomplete.list = data.data;
    } catch (error) {
        console.error('Error fetching card suggestions:', error);
    }
}

// Debounce function to limit API calls
function debounce(func, delay) {
    let debounceTimer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    }
}

// Initial setup
updateCardList();
updateLastUpdateTime();
scheduleNextUpdate();
setInterval(updateCountdown, 1000);


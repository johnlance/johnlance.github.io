// Store cards in local storage
let cards = JSON.parse(localStorage.getItem('cards')) || [];

// DOM elements
const addCardForm = document.getElementById('add-card-form');
const cardList = document.getElementById('card-list').querySelector('tbody');
const alertList = document.getElementById('alert-list');
const testAlertBtn = document.getElementById('test-alert-btn');

// Add card form submission
addCardForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const cardName = document.getElementById('card-name').value;
    const userEnteredPrice = document.getElementById('current-price').value;
    const targetIncrease = document.getElementById('target-increase').value;

    try {
        const cardData = await fetchCardData(cardName);
        if (cardData) {
            const initialPrice = userEnteredPrice !== "" ? parseFloat(userEnteredPrice) : cardData.current_price;
            addCard(cardName, initialPrice, targetIncrease, cardData.current_price);
            addCardForm.reset();
            updateCardList();
        } else {
            alert('Card not found or price information unavailable.');
        }
    } catch (error) {
        console.error('Error adding card:', error);
        alert('An error occurred while adding the card. Please try again.');
    }
});

// Fetch card data from Scryfall API
async function fetchCardData(cardName) {
    try {
        const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`);
        const data = await response.json();
        if (data.object === 'card' && data.prices && data.prices.usd) {
            return {
                current_price: parseFloat(data.prices.usd) || 0
            };
        } else {
            console.log('Price information not available for:', cardName);
            return null;
        }
    } catch (error) {
        console.error('Error fetching card data:', error);
        return null;
    }
}

// Add a new card
function addCard(name, purchasePrice, targetIncrease, currentPrice) {
    const card = {
        id: Date.now(),
        name: name,
        purchasePrice: purchasePrice,
        currentPrice: currentPrice,
        targetIncrease: targetIncrease !== "" ? parseFloat(targetIncrease) : null
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
        row.innerHTML = `
            <td>${card.name}</td>
            <td>${formatPrice(card.purchasePrice)}</td>
            <td>${formatPrice(card.currentPrice)}</td>
            <td>${formatPriceChange(card.currentPrice, card.purchasePrice)}</td>
            <td>${card.targetIncrease !== null ? card.targetIncrease + '%' : 'N/A'}</td>
            <td><button onclick="removeCard(${card.id})">Remove</button></td>
        `;
        cardList.appendChild(row);
    });
}

// Remove a card
function removeCard(id) {
    cards = cards.filter(card => card.id !== id);
    saveCards();
    updateCardList();
}

// Update prices (run every 60 minutes)
async function updatePrices() {
    for (let card of cards) {
        const cardData = await fetchCardData(card.name);
        if (cardData) {
            card.currentPrice = cardData.current_price;
            // Check if price increase meets or exceeds target (if set)
            if (card.targetIncrease !== null && card.currentPrice >= card.purchasePrice * (1 + card.targetIncrease / 100)) {
                createAlert(card);
            }
        }
    }
    saveCards();
    updateCardList();
}

// Create a price alert
function createAlert(card) {
    const alert = document.createElement('div');
    alert.textContent = `Alert: ${card.name} has reached ${formatPrice(card.currentPrice)}, meeting or exceeding the target increase of ${card.targetIncrease}%`;
    alertList.appendChild(alert);
}

// Test alert functionality
testAlertBtn.addEventListener('click', function() {
    const testCard = {
        name: "Test Card",
        currentPrice: 15.00,
        targetIncrease: 10
    };
    createAlert(testCard);
});

// Initial setup
updateCardList();
setInterval(updatePrices, 3600000); // Update prices every 60 minutes

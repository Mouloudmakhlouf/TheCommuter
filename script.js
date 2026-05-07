document.addEventListener("DOMContentLoaded", () => {
  loadHistory();
  const today = new Date();
  const currentMonth = today.toISOString().substring(0, 7);
  document.getElementById('monthSelector').value = currentMonth;
});

async function calculateSplit() {
  const startCity = document.getElementById('startCity').value;
  const endCity = document.getElementById('endCity').value;

  if (startCity === endCity) {
    alert("Start and Destination cannot be the same.");
    return;
  }

  const calcBtn = document.querySelector('.primary-btn');
  calcBtn.innerText = "⏳ Analyzing All Routes...";
  calcBtn.disabled = true;

  try {
    const response = await fetch('/.netlify/functions/getTolls', {
      method: 'POST',
      body: JSON.stringify({ startCity, endCity })
    });
    
    if (!response.ok) throw new Error("API failed");
    
    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      alert("No routes found. Check console.");
      return;
    }

    // Get User Inputs
    const isRoundTrip = document.getElementById('roundTrip').checked;
    const conditionMultiplier = parseFloat(document.getElementById('conditions').value);
    const baseConsumption = parseFloat(document.getElementById('consumption').value);
    const price = parseFloat(document.getElementById('price').value);
    const people = parseInt(document.getElementById('people').value);

    // Grab the results container and clear the old HTML
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<h3 style="border-bottom: 2px solid #bbf7d0; padding-bottom: 5px; margin-top:0;">📍 Route Comparisons</h3>`;

    // Loop through EVERY route TollGuru found
    data.routes.forEach((route, index) => {
      let distance = parseFloat(route.summary.distance.metric); 
      let tolls = 0;
      if (route.summary.tolls && route.summary.tolls.cashCost) {
          tolls = parseFloat(route.summary.tolls.cashCost);
      }

      // Fallback name if TollGuru doesn't provide one
      let routeName = route.summary.name || `Alternative Route ${index + 1}`;

      // Apply Multipliers
      let finalDistance = isRoundTrip ? distance * 2 : distance;
      let finalTolls = isRoundTrip ? tolls * 2 : tolls;
      const actualConsumption = baseConsumption * conditionMultiplier;

      // The Math
      const fuelNeeded = (finalDistance / 100) * actualConsumption;
      const fuelCost = fuelNeeded * price;
      const totalCost = fuelCost + finalTolls;
      const costPerPerson = totalCost / people;

      // Build a visual card for this specific route
      const routeCard = document.createElement('div');
      routeCard.style.border = "1px solid #166534";
      routeCard.style.padding = "10px";
      routeCard.style.marginBottom = "10px";
      routeCard.style.borderRadius = "6px";
      routeCard.style.backgroundColor = "white";

      routeCard.innerHTML = `
        <h4 style="margin: 0 0 5px 0; color: #166534;">🛣️ ${routeName}</h4>
        <p style="margin: 2px 0; font-size: 14px;"><b>Distance:</b> ${finalDistance.toFixed(1)} km | <b>Tolls:</b> ${finalTolls.toFixed(2)} PLN</p>
        <p style="margin: 2px 0; font-size: 14px;"><b>Total Trip Cost:</b> ${totalCost.toFixed(2)} PLN</p>
        <p class="highlight" style="margin: 5px 0 0 0;">Owed Per Person: ${costPerPerson.toFixed(2)} PLN</p>
      `;

      resultsDiv.appendChild(routeCard);

      // Only save the fastest route (the first one) to the monthly history tracker
      if (index === 0) {
        const displayDate = new Date().toLocaleDateString();
        const monthString = new Date().toISOString().substring(0, 7); 
        saveTrip(displayDate, monthString, `${startCity} to ${endCity} (${routeName})`, finalDistance.toFixed(1), totalCost);
      }
    });

    resultsDiv.classList.remove('hidden');

  } catch (error) {
    alert("Error fetching live route data.");
    console.error(error);
  } finally {
    calcBtn.innerText = "Calculate Options";
    calcBtn.disabled = false;
  }
}

function saveTrip(displayDate, monthString, routeName, dist, total) {
  const trip = { date: displayDate, monthKey: monthString, route: routeName, distance: dist, total: total.toFixed(2) };
  let history = JSON.parse(localStorage.getItem('uniCommuteData')) || [];
  history.unshift(trip);
  localStorage.setItem('uniCommuteData', JSON.stringify(history));
  loadHistory();
}

function loadHistory() {
  const historyList = document.getElementById('historyList');
  historyList.innerHTML = ''; 
  const history = JSON.parse(localStorage.getItem('uniCommuteData')) || [];
  const recentTrips = history.slice(0, 5);
  recentTrips.forEach(trip => {
    const li = document.createElement('li');
    li.innerText = `${trip.date} | ${trip.route} | ${trip.total} PLN`;
    historyList.appendChild(li);
  });
}

function calculateMonthly() {
  const selectedMonth = document.getElementById('monthSelector').value;
  if(!selectedMonth) return;
  const history = JSON.parse(localStorage.getItem('uniCommuteData')) || [];
  let monthlyTotal = 0;
  history.forEach(trip => { if (trip.monthKey === selectedMonth) monthlyTotal += parseFloat(trip.total); });
  const resultEl = document.getElementById('monthlyResult');
  resultEl.innerHTML = `Total spent in <b>${selectedMonth}</b>: <span class="highlight">${monthlyTotal.toFixed(2)} PLN</span>`;
  resultEl.classList.remove('hidden');
}

function clearHistory() {
  if(confirm("Are you sure you want to delete all trip history?")) {
    localStorage.removeItem('uniCommuteData');
    loadHistory();
    document.getElementById('monthlyResult').classList.add('hidden');
  }
}

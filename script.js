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
  calcBtn.innerText = "⏳ Routing with TollGuru...";
  calcBtn.disabled = true;

  try {
    // Call our Netlify backend
    const response = await fetch('/.netlify/functions/getTolls', {
      method: 'POST',
      body: JSON.stringify({ startCity, endCity })
    });
    
    if (!response.ok) throw new Error("API failed");
    
    const data = await response.json();
    console.log("TOLLGURU RESPONSE:", data); // <-- shows us the secret error

    if (!data.routes) {
         alert("TollGuru API failed. Check the console for details.");
         // Reset button so you aren't stuck loading
         document.querySelector('.primary-btn').innerText = "Calculate & Save Trip";
         document.querySelector('.primary-btn').disabled = false;
         return; 
    }

    const route = data.routes[0];
    
    let distance = parseFloat(route.summary.distance.metric); 
    let tolls = 0;

    if (route.summary.tolls && route.summary.tolls.cashCost) {
        tolls = parseFloat(route.summary.tolls.cashCost);
    }

    const isRoundTrip = document.getElementById('roundTrip').checked;
    const conditionMultiplier = parseFloat(document.getElementById('conditions').value);
    const baseConsumption = parseFloat(document.getElementById('consumption').value);
    const price = parseFloat(document.getElementById('price').value);
    const people = parseInt(document.getElementById('people').value);

    if (isRoundTrip) {
      distance *= 2;
      tolls *= 2;
    }
    const actualConsumption = baseConsumption * conditionMultiplier;

    const fuelNeeded = (distance / 100) * actualConsumption;
    const fuelCost = fuelNeeded * price;
    const totalCost = fuelCost + tolls;
    const costPerPerson = totalCost / people;

    document.getElementById('resDistance').innerText = distance.toFixed(1);
    document.getElementById('resTolls').innerText = tolls.toFixed(2);
    document.getElementById('totalCost').innerText = totalCost.toFixed(2);
    document.getElementById('perPersonCost').innerText = costPerPerson.toFixed(2);
    
    document.getElementById('results').classList.remove('hidden');

    const displayDate = new Date().toLocaleDateString();
    const monthString = new Date().toISOString().substring(0, 7); 
    saveTrip(displayDate, monthString, `${startCity} to ${endCity}`, distance.toFixed(1), totalCost);

  } catch (error) {
    alert("Error fetching live route data. Please check your API configuration.");
    console.error(error);
  } finally {
    calcBtn.innerText = "Calculate & Save Trip";
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

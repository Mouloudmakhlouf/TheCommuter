exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { startCity, endCity } = JSON.parse(event.body);
  const apiKey = process.env.TOLLGURU_API_KEY; 

  const url = 'https://apis.tollguru.com/toll/v2/origin-destination-waypoints';

  const payload = {
    from: { address: startCity + ", Poland" },
    to: { address: endCity + ", Poland" },
    vehicleType: "2AxlesAuto",
    serviceProvider: "gmaps",
    currency: "PLN"
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error("API Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to communicate with TollGuru' }) };
  }
};
const http = require('http');

const testApi = async () => {
    // wait a moment for the server
    await new Promise(r => setTimeout(r, 1000));

    // We'll just verify the response for /api/tables/demo/bill is correct
    // (mock DB might not be set up in seed, but we can see if it returns JSON or 500)
    http.get('http://localhost:3000/api/tables/demo/bill', (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
            console.log("Status:", res.statusCode);
            console.log("Response:", data);
        });
    }).on('error', (err) => {
        console.error("Error:", err.message);
    });
}
testApi();

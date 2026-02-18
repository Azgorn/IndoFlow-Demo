require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path'); // NEW: Required for file paths

const app = express();
app.use(cors());
app.use(express.json());

// --- NEW: SERVE STATIC FILES ---
// This tells Node to serve index.html, style.css, etc. from the current folder
app.use(express.static(__dirname));

const AUTH_URL = "https://sandbox.auth.boschrexroth.com/auth/realms/dc5/protocol/openid-connect/token";
const BASE_URL = "https://induflow-demo.boschrexroth.com/api/v1";
const PORT = process.env.PORT || 3000; // Updated to support Render's port

// --- TOKEN MANAGER ---
let cachedToken = null;
let tokenExpiration = 0;

async function getToken() {
    if (cachedToken && Date.now() < tokenExpiration - 30000) return cachedToken;
    
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.REXROTH_CLIENT_ID);
    params.append('client_secret', process.env.REXROTH_CLIENT_SECRET);
    
    try {
        const res = await axios.post(AUTH_URL, params);
        cachedToken = res.data.access_token;
        tokenExpiration = Date.now() + (res.data.expires_in * 1000);
        return cachedToken;
    } catch (err) {
        throw new Error("Auth Failed");
    }
}

// --- API ENDPOINTS ---

// 1. Catalog
app.get('/api/catalog', async (req, res) => {
    const page = req.query.page || 1;
    const size = req.query.size || 9;
    try {
        const token = await getToken();
        const response = await axios.get(`${BASE_URL}/product`, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { PageNumber: page, PageSize: size }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to load catalog" });
    }
});

// 2. Search
app.get('/api/search', async (req, res) => {
    const userInput = req.query.number;
    if (!userInput) return res.status(400).json({ error: "Missing number" });

    try {
        const token = await getToken();
        const response = await axios.post(
            `${BASE_URL}/product/query`, 
            { "Number": userInput, "MachineType": null }, 
            { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }}
        );
        const data = Array.isArray(response.data) ? response.data : [response.data];
        res.json(data);
    } catch (error) {
        if (error.response?.status === 404) return res.status(404).json({ error: "Product not found" });
        res.status(500).json({ error: "Search failed" });
    }
});

// 3. Image Proxy
app.get('/api/image/:id', async (req, res) => {
    try {
        const token = await getToken();
        const response = await axios.get(`${BASE_URL}/resource/download/${req.params.id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            responseType: 'arraybuffer'
        });
        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (error) {
        res.status(404).send("Image not found");
    }
});

// --- NEW: CATCH-ALL ROUTE ---
// If the user goes to "your-site.com/", send them index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

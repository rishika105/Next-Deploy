const express = require('express')
const httpProxy = require('http-proxy')
require("dotenv").config();


const app = express();
const PORT = process.env.PORT || 8000;

app.use((req, res) => {
    const hostName = req.hostname;
    const subdomain = hostname.split('.')[0];

    const resolvesTo = 
})

app.listen(PORT, () => console.log(`Reverse proxy running...${PORT}`))
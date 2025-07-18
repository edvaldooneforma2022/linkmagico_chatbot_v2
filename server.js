/**
 * LinkMágico Chatbot v3.0 - Servidor Backend
 * Extração de dados profissional via API de Web Scraping (Browserless.io)
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;
const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

if (!BROWSERLESS_API_KEY) {
    console.error("FATAL ERROR: BROWSERLESS_API_KEY não está definida no .env");
    process.exit(1);
}

async function extractDataWithApi(targetUrl) {
    console.log(`[API Extractor] Iniciando extração para: ${targetUrl}`);
    const apiEndpoint = `https://chrome.browserless.io/content?token=${BROWSERLESS_API_KEY}`;

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: targetUrl,
                waitFor: 2500, // Espera 2.5 segundos para a página carregar completamente
            } ),
        });

        if (!response.ok) {
            throw new Error(`A API de scraping falhou com status: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const title = $('title').first().text().trim() || $('h1').first().text().trim();
        const priceMatch = $.text().match(/R\$\s?(\d{1,3}(\.\d{3})*,\d{2})/);
        const price = priceMatch ? priceMatch[0] : 'Consulte o preço na página';

        console.log(`[API Extractor] Extração concluída para: ${title}`);
        return { title, price };

    } catch (error) {
        console.error(`[API Extractor] Erro: ${error.message}`);
        return { error: true, message: error.message };
    }
}

app.post('/api/extract', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL é obrigatória" });

    const data = await extractDataWithApi(url);
    if (data.error) {
        return res.status(500).json({ error: `Falha ao extrair dados: ${data.message}` });
    }
    res.json(data);
});

app.post('/api/chat', (req, res) => {
    const { message, productData } = req.body;
    if (!message || !productData) return res.status(400).json({ error: "Dados insuficientes" });

    let response = `Sobre o produto "${productData.title}", não encontrei essa informação.`;
    if (message.toLowerCase().includes('preço') || message.toLowerCase().includes('valor')) {
        response = `O preço do produto "${productData.title}" é ${productData.price}.`;
    }
    res.json({ response });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor v3.0 (API Profissional) iniciado na porta ${PORT}`);
});

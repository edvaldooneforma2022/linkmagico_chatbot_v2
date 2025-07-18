/**
 * LinkMágico Chatbot v2.2 - Servidor Backend
 * Extração de dados da página final com Puppeteer (Configuração Profissional para Produção)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const puppeteer = require('puppeteer'); // Usando a biblioteca principal
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Logger (mantido)
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console({ format: winston.format.simple() })],
});

// Middlewares (mantidos)
app.use(cors());
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.static(path.join(__dirname)));

// Cache (mantido)
const productCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000;

/**
 * Função de extração de dados com Puppeteer, configurada para produção.
 * Lida com iframes e carregamento dinâmico.
 */
async function extractDataWithPuppeteer(url) {
    logger.info(`[Puppeteer] Iniciando extração para: ${url}`);
    let browser = null;
    try {
        // Configurações de inicialização para ambientes de produção como Render/Heroku
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
        });

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Aguarda um pouco para garantir que scripts e iframes carreguem
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Tenta encontrar um iframe e extrair dados de dentro dele
        const frame = page.frames().find(f => f.url().includes('app-vsl.com') || f.name() === 'iframe-vendas');
        const context = frame || page;

        const data = await context.evaluate(() => {
            const getText = (selector) => document.querySelector(selector)?.innerText.trim();
            const getPrice = () => {
                const priceRegex = /R\$\s?(\d{1,3}(\.\d{3})*,\d{2})/;
                const priceElement = document.querySelector('.price, .preco, .valor');
                if (priceElement) return priceElement.innerText;
                const match = document.body.innerText.match(priceRegex);
                return match ? match[0] : 'Consulte o preço';
            };
            
            return {
                title: getText('h1') || document.title,
                price: getPrice(),
                description: getText('p') || 'Descrição não disponível.',
            };
        });

        logger.info(`[Puppeteer] Extração concluída para: ${data.title}`);
        return data;

    } catch (error) {
        logger.error(`[Puppeteer] Erro na extração: ${error.message}`);
        return { error: true, message: error.message };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Rota da API para extração
app.post('/api/extract', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL é obrigatória" });

    if (productCache.has(url)) {
        logger.info(`[Cache] Retornando dados para: ${url}`);
        return res.json(productCache.get(url));
    }

    const data = await extractDataWithPuppeteer(url);
    if (data.error) {
        return res.status(500).json({ error: `Falha ao extrair dados: ${data.message}` });
    }

    productCache.set(url, data);
    res.json(data);
});

// Rota do Chat
app.post('/api/chat', async (req, res) => {
    const { message, productUrl } = req.body;
    if (!message || !productUrl) return res.status(400).json({ error: "Mensagem e URL são obrigatórias" });

    let productData = productCache.get(productUrl);
    if (!productData) {
        productData = await extractDataWithPuppeteer(productUrl);
        if (!productData.error) productCache.set(productUrl, productData);
    }

    if (productData.error) {
        return res.json({ response: `Desculpe, estou com problemas para acessar os detalhes do produto. Por favor, verifique a URL.` });
    }

    let response = `Sobre o "${productData.title}": ${productData.description}`;
    if (message.toLowerCase().includes('preço') || message.toLowerCase().includes('valor')) {
        response = `O preço do produto "${productData.title}" é ${productData.price}.`;
    }

    res.json({ response });
});

// Rota principal que serve o painel
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    logger.info(`🚀 Servidor v2.2 (Puppeteer Pro) iniciado na porta ${PORT}`);
});

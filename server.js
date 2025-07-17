/**
 * LinkMágico Chatbot v2.0 - Servidor Backend
 * Extração inteligente de dados com Cheerio + Chatbot conversacional
 * @version 2.1.0 - Professional Refactor
 */

// --- Dependências ---
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const fetch = require('node-fetch');
const cheerio = require('cheerio'); // Nova dependência para extração robusta
require('dotenv').config();

// --- Configuração Inicial ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- Logger (Winston) ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'chatbot.log' })
  ],
});

// --- Rate Limiter ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // máximo 200 requests por IP
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' }
});

// --- Middlewares ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));
app.use(express.json({ limit: '10mb' }));
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(limiter);
app.use(express.static(path.join(__dirname)));

// --- Cache ---
const productCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

// --- LÓGICA PRINCIPAL ---

/**
 * Função de extração de dados robusta com Cheerio.
 * Substitui a antiga implementação com Puppeteer.
 * @param {string} url - A URL da página de vendas.
 * @returns {Promise<object>} - Os dados extraídos da página.
 */
async function extractPageDataWithCheerio(url) {
  const log = (msg) => logger.info(`[CheerioExtractor] ${msg}`);
  log(`Iniciando extração da URL: ${url}`);

  try {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    if (!response.ok) {
      throw new Error(`Falha na requisição HTTP! Status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Função auxiliar para limpar texto
    const cleanText = (text) => text ? text.replace(/\s\s+/g, ' ').trim() : '';

    // Estratégias de extração com seletores CSS
    const title = cleanText($('h1').first().text() || $('title').first().text());
    const description = cleanText($('meta[name="description"]').attr('content') || $('p').first().text());
    
    let price = 'Consulte o preço';
    const priceSelectors = ['.price', '.product-price', '.preco', '.valor', '.amount'];
    for (const selector of priceSelectors) {
        const priceText = $(selector).first().text();
        if (priceText) {
            const priceMatch = priceText.match(/R\$\s?[\d.,]+/);
            if (priceMatch) {
                price = priceMatch[0];
                break;
            }
        }
    }

    const benefits = [];
    $('ul li, .benefit, .feature').each((i, el) => {
        const benefitText = cleanText($(el).text());
        if (benefitText && benefitText.length > 10) {
            benefits.push(benefitText);
        }
    });

    const testimonials = [];
    $('.testimonial, .review, .depoimento').each((i, el) => {
        const testimonialText = cleanText($(el).text());
        if (testimonialText && testimonialText.length > 20) {
            testimonials.push(testimonialText);
        }
    });

    const cta = cleanText($('.cta, .buy-button, .btn-primary').first().text() || 'Comprar Agora');
    const finalUrl = response.url;

    const extractedData = {
      title: title || 'Produto Incrível',
      price: price,
      description: description || 'Descrição detalhada não encontrada.',
      benefits: benefits.length > 0 ? benefits.slice(0, 5) : ['Resultados comprovados', 'Suporte especializado'],
      testimonials: testimonials.length > 0 ? testimonials.slice(0, 3) : ['Excelente, recomendo!'],
      cta: cta,
      finalUrl: finalUrl
    };

    log(`Extração concluída para: ${extractedData.title}`);
    return extractedData;

  } catch (error) {
    logger.error(`Erro ao extrair dados da URL ${url}: ${error.message}`);
    return {
      error: `Falha na extração de dados da página: ${error.message}`,
      url: url
    };
  }
}

/**
 * Sistema de Chatbot Inteligente (mantido como estava)
 */
class IntelligentChatbot {
  constructor(productData) {
    this.productData = productData;
  }
  
  generateResponse(userMessage) {
    if (this.productData.error) {
      return `Desculpe, não consegui obter as informações detalhadas do produto (${this.productData.error}). Por favor, verifique a URL da página de vendas ou tente novamente mais tarde.`;
    }

    const message = userMessage.toLowerCase();
    
    if (message.includes('preço') || message.includes('valor') || message.includes('custa')) {
      return `O preço do ${this.productData.title} é ${this.productData.price}. ${this.productData.cta}`;
    }
    if (message.includes('benefício') || message.includes('vantagem')) {
      const benefits = this.productData.benefits.slice(0, 3).join('; ');
      return `Os principais benefícios são: ${benefits}. Quer saber mais?`;
    }
    if (message.includes('depoimento') || message.includes('avaliação')) {
      const testimonial = this.productData.testimonials[0];
      return `Aqui está um depoimento: "${testimonial}". Muitos clientes estão satisfeitos!`;
    }
    if (message.includes('comprar') || message.includes('adquirir')) {
      return `Ótima escolha! ${this.productData.cta} Acesse o link da página de vendas para finalizar sua compra.`;
    }
    if (message.includes('olá') || message.includes('oi')) {
      return `Olá! Sou o assistente virtual do ${this.productData.title}. Como posso ajudá-lo hoje?`;
    }
    
    return `Sobre o ${this.productData.title}: ${this.productData.description.substring(0, 150)}... Posso falar sobre preços, benefícios ou depoimentos. O que mais te interessa?`;
  }
}

// --- ROTAS DA API ---

// Rota principal (serve o painel)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota de Status
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', version: '2.1.0', timestamp: new Date().toISOString() });
});

// Rota para Extrair Dados (Atualizada)
app.post('/api/extract', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !url.startsWith('http' )) {
    return res.status(400).json({ error: 'URL válida é obrigatória.' });
  }

  if (productCache.has(url)) {
    logger.info(`Cache hit para URL: ${url}`);
    return res.json(productCache.get(url));
  }

  const productData = await extractPageDataWithCheerio(url);

  if (productData.error) {
    logger.error(`Erro na extração para URL ${url}: ${productData.error}`);
    return res.status(500).json({ error: productData.error });
  }

  productCache.set(url, productData);
  setTimeout(() => productCache.delete(url), CACHE_DURATION);
  
  res.json(productData);
});

// Rota do Chat (Atualizada)
app.post('/api/chat', async (req, res) => {
  const { message, productUrl } = req.body;
  if (!message || !productUrl) {
    return res.status(400).json({ error: 'Mensagem e URL do produto são obrigatórias.' });
  }

  let productData;
  if (productCache.has(productUrl)) {
    productData = productCache.get(productUrl);
  } else {
    productData = await extractPageDataWithCheerio(productUrl);
    if (!productData.error) {
        productCache.set(productUrl, productData);
        setTimeout(() => productCache.delete(productUrl), CACHE_DURATION);
    }
  }

  const chatbot = new IntelligentChatbot(productData);
  const response = chatbot.generateResponse(message);
  
  res.json({ response });
});

// Rota para gerar a interface do Chat (Mantida)
app.get('/chat', async (req, res) => {
    // Esta rota foi mantida para compatibilidade, mas a lógica principal
    // agora está no frontend para uma experiência mais fluida.
    // Você pode adaptar esta parte conforme necessário.
    res.status(404).send('Interface de chat agora é gerenciada pelo frontend.');
});


// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 LinkMágico Chatbot v2.1 (Cheerio Edition) iniciado na porta ${PORT}`);
  logger.info(`🔗 Acesse o painel em: http://localhost:${PORT}` );
});

module.exports = app;

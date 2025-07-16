/**
 * LinkMágico Chatbot v2.0 - IA Conversacional para Vendas
 * Solução específica para Render.com baseada no exemplo oficial
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Configuração específica do Puppeteer para Render.com
let puppeteer;
try {
    // Tenta usar puppeteer padrão primeiro
    puppeteer = require("puppeteer");
} catch (error) {
    console.log("Puppeteer padrão não encontrado, tentando puppeteer-core...");
    try {
        puppeteer = require("puppeteer-core");
    } catch (coreError) {
        console.error("Nenhuma versão do Puppeteer encontrada:", coreError);
        process.exit(1);
    }
}

// Configuração do logger
const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de segurança
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: "Muitas requisições deste IP, tente novamente em 15 minutos."
});

app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname)));

// Função para obter configuração do Puppeteer específica para Render.com
function getPuppeteerConfig() {
    const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER;
    
    if (isProduction) {
        // Configuração específica para Render.com baseada no exemplo oficial
        return {
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",
                "--disable-gpu",
                "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
                "--disable-features=TranslateUI",
                "--disable-ipc-flooding-protection"
            ],
            // No Render.com, o Puppeteer instala o Chrome automaticamente
            // Não especificamos executablePath para usar o Chrome baixado pelo Puppeteer
        };
    } else {
        // Configuração para desenvolvimento local
        return {
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ]
        };
    }
}

// Função para extrair dados da página usando Puppeteer
async function extractPageData(url) {
    let browser = null;
    let page = null;
    
    try {
        logger.info(`Iniciando extração de dados para: ${url}`);
        
        const config = getPuppeteerConfig();
        logger.info(`Configuração do Puppeteer: ${JSON.stringify(config, null, 2)}`);
        
        // Lançar o navegador com configuração específica para Render.com
        browser = await puppeteer.launch(config);
        
        page = await browser.newPage();
        
        // Configurar viewport e user agent
        await page.setViewport({ width: 1280, height: 720 });
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        
        // Configurar timeouts
        page.setDefaultNavigationTimeout(30000);
        page.setDefaultTimeout(30000);
        
        logger.info(`Navegando para: ${url}`);
        
        // Navegar para a página
        await page.goto(url, { 
            waitUntil: "networkidle2",
            timeout: 30000 
        });
        
        logger.info("Página carregada, extraindo dados...");
        
        // Extrair dados da página
        const pageData = await page.evaluate(() => {
            // Função para extrair texto limpo
            function getCleanText(selector) {
                const element = document.querySelector(selector);
                return element ? element.textContent.trim() : "";
            }
            
            // Função para extrair múltiplos elementos
            function getMultipleTexts(selector) {
                const elements = document.querySelectorAll(selector);
                return Array.from(elements).map(el => el.textContent.trim()).filter(text => text.length > 0);
            }
            
            // Extrair título da página
            const title = document.title || 
                         getCleanText("h1") || 
                         getCleanText(".title") || 
                         getCleanText(".product-title") ||
                         "Produto";
            
            // Extrair preço
            const priceSelectors = [
                ".price", ".valor", ".preco", ".price-current", ".price-now",
                "[class*='price']", "[class*='valor']", "[class*='preco']",
                ".currency", ".money", ".cost"
            ];
            
            let price = "";
            for (const selector of priceSelectors) {
                price = getCleanText(selector);
                if (price && (price.includes("R$") || price.includes("$") || /\d+[,.]?\d*/.test(price))) {
                    break;
                }
            }
            
            // Extrair descrição
            const descriptionSelectors = [
                ".description", ".descricao", ".product-description", 
                ".content", ".details", ".info", "p"
            ];
            
            let description = "";
            for (const selector of descriptionSelectors) {
                const texts = getMultipleTexts(selector);
                if (texts.length > 0) {
                    description = texts.join(" ").substring(0, 500);
                    break;
                }
            }
            
            // Extrair benefícios
            const benefitSelectors = [
                ".benefits li", ".vantagens li", ".features li",
                ".benefit", ".vantagem", ".feature",
                "ul li", ".list li"
            ];
            
            let benefits = [];
            for (const selector of benefitSelectors) {
                benefits = getMultipleTexts(selector);
                if (benefits.length > 0) {
                    benefits = benefits.slice(0, 10); // Máximo 10 benefícios
                    break;
                }
            }
            
            // Extrair depoimentos
            const testimonialSelectors = [
                ".testimonial", ".depoimento", ".review", 
                ".feedback", ".opinion", ".comment"
            ];
            
            let testimonials = [];
            for (const selector of testimonialSelectors) {
                testimonials = getMultipleTexts(selector);
                if (testimonials.length > 0) {
                    testimonials = testimonials.slice(0, 5); // Máximo 5 depoimentos
                    break;
                }
            }
            
            // Extrair call-to-action
            const ctaSelectors = [
                ".cta", ".button", ".btn", ".comprar", ".buy",
                "a[href*='checkout']", "a[href*='comprar']", "a[href*='buy']"
            ];
            
            let cta = "";
            for (const selector of ctaSelectors) {
                cta = getCleanText(selector);
                if (cta && cta.length > 0) {
                    break;
                }
            }
            
            return {
                title: title,
                price: price || "Consulte o preço",
                description: description || "Produto de qualidade",
                benefits: benefits.length > 0 ? benefits : ["Produto de qualidade", "Entrega rápida", "Garantia"],
                testimonials: testimonials.length > 0 ? testimonials : ["Produto excelente!", "Recomendo!"],
                cta: cta || "Comprar Agora",
                url: window.location.href,
                extractedAt: new Date().toISOString()
            };
        });
        
        logger.info(`Dados extraídos com sucesso: ${JSON.stringify(pageData, null, 2)}`);
        
        return {
            success: true,
            data: pageData,
            finalUrl: page.url()
        };
        
    } catch (error) {
        logger.error(`Erro na extração de dados: ${error.message}`);
        logger.error(`Stack trace: ${error.stack}`);
        
        return {
            success: false,
            error: error.message,
            data: {
                title: "Produto",
                price: "Consulte o preço",
                description: "Não foi possível extrair os dados automaticamente. Por favor, verifique a URL.",
                benefits: ["Produto de qualidade"],
                testimonials: ["Produto recomendado"],
                cta: "Saiba Mais",
                url: url,
                extractedAt: new Date().toISOString()
            }
        };
    } finally {
        try {
            if (page) await page.close();
            if (browser) await browser.close();
        } catch (closeError) {
            logger.error(`Erro ao fechar navegador: ${closeError.message}`);
        }
    }
}

// Rota principal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Rota para extração de dados
app.post("/api/extract", async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                error: "URL é obrigatória"
            });
        }
        
        logger.info(`Requisição de extração recebida para: ${url}`);
        
        const result = await extractPageData(url);
        
        if (result.success) {
            res.json({
                ...result.data,
                finalUrl: result.finalUrl
            });
        } else {
            res.status(500).json({
                error: result.error,
                ...result.data
            });
        }
        
    } catch (error) {
        logger.error(`Erro na rota de extração: ${error.message}`);
        res.status(500).json({
            error: "Erro interno do servidor",
            title: "Produto",
            price: "Consulte o preço",
            description: "Erro na extração de dados",
            benefits: ["Produto de qualidade"],
            testimonials: ["Produto recomendado"],
            cta: "Saiba Mais"
        });
    }
});

// Rota para chat
app.post("/api/chat", async (req, res) => {
    try {
        const { message, productUrl } = req.body;
        
        if (!message) {
            return res.status(400).json({
                error: "Mensagem é obrigatória"
            });
        }
        
        logger.info(`Mensagem recebida: ${message}`);
        
        // Simular resposta do chatbot baseada na mensagem
        let response = "";
        
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes("preço") || lowerMessage.includes("valor") || lowerMessage.includes("custa")) {
            response = "O preço está disponível na página do produto. Posso te ajudar com mais informações sobre os benefícios e características do produto!";
        } else if (lowerMessage.includes("entrega") || lowerMessage.includes("frete")) {
            response = "A entrega varia conforme sua localização. Geralmente temos opções de entrega rápida disponíveis. Gostaria de saber mais sobre o produto?";
        } else if (lowerMessage.includes("garantia")) {
            response = "Sim, oferecemos garantia para nossos produtos! É uma das vantagens de escolher nossos produtos de qualidade.";
        } else if (lowerMessage.includes("benefício") || lowerMessage.includes("vantagem")) {
            response = "Este produto oferece diversos benefícios! Posso destacar a qualidade superior, entrega rápida e excelente custo-benefício. Gostaria de saber mais detalhes?";
        } else if (lowerMessage.includes("comprar") || lowerMessage.includes("adquirir")) {
            response = "Que ótimo! Para finalizar sua compra, basta clicar no botão de compra na página do produto. Estou aqui para esclarecer qualquer dúvida antes da sua decisão!";
        } else {
            response = "Olá! Sou seu assistente virtual e estou aqui para ajudar com informações sobre nosso produto. Posso esclarecer dúvidas sobre preço, entrega, benefícios e muito mais. Como posso ajudá-lo?";
        }
        
        res.json({ response });
        
    } catch (error) {
        logger.error(`Erro na rota de chat: ${error.message}`);
        res.status(500).json({
            error: "Erro interno do servidor",
            response: "Desculpe, ocorreu um erro. Tente novamente em alguns instantes."
        });
    }
});

// Rota para chat direto (interface de chat)
app.get("/chat", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
    logger.error(`Erro não tratado: ${error.message}`);
    res.status(500).json({
        error: "Erro interno do servidor"
    });
});

// Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
    logger.info(`🚀 LinkMágico Chatbot v2.0 iniciado na porta ${PORT}`);
    logger.info(`🔗 Acesse: http://localhost:${PORT}`);
    logger.info(`💬 Chat: http://localhost:${PORT}/chat?url=SUA_URL&robot=@SeuBot`);
    logger.info(`🌍 Ambiente: ${process.env.NODE_ENV || "development"}`);
    logger.info(`📦 Render: ${process.env.RENDER ? "SIM" : "NÃO"}`);
});

// Tratamento de sinais de encerramento
process.on("SIGTERM", () => {
    logger.info("Recebido SIGTERM, encerrando servidor...");
    process.exit(0);
});

process.on("SIGINT", () => {
    logger.info("Recebido SIGINT, encerrando servidor...");
    process.exit(0);
});

module.exports = app;

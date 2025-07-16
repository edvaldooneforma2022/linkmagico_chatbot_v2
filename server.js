/**
 * LinkMágico Chatbot v2.0 - Servidor Backend
 * Extração inteligente de dados da página final + Chatbot conversacional
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const rateLimit = require("express-rate-limit");
const winston = require("winston");
const puppeteer = require("puppeteer-core");
const { launch } = require("@puppeteer/browsers");
const fetch = require("node-fetch");
const crypto = require("crypto");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Logger
const logger = winston.createLogger({
  level: "info",
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
    new winston.transports.File({ filename: "chatbot.log" })
  ],
});

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // máximo 200 requests por IP
  message: { error: "Muitas requisições. Tente novamente em 15 minutos." }
});

// Middlewares
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
}));
app.use(express.json({ limit: "10mb" }));
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(limiter);
app.use(express.static(path.join(__dirname)));

// Cache para dados extraídos
const productCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

/**
 * Classe aprimorada para extração de dados da página final
 */
class AdvancedPageExtractor {
  static async extractFromFinalPage(url) {
    const log = (msg) => logger.info(`[AdvancedPageExtractor] ${msg}`);
    let browser;
    
    try {
      log(`Iniciando extração da URL: ${url}`);
      
      browser = await launch({
        channel: "chrome", // Use a versão estável do Chrome
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--single-process"
        ],
      });

      const page = await browser.newPage();
      
      // Configurar user agent e viewport
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
      await page.setViewport({ width: 1366, height: 768 });
      
      // Navegar para a URL e aguardar carregamento completo
      await page.goto(url, { 
        waitUntil: "networkidle2", 
        timeout: 60000 
      });
      
      // Aguardar elementos dinâmicos carregarem
      await page.waitForTimeout(3000);
      
      // Obter URL final após redirecionamentos
      const finalUrl = page.url();
      log(`URL final após redirecionamentos: ${finalUrl}`);
      
      // Extrair dados estruturados da página
      const pageData = await page.evaluate(() => {
        // Função auxiliar para limpar texto
        const cleanText = (text) => {
          if (!text) return "";
          return text
            .replace(/\s+/g, " ")
            .replace(/[^\w\sÀ-ÿ,.!?€$@%()\-"]/g, "")
            .trim();
        };
        
        // Extrair título
        const extractTitle = () => {
          // Tentar diferentes seletores para título
          const selectors = [
            "h1",
            ".product-title",
            ".title",
            "[data-testid=\"product-title\"]",
            ".product-name",
            "title"
          ];
          
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
              return cleanText(element.textContent);
            }
          }
          
          // Fallback: primeiro h1 ou título da página
          const h1 = document.querySelector("h1");
          if (h1) return cleanText(h1.textContent);
          
          return cleanText(document.title) || "Produto Incrível";
        };
        
        // Extrair preço
        const extractPrice = () => {
          const priceSelectors = [
            ".price",
            ".product-price",
            "[data-testid=\"price\"]",
            ".value",
            ".amount",
            ".cost"
          ];
          
          for (const selector of priceSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              const text = element.textContent;
              const priceMatch = text.match(/R\$\s*[\d.,]+/);
              if (priceMatch) return priceMatch[0];
            }
          }
          
          // Buscar padrão de preço em todo o texto
          const bodyText = document.body.textContent;
          const priceMatch = bodyText.match(/R\$\s*[\d.,]+/);
          return priceMatch ? priceMatch[0] : "Consulte o preço";
        };
        
        // Extrair descrição
        const extractDescription = () => {
          const descSelectors = [
            ".description",
            ".product-description",
            "[data-testid=\"description\"]",
            ".summary",
            ".about",
            "meta[name=\"description\"]"
          ];
          
          for (const selector of descSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              const text = selector.includes("meta") ? 
                element.getAttribute("content") : 
                element.textContent;
              if (text && text.length > 50) {
                return cleanText(text);
              }
            }
          }
          
          // Fallback: buscar parágrafos longos
          const paragraphs = Array.from(document.querySelectorAll("p"));
          const longParagraph = paragraphs.find(p => p.textContent.length > 100);
          return longParagraph ? cleanText(longParagraph.textContent) : "Descrição não encontrada";
        };
        
        // Extrair benefícios
        const extractBenefits = () => {
          const benefits = [];
          
          // Buscar listas
          const lists = document.querySelectorAll("ul, ol");
          lists.forEach(list => {
            const items = list.querySelectorAll("li");
            items.forEach(item => {
              const text = cleanText(item.textContent);
              if (text.length > 10 && text.length < 200) {
                benefits.push(text);
              }
            });
          });
          
          // Buscar elementos com classes relacionadas a benefícios
          const benefitSelectors = [
            ".benefit",
            ".feature",
            ".advantage",
            ".highlight"
          ];
          
          benefitSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              const text = cleanText(el.textContent);
              if (text.length > 10 && text.length < 200) {
                benefits.push(text);
              }
            });
          });
          
          return benefits.length > 0 ? benefits.slice(0, 10) : ["Benefícios incríveis", "Resultados garantidos"];
        };
        
        // Extrair depoimentos
        const extractTestimonials = () => {
          const testimonials = [];
          
          // Buscar elementos com classes relacionadas a depoimentos
          const testimonialSelectors = [
            ".testimonial",
            ".review",
            ".feedback",
            ".comment",
            ".depoimento"
          ];
          
          testimonialSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              const text = cleanText(el.textContent);
              if (text.length > 30 && text.length < 500) {
                testimonials.push(text);
              }
            });
          });
          
          // Buscar texto entre aspas
          const bodyText = document.body.textContent;
          const quoteMatches = bodyText.match(/[""]([^""]{30,300})[""]/g);
          if (quoteMatches) {
            quoteMatches.forEach(match => {
              const text = match.replace(/[""]/g, "").trim();
              if (text.length > 30) {
                testimonials.push(cleanText(text));
              }
            });
          }
          
          return testimonials.length > 0 ? testimonials.slice(0, 5) : ["Produto excelente! Recomendo!"];
        };
        
        // Extrair CTA
        const extractCTA = () => {
          const ctaSelectors = [
            ".cta",
            ".buy-button",
            ".purchase",
            ".add-to-cart",
            "button[type=\"submit\"]",
            ".btn-primary"
          ];
          
          for (const selector of ctaSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              const text = cleanText(element.textContent);
              if (text.length > 5 && text.length < 100) {
                return text;
              }
            }
          }
          
          return "Garanta já o seu!";
        };
        
        return {
          title: extractTitle(),
          price: extractPrice(),
          description: extractDescription(),
          benefits: extractBenefits(),
          testimonials: extractTestimonials(),
          cta: extractCTA(),
          finalUrl: window.location.href
        };
      });
      
      log(`Extração concluída: ${pageData.title}`);
      return pageData;
      
    } catch (error) {
      log(`Erro na extração da URL ${url}: ${error.message}`);
      // Logar o stack trace completo para depuração
      logger.error(`Stack trace do erro de extração: ${error.stack}`);
      
      // Retornar um objeto de erro claro para o frontend
      return {
        error: `Falha na extração de dados da página: ${error.message}`,
        details: error.stack,
        url: url
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

/**
 * Sistema de Chatbot Inteligente
 */
class IntelligentChatbot {
  constructor(productData) {
    this.productData = productData;
    this.conversationHistory = [];
  }
  
  generateResponse(userMessage) {
    // Se houver erro na extração, informar ao usuário
    if (this.productData.error) {
      return `Desculpe, não consegui obter as informações detalhadas do produto (${this.productData.error}). Por favor, verifique a URL da página de vendas ou tente novamente mais tarde.`;
    }

    const message = userMessage.toLowerCase();
    
    // Respostas baseadas em palavras-chave
    if (message.includes("preço") || message.includes("valor") || message.includes("custa")) {
      return `O preço do ${this.productData.title} é ${this.productData.price}. ${this.productData.cta}`;
    }
    
    if (message.includes("benefício") || message.includes("vantagem") || message.includes("serve")) {
      const benefits = this.productData.benefits.slice(0, 3).join(", ");
      return `Os principais benefícios são: ${benefits}. Quer saber mais alguma coisa?`;
    }
    
    if (message.includes("depoimento") || message.includes("avaliação") || message.includes("opinião")) {
      const testimonial = this.productData.testimonials[0];
      return `Aqui está um depoimento real: "${testimonial}". Muitos clientes têm resultados similares!`;
    }
    
    if (message.includes("comprar") || message.includes("adquirir") || message.includes("quero")) {
      return `Ótima escolha! ${this.productData.cta} Acesse o link da página de vendas para finalizar sua compra.`;
    }
    
    if (message.includes("dúvida") || message.includes("ajuda") || message.includes("suporte")) {
      return `Estou aqui para ajudar! Posso falar sobre preços, benefícios, depoimentos ou qualquer dúvida sobre o ${this.productData.title}.`;
    }
    
    if (message.includes("olá") || message.includes("oi") || message.includes("bom dia") || message.includes("boa tarde")) {
      return `Olá! Seja bem-vindo! Sou o assistente virtual do ${this.productData.title}. Como posso ajudá-lo hoje?`;
    }
    
    // Resposta padrão inteligente
    return `Sobre o ${this.productData.title}: ${this.productData.description} Posso falar sobre preços, benefícios ou depoimentos. O que mais te interessa?`;
  }
}

// Rotas da API

// Página inicial
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Status da API
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    version: "2.0",
    timestamp: new Date().toISOString(),
    cache_size: productCache.size
  });
});

// Extrair dados de uma URL
app.post("/api/extract", async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "URL é obrigatória" });
    }
    
    // Verificar cache
    if (productCache.has(url)) {
      logger.info(`Cache hit para URL: ${url}`);
      return res.json(productCache.get(url));
    }
    
    // Extrair dados
    const productData = await AdvancedPageExtractor.extractFromFinalPage(url);

    // Se houver erro na extração, retornar o erro para o frontend
    if (productData.error) {
      logger.error(`Erro na extração para URL ${url}: ${productData.error}`);
      return res.status(500).json({ error: productData.error, details: productData.details });
    }
    
    // Salvar no cache
    productCache.set(url, productData);
    setTimeout(() => productCache.delete(url), CACHE_DURATION);
    
    res.json(productData);
    
  } catch (error) {
    logger.error(`Erro na extração: ${error.message}`);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Chat com o bot
app.post("/api/chat", async (req, res) => {
  try {
    const { message, productUrl } = req.body;
    
    if (!message || !productUrl) {
      return res.status(400).json({ error: "Mensagem e URL do produto são obrigatórias" });
    }
    
    // Obter dados do produto (cache ou extrair)
    let productData;
    if (productCache.has(productUrl)) {
      productData = productCache.get(productUrl);
    } else {
      productData = await AdvancedPageExtractor.extractFromFinalPage(productUrl);
      productCache.set(productUrl, productData);
      setTimeout(() => productCache.delete(productUrl), CACHE_DURATION);
    }
    
    // Gerar resposta do chatbot
    const chatbot = new IntelligentChatbot(productData);
    const response = chatbot.generateResponse(message);
    
    res.json({
      response,
      timestamp: new Date().toISOString(),
      product: productData.title
    });
    
  } catch (error) {
    logger.error(`Erro no chat: ${error.message}`);
    res.status(500).json({ error: "Erro ao processar mensagem" });
  }
});

// Interface do chatbot para clientes
app.get("/chat", async (req, res) => {
  try {
    const { robot, url, instructions } = req.query;
    
    if (!url) {
      return res.status(400).send("URL do produto é obrigatória");
    }
    
    // Extrair dados do produto
    let productData;
    if (productCache.has(url)) {
      productData = productCache.get(url);
    } else {
      productData = await AdvancedPageExtractor.extractFromFinalPage(url);
      productCache.set(url, productData);
      setTimeout(() => productCache.delete(url), CACHE_DURATION);
    }
    
    const robotName = robot || "@AssistenteVirtual";
    const customInstructions = instructions || "";
    
    res.send(generateChatInterface(productData, robotName, customInstructions));
    
  } catch (error) {
    logger.error(`Erro ao gerar interface do chat: ${error.message}`);
    res.status(500).send("Erro interno do servidor");
  }
});

// Função para gerar interface do chat
function generateChatInterface(productData, robotName, customInstructions) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat com ${robotName} - ${productData.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .chat-container {
            width: 100%;
            max-width: 400px;
            height: 600px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .chat-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        .chat-header h1 {
            font-size: 18px;
            margin-bottom: 5px;
        }
        .chat-header p {
            font-size: 14px;
            opacity: 0.9;
        }
        .chat-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #f8f9fa;
        }
        .message {
            margin-bottom: 15px;
            padding: 12px 16px;
            border-radius: 18px;
            max-width: 85%;
            word-wrap: break-word;
        }
        .message.bot {
            background: white;
            border: 1px solid #e9ecef;
            margin-right: auto;
        }
        .message.user {
            background: #667eea;
            color: white;
            margin-left: auto;
            text-align: right;
        }
        .chat-input-container {
            padding: 20px;
            border-top: 1px solid #e9ecef;
            display: flex;
            gap: 10px;
        }
        .chat-input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #ddd;
            border-radius: 25px;
            outline: none;
            font-size: 14px;
        }
        .chat-send-btn {
            padding: 12px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 500;
        }
        .chat-send-btn:hover {
            background: #5a6fd8;
        }
        .typing-indicator {
            display: none;
            padding: 12px 16px;
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 18px;
            margin-right: auto;
            margin-bottom: 15px;
        }
        .typing-dots {
            display: flex;
            gap: 4px;
        }
        .typing-dots span {
            width: 8px;
            height: 8px;
            background: #667eea;
            border-radius: 50%;
            animation: typing 1.4s infinite;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-10px); }
        }
        @media (max-width: 480px) {
            .chat-container { height: 100vh; border-radius: 0; }
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h1>💬 ${robotName}</h1>
            <p>Assistente Virtual - ${productData.title}</p>
        </div>
        
        <div class="chat-messages" id="chatMessages">
            <div class="message bot">
                Olá! Sou o ${robotName}, seu assistente virtual especializado em ${productData.title}. 
                Como posso ajudá-lo hoje? Posso falar sobre preços, benefícios, depoimentos e muito mais!
            </div>
        </div>
        
        <div class="typing-indicator" id="typingIndicator">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
        
        <div class="chat-input-container">
            <input type="text" class="chat-input" id="chatInput" placeholder="Digite sua mensagem...">
            <button class="chat-send-btn" id="chatSendBtn">Enviar</button>
        </div>
    </div>

    <script>
        const chatMessages = document.getElementById("chatMessages");
        const chatInput = document.getElementById("chatInput");
        const chatSendBtn = document.getElementById("chatSendBtn");
        const typingIndicator = document.getElementById("typingIndicator");
        
        const productUrl = "${productData.finalUrl || productData.url}";
        
        function addMessage(content, isUser = false) {
            const messageDiv = document.createElement("div");
            messageDiv.className = "message " + (isUser ? "user" : "bot");
            messageDiv.textContent = content;
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        function showTyping() {
            typingIndicator.style.display = "block";
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        function hideTyping() {
            typingIndicator.style.display = "none";
        }
        
        async function sendMessage() {
            const message = chatInput.value.trim();
            if (!message) return;
            
            addMessage(message, true);
            chatInput.value = "";
            chatSendBtn.disabled = true;
            
            showTyping();
            
            try {
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: message,
                        productUrl: productUrl
                    })
                });
                
                const data = await response.json();
                
                setTimeout(() => {
                    hideTyping();
                    addMessage(data.response);
                    chatSendBtn.disabled = false;
                    chatInput.focus();
                }, 1000);
                
            } catch (error) {
                hideTyping();
                addMessage("Desculpe, ocorreu um erro. Tente novamente.");
                chatSendBtn.disabled = false;
                chatInput.focus();
            }
        }
        
        chatSendBtn.addEventListener("click", sendMessage);
        chatInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                sendMessage();
            }
        });
        
        // Focar no input ao carregar
        chatInput.focus();
    </script>
</body>
</html>`;
}

// Inicializar servidor
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`🚀 LinkMágico Chatbot v2.0 iniciado na porta ${PORT}`);
  logger.info(`🔗 Acesse: http://localhost:${PORT}` );
  logger.info(`💬 Chat: http://localhost:${PORT}/chat?url=SUA_URL&robot=@SeuBot` );
});

module.exports = app;

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Chave da API do ScraperAPI (substitua pela sua chave real)
const SCRAPERAPI_API_KEY = "f1f7d64f3b39ebcac6505cd8e621e57a";

app.use(express.json());
app.use(express.static("public"));
app.use(cors());

// Rota para extração de dados
app.post("/api/extract", async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: "URL é obrigatória." });
    }

    try {
        // Usar ScraperAPI para fazer a requisição
        const scraperApiUrl = `http://api.scraperapi.com/?api_key=${SCRAPERAPI_API_KEY}&url=${encodeURIComponent(url )}`;
        const { data } = await axios.get(scraperApiUrl);
        const $ = cheerio.load(data);

        // Exemplo de extração de dados (ajuste conforme a estrutura da página)
        const title = $("title").text();
        const description = $("meta[name=\"description\"]").attr("content") || "";
        const price = $(".price").first().text() || "N/A";
        const benefits = []; // Exemplo: $(".benefit-item").map((i, el) => $(el).text()).get();
        const testimonials = []; // Exemplo: $(".testimonial-text").map((i, el) => $(el).text()).get();
        const cta = $(".cta-button").first().text() || "N/A";

        res.json({
            title,
            description,
            price,
            benefits,
            testimonials,
            cta,
            finalUrl: url
        });

    } catch (error) {
        console.error("Erro ao extrair dados com ScraperAPI:", error.message);
        res.status(500).json({ error: "Erro ao extrair dados da URL fornecida via ScraperAPI." });
    }
});

// Rota para o chatbot (simulação)
app.post("/api/chat", (req, res) => {
    const { message, productUrl } = req.body;
    console.log(`Mensagem recebida: ${message} para URL: ${productUrl}`);

    // Lógica simples de resposta do chatbot
    let response = "Desculpe, não entendi. Pode reformular sua pergunta?";

    if (message.toLowerCase().includes("olá")) {
        response = "Olá! Como posso ajudar você hoje com o produto?";
    } else if (message.toLowerCase().includes("preço")) {
        response = "O preço do produto é R$ 99,90. Aproveite a oferta!";
    } else if (message.toLowerCase().includes("comprar")) {
        response = `Você pode comprar o produto diretamente aqui: ${productUrl}`; 
    }

    res.json({ response });
});

app.listen(PORT, () => {
    console.log(`🚀 LinkMágico Chatbot v2.0 iniciado na porta ${PORT}`);
});

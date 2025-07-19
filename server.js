require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;
const SCRAPING_BEE_API_KEY = process.env.SCRAPING_BEE_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Função 1: Extrair dados de qualquer site usando ScrapingBee
async function extractPageData(targetUrl) {
    console.log(`[Extractor] Iniciando extração em: ${targetUrl}`);
    const encodedUrl = encodeURIComponent(targetUrl);
    const apiEndpoint = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPING_BEE_API_KEY}&url=${encodedUrl}&render_js=true`;

    try {
        const response = await fetch(apiEndpoint );
        if (!response.ok) throw new Error(`ScrapingBee API falhou com status: ${response.status}`);
        
        const html = await response.text();
        const $ = cheerio.load(html);

        const title = $('h1').first().text().trim() || $('title').first().text().trim();
        const priceMatch = $.text().match(/R\$\s?(\d{1,3}(?:\.\d{3})*,\d{2})/);
        const price = priceMatch ? priceMatch[0] : 'Não informado na página';
        const description = $('meta[name="description"]').attr('content') || $('p').first().text().trim();

        return { title, price, description };
    } catch (error) {
        console.error(`[Extractor] Erro: ${error.message}`);
        return { error: true, message: error.message };
    }
}

// Função 2: Gerar resposta usando uma IA de verdade (LLM)
async function generateAiResponse(productData, userMessage) {
    console.log(`[AI] Gerando resposta para: "${userMessage}"`);
    const systemPrompt = `Você é um vendedor especialista e amigável. Seu único conhecimento é sobre o produto a seguir. Responda às perguntas do cliente com base estritamente nessas informações. Seja prestativo e tente vender o produto.
    
    --- INFORMAÇÕES DO PRODUTO ---
    Nome: ${productData.title}
    Preço: ${productData.price}
    Descrição: ${productData.description}
    --- FIM DAS INFORMAÇÕES ---`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "mistralai/mistral-7b-instruct:free", // Modelo gratuito e eficiente
                "messages": [
                    { "role": "system", "content": systemPrompt },
                    { "role": "user", "content": userMessage }
                ]
            } )
        });

        if (!response.ok) throw new Error(`OpenRouter API falhou com status: ${response.status}`);
        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error(`[AI] Erro: ${error.message}`);
        return "Desculpe, estou com um problema na minha conexão interna. Tente novamente em instantes.";
    }
}

// Rota principal da API: recebe a pergunta e a URL, e orquestra tudo
app.post('/api/v6/chat', async (req, res) => {
    const { url, message } = req.body;
    if (!url || !message) return res.status(400).json({ error: "URL e mensagem são obrigatórias." });

    // Passo 1: Extrair os dados da página
    const productData = await extractPageData(url);
    if (productData.error) {
        return res.status(500).json({ response: `Desculpe, não consegui analisar a página. Erro: ${productData.message}` });
    }

    // Passo 2: Gerar a resposta com a IA contextualizada
    const aiResponse = await generateAiResponse(productData, message);
    res.json({ response: aiResponse });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor IA de Vendas v6.0 iniciado na porta ${PORT}`);
});
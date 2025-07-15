# 🤖 LinkMágico Chatbot v2.0

**IA Conversacional Inteligente para Vendas Online**

Uma ferramenta revolucionária que combina extração inteligente de dados de páginas de vendas com um chatbot conversacional avançado, permitindo que seus clientes interajam diretamente com uma IA que conhece todos os detalhes do seu produto.

## 🚀 **Principais Funcionalidades**

### 🤖 **Chatbot Inteligente**
- IA conversacional que responde perguntas sobre produtos em tempo real
- Extração automática de dados da página final da URL (não apenas do domínio)
- Respostas personalizadas baseadas nos dados reais do produto
- Interface de chat moderna e responsiva

### 📊 **Ferramentas de Apoio (Botões de Atalho)**
- **Extrator**: Visualiza dados extraídos da página
- **Prompt**: Gera prompts para ChatGPT baseados nos dados
- **Redes Sociais**: Links dinâmicos para WhatsApp, Instagram, etc.
- **Analytics**: Acompanha interações e performance

### 🎯 **Diferenciais Únicos**
- **Extração da Página Final**: Foca no conteúdo real do produto, não na plataforma
- **Chatbot Próprio**: Não depende do ChatGPT para funcionar
- **Layout Profissional**: Baseado no design do Automaclick v6
- **Uso Online e Local**: Funciona tanto localmente quanto hospedado

## 📋 **Requisitos do Sistema**

- **Node.js** 16.0.0 ou superior
- **NPM** (incluído com Node.js)
- **Navegador moderno** (Chrome, Firefox, Edge, Safari)

## ⚡ **Instalação Rápida**

### 1. **Preparação**
```bash
# Clone ou extraia os arquivos do projeto
cd linkmagico_chatbot_v2

# Instale as dependências
npm install
```

### 2. **Configuração (Opcional)**
Edite o arquivo `.env` para personalizar:
```env
PORT=3000                    # Porta do servidor
NODE_ENV=development         # Ambiente
CACHE_DURATION=1800000      # Duração do cache (30 min)
```

### 3. **Execução**
```bash
# Iniciar o servidor
npm start

# Ou para desenvolvimento com auto-reload
npm run dev
```

### 4. **Acesso**
- **Interface Principal**: `http://localhost:3000`
- **Chat Direto**: `http://localhost:3000/chat?url=SUA_URL&robot=@SeuBot`

## 🎮 **Como Usar**

### **Método 1: Interface Principal**
1. Acesse `http://localhost:3000`
2. Preencha o nome do assistente virtual (ex: `@VendedorPro`)
3. Cole a URL da página de vendas
4. Adicione instruções personalizadas (opcional)
5. Clique em "🚀 Ativar Chatbot Inteligente"

### **Método 2: Link Direto**
Crie um link direto para o chat:
```
http://localhost:3000/chat?url=URL_DO_PRODUTO&robot=@NOME_DO_BOT
```

### **Método 3: Botões de Atalho**
Use os botões no rodapé para acessar funcionalidades específicas:
- 🤖 **Chatbot**: Interface principal
- 📊 **Extrator**: Visualizar dados extraídos
- 💭 **Prompt**: Gerar prompts para ChatGPT
- 📱 **Redes Sociais**: Links para redes sociais
- 📈 **Analytics**: Estatísticas de uso

## 🌐 **Hospedagem Online**

### **Opção 1: Heroku (Gratuito)**
```bash
# Instalar Heroku CLI
# Fazer login: heroku login

# Criar app
heroku create seu-linkmagico-chatbot

# Deploy
git add .
git commit -m "Deploy LinkMágico Chatbot v2.0"
git push heroku main

# Configurar variáveis
heroku config:set NODE_ENV=production
```

### **Opção 2: Vercel (Gratuito)**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Seguir as instruções na tela
```

### **Opção 3: DigitalOcean/AWS/Google Cloud**
1. Crie uma instância/servidor
2. Instale Node.js
3. Faça upload dos arquivos
4. Execute `npm install && npm start`
5. Configure proxy reverso (Nginx) se necessário

## 🔧 **Configurações Avançadas**

### **Variáveis de Ambiente**
```env
# Servidor
PORT=3000
NODE_ENV=production

# Cache
CACHE_DURATION=1800000

# Puppeteer (Extração)
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=60000

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=200

# Segurança
CORS_ORIGIN=*
HELMET_CSP=false
```

### **Personalização do Chatbot**
Edite o arquivo `server.js` na seção `generateChatbotResponse()` para:
- Modificar o tom das respostas
- Adicionar novas funcionalidades
- Integrar com APIs externas
- Personalizar a lógica de negócio

## 📊 **Estrutura do Projeto**

```
linkmagico_chatbot_v2/
├── server.js              # Servidor principal
├── index.html             # Interface frontend
├── package.json           # Dependências
├── .env                   # Configurações
├── README.md              # Esta documentação
└── node_modules/          # Dependências instaladas
```

## 🛠 **Solução de Problemas**

### **Erro: "Port already in use"**
```bash
# Matar processos na porta
pkill -f "node server.js"

# Ou usar outra porta
PORT=3001 npm start
```

### **Erro: "Failed to fetch"**
- Verifique se a URL é válida
- Teste com URLs diferentes
- Verifique a conexão com a internet

### **Chatbot não responde**
- Verifique os logs do servidor
- Teste a extração de dados primeiro
- Verifique se a URL contém dados válidos

## 📈 **Performance e Otimização**

- **Cache Inteligente**: Dados são cacheados por 30 minutos
- **Rate Limiting**: Proteção contra spam (200 req/15min)
- **Compressão**: Respostas são comprimidas automaticamente
- **Logs Estruturados**: Sistema de logs para monitoramento

## 🔒 **Segurança**

- **Helmet**: Proteção contra vulnerabilidades comuns
- **CORS**: Configurado para aceitar requisições de qualquer origem
- **Rate Limiting**: Proteção contra ataques DDoS
- **Sanitização**: Dados de entrada são sanitizados

## 📞 **Suporte**

Para dúvidas, problemas ou sugestões:
- Verifique os logs do servidor
- Teste em modo desenvolvimento
- Consulte a documentação das dependências

## 📄 **Licença**

MIT License - Livre para uso comercial e pessoal.

---

**LinkMágico Chatbot v2.0** - Transformando vendas online com IA conversacional! 🚀


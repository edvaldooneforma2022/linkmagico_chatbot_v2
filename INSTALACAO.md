# 🚀 Guia de Instalação - LinkMágico Chatbot v2.0

## ⚡ **Instalação Rápida (5 minutos)**

### **Passo 1: Preparar o Ambiente**
```bash
# Verificar se o Node.js está instalado
node --version

# Se não estiver instalado, baixe em: https://nodejs.org
```

### **Passo 2: Instalar a Ferramenta**
```bash
# Extrair o arquivo ZIP
unzip linkmagico_chatbot_v2.zip
cd linkmagico_chatbot_v2

# Instalar dependências
npm install
```

### **Passo 3: Iniciar o Servidor**
```bash
# Iniciar
npm start

# Aguardar a mensagem:
# "🚀 LinkMágico Chatbot v2.0 iniciado na porta 3000"
```

### **Passo 4: Acessar a Ferramenta**
Abra o navegador e acesse:
- **Interface Principal**: `http://localhost:3000`

## 🌐 **Para Uso Online (Hospedagem)**

### **Opção 1: Heroku (Recomendado - Gratuito)**

1. **Criar conta no Heroku**: https://heroku.com
2. **Instalar Heroku CLI**: https://devcenter.heroku.com/articles/heroku-cli
3. **Fazer deploy**:
```bash
# Login no Heroku
heroku login

# Criar app (substitua 'meu-chatbot' por um nome único)
heroku create meu-chatbot

# Fazer deploy
git init
git add .
git commit -m "Deploy inicial"
heroku git:remote -a meu-chatbot
git push heroku main
```

4. **Acessar**: `https://meu-chatbot.herokuapp.com`

### **Opção 2: Vercel (Alternativa Gratuita)**

1. **Instalar Vercel CLI**:
```bash
npm i -g vercel
```

2. **Fazer deploy**:
```bash
vercel
# Seguir as instruções na tela
```

## 🔧 **Configurações Opcionais**

### **Alterar Porta**
```bash
# Usar porta diferente
PORT=8080 npm start
```

### **Modo Desenvolvimento**
```bash
# Com auto-reload
npm run dev
```

## ❓ **Problemas Comuns**

### **"Port already in use"**
```bash
# Matar processos
pkill -f "node server.js"
# Ou usar outra porta
PORT=3001 npm start
```

### **"npm not found"**
- Instale o Node.js: https://nodejs.org

### **Erro de permissão**
```bash
# Linux/Mac
sudo npm install
```

## ✅ **Teste de Funcionamento**

1. Acesse `http://localhost:3000`
2. Preencha:
   - **Nome**: `@TestBot`
   - **URL**: `https://www.mercadolivre.com.br/qualquer-produto`
3. Clique em "🚀 Ativar Chatbot Inteligente"
4. Teste o chat fazendo uma pergunta

## 📞 **Precisa de Ajuda?**

- Verifique se o Node.js está instalado
- Teste com URLs diferentes
- Verifique os logs no terminal
- Reinicie o servidor se necessário

---

**Pronto! Sua ferramenta está funcionando!** 🎉


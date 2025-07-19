document.addEventListener('DOMContentLoaded', () => {
    const salesPageUrlInput = document.getElementById('salesPageUrl');
    const chatContainer = document.getElementById('chatContainer');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    
    const addMessage = (text, sender) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    addMessage("Olá! Por favor, insira a URL da página de vendas que você quer que eu analise e depois faça sua pergunta.", "bot");

    const handleSendMessage = async () => {
        const url = salesPageUrlInput.value.trim();
        const message = chatInput.value.trim();

        if (!url || !message) {
            alert('Por favor, preencha a URL e a sua pergunta.');
            return;
        }

        addMessage(message, 'user');
        chatInput.value = '';
        chatSendBtn.disabled = true;
        addMessage("Analisando a página e pensando na melhor resposta... 🧠", "bot");

        try {
            const response = await fetch('/api/v6/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, message }),
            });
            const data = await response.json();
            
            // Remove a mensagem "Analisando..." e adiciona a resposta da IA
            chatMessages.removeChild(chatMessages.lastChild);
            addMessage(data.response, 'bot');

        } catch (error) {
            chatMessages.removeChild(chatMessages.lastChild);
            addMessage('Desculpe, ocorreu um erro. Verifique a URL e tente novamente.', 'bot');
        } finally {
            chatSendBtn.disabled = false;
        }
    };

    chatSendBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSendMessage());

    document.querySelectorAll('.shortcut-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = salesPageUrlInput.value.trim();
            if (!url) return alert('Insira a URL primeiro.');
            
            const platform = btn.dataset.tab;
            const textToCopy = `Confira este produto: ${url}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                alert(`Link para ${platform.toUpperCase()} copiado!`);
            });
        });
    });
});

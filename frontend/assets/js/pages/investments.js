import { transactionService } from '../services/transactionService.js';
import { formatMoney } from '../utils/formatMoney.js';
import { formatDate } from '../utils/formatDate.js';

let editingId = null;

// Chave específica para guardar o valor atual da carteira no LocalStorage
const PORTFOLIO_VALUE_KEY = 'finances:portfolio_value';

// Elementos DOM
const modalOverlay = document.getElementById('modalOverlay');
const form = document.getElementById('investmentForm');
const modalTitle = document.getElementById('modalTitle');

document.addEventListener('DOMContentLoaded', () => {
    updateScreen();
    setupEventListeners();
});

function setupEventListeners() {
    // Modal de Aporte
    document.getElementById('btnNewInvestment').onclick = () => openModal();
    document.getElementById('btnCancel').onclick = closeModal;
    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeModal(); };
    form.onsubmit = handleSave;

    // Atualizar Valor Atual da Carteira (Manual)
    document.getElementById('btnUpdateCurrentValue').onclick = updateCurrentPortfolioValue;
}

function updateScreen() {
    const allTransactions = transactionService.getAll();

    // 1. Filtrar apenas Investimentos
    const investments = allTransactions.filter(t => t.type === 'investment');

    // 2. Calcular Total Aportado
    const totalInvested = investments.reduce((acc, t) => acc + Number(t.amount), 0);

    // 3. Pegar Valor Atual da Carteira (Salvo manualmente pelo usuário)
    const storedValue = localStorage.getItem(PORTFOLIO_VALUE_KEY);
    const currentPortfolioValue = storedValue ? Number(storedValue) : 0;

    // 4. Calcular Rentabilidade
    calculateProfitability(totalInvested, currentPortfolioValue);

    // 5. Atualizar Tela
    document.getElementById('totalInvestedDisplay').textContent = formatMoney(totalInvested);
    document.getElementById('currentValueDisplay').textContent = formatMoney(currentPortfolioValue);
    
    renderTable(investments);
}

function calculateProfitability(invested, current) {
    const profitValueEl = document.getElementById('profitabilityValueDisplay');
    const profitPercentEl = document.getElementById('profitabilityPercentDisplay');
    
    const diff = current - invested;
    let percent = 0;

    if (invested > 0) {
        percent = (diff / invested) * 100;
    }

    profitValueEl.textContent = formatMoney(diff);
    profitPercentEl.textContent = `(${percent.toFixed(2)}%)`;

    // Cores
    profitValueEl.className = diff >= 0 ? 'profit-positive' : 'profit-negative';
    profitPercentEl.className = diff >= 0 ? 'profit-positive' : 'profit-negative';
    
    // Adiciona sinal de + se positivo
    if(diff > 0) profitValueEl.textContent = "+ " + profitValueEl.textContent;
}

function updateCurrentPortfolioValue() {
    const storedValue = localStorage.getItem(PORTFOLIO_VALUE_KEY) || "0";
    // Prompt simples para atualizar o valor (pode ser substituído por modal depois)
    const newValue = prompt("Qual o valor TOTAL atual da sua carteira hoje?", storedValue);

    if (newValue !== null && !isNaN(newValue) && newValue.trim() !== "") {
        localStorage.setItem(PORTFOLIO_VALUE_KEY, newValue);
        updateScreen();
    }
}

function renderTable(investments) {
    const tbody = document.getElementById('investmentsTable');
    tbody.innerHTML = '';

    // Ordenar por data (mais recente primeiro)
    investments.sort((a, b) => new Date(b.date) - new Date(a.date));

    investments.forEach(t => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${formatDate(t.date)}</td>
            <td><span class="badge" style="background-color: #1565c0">${t.category}</span></td>
            <td>${t.title}</td>
            <td class="text-dark"><strong>${formatMoney(t.amount)}</strong></td>
            <td>
                <button class="action-btn text-blue btn-edit" data-id="${t.id}"><i class="fas fa-pencil-alt"></i></button>
                <button class="action-btn text-red btn-delete" data-id="${t.id}"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Listeners
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.onclick = () => {
            if(confirm("Excluir este aporte?")) {
                transactionService.delete(Number(btn.dataset.id));
                updateScreen();
            }
        };
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.onclick = () => openModal(Number(btn.dataset.id));
    });
}

// --- MODAL ---

function openModal(id = null) {
    modalOverlay.classList.add('active');
    
    if (id) {
        const t = transactionService.getAll().find(item => item.id === id);
        if (t) {
            document.getElementById('transactionId').value = t.id;
            document.getElementById('title').value = t.title;
            document.getElementById('amount').value = t.amount;
            document.getElementById('date').value = t.date;
            document.getElementById('category').value = t.category;
            
            modalTitle.textContent = "Editar Aporte";
            editingId = id;
        }
    } else {
        form.reset();
        document.getElementById('date').valueAsDate = new Date();
        document.getElementById('transactionId').value = '';
        modalTitle.textContent = "Novo Aporte";
        editingId = null;
    }
}

function closeModal() {
    modalOverlay.classList.remove('active');
    editingId = null;
}

function handleSave(e) {
    e.preventDefault();

    const id = document.getElementById('transactionId').value;
    
    const transaction = {
        id: id ? Number(id) : null,
        title: document.getElementById('title').value,
        amount: Number(document.getElementById('amount').value),
        date: document.getElementById('date').value,
        category: document.getElementById('category').value,
        type: 'investment', // TIPO EXCLUSIVO
        isFixed: false, // Investimento geralmente não é "fixo" no sentido de conta
        isPaid: true // Investimento é sempre realizado na hora
    };

    transactionService.save(transaction);
    closeModal();
    updateScreen();
}
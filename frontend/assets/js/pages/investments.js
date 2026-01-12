import { transactionService } from '../services/transactionService.js';
import { formatMoney } from '../utils/formatMoney.js';
import { formatDate } from '../utils/formatDate.js';

let editingId = null;

const PORTFOLIO_VALUE_KEY = 'finances:portfolio_value';

const modalOverlay = document.getElementById('modalOverlay');
const form = document.getElementById('investmentForm');
const modalTitle = document.getElementById('modalTitle');

document.addEventListener('DOMContentLoaded', () => {
    updateScreen();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('btnNewInvestment').onclick = () => openModal();
    document.getElementById('btnCancel').onclick = closeModal;
    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeModal(); };
    form.onsubmit = handleSave;

    document.getElementById('btnUpdateCurrentValue').onclick = updateCurrentPortfolioValue;
}

function updateScreen() {
    const allTransactions = transactionService.getAll();

    const investments = allTransactions.filter(t => t.type === 'investment');

    const totalInvested = investments.reduce((acc, t) => acc + Number(t.amount), 0);

    const storedValue = localStorage.getItem(PORTFOLIO_VALUE_KEY);
    const currentPortfolioValue = storedValue ? Number(storedValue) : 0;

    calculateProfitability(totalInvested, currentPortfolioValue);

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

    profitValueEl.className = diff >= 0 ? 'profit-positive' : 'profit-negative';
    profitPercentEl.className = diff >= 0 ? 'profit-positive' : 'profit-negative';
    
    if(diff > 0) profitValueEl.textContent = "+ " + profitValueEl.textContent;
}

function updateCurrentPortfolioValue() {
    const storedValue = localStorage.getItem(PORTFOLIO_VALUE_KEY) || "0";
    const newValue = prompt("Qual o valor TOTAL atual da sua carteira hoje?", storedValue);

    if (newValue !== null && !isNaN(newValue) && newValue.trim() !== "") {
        localStorage.setItem(PORTFOLIO_VALUE_KEY, newValue);
        updateScreen();
    }
}

function renderTable(investments) {
    const tbody = document.getElementById('investmentsTable');
    tbody.innerHTML = '';

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
        type: 'investment',
        isFixed: false,
        isPaid: true 
    };

    transactionService.save(transaction);
    closeModal();
    updateScreen();
}
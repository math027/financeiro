import { transactionService } from '../services/transactionService.js';
import { formatMoney } from '../utils/formatMoney.js';
import { formatDate } from '../utils/formatDate.js';
import { charts } from '../components/charts.js';

// Estado Local
let currentDate = new Date();

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    updateScreen();
    setupEventListeners();
});

function setupEventListeners() {
    // Apenas navegação de Mês
    document.getElementById('prevMonth').onclick = () => changeMonth(-1);
    document.getElementById('nextMonth').onclick = () => changeMonth(1);
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    updateScreen();
}

function updateScreen() {
    const transactions = transactionService.getAll();
    
    const currentMonthData = filterTransactionsByDate(transactions, currentDate);
    
    const prevDate = new Date(currentDate);
    prevDate.setMonth(currentDate.getMonth() - 1);
    const prevMonthData = filterTransactionsByDate(transactions, prevDate);

    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    document.getElementById('currentMonthDisplay').textContent = monthName;

    renderTable(currentMonthData);
    updateCards(currentMonthData);
    updateCharts(currentMonthData, prevMonthData);
}

function filterTransactionsByDate(allTransactions, referenceDate) {
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth();

    return allTransactions.filter(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        
        if (t.isFixed) {
            return tDate <= new Date(refYear, refMonth + 1, 0);
        }
        
        return tDate.getMonth() === refMonth && tDate.getFullYear() === refYear;
    });
}

function renderTable(transactions) {
    const tbody = document.getElementById('transactionsTable');
    tbody.innerHTML = '';

    const displayTransactions = transactions
        .filter(t => t.type !== 'investment') 
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    displayTransactions.forEach(t => {
        const tr = document.createElement('tr');
        
        let amountClass = 'text-dark';
        let iconClass = 'far fa-circle text-grey';
        let amountPrefix = '';

        if (t.type === 'income') {
            amountClass = 'text-green';
            amountPrefix = '+ ';
            iconClass = t.isPaid ? 'fas fa-check-circle text-green' : 'far fa-circle text-grey';
        } else if (t.type === 'expense') {
            amountClass = 'text-red';
            amountPrefix = '- ';
            iconClass = t.isPaid ? 'fas fa-check-circle text-green' : 'far fa-circle text-grey';
        }

        tr.innerHTML = `
            <td style="cursor:pointer; text-align:center;" class="toggle-status" data-id="${t.id}">
                <i class="${iconClass}"></i>
            </td>
            <td>${formatDate(t.date)}</td>
            <td><span class="badge" style="background-color: #7f8c8d">${t.category}</span></td>
            <td>
                ${t.title}
                ${t.isFixed ? '<i class="fas fa-sync-alt" style="font-size:10px; color:#999; margin-left:5px" title="Fixo"></i>' : ''}
            </td>
            <td class="${amountClass}"><strong>${amountPrefix}${formatMoney(t.amount)}</strong></td>
            <td>
                <button class="action-btn text-red btn-delete" data-id="${t.id}"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.toggle-status').forEach(btn => {
        btn.onclick = () => {
            transactionService.toggleStatus(Number(btn.dataset.id));
            updateScreen();
        };
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.onclick = () => {
            if(confirm("Deseja excluir esta transação?")) {
                transactionService.delete(Number(btn.dataset.id));
                updateScreen();
            }
        };
    });
}

function updateCards(transactions) {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + Number(t.amount), 0);

    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + Number(t.amount), 0);

    const invested = transactions
        .filter(t => t.type === 'investment')
        .reduce((acc, t) => acc + Number(t.amount), 0);

    const currentBalance = income - expense - invested;

    document.getElementById('incomeDisplay').textContent = formatMoney(income);
    document.getElementById('expenseDisplay').textContent = formatMoney(expense);
    
    const totalEl = document.getElementById('totalDisplay');
    totalEl.textContent = formatMoney(currentBalance);
    totalEl.className = currentBalance >= 0 ? 'text-green' : 'text-red';

    let investWarning = document.getElementById('investWarning');
    if (!investWarning && invested > 0) {
        investWarning = document.createElement('div');
        investWarning.id = 'investWarning';
        investWarning.style.fontSize = '0.75rem';
        investWarning.style.color = '#666';
        investWarning.style.marginTop = '5px';
        totalEl.parentNode.appendChild(investWarning);
    }
    
    if (investWarning) {
        if (invested > 0) {
            investWarning.innerHTML = `<i class="fas fa-piggy-bank"></i> ${formatMoney(invested)} investidos`;
            investWarning.style.display = 'block';
        } else {
            investWarning.style.display = 'none';
        }
    }
}

function updateCharts(currentData, prevData) {
    const currentExpenses = currentData
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + Number(t.amount), 0);

    const prevExpenses = prevData
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + Number(t.amount), 0);

    charts.renderComparison(currentExpenses, prevExpenses);

    const categoryTotals = {};
    
    currentData.filter(t => t.type === 'expense').forEach(t => {
        if (categoryTotals[t.category]) {
            categoryTotals[t.category] += Number(t.amount);
        } else {
            categoryTotals[t.category] = Number(t.amount);
        }
    });

    charts.renderCategories(categoryTotals);
}
import { transactionService } from '../services/transactionService.js';
import { formatMoney } from '../utils/formatMoney.js';
import { formatDate } from '../utils/formatDate.js';

let currentDate = new Date();
let editingId = null; // Controla se estamos editando

// Elementos DOM
const modalOverlay = document.getElementById('modalOverlay');
const form = document.getElementById('expenseForm');
const modalTitle = document.getElementById('modalTitle');

document.addEventListener('DOMContentLoaded', () => {
    updateScreen();
    setupEventListeners();
});

function setupEventListeners() {
    // Navegação Mês
    document.getElementById('prevMonth').onclick = () => changeMonth(-1);
    document.getElementById('nextMonth').onclick = () => changeMonth(1);

    // Modal
    document.getElementById('btnNewExpense').onclick = () => openModal();
    document.getElementById('btnCancel').onclick = closeModal;
    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeModal(); };

    // Submit
    form.onsubmit = handleSave;
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    updateScreen();
}

function updateScreen() {
    const allTransactions = transactionService.getAll();
    const viewYear = currentDate.getFullYear();
    const viewMonth = currentDate.getMonth();

    // Filtra APENAS DESPESAS do mês selecionado
    const expenses = allTransactions.filter(t => {
        // Verifica se é tipo 'expense'
        if (t.type !== 'expense') return false;

        const tDate = new Date(t.date + 'T00:00:00');
        
        if (t.isFixed) {
            return tDate <= new Date(viewYear, viewMonth + 1, 0);
        }
        return tDate.getMonth() === viewMonth && tDate.getFullYear() === viewYear;
    });

    updateCards(expenses);
    renderTable(expenses);

    // Atualiza Texto do Mês
    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    document.getElementById('currentMonthDisplay').textContent = monthName;
}

function updateCards(expenses) {
    const total = expenses.reduce((acc, t) => acc + Number(t.amount), 0);
    const paid = expenses.filter(t => t.isPaid).reduce((acc, t) => acc + Number(t.amount), 0);
    const pending = total - paid;

    document.getElementById('totalExpensesDisplay').textContent = formatMoney(total);
    document.getElementById('paidExpensesDisplay').textContent = formatMoney(paid);
    document.getElementById('pendingExpensesDisplay').textContent = formatMoney(pending);
}

function renderTable(expenses) {
    const tbody = document.getElementById('expensesTable');
    tbody.innerHTML = '';

    expenses.sort((a, b) => new Date(a.date) - new Date(b.date));

    expenses.forEach(t => {
        const tr = document.createElement('tr');
        const iconClass = t.isPaid ? 'fas fa-check-circle text-green' : 'far fa-circle text-grey';
        const rowOpacity = t.isPaid ? '0.6' : '1'; // Visualmente mais leve se pago

        tr.style.opacity = rowOpacity;
        
        tr.innerHTML = `
            <td style="cursor:pointer; text-align:center;" class="toggle-status" data-id="${t.id}">
                <i class="${iconClass}"></i>
            </td>
            <td>${formatDate(t.date)}</td>
            <td><span class="badge" style="background-color: #c0392b">${t.category}</span></td>
            <td>
                ${t.title}
                ${t.isFixed ? '<i class="fas fa-sync-alt" style="font-size:10px; color:#999; margin-left:5px"></i>' : ''}
            </td>
            <td class="text-red"><strong>- ${formatMoney(t.amount)}</strong></td>
            <td>
                <button class="action-btn text-blue btn-edit" data-id="${t.id}"><i class="fas fa-pencil-alt"></i></button>
                <button class="action-btn text-red btn-delete" data-id="${t.id}"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Listeners da Tabela
    document.querySelectorAll('.toggle-status').forEach(btn => {
        btn.onclick = () => {
            transactionService.toggleStatus(Number(btn.dataset.id));
            updateScreen();
        };
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.onclick = () => {
            if(confirm("Excluir esta despesa?")) {
                transactionService.delete(Number(btn.dataset.id));
                updateScreen();
            }
        };
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.onclick = () => openModal(Number(btn.dataset.id));
    });
}

// --- LÓGICA DE MODAL (CRIAR E EDITAR) ---

function openModal(id = null) {
    modalOverlay.classList.add('active');
    
    if (id) {
        // MODO EDIÇÃO
        const t = transactionService.getAll().find(item => item.id === id);
        if (t) {
            document.getElementById('transactionId').value = t.id;
            document.getElementById('title').value = t.title;
            document.getElementById('amount').value = t.amount;
            document.getElementById('date').value = t.date;
            document.getElementById('category').value = t.category;
            document.getElementById('isFixed').checked = t.isFixed;
            document.getElementById('isPaid').checked = t.isPaid;
            
            modalTitle.textContent = "Editar Despesa";
            editingId = id;
        }
    } else {
        // MODO CRIAÇÃO
        form.reset();
        document.getElementById('date').valueAsDate = new Date();
        document.getElementById('transactionId').value = '';
        modalTitle.textContent = "Nova Despesa";
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
        id: id ? Number(id) : null, // Se tiver ID, mantém. Se não, service cria.
        title: document.getElementById('title').value,
        amount: Number(document.getElementById('amount').value),
        date: document.getElementById('date').value,
        category: document.getElementById('category').value,
        type: 'expense', // Força tipo Despesa
        isFixed: document.getElementById('isFixed').checked,
        isPaid: document.getElementById('isPaid').checked
    };

    transactionService.save(transaction);
    closeModal();
    updateScreen();
}
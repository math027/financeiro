import { transactionService } from '../services/transactionService.js';
import { formatMoney } from '../utils/formatMoney.js';

const charts = {
    monthlyCategory: null,
    monthlyEvolution: null,
    annualBalance: null,
    compIncome: null,
    compExpense: null
};

let state = {
    monthly: { month: new Date().getMonth(), year: new Date().getFullYear() },
    annual: { year: new Date().getFullYear() },
    comp: { year1: new Date().getFullYear() - 1, year2: new Date().getFullYear() }
};

document.addEventListener('DOMContentLoaded', () => {
    populateYearSelects();
    
    document.getElementById('btnFilterMonthly').onclick = renderMonthlyTab;
    document.getElementById('btnFilterAnnual').onclick = renderAnnualTab;
    document.getElementById('btnFilterComp').onclick = renderComparativeTab;

    document.addEventListener('tabChanged', (e) => {
        const tab = e.detail;
        if(tab === 'monthly') renderMonthlyTab();
        if(tab === 'annual') renderAnnualTab();
        if(tab === 'comparative') renderComparativeTab();
    });

    renderMonthlyTab();
});

function populateYearSelects() {
    const transactions = transactionService.getAll();
    const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    
    years.add(new Date().getFullYear());
    years.add(new Date().getFullYear() - 1);

    const sortedYears = Array.from(years).sort((a,b) => b-a);

    const selects = ['monthlyYear', 'annualYear', 'compYear1', 'compYear2'];
    
    selects.forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = '';
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        });
    });

    document.getElementById('monthlyMonth').value = state.monthly.month;
    document.getElementById('monthlyYear').value = state.monthly.year;
    document.getElementById('annualYear').value = state.annual.year;
    
    if (sortedYears.length >= 2) {
        document.getElementById('compYear1').value = sortedYears[1]; // Anterior
        document.getElementById('compYear2').value = sortedYears[0]; // Atual
    } else {
        document.getElementById('compYear1').value = state.comp.year1;
        document.getElementById('compYear2').value = state.comp.year2;
    }
}

function renderMonthlyTab() {
    const month = Number(document.getElementById('monthlyMonth').value);
    const year = Number(document.getElementById('monthlyYear').value);
    
    const transactions = transactionService.getAll();
    
    const monthlyData = transactions.filter(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        if (t.type === 'investment') return false; 
        
        if (t.isFixed) {
            return tDate <= new Date(year, month + 1, 0);
        }
        return tDate.getMonth() === month && tDate.getFullYear() === year;
    });

    const categoryData = {};
    monthlyData.filter(t => t.type === 'expense').forEach(t => {
        categoryData[t.category] = (categoryData[t.category] || 0) + Number(t.amount);
    });

    renderChart('monthlyCategory', 'doughnut', {
        labels: Object.keys(categoryData),
        datasets: [{
            data: Object.values(categoryData),
            backgroundColor: ['#e67e22', '#c0392b', '#2980b9', '#9b59b6', '#95a5a6', '#2ecc71']
        }]
    }, document.getElementById('monthlyCategoryChart'));

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysLabels = Array.from({length: daysInMonth}, (_, i) => i + 1);
    const dailyBalance = new Array(daysInMonth).fill(0);

    let accum = 0;
    daysLabels.forEach((day, index) => {
        const dayTransactions = monthlyData.filter(t => {
            const d = new Date(t.date + 'T00:00:00');
            return d.getDate() === day;
        });

        dayTransactions.forEach(t => {
            if(t.type === 'income') accum += Number(t.amount);
            if(t.type === 'expense') accum -= Number(t.amount);
        });
        dailyBalance[index] = accum;
    });

    renderChart('monthlyEvolution', 'line', {
        labels: daysLabels,
        datasets: [{
            label: 'Saldo Acumulado',
            data: dailyBalance,
            borderColor: '#00008b',
            tension: 0.3,
            fill: true,
            backgroundColor: 'rgba(0, 0, 139, 0.1)'
        }]
    }, document.getElementById('monthlyEvolutionChart'));
}

function renderAnnualTab() {
    const year = Number(document.getElementById('annualYear').value);
    const transactions = transactionService.getAll();
    
    const incomes = new Array(12).fill(0);
    const expenses = new Array(12).fill(0);

    for (let m = 0; m < 12; m++) {
        const monthTrans = transactions.filter(t => {
            if (t.type === 'investment') return false;
            const tDate = new Date(t.date + 'T00:00:00');
            if (t.isFixed) {
                return tDate <= new Date(year, m + 1, 0);
            }
            return tDate.getMonth() === m && tDate.getFullYear() === year;
        });

        monthTrans.forEach(t => {
            if (t.type === 'income') incomes[m] += Number(t.amount);
            if (t.type === 'expense') expenses[m] += Number(t.amount);
        });
    }

    renderChart('annualBalance', 'bar', {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        datasets: [
            { label: 'Receitas', data: incomes, backgroundColor: '#2e7d32' },
            { label: 'Despesas', data: expenses, backgroundColor: '#c0392b' }
        ]
    }, document.getElementById('annualBalanceChart'));

    const totalInc = incomes.reduce((a, b) => a + b, 0);
    const totalExp = expenses.reduce((a, b) => a + b, 0);
    document.getElementById('annualTotalIncome').textContent = formatMoney(totalInc);
    document.getElementById('annualTotalExpense').textContent = formatMoney(totalExp);
    
    const res = totalInc - totalExp;
    const resEl = document.getElementById('annualResult');
    resEl.textContent = formatMoney(res);
    resEl.className = res >= 0 ? 'text-green' : 'text-red';
}

function renderComparativeTab() {
    const year1 = Number(document.getElementById('compYear1').value);
    const year2 = Number(document.getElementById('compYear2').value);
    
    const dataY1 = getAnnualData(year1);
    const dataY2 = getAnnualData(year2);
    
    const catsY1 = getCategoryTotalsByYear(year1); 
    const catsY2 = getCategoryTotalsByYear(year2);

    const allCategories = new Set([...Object.keys(catsY1), ...Object.keys(catsY2)]);
    const differences = [];

    allCategories.forEach(cat => {
        const val1 = catsY1[cat] || 0;
        const val2 = catsY2[cat] || 0;
        const diff = val2 - val1;
        
        if (diff !== 0) {
            differences.push({ category: cat, diff: diff });
        }
    });

    const increases = differences
        .filter(d => d.diff > 0)
        .sort((a, b) => b.diff - a.diff)
        .slice(0, 5);

    const decreases = differences
        .filter(d => d.diff < 0)
        .sort((a, b) => a.diff - b.diff) 
        .slice(0, 5);

    renderCategoryList('topIncreasesList', increases, true);
    renderCategoryList('topDecreasesList', decreases, false);


    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    renderChart('compIncome', 'bar', {
        labels: labels,
        datasets: [
            { label: `${year1}`, data: dataY1.incomes, backgroundColor: '#a5d6a7', borderRadius: 4 },
            { label: `${year2}`, data: dataY2.incomes, backgroundColor: '#2e7d32', borderRadius: 4 }
        ]
    }, document.getElementById('compIncomeChart'));

    renderChart('compExpense', 'bar', {
        labels: labels,
        datasets: [
            { label: `${year1}`, data: dataY1.expenses, backgroundColor: '#ef9a9a', borderRadius: 4 },
            { label: `${year2}`, data: dataY2.expenses, backgroundColor: '#c62828', borderRadius: 4 }
        ]
    }, document.getElementById('compExpenseChart'));
}


function getCategoryTotalsByYear(year) {
    const transactions = transactionService.getAll();
    const totals = {};
    
    transactions.filter(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        return t.type === 'expense' && tDate.getFullYear() === year;
    }).forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + Number(t.amount);
    });
    
    return totals;
}

function renderCategoryList(elementId, items, isIncrease) {
    const list = document.getElementById(elementId);
    list.innerHTML = '';

    if (items.length === 0) {
        list.innerHTML = '<li class="text-grey" style="padding:10px; font-size:0.9rem;">Nenhuma variação relevante.</li>';
        return;
    }

    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'category-item';
        
        const sign = item.diff > 0 ? '+' : '';
        const colorClass = isIncrease ? 'text-red' : 'text-green';
        
        li.innerHTML = `
            <span class="category-name">${item.category}</span>
            <span class="diff-value ${colorClass}">${sign}${formatMoney(item.diff)}</span>
        `;
        
        list.appendChild(li);
    });
}

function updateVariationBadge(elementId, val1, val2, isExpense) {
    const el = document.getElementById(elementId);
    let percent = 0;

    if (val1 !== 0) {
        percent = ((val2 - val1) / Math.abs(val1)) * 100;
    } else if (val2 !== 0) {
        percent = 100;
    }

    const signal = percent > 0 ? '+' : '';
    el.textContent = `${signal}${percent.toFixed(1)}%`;

    el.style.color = '#fff';
    
    if (isExpense) {
        el.style.backgroundColor = percent > 0 ? '#c62828' : '#2e7d32'; 
        if(percent === 0) el.style.backgroundColor = '#999';
    } else {
        el.style.backgroundColor = percent >= 0 ? '#2e7d32' : '#c62828';
        if(percent === 0) el.style.backgroundColor = '#999';
    }
}

function getAnnualData(year) {
    const transactions = transactionService.getAll();
    const incomes = new Array(12).fill(0);
    const expenses = new Array(12).fill(0);

    for (let m = 0; m < 12; m++) {
        const monthTrans = transactions.filter(t => {
            if (t.type === 'investment') return false;
            const tDate = new Date(t.date + 'T00:00:00');
            if (t.isFixed) {
                return tDate <= new Date(year, m + 1, 0);
            }
            return tDate.getMonth() === m && tDate.getFullYear() === year;
        });

        monthTrans.forEach(t => {
            if (t.type === 'income') incomes[m] += Number(t.amount);
            if (t.type === 'expense') expenses[m] += Number(t.amount);
        });
    }
    return { incomes, expenses };
}

function renderChart(key, type, data, canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (charts[key]) {
        charts[key].destroy();
    }

    charts[key] = new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: type === 'doughnut' ? {} : {
                y: { beginAtZero: true }
            }
        }
    });
}
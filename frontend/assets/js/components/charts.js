// Variáveis locais para controlar as instâncias e evitar sobreposição
let comparisonChartInstance = null;
let categoryChartInstance = null;

// AQUI ESTÁ O IMPORTANTE: "export const charts"
export const charts = {
    
    renderComparison: (currentMonthValue, lastMonthValue) => {
        const canvas = document.getElementById('comparisonChart');
        if (!canvas) return; // Evita erro se o canvas não existir
        
        const ctx = canvas.getContext('2d');
        
        // Destrói gráfico anterior se existir
        if (comparisonChartInstance) comparisonChartInstance.destroy();

        comparisonChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Mês Anterior', 'Mês Atual'],
                datasets: [{
                    label: 'Total Despesas',
                    data: [lastMonthValue, currentMonthValue],
                    backgroundColor: ['#e0e0e0', '#d32f2f'],
                    borderRadius: 4,
                    barThickness: 50
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    renderCategories: (categoriesData) => {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (categoryChartInstance) categoryChartInstance.destroy();

        const labels = Object.keys(categoriesData);
        const data = Object.values(categoriesData);

        // Cores padrão
        const colors = {
            'Alimentação': '#e67e22',
            'Moradia': '#c0392b',
            'Salário': '#27ae60',
            'Transporte': '#2980b9',
            'Lazer': '#9b59b6',
            'Outros': '#95a5a6'
        };

        const bgColors = labels.map(cat => colors[cat] || '#333');

        categoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: bgColors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12 } }
                }
            }
        });
    }
};
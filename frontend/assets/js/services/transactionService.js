const DB_KEY = 'finances:transactions';

export const transactionService = {
    getAll: () => {
        const data = localStorage.getItem(DB_KEY);
        return data ? JSON.parse(data) : [];
    },

    save: (transaction) => {
        const transactions = transactionService.getAll();
        
        if (transaction.id) {
            // Edição (futura)
            const index = transactions.findIndex(t => t.id === transaction.id);
            if (index > -1) transactions[index] = transaction;
        } else {
            // Criação
            transaction.id = Date.now();
            transactions.push(transaction);
        }

        localStorage.setItem(DB_KEY, JSON.stringify(transactions));
    },

    delete: (id) => {
        let transactions = transactionService.getAll();
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem(DB_KEY, JSON.stringify(transactions));
    },

    toggleStatus: (id) => {
        const transactions = transactionService.getAll();
        const index = transactions.findIndex(t => t.id === id);
        if (index > -1) {
            transactions[index].isPaid = !transactions[index].isPaid;
            localStorage.setItem(DB_KEY, JSON.stringify(transactions));
        }
    }
};
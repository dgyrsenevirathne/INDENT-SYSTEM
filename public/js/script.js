document.addEventListener('DOMContentLoaded', function () {
    // Load suppliers when page loads
    loadSuppliers();

    // Add event listeners for calculation
    const numericInputs = ['value', 'reimbursement', 'harringTransport', 'vat', 'nbt', 'advance', 'commission'];
    numericInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', calculateTotal);
    });

    // Form submission
    document.getElementById('indentForm').addEventListener('submit', handleSubmit);
});

function calculateTotal() {
    const getValue = id => parseFloat(document.getElementById(id).value) || 0;

    const total = getValue('value') +
        getValue('reimbursement') +
        getValue('harringTransport') +
        getValue('vat') +
        getValue('nbt') +
        getValue('advance') +
        getValue('commission');

    document.getElementById('total').value = total.toFixed(2);
}

async function loadSuppliers() {
    try {
        const response = await fetch('/api/suppliers');
        const suppliers = await response.json();
        const select = document.getElementById('supplier');

        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.SupplierID;
            option.textContent = supplier.SupplierName;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

async function handleSubmit(e) {
    e.preventDefault();

    const formData = {
        indentNo: document.getElementById('indentNo').value,
        complexRef: document.getElementById('complexRef').value,
        date: document.getElementById('date').value,
        currency: document.getElementById('currency').value,
        baseValue: parseFloat(document.getElementById('baseValue').value),
        value: parseFloat(document.getElementById('value').value),
        reimbursement: parseFloat(document.getElementById('reimbursement').value),
        harringTransport: parseFloat(document.getElementById('harringTransport').value),
        vat: parseFloat(document.getElementById('vat').value),
        nbt: parseFloat(document.getElementById('nbt').value),
        advance: parseFloat(document.getElementById('advance').value),
        commission: parseFloat(document.getElementById('commission').value),
        total: parseFloat(document.getElementById('total').value),
        complex: document.getElementById('complex').value,
        item: document.getElementById('item').value,
        supplierId: parseInt(document.getElementById('supplier').value)
    };

    try {
        const response = await fetch('/api/indents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (response.ok) {
            console.log('Indent saved successfully:', result);
            alert('Indent saved successfully!');
            document.getElementById('indentForm').reset();
            window.location.href = '/dashboard.html';
        } else {
            console.error('Error saving indent:', result.error);
            alert('Error saving indent: ' + result.error);
        }
    } catch (error) {
        console.error('Network error:', error);
        alert('Network error: ' + error.message);
    }
}

document.getElementById('submitBtn').addEventListener('click', handleSubmit);

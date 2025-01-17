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

// Add event listener to Add Supplier button
document.getElementById('addSupplierBtn').addEventListener('click', function () {
    document.getElementById('addSupplierModal').style.display = 'flex';
});

// Add event listener to close button
document.querySelector('.close').onclick = function () {
    document.getElementById('addSupplierModal').style.display = 'none';
}

// Add event listener to Add Supplier submit button
document.getElementById('addSupplierSubmit').addEventListener('click', async function () {
    const newSupplierName = document.getElementById('newSupplierName').value;
    if (newSupplierName) {
        try {
            const response = await fetch('/api/suppliers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ SupplierName: newSupplierName })
            });
            const data = await response.json();
            if (response.ok) {
                console.log('Supplier added successfully:', data);
                alert('Supplier added successfully!');
                // Refresh supplier dropdown
                loadSuppliers();
                document.getElementById('addSupplierModal').style.display = 'none';
            } else {
                console.error('Error adding supplier:', data.error);
                alert('Error adding supplier: ' + data.error);
            }
        } catch (error) {
            console.error('Error adding supplier:', error);
            alert('Error adding supplier: ' + error.message);
        }
    }
});

async function loadSuppliers() {
    try {
        const response = await fetch('/api/suppliers');
        const suppliers = await response.json();
        const select = document.getElementById('supplier');
        select.innerHTML = '';
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

    const indentNo = document.getElementById('indentNo').value;

    // First, check if the indent number already exists
    try {
        const checkResponse = await fetch(`/api/indents/check?indentNo=${encodeURIComponent(indentNo)}`);
        const checkResult = await checkResponse.json();

        if (checkResult.exists) {
            alert('Indent number already exists. Please use a different indent number.');
            return;
        }
    } catch (error) {
        console.error('Error checking indent number:', error);
        alert('Error checking indent number: ' + error.message);
        return;
    }

    const formData = {
        indentNo: document.getElementById('indentNo').value,
        refTvNo: document.getElementById('refTvNo').value,
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
        supplierId: parseInt(document.getElementById('supplier').value),
        indentType: document.getElementById('indentType').value
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

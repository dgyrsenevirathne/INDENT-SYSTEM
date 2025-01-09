document.addEventListener('DOMContentLoaded', function () {
    // Get indent ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const indentNo = urlParams.get('indentNo');

    document.getElementById('indentNo').value = indentNo;
    document.getElementById('indentNoDisplay').textContent = indentNo;

    // Add event listeners for calculation
    const numericInputs = ['addValue', 'addReimbursement', 'addHarringTransport',
        'addVAT', 'addRAT', 'addAdvance', 'addCommission'];

    numericInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', calculateTotal);
    });

    // Form submission
    document.getElementById('addValuesForm').addEventListener('submit', handleSubmit);
});

function calculateTotal() {
    const getValue = id => parseFloat(document.getElementById(id).value) || 0;

    const total = getValue('addValue') +
        getValue('addReimbursement') +
        getValue('addHarringTransport') +
        getValue('addVAT') +
        getValue('addRAT') +
        getValue('addAdvance') +
        getValue('addCommission');

    document.getElementById('addTotal').value = total.toFixed(2);
}

async function handleSubmit(e) {
    e.preventDefault();

    const formData = {
        indentNo: document.getElementById('indentNo').value,
        refTvNo: document.getElementById('refTvNo').value,
        addDate: document.getElementById('addDate').value,
        addCurrency: document.getElementById('addCurrency').value,
        addBaseValue: parseFloat(document.getElementById('addBaseValue').value),
        addValue: parseFloat(document.getElementById('addValue').value),
        addReimbursement: parseFloat(document.getElementById('addReimbursement').value),
        addHarringTransport: parseFloat(document.getElementById('addHarringTransport').value),
        addVAT: parseFloat(document.getElementById('addVAT').value),
        addRAT: parseFloat(document.getElementById('addRAT').value),
        addAdvance: parseFloat(document.getElementById('addAdvance').value),
        addCommission: parseFloat(document.getElementById('addCommission').value),
        addTotal: parseFloat(document.getElementById('addTotal').value)
    };

    try {
        const response = await fetch('/api/addindents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (response.ok) {
            alert('Values added successfully!');
            window.location.href = '/dashboard.html';
        } else {
            alert('Error adding values: ' + result.error);
        }
    } catch (error) {
        alert('Network error: ' + error.message);
    }
}

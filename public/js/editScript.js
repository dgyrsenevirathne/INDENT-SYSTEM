document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const indentNo = urlParams.get('indentNo');
    loadIndentData(indentNo);


    // Add calculation listeners
    const numericInputs = ['value', 'reimbursement', 'harringTransport',
        'vat', 'nbt', 'advance', 'commission'];

    numericInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', calculateTotal);
    });

    document.getElementById('editIndentForm').addEventListener('submit', handleEditSubmit);
});

// Add total calculation function
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

async function loadIndentData(indentNo) {
    try {
        const encodedIndentNo = encodeURIComponent(indentNo);
        const response = await fetch(`/api/indents/${encodedIndentNo}`);
        if (!response.ok) {
            throw new Error('Failed to load indent data');
        }
        const indent = await response.json();

        // Fetch supplier data
        const supplierResponse = await fetch('/api/suppliers');
        const suppliers = await supplierResponse.json();

        // Populate the form fields with the received data
        document.getElementById('indentNo').value = indent.IndentNo;
        document.getElementById('complexRef').value = indent.ComplexReference;
        document.getElementById('indentType').value = indent.IndentType;
        document.getElementById('currency').value = indent.Currency;
        document.getElementById('date').value = new Date(indent.IndentDate).toISOString().split('T')[0];
        document.getElementById('baseValue').value = indent.BaseValue;
        document.getElementById('value').value = indent.Value;
        document.getElementById('reimbursement').value = indent.Reimbursement;
        document.getElementById('harringTransport').value = indent.HarringAndTransport;
        document.getElementById('vat').value = indent.VAT;
        document.getElementById('nbt').value = indent.NBT;
        document.getElementById('advance').value = indent.Advance;
        document.getElementById('commission').value = indent.Commission;
        document.getElementById('total').value = indent.Total;
        document.getElementById('complex').value = indent.Complex;
        document.getElementById('item').value = indent.Item;

        // Populate supplier dropdown
        const supplierSelect = document.getElementById('supplier');
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.SupplierID;
            option.textContent = supplier.SupplierName;
            supplierSelect.appendChild(option);
        });
        supplierSelect.value = indent.SupplierID;
    } catch (error) {
        console.error('Error loading indent data:', error);
    }
}
async function handleEditSubmit(e) {
    e.preventDefault();

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const originalIndentNo = urlParams.get('indentNo');

        if (!originalIndentNo) {
            throw new Error('No indent number provided');
        }

        calculateTotal();
        const formData = getFormData();

        if (!validateFormData(formData)) {
            alert('Please fill in all required fields with valid values');
            return;
        }

        const result = await updateIndent(formData);

        if (result.success) {
            alert('Indent updated successfully!');
            window.location.href = '/dashboard.html';
        } else {
            throw new Error(result.error || 'Failed to update indent');
        }
    } catch (error) {
        console.error('Error updating indent:', error);
        alert('Error updating indent: ' + error.message);
    }
}
function getFormData() {
    return {
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
        supplierId: parseInt(document.getElementById('supplier').value),
        indentType: document.getElementById('indentType').value
    };
}

async function updateIndent(formData) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const originalIndentNo = urlParams.get('indentNo');

        if (!originalIndentNo) {
            throw new Error('Original indent number not found');
        }

        const response = await fetch(`/api/indents/${encodeURIComponent(originalIndentNo)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...formData,
                indentNo: formData.indentNo.trim()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update indent');
        }

        return data;
    } catch (error) {
        console.error('Error in updateIndent:', error);
        throw error;
    }
}

function validateFormData(formData) {
    // Check for required fields
    const requiredFields = [
        'indentNo', 'complexRef', 'date', 'currency',
        'baseValue', 'value', 'complex', 'item', 'supplierId'
    ];

    for (const field of requiredFields) {
        if (!formData[field] && formData[field] !== 0) {
            return false;
        }
    }

    // Validate numeric fields
    const numericFields = [
        'baseValue', 'value', 'reimbursement', 'harringTransport',
        'vat', 'nbt', 'advance', 'commission', 'total'
    ];

    for (const field of numericFields) {
        if (isNaN(formData[field])) {
            return false;
        }
    }

    return true;
}

async function getError(response) {
    try {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return 'Invalid server response';
        }
        const data = await response.json();
        return data.error || data.message || 'Unknown error occurred';
    } catch (error) {
        return 'Failed to parse error response';
    }
}
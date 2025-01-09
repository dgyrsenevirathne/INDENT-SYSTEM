const express = require('express');
const sql = require('mssql/msnodesqlv8');
const path = require('path');

const app = express();
app.use(express.json());

// Redirect root URL to dashboard.html
app.get('/', (req, res) => {
    console.log('Redirecting to dashboard.html'); // Debug log
    res.redirect('/dashboard.html'); // Redirect to dashboard.html
});

app.use(express.static('public'));

const sqlConfig = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=MSI\\SQLEXPRESS;Database=IndentDB;Trusted_Connection=yes;'
};

// Get all suppliers
app.get('/api/suppliers', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const result = await sql.query('SELECT * FROM Suppliers');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new indent
app.post('/api/indents', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const request = new sql.Request();

        console.log('Form Data:', req.body);

        const query = `
            INSERT INTO Indents (
                IndentNo, ComplexReference, IndentDate, Currency, BaseValue,
                Value, Reimbursement, HarringAndTransport, VAT, RAT,
                Advance, Commission, Total, PSCode, Complex, Item, SupplierID
            )
            VALUES (
                @indentNo, @complexRef, @date, @currency, @baseValue,
                @value, @reimbursement, @harringTransport, @vat, @rat,
                @advance, @commission, @total, @psCode, @complex, @item, @supplierId
            )
        `;

        console.log('SQL Query:', query);

        // Add parameters
        request.input('indentNo', sql.VarChar, req.body.indentNo);
        request.input('complexRef', sql.VarChar, req.body.complexRef);
        request.input('date', sql.Date, new Date(req.body.date));
        request.input('currency', sql.VarChar, req.body.currency);
        request.input('baseValue', sql.Decimal, req.body.baseValue);
        request.input('value', sql.Decimal, req.body.value);
        request.input('reimbursement', sql.Decimal, req.body.reimbursement);
        request.input('harringTransport', sql.Decimal, req.body.harringTransport);
        request.input('vat', sql.Decimal, req.body.vat);
        request.input('rat', sql.Decimal, req.body.rat);
        request.input('advance', sql.Decimal, req.body.advance);
        request.input('commission', sql.Decimal, req.body.commission);
        request.input('total', sql.Decimal, req.body.total);
        request.input('psCode', sql.VarChar, req.body.psCode);
        request.input('complex', sql.VarChar, req.body.complex);
        request.input('item', sql.NVarChar(sql.MAX), req.body.item); // Updated to NVARCHAR(MAX)
        request.input('supplierId', sql.Int, req.body.supplierId);

        const result = await request.query(query);
        console.log('Indent saved successfully:', result);
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving indent:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all indents for dashboard
app.get('/api/indents', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const result = await sql.query(`
            SELECT i.*, s.SupplierName 
            FROM Indents i 
            LEFT JOIN Suppliers s ON i.SupplierID = s.SupplierID
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

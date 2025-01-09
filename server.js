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

const createAddIndentsTable = async () => {
    try {
        await sql.connect(sqlConfig);
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AddIndents' AND xtype='U')
            CREATE TABLE AddIndents (
                AddIndentID INT PRIMARY KEY IDENTITY(1,1),
                IndentNo VARCHAR(50),
                RefTvNo VARCHAR(50),
                AddDate DATE,
                AddCurrency VARCHAR(10),
                AddBaseValue DECIMAL(18,2),
                AddValue DECIMAL(18,2),
                AddReimbursement DECIMAL(18,2),
                AddHarringAndTransport DECIMAL(18,2),
                AddVAT DECIMAL(18,2),
                AddRAT DECIMAL(18,2),
                AddAdvance DECIMAL(18,2),
                AddCommission DECIMAL(18,2),
                AddTotal DECIMAL(18,2),
                CreatedAt DATETIME DEFAULT GETDATE()
            )
        `);
    } catch (err) {
        console.error('Error creating AddIndents table:', err);
    }
};



// Add new values endpoint
app.post('/api/addindents', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const transaction = new sql.Transaction();
        await transaction.begin();

        try {
            // 1. Insert into AddIndents table
            const request1 = new sql.Request(transaction);
            await request1.input('indentNo', sql.VarChar, req.body.indentNo)
                .input('refTvNo', sql.VarChar, req.body.refTvNo)
                .input('addDate', sql.Date, new Date(req.body.addDate))
                .input('addCurrency', sql.VarChar, req.body.addCurrency)
                .input('addBaseValue', sql.Decimal, req.body.addBaseValue)
                .input('addValue', sql.Decimal, req.body.addValue)
                .input('addReimbursement', sql.Decimal, req.body.addReimbursement)
                .input('addHarringTransport', sql.Decimal, req.body.addHarringTransport)
                .input('addVAT', sql.Decimal, req.body.addVAT)
                .input('addRAT', sql.Decimal, req.body.addRAT)
                .input('addAdvance', sql.Decimal, req.body.addAdvance)
                .input('addCommission', sql.Decimal, req.body.addCommission)
                .input('addTotal', sql.Decimal, req.body.addTotal)
                .query(`
                            INSERT INTO AddIndents (
                                IndentNo, RefTvNo, AddDate, AddCurrency, AddBaseValue,
                                AddValue, AddReimbursement, AddHarringAndTransport,
                                AddVAT, AddRAT, AddAdvance, AddCommission, AddTotal
                            )
                            VALUES (
                                @indentNo, @refTvNo, @addDate, @addCurrency, @addBaseValue,
                                @addValue, @addReimbursement, @addHarringTransport,
                                @addVAT, @addRAT, @addAdvance, @addCommission, @addTotal
                            )
                         `);

            // 2. Update Indents table
            const request2 = new sql.Request(transaction);
            await request2.input('indentNo', sql.VarChar, req.body.indentNo)
                .input('addBaseValue', sql.Decimal, req.body.addBaseValue)
                .input('addValue', sql.Decimal, req.body.addValue)
                .input('addReimbursement', sql.Decimal, req.body.addReimbursement)
                .input('addHarringTransport', sql.Decimal, req.body.addHarringTransport)
                .input('addVAT', sql.Decimal, req.body.addVAT)
                .input('addRAT', sql.Decimal, req.body.addRAT)
                .input('addAdvance', sql.Decimal, req.body.addAdvance)
                .input('addCommission', sql.Decimal, req.body.addCommission)
                .input('addTotal', sql.Decimal, req.body.addTotal)
                .query(`
                            UPDATE Indents
                            SET BaseValue = BaseValue + @addBaseValue,
                                Value = Value + @addValue,
                                Reimbursement = Reimbursement + @addReimbursement,
                                HarringAndTransport = HarringAndTransport + @addHarringTransport,
                                VAT = VAT + @addVAT,
                                RAT = RAT + @addRAT,
                                Advance = Advance + @addAdvance,
                                Commission = Commission + @addCommission,
                                Total = Total + @addTotal
                            WHERE IndentNo = @indentNo
                         `);

            await transaction.commit();
            res.json({ success: true });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Error in /api/addindents:', err);
        res.status(500).json({ error: err.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Call this when server starts
createAddIndentsTable();

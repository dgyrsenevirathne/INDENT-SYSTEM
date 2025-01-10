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
        const transaction = new sql.Transaction();
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            // Add all parameters once
            request.input('indentNo', sql.VarChar, req.body.indentNo);
            request.input('refTvNo', sql.VarChar, req.body.refTvNo);
            request.input('complexRef', sql.VarChar, req.body.complexRef);
            request.input('date', sql.Date, new Date(req.body.date));
            request.input('currency', sql.VarChar, req.body.currency);
            request.input('baseValue', sql.Decimal, req.body.baseValue);
            request.input('value', sql.Decimal, req.body.value);
            request.input('reimbursement', sql.Decimal, req.body.reimbursement);
            request.input('harringTransport', sql.Decimal, req.body.harringTransport);
            request.input('vat', sql.Decimal, req.body.vat);
            request.input('nbt', sql.Decimal, req.body.nbt);
            request.input('advance', sql.Decimal, req.body.advance);
            request.input('commission', sql.Decimal, req.body.commission);
            request.input('total', sql.Decimal, req.body.total);
            request.input('complex', sql.VarChar, req.body.complex);
            request.input('item', sql.NVarChar(sql.MAX), req.body.item);
            request.input('supplierId', sql.Int, req.body.supplierId);
            request.input('indentType', sql.NVarChar(50), req.body.indentType);

            // Check existing indent
            const checkQuery = `
                SELECT IndentNo FROM Indents 
                WHERE IndentNo = @indentNo AND Status = 0
            `;
            const existingIndent = await request.query(checkQuery);

            // Handle Indents table
            if (existingIndent.recordset.length > 0) {
                await request.query(`
                    UPDATE Indents SET
                        ComplexReference = @complexRef,
                        IndentDate = @date,
                        Currency = @currency,
                        BaseValue = @baseValue,
                        Value = @value,
                        Reimbursement = @reimbursement,
                        HarringAndTransport = @harringTransport,
                        VAT = @vat,
                        NBT = @nbt,
                        Advance = @advance,
                        Commission = @commission,
                        Total = @total,
                        Complex = @complex,
                        Item = @item,
                        SupplierID = @supplierId,
                        IndentType = @indentType,
                        Status = 1
                    WHERE IndentNo = @indentNo
                `);
            } else {
                await request.query(`
                    INSERT INTO Indents (
                        IndentNo, ComplexReference, IndentDate, Currency, BaseValue,
                        Value, Reimbursement, HarringAndTransport, VAT, NBT,
                        Advance, Commission, Total, Complex, Item, SupplierID, IndentType, Status
                    )
                    VALUES (
                        @indentNo, @complexRef, @date, @currency, @baseValue,
                        @value, @reimbursement, @harringTransport, @vat, @nbt,
                        @advance, @commission, @total, @complex, @item, @supplierId, @indentType, 1
                    )
                `);
            }

            // Handle AddIndents table if refTvNo exists
            if (req.body.refTvNo) {
                await request.query(`
                    INSERT INTO AddIndents (
                        IndentNo, RefTvNo, AddDate, AddCurrency, AddBaseValue,
                        AddValue, AddReimbursement, AddHarringAndTransport,
                        AddVAT, AddNBT, AddAdvance, AddCommission, AddTotal
                    )
                    VALUES (
                        @indentNo, @refTvNo, @date, @currency, @baseValue,
                        @value, @reimbursement, @harringTransport,
                        @vat, @nbt, @advance, @commission, @total
                    )
                `);
            }

            await transaction.commit();
            res.json({ success: true });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
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
            WHERE i.Status = 1
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
                AddNBT DECIMAL(18,2),
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
                .input('addNBT', sql.Decimal, req.body.addNBT)
                .input('addAdvance', sql.Decimal, req.body.addAdvance)
                .input('addCommission', sql.Decimal, req.body.addCommission)
                .input('addTotal', sql.Decimal, req.body.addTotal)
                .query(`
                            INSERT INTO AddIndents (
                                IndentNo, RefTvNo, AddDate, AddCurrency, AddBaseValue,
                                AddValue, AddReimbursement, AddHarringAndTransport,
                                AddVAT, AddNBT, AddAdvance, AddCommission, AddTotal
                            )
                            VALUES (
                                @indentNo, @refTvNo, @addDate, @addCurrency, @addBaseValue,
                                @addValue, @addReimbursement, @addHarringTransport,
                                @addVAT, @addNBT, @addAdvance, @addCommission, @addTotal
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
                .input('addNBT', sql.Decimal, req.body.addNBT)
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
                                NBT = NBT + @addNBT,
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

app.put('/api/indents/:indentNo/status', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const request = new sql.Request();

        // Clean the indent number by removing all spaces
        const indentNo = decodeURIComponent(req.params.indentNo).replace(/\s+/g, '');

        // Modified query to handle potential spacing differences
        const query = `
            UPDATE Indents
            SET Status = 0
            WHERE REPLACE(IndentNo, ' ', '') = @indentNo
        `;

        request.input('indentNo', sql.VarChar, indentNo);

        console.log('Attempting to delete indent:', indentNo); // Debug log

        // First, let's verify if the record exists
        const checkQuery = `SELECT IndentNo FROM Indents WHERE REPLACE(IndentNo, ' ', '') = @indentNo`;
        const checkResult = await request.query(checkQuery);

        if (checkResult.recordset.length === 0) {
            console.log('Record not found in database. Available records:');
            // Debug: List all indent numbers for comparison
            const allIndents = await request.query('SELECT IndentNo FROM Indents');
            console.log(allIndents.recordset.map(r => r.IndentNo));
            return res.status(404).json({ message: 'Indent not found' });
        }

        const result = await request.query(query);
        res.json({ success: true, message: 'Indent deleted successfully' });
    } catch (err) {
        console.error('Error updating indent status:', err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Call this when server starts
createAddIndentsTable();

const express = require('express');
const sql = require('mssql/msnodesqlv8');
const path = require('path');

const app = express();
app.use(express.json());

// Redirect root URL to dashboard.html
app.get('/', (req, res) => {
    console.log('Redirecting to dashboard.html');
    res.redirect('/dashboard.html');
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
            request.input('baseValue', sql.Decimal(18, 2), req.body.baseValue);
            request.input('value', sql.Decimal(18, 2), req.body.value);
            request.input('reimbursement', sql.Decimal(18, 2), req.body.reimbursement);
            request.input('harringTransport', sql.Decimal(18, 2), req.body.harringTransport);
            request.input('vat', sql.Decimal(18, 2), req.body.vat);
            request.input('nbt', sql.Decimal(18, 2), req.body.nbt);
            request.input('advance', sql.Decimal(18, 2), req.body.advance);
            request.input('commission', sql.Decimal(18, 2), req.body.commission);
            request.input('total', sql.Decimal(18, 2), req.body.total);
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
            SELECT i.*, s.SupplierName,
                   i.Total as IndentTotal,
                   g.GrnNo,
                   g.GrnAmount   
            FROM Indents i 
            LEFT JOIN Suppliers s ON i.SupplierID = s.SupplierID
            LEFT JOIN GRN g ON i.IndentNo = g.IndentNo AND g.Status = 1
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
                .input('addBaseValue', sql.Decimal(18, 2), req.body.addBaseValue)
                .input('addValue', sql.Decimal(18, 2), req.body.addValue)
                .input('addReimbursement', sql.Decimal(18, 2), req.body.addReimbursement)
                .input('addHarringTransport', sql.Decimal(18, 2), req.body.addHarringTransport)
                .input('addVAT', sql.Decimal(18, 2), req.body.addVAT)
                .input('addNBT', sql.Decimal(18, 2), req.body.addNBT)
                .input('addAdvance', sql.Decimal(18, 2), req.body.addAdvance)
                .input('addCommission', sql.Decimal(18, 2), req.body.addCommission)
                .input('addTotal', sql.Decimal(18, 2), req.body.addTotal)
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
                .input('addBaseValue', sql.Decimal(18, 2), req.body.addBaseValue)
                .input('addValue', sql.Decimal(18, 2), req.body.addValue)
                .input('addReimbursement', sql.Decimal(18, 2), req.body.addReimbursement)
                .input('addHarringTransport', sql.Decimal(18, 2), req.body.addHarringTransport)
                .input('addVAT', sql.Decimal(18, 2), req.body.addVAT)
                .input('addNBT', sql.Decimal(18, 2), req.body.addNBT)
                .input('addAdvance', sql.Decimal(18, 2), req.body.addAdvance)
                .input('addCommission', sql.Decimal(18, 2), req.body.addCommission)
                .input('addTotal', sql.Decimal(18, 2), req.body.addTotal)
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
    let transaction;
    try {
        await sql.connect(sqlConfig);
        transaction = new sql.Transaction();
        await transaction.begin();

        const request = new sql.Request(transaction);
        const indentNo = decodeURIComponent(req.params.indentNo).replace(/\s+/g, '');

        console.log('Attempting to delete indent:', indentNo);

        const checkQuery = `SELECT IndentNo FROM Indents WHERE REPLACE(IndentNo, ' ', '') = @indentNo`;
        request.input('indentNo', sql.VarChar, indentNo);
        const checkResult = await request.query(checkQuery);

        if (checkResult.recordset.length === 0) {
            console.log('Record not found in database.');
            const allIndents = await request.query('SELECT IndentNo FROM Indents');
            console.log(allIndents.recordset.map(r => r.IndentNo));
            await transaction.rollback();
            return res.status(404).json({ message: 'Indent not found' });
        }

        // Update both Indents and GRN tables
        const updateQuery = `
            UPDATE Indents
            SET Status = 0, DeletedDate = GETDATE()
            WHERE REPLACE(IndentNo, ' ', '') = @indentNo;

            UPDATE GRN
            SET Status = 0
            WHERE REPLACE(IndentNo, ' ', '') = @indentNo;
        `;

        await request.query(updateQuery);
        await transaction.commit();

        res.json({ success: true, message: 'Indent and related GRN records deleted successfully' });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error updating status:', err);
        res.status(500).json({ error: err.message });
    }
});

// Check if indent number already exists
app.get('/api/indents/check', async (req, res) => {
    const indentNo = req.query.indentNo;

    try {
        await sql.connect(sqlConfig);
        const result = await sql.query`SELECT IndentNo FROM Indents WHERE IndentNo = ${indentNo}`;

        if (result.recordset.length > 0) {
            res.json({ exists: true });
        } else {
            res.json({ exists: false });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/log-indent-deletion', async (req, res) => {
    try {
        const indentNo = req.body.indentNo;
        console.log(`Indent ${indentNo} deleted by user`);
        res.json({ success: true });
    } catch (err) {
        console.error('Error logging indent deletion:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get indent by indent number
app.get('/api/indents/:indentNo', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const request = new sql.Request();
        request.input('indentNo', sql.VarChar, req.params.indentNo);
        const result = await request.query('SELECT * FROM Indents WHERE IndentNo = @indentNo');
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/indents/:indentNo', async (req, res) => {
    let transaction;
    try {
        await sql.connect(sqlConfig);
        transaction = new sql.Transaction();
        await transaction.begin();

        const request = new sql.Request(transaction);

        // Add all parameters with unique names
        request.input('oldIndentNo', sql.VarChar, decodeURIComponent(req.params.indentNo));
        request.input('newIndentNo', sql.VarChar, req.body.indentNo);
        request.input('complexRef', sql.VarChar, req.body.complexRef);
        request.input('indentDate', sql.Date, new Date(req.body.date));
        request.input('currency', sql.VarChar, req.body.currency);
        request.input('baseValue', sql.Decimal(18, 2), req.body.baseValue);
        request.input('value', sql.Decimal(18, 2), req.body.value);
        request.input('reimbursement', sql.Decimal(18, 2), req.body.reimbursement);
        request.input('harringTransport', sql.Decimal(18, 2), req.body.harringTransport);
        request.input('vat', sql.Decimal(18, 2), req.body.vat);
        request.input('nbt', sql.Decimal(18, 2), req.body.nbt);
        request.input('advance', sql.Decimal(18, 2), req.body.advance);
        request.input('commission', sql.Decimal(18, 2), req.body.commission);
        request.input('total', sql.Decimal(18, 2), req.body.total);
        request.input('complex', sql.VarChar, req.body.complex);
        request.input('item', sql.VarChar, req.body.item);
        request.input('supplierId', sql.Int, req.body.supplierId);
        request.input('indentType', sql.VarChar, req.body.indentType);

        // Check if indent number is changing
        const isIndentNoChanging = req.params.indentNo !== req.body.indentNo;

        if (isIndentNoChanging) {
            // Check for duplicates
            const checkResult = await request.query(
                `SELECT COUNT(*) as count FROM Indents 
                 WHERE IndentNo = @newIndentNo 
                 AND IndentNo != @oldIndentNo`
            );

            if (checkResult.recordset[0].count > 0) {
                throw new Error('New indent number already exists');
            }

            // Insert new record
            await request.query(
                `INSERT INTO Indents (
                    IndentNo, ComplexReference, IndentDate, Currency, 
                    BaseValue, Value, Reimbursement, HarringAndTransport,
                    VAT, NBT, Advance, Commission, Total, Complex,
                    Item, SupplierID, IndentType
                ) VALUES (
                    @newIndentNo, @complexRef, @indentDate, @currency,
                    @baseValue, @value, @reimbursement, @harringTransport,
                    @vat, @nbt, @advance, @commission, @total, @complex,
                    @item, @supplierId, @indentType
                )`
            );

            // Update related tables
            await request.query(
                `UPDATE GRN SET IndentNo = @newIndentNo 
                 WHERE IndentNo = @oldIndentNo;
                 
                 UPDATE AddIndents SET IndentNo = @newIndentNo 
                 WHERE IndentNo = @oldIndentNo;`
            );

            // Delete old record
            await request.query(`DELETE FROM Indents WHERE IndentNo = @oldIndentNo`);
        } else {
            // Direct update for non-indent number changes
            await request.query(
                `UPDATE Indents
                 SET ComplexReference = @complexRef,
                     IndentDate = @indentDate,
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
                     IndentType = @indentType
                 WHERE IndentNo = @oldIndentNo`
            );
        }

        await transaction.commit();

        // Get updated record
        const getRequest = new sql.Request();
        getRequest.input('indentNo', sql.VarChar, req.body.indentNo);
        const updatedIndent = await getRequest.query(
            'SELECT * FROM Indents WHERE IndentNo = @indentNo'
        );

        res.json({
            success: true,
            message: 'Indent updated successfully',
            updatedRecord: updatedIndent.recordset[0]
        });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error updating indent:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add new supplier endpoint
app.post('/api/suppliers', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const request = new sql.Request();
        request.input('SupplierName', sql.NVarChar(sql.MAX), req.body.SupplierName);

        // Modify the query to return the inserted record
        const result = await request.query(`
            INSERT INTO Suppliers (SupplierName)
            OUTPUT INSERTED.SupplierID
            VALUES (@SupplierName)
        `);

        // Check if the result contains the inserted record
        if (result.recordset && result.recordset.length > 0) {
            res.json({ success: true, SupplierID: result.recordset[0].SupplierID });
        } else {
            throw new Error('Failed to retrieve the inserted SupplierID');
        }
    } catch (err) {
        console.error('Error adding supplier:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update createGrnTable function
const createGrnTable = async () => {
    try {
        await sql.connect(sqlConfig);

        // First ensure IndentNo is unique in Indents table
        await sql.query(`
            IF NOT EXISTS (
                SELECT * FROM sys.indexes 
                WHERE name='UQ_Indents_IndentNo' AND object_id = OBJECT_ID('Indents')
            )
            BEGIN
                ALTER TABLE Indents
                ADD CONSTRAINT UQ_Indents_IndentNo UNIQUE (IndentNo)
            END
        `);

        // Then create GRN table with Status column
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GRN' AND xtype='U')
            BEGIN
                CREATE TABLE GRN (
                    GrnID INT PRIMARY KEY IDENTITY(1,1),
                    IndentNo VARCHAR(50),
                    GrnNo VARCHAR(50) UNIQUE,
                    GrnDate DATE,
                    GrnAmount DECIMAL(18,2),
                    Status INT DEFAULT 1,
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_GRN_Indents FOREIGN KEY (IndentNo) 
                    REFERENCES Indents(IndentNo)
                )
            END
            ELSE IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID('GRN') AND name = 'Status'
            )
            BEGIN
                ALTER TABLE GRN ADD Status INT DEFAULT 1
            END
        `);
    } catch (err) {
        console.error('Error creating GRN table:', err);
    }
};

// Add this API endpoint
app.post('/api/grn', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const request = new sql.Request();

        request.input('indentNo', sql.VarChar, req.body.indentNo);
        request.input('grnNo', sql.VarChar, req.body.grnNo);
        request.input('grnDate', sql.Date, new Date(req.body.grnDate));
        request.input('grnAmount', sql.Decimal(18, 2), req.body.grnAmount);

        // Check if GRN number already exists
        const checkResult = await request.query`
            SELECT GrnNo FROM GRN WHERE GrnNo = ${req.body.grnNo}
        `;

        if (checkResult.recordset.length > 0) {
            return res.status(400).json({ error: 'GRN number already exists' });
        }

        await request.query(`
            INSERT INTO GRN (IndentNo, GrnNo, GrnDate, GrnAmount)
            VALUES (@indentNo, @grnNo, @grnDate, @grnAmount)
        `);

        res.json({ success: true, message: 'GRN added successfully' });
    } catch (err) {
        console.error('Error adding GRN:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add this API endpoint to get GRN details for an indent
app.get('/api/grn/:indentNo', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const request = new sql.Request();
        request.input('indentNo', sql.VarChar, req.params.indentNo);

        const result = await request.query(`
            SELECT * FROM GRN 
            WHERE IndentNo = @indentNo 
            ORDER BY GrnDate DESC
        `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/grn', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const result = await sql.query(`
            SELECT * FROM GRN 
            WHERE Status = 1
            ORDER BY CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/grn/:grnNo', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const request = new sql.Request();
        request.input('grnNo', sql.VarChar, req.params.grnNo);

        const result = await request.query(`
            UPDATE GRN 
            SET Status = 0
            WHERE GrnNo = @grnNo
        `);

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'GRN deleted successfully' });
        } else {
            res.status(404).json({ message: 'GRN not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/deleted-indents', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const result = await sql.query(`
            SELECT i.*, s.SupplierName,
                   g.GrnNo,
                   g.GrnAmount
            FROM Indents i 
            LEFT JOIN Suppliers s ON i.SupplierID = s.SupplierID
            LEFT JOIN GRN g ON i.IndentNo = g.IndentNo AND g.Status = 0
            WHERE i.Status = 0
            ORDER BY i.DeletedDate DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching deleted indents:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/addindents/report', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const result = await sql.query(`
            SELECT *
            FROM AddIndents
            ORDER BY CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching AddIndents report:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add this to server.js
app.put('/api/grn/:grnNo', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const request = new sql.Request();

        request.input('oldGrnNo', sql.VarChar, req.params.grnNo);
        request.input('newGrnNo', sql.VarChar, req.body.grnNo);
        request.input('grnDate', sql.Date, new Date(req.body.grnDate));
        request.input('grnAmount', sql.Decimal(18, 2), req.body.grnAmount);

        // Check if new GRN number already exists (if changed)
        if (req.params.grnNo !== req.body.grnNo) {
            const checkResult = await request.query`
                SELECT GrnNo FROM GRN WHERE GrnNo = ${req.body.grnNo}
            `;
            if (checkResult.recordset.length > 0) {
                return res.status(400).json({ error: 'New GRN number already exists' });
            }
        }

        const result = await request.query(`
            UPDATE GRN 
            SET GrnNo = @newGrnNo,
                GrnDate = @grnDate,
                GrnAmount = @grnAmount
            WHERE GrnNo = @oldGrnNo
        `);

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'GRN updated successfully' });
        } else {
            res.status(404).json({ message: 'GRN not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const createDeletePasswordTable = async () => {
    try {
        await sql.connect(sqlConfig);
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DeletePassword' AND xtype='U')
            BEGIN
                CREATE TABLE DeletePassword (
                    Id INT PRIMARY KEY IDENTITY(1,1),
                    Password VARCHAR(50) NOT NULL
                )
                
                -- Insert default password
                INSERT INTO DeletePassword (Password) VALUES ('admin123')
            END
        `);
    } catch (err) {
        console.error('Error creating DeletePassword table:', err);
    }
};

app.post('/api/verify-delete-password', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const request = new sql.Request();
        request.input('password', sql.VarChar, req.body.password);

        const result = await request.query(`
            SELECT COUNT(*) as count 
            FROM DeletePassword 
            WHERE Password = @password
        `);

        res.json({ valid: result.recordset[0].count > 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

createAddIndentsTable();
createGrnTable();
createDeletePasswordTable();

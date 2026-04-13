const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

router.post('/calculate-risk', async (req, res) => {
    try {
        const { safeCount, mildCount, dangerousCount, totalPop, totalMedicalLogs } = req.body;

        const mongoURI = process.env.MONGO_URI;
        // Explicitly point to the venv Python and the script path
        const pythonExecutable = path.join(__dirname, '..', 'venv', 'bin', 'python3');
        const scriptPath = path.join(__dirname, '..', 'ml_models', 'risk_engine.py');

        const pythonProcess = spawn(pythonExecutable, [
            scriptPath, 
            safeCount, mildCount, dangerousCount, totalPop, totalMedicalLogs, mongoURI
        ]);

        let resultData = '';

        pythonProcess.stdout.on('data', (data) => {
            resultData += data.toString();
        });

        // Catch python syntax/import errors
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data.toString()}`);
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const finalRisk = JSON.parse(resultData);
                    if (finalRisk.error) return res.status(400).json(finalRisk);
                    res.json(finalRisk);
                } catch (e) {
                    res.status(500).json({ error: "Failed to parse ML response.", raw: resultData });
                }
            } else {
                res.status(500).json({ error: "Machine Learning engine process failed." });
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
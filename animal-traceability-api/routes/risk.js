const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// Helper for v1 python path
function runV1Model(req, res) {
    const { safeCount, mildCount, dangerousCount, totalPop, totalMedicalLogs } = req.body.snapshot || req.body;
    
    const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017";
    const pythonExecutable = path.join(__dirname, '..', 'venv', 'bin', 'python3');
    const scriptPath = path.join(__dirname, '..', 'ml_models', 'risk_engine.py');

    const pythonProcess = spawn(pythonExecutable, [
        scriptPath, 
        safeCount || 0, mildCount || 0, dangerousCount || 0, totalPop || 0, totalMedicalLogs || 0, mongoURI
    ]);

    let resultData = '';

    pythonProcess.stdout.on('data', (data) => {
        resultData += data.toString();
    });

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
}

router.post('/calculate-risk', async (req, res) => {
    try {
        runV1Model(req, res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/risk/v2', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('http://localhost:8001/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        if (!response.ok) {
            throw new Error(`ml-service unavailable with status: ${response.status}`);
        }
        res.json(await response.json());
    } catch (err) {
        // Fallback to v1 logic if ml-service is down
        console.error('v2 risk service failed, falling back to v1:', err.message);
        runV1Model(req, res);
    }
});

module.exports = router;
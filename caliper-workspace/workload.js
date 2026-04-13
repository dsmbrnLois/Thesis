'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

class RegisterAnimalWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.txIndex = 0;
    }

    async submitTransaction() {
        this.txIndex++;
        
        // Generate a unique ID for each test animal
        const batchId = `CALIPER-${this.workerIndex}-${this.txIndex}-${Date.now()}`;
        
        const animalData = {
            id: batchId,
            batchId: batchId,
            species: "Caliper Test Hog",
            quantity: 10,
            location: "Santa Rosa Benchmark",
            healthStatus: "Healthy",
            status: "In Stock",
            severity: "safe"
        };

        const request = {
            contractId: 'animal-traceability',
            contractFunction: 'RegisterAnimal',
            contractArguments: [batchId, JSON.stringify(animalData)],
            readOnly: false
        };

        // Submit the transaction to the network
        await this.sutAdapter.sendRequests(request);
    }
}

function createWorkloadModule() {
    return new RegisterAnimalWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
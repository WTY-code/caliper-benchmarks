'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const fs = require('fs');
const path = require('path');

class SmallbankCustomWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.transactions = [];
        this.currentIndex = 0;
        this.contractId = 'smallbank';
        this.contractVersion = '1.0';
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        
        // 解析参数
        const txFilePath = roundArguments.txFilePath || 'transactions.json';
        if (roundArguments && roundArguments.contractId) {
            this.contractId = roundArguments.contractId;
        }
        if (roundArguments && roundArguments.contractVersion) {
            this.contractVersion = roundArguments.contractVersion;
        }

        // 读取并解析交易文件
        const absolutePath = path.isAbsolute(txFilePath) ? txFilePath : path.join(process.cwd(), txFilePath);
        const raw = fs.readFileSync(absolutePath);
        this.transactions = JSON.parse(raw);
        this.currentIndex = 0;
        console.log(`Worker ${workerIndex} loaded ${this.transactions.length} txs from ${absolutePath}`);
    }

    async submitTransaction() {
        if (this.currentIndex >= this.transactions.length) {
            return {};
        }

        const tx = this.transactions[this.currentIndex++];

        const request = {
            contractId: this.contractId,
            contractVersion: this.contractVersion,
            contractFunction: tx.functionName,
            contractArguments: tx.arguments || [],
            readOnly: tx.readOnly || false,
            timeout: tx.timeout || 30000,
            metadata: {
                txIdInFile: tx.id || `idx_${this.currentIndex - 1}`,
                workerId: this.workerIndex,
                roundId: this.roundIndex
            }
        };

        // 打印首尾少量日志，避免刷屏
        if (this.currentIndex <= 3 || this.currentIndex === this.transactions.length) {
            console.log(`Submitting tx ${request.metadata.txIdInFile}: ${request.contractFunction} args=${JSON.stringify(request.contractArguments)}`);
        }

        await this.sutAdapter.sendRequests(request);
    }

    async cleanupWorkloadModule() {
        console.log(`Worker ${this.workerIndex} sent ${this.currentIndex}/${this.transactions.length} txs in round ${this.roundIndex}`);
        this.transactions = [];
        this.currentIndex = 0;
    }
}

function createWorkloadModule() {
    return new SmallbankCustomWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;

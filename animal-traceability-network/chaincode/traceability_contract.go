package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SmartContract struct {
	contractapi.Contract
}

type AnimalTransaction struct {
	ID               string `json:"id"`
	BatchID          string `json:"batchId"`
	Username         string `json:"username"`
	Species          string `json:"species"`
	Quantity         int    `json:"quantity"`
	Location         string `json:"location"`
	HealthStatus     string `json:"healthStatus"`
	Status           string `json:"status"`
	DiagnosedDisease string `json:"diagnosedDisease"`
	Severity         string `json:"severity"`
	Timestamp        string `json:"timestamp"`
	LastUpdatedBy    string `json:"lastUpdatedBy"`
	TargetOwner      string `json:"targetOwner"`
	ParentBatchID    string `json:"parentBatchId"`
}

// ===================================================================================
// 1. REGISTER ANIMAL (Farmer Only)
// ===================================================================================
func (s *SmartContract) RegisterAnimal(ctx contractapi.TransactionContextInterface, id string, data string) error {
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSPID: %v", err)
	}
	if clientMSPID != "FarmerMSP" {
		return fmt.Errorf("Access Denied: Only FarmerMSP can register animals. You are %s", clientMSPID)
	}

	exists, err := s.AnimalExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the animal %s already exists", id)
	}

	var tx AnimalTransaction
	if err := json.Unmarshal([]byte(data), &tx); err != nil {
		return fmt.Errorf("failed to unmarshal: %v", err)
	}

	tx.LastUpdatedBy = clientMSPID
	if tx.Timestamp == "" {
		tx.Timestamp = time.Now().Format(time.RFC3339)
	}
	tx.TargetOwner = ""
	tx.ParentBatchID = "NONE"

	txBytes, _ := json.Marshal(tx)
	return ctx.GetStub().PutState(id, txBytes)
}

// ===================================================================================
// 2. UPDATE DIAGNOSIS (Vet Only)
// ===================================================================================
func (s *SmartContract) UpdateDiagnosis(ctx contractapi.TransactionContextInterface, id string, newStatus string, diagnosis string, severity string, targetOwner string) error {
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSPID: %v", err)
	}
	if clientMSPID != "VetMSP" {
		return fmt.Errorf("Access Denied: Only VetMSP can diagnose animals.")
	}

	animalBytes, err := ctx.GetStub().GetState(id)
	if err != nil || animalBytes == nil {
		return fmt.Errorf("the animal %s does not exist", id)
	}

	var animal AnimalTransaction
	json.Unmarshal(animalBytes, &animal)

	animal.Status = newStatus
	animal.DiagnosedDisease = diagnosis
	animal.Severity = severity
	animal.TargetOwner = targetOwner 
	animal.LastUpdatedBy = clientMSPID
	animal.Timestamp = time.Now().Format(time.RFC3339)

	updatedBytes, _ := json.Marshal(animal)
	return ctx.GetStub().PutState(id, updatedBytes)
}

// ===================================================================================
// 3. GET ALL ANIMALS (Regulator/Admin Only)
// ===================================================================================
func (s *SmartContract) GetAllAnimals(ctx contractapi.TransactionContextInterface) ([]*AnimalTransaction, error) {
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return nil, fmt.Errorf("failed to get MSPID: %v", err)
	}
	if clientMSPID != "RegulatorMSP" {
		return nil, fmt.Errorf("Access Denied: Only RegulatorMSP can view the ledger.")
	}

	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var animals []*AnimalTransaction
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var animal AnimalTransaction
		json.Unmarshal(queryResponse.Value, &animal)
		animals = append(animals, &animal)
	}
	return animals, nil
}

// ===================================================================================
// 4. FULL TRANSFER (Moves 100% of the batch)
// ===================================================================================
func (s *SmartContract) TransferAsset(ctx contractapi.TransactionContextInterface, id string, newOwner string, newLocation string, transferType string) error {
	clientMSPID, _ := ctx.GetClientIdentity().GetMSPID()

	if clientMSPID == "RegulatorMSP" {
		if transferType == "Internal" {
			return fmt.Errorf("Regulators cannot execute internal farmer-to-farmer transfers")
		}
	} else if clientMSPID != "FarmerMSP" {
		return fmt.Errorf("Access Denied: Only Farmers or Regulators can execute transfers")
	}

	animalBytes, err := ctx.GetStub().GetState(id)
	if err != nil || animalBytes == nil {
		return fmt.Errorf("the animal %s does not exist", id)
	}

	var animal AnimalTransaction
	json.Unmarshal(animalBytes, &animal)

	// --- NEW: BYPASS HEALTH CHECK FOR CULLING ---
	if transferType != "Cull" && animal.Severity != "safe" {
		return fmt.Errorf("transport rejected: Animal %s is marked as '%s' (Must be 'safe' unless Culling)", id, animal.Severity)
	}

	if transferType == "Internal" {
		if animal.TargetOwner != newOwner {
			 return fmt.Errorf("authorization failed: targeted to '%s', but '%s' is trying to claim", animal.TargetOwner, newOwner)
		}
		animal.Username = newOwner
		animal.Location = newLocation
		animal.Status = "In Stock" 
	} else if transferType == "Slaughter" {
		animal.Status = "Slaughtered" 
		animal.Location = "Slaughterhouse: " + newLocation
		animal.Username = "EXIT"
	} else if transferType == "External" {
		animal.Status = "Exported"
		animal.Location = "Exported to: " + newLocation
		animal.Username = "EXIT"
	} else if transferType == "Cull" { // --- NEW: CULL WORKFLOW ---
		animal.Status = "Culled"
		animal.Location = "Disposed: " + newLocation
		animal.Username = "EXIT" // Burn the asset
	} else {
		return fmt.Errorf("invalid transfer type: %s", transferType)
	}

	animal.TargetOwner = ""
	animal.LastUpdatedBy = clientMSPID
	animal.Timestamp = time.Now().Format(time.RFC3339)

	updatedBytes, _ := json.Marshal(animal)
	return ctx.GetStub().PutState(id, updatedBytes)
}

// ===================================================================================
// 5. SPLIT AND TRANSFER (Fractional Movement)
// ===================================================================================
func (s *SmartContract) SplitAndTransferAsset(ctx contractapi.TransactionContextInterface, parentId string, childId string, transferQty int, newOwner string, newLocation string, transferType string) error {
	clientMSPID, _ := ctx.GetClientIdentity().GetMSPID()

	if clientMSPID == "RegulatorMSP" {
		if transferType == "Internal" {
			return fmt.Errorf("Regulators cannot execute internal farmer-to-farmer transfers")
		}
	} else if clientMSPID != "FarmerMSP" {
		return fmt.Errorf("Access Denied: Only Farmers or Regulators can execute transfers")
	}

	parentBytes, err := ctx.GetStub().GetState(parentId)
	if err != nil || parentBytes == nil {
		return fmt.Errorf("parent batch %s does not exist", parentId)
	}

	var parent AnimalTransaction
	json.Unmarshal(parentBytes, &parent)

	// --- NEW: BYPASS HEALTH CHECK FOR CULLING ---
	if transferType != "Cull" && parent.Severity != "safe" {
		return fmt.Errorf("transport rejected: Parent is marked as '%s' (Must be 'safe' unless Culling)", parent.Severity)
	}
	if transferQty >= parent.Quantity {
		return fmt.Errorf("split rejected: Qty must be less than parent quantity")
	}
	if transferType == "Internal" && parent.TargetOwner != newOwner {
		return fmt.Errorf("authorization failed: targeted to '%s', but '%s' is trying to claim", parent.TargetOwner, newOwner)
	}

	currentTime := time.Now().Format(time.RFC3339)

	// Create Child
	child := AnimalTransaction{
		ID:               childId,
		BatchID:          childId,
		Species:          parent.Species,
		Quantity:         transferQty,
		HealthStatus:     parent.HealthStatus,
		DiagnosedDisease: parent.DiagnosedDisease,
		Severity:         parent.Severity,
		ParentBatchID:    parentId,
		TargetOwner:      "", 
		Timestamp:        currentTime,
		LastUpdatedBy:    clientMSPID,
	}

	if transferType == "Internal" {
		child.Username = newOwner
		child.Location = newLocation
		child.Status = "In Stock"
	} else if transferType == "Slaughter" {
		child.Username = "EXIT"
		child.Status = "Slaughtered"
		child.Location = "Slaughterhouse: " + newLocation
	} else if transferType == "External" {
		child.Username = "EXIT"
		child.Status = "Exported"
		child.Location = "Exported to: " + newLocation
	} else if transferType == "Cull" { // --- NEW: CULL WORKFLOW ---
		child.Username = "EXIT"
		child.Status = "Culled"
		child.Location = "Disposed: " + newLocation
	}

	// Update Parent
	parent.Quantity = parent.Quantity - transferQty
	parent.TargetOwner = ""
	// If a cull was partial, the parent remains sick! Do not overwrite health status.
	parent.LastUpdatedBy = clientMSPID
	parent.Timestamp = currentTime

	parentUpdatedBytes, _ := json.Marshal(parent)
	childBytes, _ := json.Marshal(child)

	ctx.GetStub().PutState(parentId, parentUpdatedBytes)
	return ctx.GetStub().PutState(childId, childBytes)
}

// ===================================================================================
// HELPER FUNCTIONS
// ===================================================================================
func (s *SmartContract) ReadAnimal(ctx contractapi.TransactionContextInterface, id string) (*AnimalTransaction, error) {
	animalBytes, _ := ctx.GetStub().GetState(id)
	var animal AnimalTransaction
	json.Unmarshal(animalBytes, &animal)
	return &animal, nil
}

func (s *SmartContract) AnimalExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	animalJSON, _ := ctx.GetStub().GetState(id)
	return animalJSON != nil, nil
}

func (s *SmartContract) GetHistory(ctx contractapi.TransactionContextInterface, id string) ([]map[string]interface{}, error) {
	resultsIterator, _ := ctx.GetStub().GetHistoryForKey(id)
	defer resultsIterator.Close()

	var history []map[string]interface{}
	for resultsIterator.HasNext() {
		response, _ := resultsIterator.Next()
		var tx AnimalTransaction
		if len(response.Value) > 0 {
			json.Unmarshal(response.Value, &tx)
		}
		history = append(history, map[string]interface{}{
			"txId": response.TxId, "data": tx, "timestamp": response.Timestamp,
		})
	}
	return history, nil
}
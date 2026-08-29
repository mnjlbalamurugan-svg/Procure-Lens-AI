import sys
import os
import io

# Ensure backend path is in sys.path
sys.path.insert(0, "c:/Users/DELL/OneDrive/Desktop/procure lens/backend")

from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, SessionLocal
from app import models

client = TestClient(app)

def test_workflow():
    # 1. Create a project
    project_payload = {
        "name": "Integration Laptop Project",
        "description": "Test live file extraction and compliance swap.",
        "quantity": 100,
        "budget": 60000,
        "currency": "INR",
        "requirements": [
            {"category": "Commercial", "parameter": "Unit Price", "required_value": "<= ₹60000", "weight": 30.0, "mandatory": True},
            {"category": "Technical", "parameter": "RAM", "required_value": ">= 16GB", "weight": 30.0, "mandatory": True},
            {"category": "Warranty", "parameter": "Warranty", "required_value": ">= 3 years", "weight": 15.0, "mandatory": True},
            {"category": "Delivery", "parameter": "Delivery Time", "required_value": "<= 30 days", "weight": 10.0, "mandatory": True},
            {"category": "Payment", "parameter": "Payment Terms", "required_value": "30-day credit", "weight": 10.0, "mandatory": False}
        ]
    }
    
    response = client.post("/api/projects", json=project_payload)
    assert response.status_code == 200, f"Failed to create project: {response.text}"
    project = response.json()
    project_id = project["id"]
    print(f"Created Project ID: {project_id}")

    # 2. Upload the 3 custom PDFs
    files_to_upload = [
        ("vendor_1_custom.pdf", "Vendor 1"),
        ("vendor_2_custom.pdf", "Vendor 2"),
        ("vendor_3_custom.pdf", "Vendor 3"),
    ]
    
    for filename, vendor_name in files_to_upload:
        filepath = f"c:/Users/DELL/OneDrive/Desktop/procure lens/sample-data/{filename}"
        with open(filepath, "rb") as f:
            file_data = f.read()
            
        upload_response = client.post(
            f"/api/projects/{project_id}/proposals/upload",
            data={"vendor_name": vendor_name},
            files={"file": (filename, io.BytesIO(file_data), "application/pdf")}
        )
        assert upload_response.status_code == 200, f"Failed to upload {filename}: {upload_response.text}"
        print(f"Uploaded {filename} for {vendor_name}. Proposal ID: {upload_response.json()['proposal_id']}")

    # 3. Run Analysis
    analyze_response = client.post(f"/api/projects/{project_id}/analyze")
    assert analyze_response.status_code == 200, f"Analysis failed: {analyze_response.text}"
    print("Analysis finished successfully.")

    # 4. Fetch results and verify scores
    comp_response = client.post(f"/api/projects/{project_id}/simulate", json={
        "price_weight": 30.0,
        "technical_weight": 30.0,
        "warranty_weight": 15.0,
        "delivery_weight": 10.0,
        "payment_weight": 10.0,
        "risk_weight": 5.0
    })
    assert comp_response.status_code == 200, f"Simulation failed: {comp_response.text}"
    results = comp_response.json()
    
    print("\n--- RESULTS PRIOR TO PRICE SWAP ---")
    for r in results:
        print(f"Vendor: {r['vendor_name']}, Score: {r['total_score']}")
    
    # Assert Vendor 1 wins because Vendor 2 exceeds unit price limit and Vendor 3 fails mandatory RAM, Warranty, Delivery
    # Vendor 1: Score 91.0
    # Vendor 2: Score 37.9
    # Vendor 3: Score 0.0
    assert results[0]["vendor_name"] == "Vendor 1", "Vendor 1 should be the champion"
    assert results[0]["total_score"] == 92.5, f"Vendor 1 score should be 92.5, got {results[0]['total_score']}"

    # 5. Swap Vendor 1 price from ₹50,000 to ₹70,000 to test score changes
    # Let's generate a modified PDF for Vendor 1
    modified_content = """
    PROPOSAL FROM VENDOR 1 - ENTERPRISE SYSTEMS
    
    We submit our modified proposal.
    
    Commercial Details:
    - Product Model: Business Pro Book A1
    - Unit Price: Rs. 70,000 per unit.
    - Bulk Quantity: 100 Units.
    - Total Value: Rs. 7,000,000.
    
    Technical Specs:
    - System Memory: 16GB DDR4 RAM
    - SSD Storage: 512GB SSD
    - Screen: 14-inch Full HD
    
    Warranty & Service:
    - 3 years onsite manufacturer warranty.
    
    Logistics:
    - Delivery schedule: 20 days after signed purchase agreement.
    
    Payment terms:
    - Payment within 30 days of invoice receipt (30-day credit).
    """
    
    import fitz
    modified_pdf_path = "c:/Users/DELL/OneDrive/Desktop/procure lens/sample-data/vendor_1_custom_modified.pdf"
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), modified_content)
    doc.save(modified_pdf_path)
    
    # Re-upload Vendor 1 proposal
    with open(modified_pdf_path, "rb") as f:
        file_data = f.read()
        
    reupload_response = client.post(
        f"/api/projects/{project_id}/proposals/upload",
        data={"vendor_name": "Vendor 1"},
        files={"file": ("vendor_1_custom_modified.pdf", io.BytesIO(file_data), "application/pdf")}
    )
    assert reupload_response.status_code == 200, f"Re-upload failed: {reupload_response.text}"
    print(f"Re-uploaded Vendor 1 with Price Rs. 70,000. Proposal ID: {reupload_response.json()['proposal_id']}")

    # Re-analyze
    reanalyze_response = client.post(f"/api/projects/{project_id}/analyze")
    assert reanalyze_response.status_code == 200, f"Re-analysis failed: {reanalyze_response.text}"
    
    # Recalculate
    recalc_response = client.post(f"/api/projects/{project_id}/simulate", json={
        "price_weight": 30.0,
        "technical_weight": 30.0,
        "warranty_weight": 15.0,
        "delivery_weight": 10.0,
        "payment_weight": 10.0,
        "risk_weight": 5.0
    })
    assert recalc_response.status_code == 200, f"Simulation failed: {recalc_response.text}"
    recalc_results = recalc_response.json()
    
    print("\n--- RESULTS AFTER PRICE SWAP (Vendor 1 is now Rs. 70,000) ---")
    for r in recalc_results:
        print(f"Vendor: {r['vendor_name']}, Score: {r['total_score']}")
        
    # Since Vendor 1 is now ₹70,000 (exceeds budget ₹60,000), it has a mandatory failure and is penalized.
    # Scores before penalty:
    # Vendor 1 Price Score: max(0.0, 70.0 * (60000/70000) - 20) = 70.0 * 0.857 - 20 = 60.0 - 20 = 40.0.
    # Vendor 1 Weighted score before penalty: (40.0 * 0.3) + 30 + 15 + 10 + 10 + (95 * 0.05) = 12 + 65 + 4.75 = 81.75
    # Vendor 1 Score (Penalty Applied): 81.75 - 40 = 41.75 -> 41.8.
    # Let's verify who is top now:
    # Vendor 1: 41.8
    # Vendor 2: 37.9
    # Vendor 3: 0.0
    # Vendor 1 is still top but its score dropped from 91.0 to 41.8!
    assert recalc_results[0]["vendor_name"] == "Vendor 1"
    assert recalc_results[0]["total_score"] < 45.0, f"Vendor 1 score should be lowered, got {recalc_results[0]['total_score']}"
    print("\nIntegration test completed successfully and validated compliance swap!")

if __name__ == "__main__":
    test_workflow()

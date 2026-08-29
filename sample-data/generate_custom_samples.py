import fitz
import os

os.makedirs("c:/Users/DELL/OneDrive/Desktop/procure lens/sample-data", exist_ok=True)

data = [
    {
        "file": "c:/Users/DELL/OneDrive/Desktop/procure lens/sample-data/vendor_1_custom.pdf",
        "content": """
        PROPOSAL FROM VENDOR 1 - ENTERPRISE SYSTEMS
        
        We submit our proposal for the procurement tender.
        
        Commercial Details:
        - Product Model: Business Pro Book A1
        - Unit Price: Rs. 50,000 per unit.
        - Bulk Quantity: 100 Units.
        - Total Value: Rs. 5,000,000.
        
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
    },
    {
        "file": "c:/Users/DELL/OneDrive/Desktop/procure lens/sample-data/vendor_2_custom.pdf",
        "content": """
        OFFICIAL QUOTATION - VENDOR 2 (PREMIUM COMPUTING)
        
        Tender details for custom high-spec bulk laptops.
        
        Commercial Specs:
        - Model: Extreme Developer Series Book X
        - Unit price: Rs. 65,000.
        - Total bulk cost: Rs. 6,500,000 for 100 laptops.
        
        Specifications:
        - RAM: 32GB DDR5 high-speed RAM
        - Storage: 1TB PCIe NVMe SSD
        - Screen: 15.6-inch IPS screen
        
        Warranty:
        - 5 years comprehensive warranty coverage.
        
        Logistics:
        - Delivery timeline: 15 days standard shipping.
        
        Commercial payment terms:
        - 50% advance payment required upon purchase order confirmation.
        """
    },
    {
        "file": "c:/Users/DELL/OneDrive/Desktop/procure lens/sample-data/vendor_3_custom.pdf",
        "content": """
        BUDGET BID - VENDOR 3 (VALUE PC CORP)
        
        Low-cost proposal for business laptop fulfillment.
        
        Commercial Details:
        - Product Model: Value Laptop Series V
        - Unit price: Rs. 45,000.
        - Subtotal price: Rs. 4,500,000. All packaging included.
        
        Technical Specifications:
        - RAM: 8GB DDR4 RAM
        - Storage: 256GB SSD
        - Screen: 14-inch HD display
        
        Warranty and Support:
        - 1 year standard return-to-base warranty.
        
        Logistics and delivery:
        - Lead time: 60 days delivery timeline due to shipping delays.
        
        Commercial Payment Terms:
        - 30-day net credit payment terms.
        """
    }
]

for item in data:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), item["content"])
    doc.save(item["file"])
    print(f"Generated PDF file: {item['file']}")

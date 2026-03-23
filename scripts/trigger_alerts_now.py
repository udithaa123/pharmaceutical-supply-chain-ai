from pymongo import MongoClient
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def trigger_alerts():
    client = MongoClient("mongodb://localhost:27017/")
    db = client["pharma_supply_chain"]
    inventory = db.inventory

    # Pick 5 random items and set their stock to 0 to trigger CRITICAL alerts
    items = list(inventory.find({}).limit(5))
    
    for item in items:
        inventory.update_one(
            {"_id": item["_id"]},
            {
                "$set": {
                    "current_stock": 0,
                    "last_updated": datetime.utcnow()
                }
            }
        )
        logger.info(f"EMERGENCY DRILL: Drained ALL units from {item.get('drug_name')} at {item.get('branch_id')}.")

if __name__ == "__main__":
    trigger_alerts()

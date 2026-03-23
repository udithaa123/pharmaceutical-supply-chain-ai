import time
import random
from datetime import datetime
from pymongo import MongoClient
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_inventory():
    client = MongoClient("mongodb://localhost:27017/")
    db = client["pharma_supply_chain"]
    inventory = db.inventory

    items = list(inventory.find({}))
    if not items:
        logger.warning("No inventory found to update.")
        return

    # Randomly pick 3-5 items to drain stock from
    to_update = random.sample(items, k=random.randint(3, 5))
    
    for item in to_update:
        current = item.get("current_stock", 0)
        # Randomly subtract 1-5% of current stock
        reduction = int(current * random.uniform(0.01, 0.05))
        new_stock = max(0, current - reduction)
        
        inventory.update_one(
            {"_id": item["_id"]},
            {
                "$set": {
                    "current_stock": new_stock,
                    "last_updated": datetime.utcnow()
                }
            }
        )
        logger.info(f"Drained {reduction} units from {item.get('drug_name')} at {item.get('branch_id')}. New Stock: {new_stock}")

if __name__ == "__main__":
    logger.info("Starting live data emulation...")
    while True:
        update_inventory()
        # Sleep for 15 seconds to simulate high frequency updates
        time.sleep(15)

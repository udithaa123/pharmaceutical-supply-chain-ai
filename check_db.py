import pymongo
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Connect to MongoDB
CLIENT = pymongo.MongoClient("mongodb://localhost:27017")
DB = CLIENT["pharma_supply_chain"]

def check_data():
    logger.info("Checking database content...")
    
    # Check drugs
    drugs_count = DB.drugs.count_documents({})
    logger.info(f"Drugs count: {drugs_count}")
    
    # Check inventory
    inv_count = DB.inventory.count_documents({})
    logger.info(f"Inventory count: {inv_count}")
    
    # Check sales history
    sales_count = DB.sales_history.count_documents({})
    logger.info(f"Sales history count: {sales_count}")
    
    if sales_count > 0:
        # Check specific drug "insulin"
        insulin_sales = DB.sales_history.count_documents({"drug_id": "insulin"})
        logger.info(f"Sales for 'insulin': {insulin_sales}")
        
        if insulin_sales == 0:
             # Check what drug IDs actulaly exist
             sample = DB.sales_history.find_one()
             logger.info(f"Sample sales record: {sample}")
             
             distinct_ids = DB.sales_history.distinct("drug_id")
             logger.info(f"Distinct drug IDs in sales: {distinct_ids[:10]}")
        else:
            # Check dates
            recent_sales = DB.sales_history.count_documents({
                "drug_id": "insulin",
                "date": {"$gte": datetime.utcnow() - timedelta(days=365)}
            })
            logger.info(f"Sales for 'insulin' in last 365 days: {recent_sales}")
            
            # Print a sample
            sample = DB.sales_history.find_one({"drug_id": "insulin"})
            logger.info(f"Sample 'insulin' record: {sample}")

if __name__ == "__main__":
    check_data()

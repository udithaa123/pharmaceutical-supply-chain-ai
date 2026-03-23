import pymongo
from datetime import datetime, timedelta
import random
import math
import logging

logging.basicConfig(level=logging.INFO,
format="%(asctime)s - %(levelname)s - %(message)s")

logger = logging.getLogger(__name__)

CLIENT = pymongo.MongoClient("mongodb://localhost:27017")
DB = CLIENT["pharma_supply_chain"]

# ============================
# CONFIGURATION
# ============================

NUM_DRUGS = 30
NUM_BRANCHES = 3
HISTORY_DAYS = 180
BATCH_SIZE = 5000

# ============================

def clear_database():
    logger.info("Clearing existing database...")
    DB.drugs.delete_many({})
    DB.inventory.delete_many({})
    DB.sales_history.delete_many({})
    logger.info("Database cleared.")


def get_drug_list():
    drug_names = [
        "Metformin","Aspirin","Insulin","Amoxicillin","Omeprazole",
        "Losartan","Simvastatin","Albuterol","Warfarin","Furosemide",
        "Atorvastatin","Levothyroxine","Lisinopril","Amlodipine","Metoprolol",
        "Gabapentin","Sertraline","Acetaminophen","Ibuprofen","Prednisone",
        "Cephalexin","Tramadol","Clonazepam","Pantoprazole","Montelukast",
        "Escitalopram","Rosuvastatin","Azithromycin","Doxycycline","Ciprofloxacin"
    ]

    categories = [
        "Cardiovascular","Antibiotic","Pain Relief",
        "Diabetes","Respiratory","Gastro","Psychiatry"
    ]

    drugs = []

    for name in drug_names[:NUM_DRUGS]:
        drugs.append({
            "id": name.lower(),
            "name": name,
            "category": random.choice(categories),
            "unit_price": round(random.uniform(5.0,150.0),2),
            "optimal_stock": random.randint(1000,5000)
        })

    return drugs


def seed_drugs(drugs):
    DB.drugs.insert_many(drugs)
    logger.info(f"Seeded {len(drugs)} drugs")


def seed_inventory(drugs):

    branches = ["MAIN_BRANCH"] + [f"branch_{i:03d}" for i in range(1, NUM_BRANCHES+1)]

    items = []

    for drug in drugs:

        optimal = drug["optimal_stock"]

        for branch in branches:

            current = int(random.triangular(optimal*0.8, optimal*1.1, optimal))

            items.append({
                "drug_id": drug["id"],
                "drug_name": drug["name"],
                "branch_id": branch,
                "current_stock": current,
                "optimal_stock": optimal,
                "safe_stock": int(optimal*0.25),
                "last_updated": datetime.utcnow()
            })

    DB.inventory.insert_many(items)

    logger.info(f"Seeded inventory for {len(branches)} branches")


def seed_sales_history(drugs):

    branches = ["MAIN_BRANCH"] + [f"branch_{i:03d}" for i in range(1, NUM_BRANCHES+1)]

    end = datetime.utcnow()
    start = end - timedelta(days=HISTORY_DAYS)

    patterns = {}

    for drug in drugs:
        patterns[drug["id"]] = random.choice(["growth","winter","summer","stable"])

    sales_batch = []
    total = 0

    current = start

    while current <= end:

        day_of_year = current.timetuple().tm_yday
        progress = (current-start).days / HISTORY_DAYS

        for drug in drugs:

            base = drug["optimal_stock"] / 30
            pattern = patterns[drug["id"]]

            multiplier = 1

            if pattern == "growth":
                multiplier = 1 + progress*0.4

            elif pattern == "winter":
                multiplier = 1 + 0.3 * math.cos(2*math.pi*day_of_year/365)

            elif pattern == "summer":
                multiplier = 1 - 0.3 * math.cos(2*math.pi*day_of_year/365)

            for branch in branches:

                noise = random.uniform(0.85,1.15)

                weekend = 0.7 if current.weekday() >= 5 else 1

                qty = int(base * multiplier * noise * weekend)

                sales_batch.append({
                    "drug_id": drug["id"],
                    "drug_name": drug["name"],
                    "branch_id": branch,
                    "quantity": max(0,qty),
                    "date": current,
                    "price": drug["unit_price"]
                })

                if len(sales_batch) >= BATCH_SIZE:
                    DB.sales_history.insert_many(sales_batch)
                    total += len(sales_batch)
                    sales_batch.clear()

        current += timedelta(days=1)

    if sales_batch:
        DB.sales_history.insert_many(sales_batch)
        total += len(sales_batch)

    logger.info(f"Total sales records: {total}")


if __name__ == "__main__":

    clear_database()

    drugs = get_drug_list()

    seed_drugs(drugs)

    seed_inventory(drugs)

    seed_sales_history(drugs)

    logger.info("Database seeding completed")